create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  external_id bigint not null unique,
  league_external_id bigint not null,
  season int not null,
  home_team_id uuid not null references public.teams (id),
  away_team_id uuid not null references public.teams (id),
  venue text,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  lineup_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fixtures_external_id_idx on public.fixtures (external_id);
create index if not exists fixtures_kickoff_at_idx on public.fixtures (kickoff_at);
create index if not exists fixtures_status_idx on public.fixtures (status);
create index if not exists fixtures_league_season_idx on public.fixtures (league_external_id, season);
