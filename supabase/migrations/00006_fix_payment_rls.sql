-- ============================================================
-- jelantahin — Fix RLS: UMKM can see incoming payments
-- Old policy: user_id = auth.uid() (only the payer can see)
-- New policy: payer OR the UMKM in the related order can see
-- ============================================================

drop policy if exists "Users can view own payment confirmations"
  on public.payment_confirmations;

create policy "Users can view own or incoming payment confirmations"
  on public.payment_confirmations for select to authenticated
  using (
    -- The person who made the payment (Perusahaan)
    user_id = auth.uid()
    or
    -- The UMKM receiving the payment (via order relation)
    exists (
      select 1 from public.orders o
      where o.id = order_id
      and o.umkm_id = auth.uid()
    )
  );
