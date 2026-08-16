create table if not exists public.team_form_stats (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id),
  league_external_id bigint not null,
  season int not null,
  computed_at timestamptz not null default now(),
  matches_considered int not null,
  goals_scored_avg numeric not null,
  goals_conceded_avg numeric not null,
  attack_strength numeric not null,
  defense_strength numeric not null,
  -- ordered array of recent results, e.g. [{"opponent_id","goals_for","goals_against","result","date"}, ...]
  -- used by the LLM layer to reason about narrow-margin win streaks
  recent_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists team_form_stats_team_idx on public.team_form_stats (team_id, computed_at desc);
create index if not exists team_form_stats_league_season_idx on public.team_form_stats (league_external_id, season);
