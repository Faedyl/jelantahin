-- =============================================================
-- FIX LUNAS FLOW — Gabungan 00017 + 00018 + 00019
-- Jalanin SEKALIGUS di Supabase SQL Editor.
-- Urutan: kolom → trigger → constraint
-- =============================================================

-- 1. KOLOM umkm_bank_id di payment_confirmations (00017)
alter table public.payment_confirmations
  add column if not exists umkm_bank_id uuid references public.umkm_banks(id) on delete set null;

create index if not exists idx_payment_confirmations_umkm_bank
  on public.payment_confirmations(umkm_bank_id);


-- 2. FIX TRIGGER: completed→paid + order-based role lookup (00018)
--    (menggabungkan fix dari 00011 + fitur paid dari 00014)
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
  if old.status is not distinct from new.status then
    return new;
  end if;

  v_current_user := auth.uid();

  select o.umkm_id, o.perusahaan_id
  into v_umkm_id, v_perusahaan_id
  from public.orders o
  where o.id = new.id;

  if v_current_user = v_umkm_id then
    if not (
      (old.status = 'pending'                and new.status = 'confirmed_by_umkm') or
      (old.status = 'pending'                and new.status = 'cancelled') or
      (old.status = 'picked_up_by_perusahaan' and new.status = 'picked_up') or
      (old.status = 'completed_by_perusahaan' and new.status = 'completed')
    ) then
      raise exception 'UMKM hanya dapat menerima (pending→confirmed_by_umkm), membatalkan (pending→cancelled), mengkonfirmasi penjemputan (picked_up_by_perusahaan→picked_up), atau mengkonfirmasi penyelesaian (completed_by_perusahaan→completed).';
    end if;

  elsif v_current_user = v_perusahaan_id then
    if not (
      (old.status = 'confirmed_by_umkm'      and new.status = 'confirmed') or
      (old.status = 'confirmed'              and new.status = 'picked_up_by_perusahaan') or
      (old.status = 'picked_up_by_perusahaan' and new.status = 'cancelled') or
      (old.status = 'picked_up'              and new.status = 'completed_by_perusahaan') or
      (old.status = 'completed'              and new.status = 'paid')
    ) then
      raise exception 'Transisi status tidak valid untuk perusahaan.';
    end if;

  else
    raise exception 'Anda tidak terdaftar sebagai pihak yang terlibat dalam pesanan ini.';
  end if;

  return new;
end;
$$;


-- 3. FIX CHECK CONSTRAINT: tambah 'paid' ke daftar status (00019)
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in (
    'pending',
    'confirmed_by_umkm',
    'confirmed',
    'picked_up_by_perusahaan',
    'picked_up',
    'completed_by_perusahaan',
    'completed',
    'paid',
    'cancelled'
  ));
