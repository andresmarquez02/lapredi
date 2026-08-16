-- Fixture-detail cache fields needed by the 5-minute cache-on-view mechanism
-- (data-ingestion spec: "Cached fixture-detail data is reused within a
-- 5-minute window"). `updated_at` (already on fixtures) is the freshness
-- marker checked against that window.
alter table public.fixtures
  add column if not exists temperature_celsius numeric,
  add column if not exists lineup_home jsonb,
  add column if not exists lineup_away jsonb;
