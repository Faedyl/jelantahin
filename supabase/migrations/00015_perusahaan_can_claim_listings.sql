-- ============================================================
-- Migration 00015: Allow Perusahaan to claim listings
--
-- Problem: When Perusahaan claims a listing (executeClaim),
-- updateListing(id, { status: 'claimed' }) is called but RLS
-- policy only allows UMKM owner to update. The error is
-- silently swallowed, so the listing stays 'available'.
--
-- Fix: Add a policy that lets the Perusahaan who created an
-- order for this listing change its status to 'claimed'.
-- ============================================================

-- Allow the Perusahaan that has an order for this listing
-- to update its status to 'claimed'.
create policy "Perusahaan can claim listings they ordered"
  on public.oil_listings for update to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.listing_id = oil_listings.id
        and orders.perusahaan_id = auth.uid()
    )
  )
  with check (status = 'claimed');
