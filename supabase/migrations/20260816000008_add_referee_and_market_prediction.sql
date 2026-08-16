alter table public.fixtures
  add column if not exists referee text;

-- External reference prediction (Highlightly's own prematch model, the
-- closest thing to a bookmaker/market consensus available on the free plan -
-- raw odds require a paid plan). Shown alongside our own ensemble, never
-- merged into it, so the user can compare.
alter table public.predictions
  add column if not exists market_home_prob numeric,
  add column if not exists market_draw_prob numeric,
  add column if not exists market_away_prob numeric,
  add column if not exists market_source text;
