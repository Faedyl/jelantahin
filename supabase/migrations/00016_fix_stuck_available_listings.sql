-- ============================================================
-- Migration 00016: Fix existing listings stuck on 'available'
--
-- Problem: Before migration 00015, Perusahaan's updateListing
-- call was silently blocked by RLS, so listings that were
-- claimed/paid still show status 'available'.
--
-- Fix: Update any listing that has an order in a terminal
-- state (completed / paid) but is still 'available'.
-- ============================================================

-- Safe to re-run: only updates rows that still need fixing
update public.oil_listings
set status = 'completed',
    updated_at = now()
where status = 'available'
  and exists (
    select 1
    from public.orders
    where orders.listing_id = oil_listings.id
      and orders.status in ('completed', 'paid')
  );
