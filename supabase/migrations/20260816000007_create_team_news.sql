-- Cached GNews results per team (free tier: 100 req/day, ~12h data delay).
-- One row per team, replaced wholesale on refresh, so we never re-query
-- GNews for the same team within the cache window.
create table if not exists public.team_news (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null unique references public.teams (id),
  articles jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);

create index if not exists team_news_team_idx on public.team_news (team_id);
