create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('team', 'league')),
  team_id uuid references public.teams (id) on delete cascade,
  league_external_id bigint,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint follows_kind_ref_check check (
    (kind = 'team' and team_id is not null and league_external_id is null) or
    (kind = 'league' and league_external_id is not null and team_id is null)
  )
);

create unique index if not exists follows_team_unique on public.follows (team_id) where kind = 'team';
create unique index if not exists follows_league_unique on public.follows (league_external_id) where kind = 'league';

-- Tracks which fixtures already triggered a "kickoff soon" push, so the
-- periodic notify job never double-sends for the same match.
create table if not exists public.fixture_notifications (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures (id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (fixture_id)
);
