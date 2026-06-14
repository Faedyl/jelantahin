-- ============================================================
-- jelantahin — Enforce strict dual-confirmation status transitions
-- Each confirmation step can only be done by the correct role.
--   UMKM-only: pending→confirmed_by_umkm, pending→cancelled,
--              picked_up_by_perusahaan→picked_up,
--              completed_by_perusahaan→completed
--   Perusahaan-only: confirmed_by_umkm→confirmed,
--                    confirmed→picked_up_by_perusahaan,
--                    picked_up_by_perusahaan→cancelled,
--                    picked_up→completed_by_perusahaan
-- ============================================================

create or replace function public.check_order_status_transition()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_role text;
begin
  -- Only validate when status actually changes
  if old.status is not distinct from new.status then
    return new;
  end if;

  -- Look up the role of the current user
  select role::text into v_role
  from public.profiles
  where id = auth.uid();

  if v_role = 'umkm' then
    -- UMKM can accept, reject, confirm pickup, and confirm completion
    if not (
      (old.status = 'pending'                and new.status = 'confirmed_by_umkm') or
      (old.status = 'pending'                and new.status = 'cancelled') or
      (old.status = 'picked_up_by_perusahaan' and new.status = 'picked_up') or
      (old.status = 'completed_by_perusahaan' and new.status = 'completed')
    ) then
      raise exception 'UMKM hanya dapat menerima (pending→confirmed_by_umkm), membatalkan (pending→cancelled), mengkonfirmasi penjemputan (picked_up_by_perusahaan→picked_up), atau mengkonfirmasi penyelesaian (completed_by_perusahaan→completed).';
    end if;

  elsif v_role = 'perusahaan' then
    -- Perusahaan can advance the lifecycle (but cannot skip UMKM's confirmations)
    if not (
      (old.status = 'confirmed_by_umkm'      and new.status = 'confirmed') or
      (old.status = 'confirmed'              and new.status = 'picked_up_by_perusahaan') or
      (old.status = 'picked_up_by_perusahaan' and new.status = 'cancelled') or
      (old.status = 'picked_up'              and new.status = 'completed_by_perusahaan')
    ) then
      raise exception 'Transisi status tidak valid untuk perusahaan.';
    end if;

  else
    raise exception 'Role tidak dikenal.';
  end if;

  return new;
end;
$$;
