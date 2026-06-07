-- ============================================================
-- jelantahin — Seed data with coordinates for map testing
-- Sample locations around Samarinda, East Kalimantan
-- ============================================================

-- Update existing listings with varied coordinates around Samarinda
-- so the map view has content to display

-- Samarinda Kota (city center)
update public.oil_listings
set
  latitude  = -0.5022 + (random() * 0.04 - 0.02),
  longitude = 117.1536 + (random() * 0.04 - 0.02)
where latitude is null
  and (city = 'Samarinda' or city is null)
limit 100;
