-- ============================================================
-- jelantahin — Add 'paid' to orders.status CHECK constraint
--
-- The original constraint in 00001_init.sql didn't include
-- 'paid', so updating orders.status to 'paid' fails with:
--   new row for relation orders violates check constraint
--   "orders_status_check"
-- ============================================================

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
