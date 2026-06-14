-- ============================================================
-- jelantahin — Add UPDATE & INSERT policies for transactions
-- So Perusahaan can update payment_status → 'paid' and
-- createTransaction() works from client-side
-- ============================================================

create policy "Involved parties can update transactions"
  on public.transactions for update to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.umkm_id = auth.uid() or o.perusahaan_id = auth.uid())
    )
  );

create policy "Involved parties can insert transactions"
  on public.transactions for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.umkm_id = auth.uid() or o.perusahaan_id = auth.uid())
    )
  );
