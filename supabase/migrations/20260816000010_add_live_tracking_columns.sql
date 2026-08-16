alter table public.fixtures
  add column if not exists live_minute text,
  add column if not exists live_home_score smallint,
  add column if not exists live_away_score smallint,
  add column if not exists live_synced_at timestamptz;
