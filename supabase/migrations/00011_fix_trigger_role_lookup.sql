-- ============================================================
-- jelantahin — Fix role lookup in order status trigger
-- Use the order's own umkm_id / perusahaan_id instead of the
-- profiles table, because the auth user may not have a profile
-- row (e.g. legacy accounts created before the signup trigger).
-- ============================================================

create or replace function public.check_order_status_transition()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_umkm_id        uuid;
  v_perusahaan_id  uuid;
  v_current_user   uuid;
begin
  -- Only validate when status actually changes
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_current_user := auth.uid();

  -- Get the involved parties directly from the order row
  select o.umkm_id, o.perusahaan_id
  into v_umkm_id, v_perusahaan_id
  from public.orders o
  where o.id = new.id;

  -- Determine role from order involvement, not from profiles table
  if v_current_user = v_umkm_id then
    -- UMKM can accept, reject, confirm pickup, and confirm completion
    if not (
      (old.status = 'pending'                and new.status = 'confirmed_by_umkm') or
      (old.status = 'pending'                and new.status = 'cancelled') or
      (old.status = 'picked_up_by_perusahaan' and new.status = 'picked_up') or
      (old.status = 'completed_by_perusahaan' and new.status = 'completed')
    ) then
      raise exception 'UMKM hanya dapat menerima (pending→confirmed_by_umkm), membatalkan (pending→cancelled), mengkonfirmasi penjemputan (picked_up_by_perusahaan→picked_up), atau mengkonfirmasi penyelesaian (completed_by_perusahaan→completed).';
    end if;

  elsif v_current_user = v_perusahaan_id then
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
    raise exception 'Anda tidak terdaftar sebagai pihak yang terlibat dalam pesanan ini.';
  end if;

  return new;
end;
$$;
