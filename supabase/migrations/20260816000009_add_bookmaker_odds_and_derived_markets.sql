-- Real bookmaker odds (normalized probabilities) as a comparison point,
-- alongside Highlightly's own model (market_* columns) - never blended into
-- our ensemble.
alter table public.predictions
  add column if not exists bookmaker_name text,
  add column if not exists bookmaker_home_prob numeric,
  add column if not exists bookmaker_draw_prob numeric,
  add column if not exists bookmaker_away_prob numeric;

-- Our own multi-market breakdown (over/under, BTTS, handicap, top scorelines)
-- derived from the same scoreline grid the 1X2 probabilities come from -
-- see src/lib/prediction/markets.ts.
alter table public.predictions
  add column if not exists derived_markets jsonb;
