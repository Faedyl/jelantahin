-- ============================================================
-- jelantahin — Allow Perusahaan to select which UMKM bank
-- to pay when UMKM has multiple rekening
-- ============================================================

-- 1. Add umkm_bank_id to payment_confirmations so Perusahaan
--    can record which UMKM bank they transferred to
alter table public.payment_confirmations
  add column if not exists umkm_bank_id uuid references public.umkm_banks(id) on delete set null;

-- Index for faster lookups
create index if not exists idx_payment_confirmations_umkm_bank
  on public.payment_confirmations(umkm_bank_id);
