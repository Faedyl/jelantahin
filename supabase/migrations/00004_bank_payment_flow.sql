-- ============================================================
-- jelantahin — Bank accounts for UMKM + order payments
-- UMKM sets their bank to receive payment from Perusahaan
-- Perusahaan pays UMKM directly per order
-- ============================================================

-- 1. Add bank fields to profiles (UMKM sets where to receive payment)
alter table public.profiles
  add column if not exists bank_name    text,
  add column if not exists bank_account text,
  add column if not exists bank_holder  text;

-- 2. Add order_id to payment_confirmations for order-based payments
alter table public.payment_confirmations
  add column if not exists order_id uuid references public.orders(id) on delete set null;

-- Index for faster lookups
create index if not exists idx_payment_confirmations_order
  on public.payment_confirmations(order_id);
