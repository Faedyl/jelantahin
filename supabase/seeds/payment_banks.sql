-- ============================================================
-- Seed: Common Indonesian Bank Accounts for Payment Gateway
-- Run this AFTER migration 00003_points_payment.sql
-- ============================================================

insert into public.payment_banks (bank_name, account_number, account_name, is_active, sort_order)
values
  ('BCA',         '1234567890', 'PT Jelantahin Indonesia', true, 1),
  ('Mandiri',     '1234567890', 'PT Jelantahin Indonesia', true, 2),
  ('BNI',         '1234567890', 'PT Jelantahin Indonesia', true, 3),
  ('BRI',         '1234567890', 'PT Jelantahin Indonesia', true, 4),
  ('CIMB Niaga',  '1234567890', 'PT Jelantahin Indonesia', true, 5),
  ('Danamon',     '1234567890', 'PT Jelantahin Indonesia', true, 6),
  ('Permata',     '1234567890', 'PT Jelantahin Indonesia', true, 7),
  ('BSI',         '1234567890', 'PT Jelantahin Indonesia', true, 8)
on conflict (id) do nothing;
