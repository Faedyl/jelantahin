-- ============================================================
-- jelantahin — Map Integration
-- Add lat/lng coordinates to oil_listings for map display
-- ============================================================

alter table public.oil_listings
  add column latitude  numeric(10,7),
  add column longitude numeric(10,7);

-- optional: enable PostGIS extension if you want spatial queries
-- create extension if not exists postgis with schema extensions;
