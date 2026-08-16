create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null unique references public.fixtures (id),

  statistical_home_prob numeric not null,
  statistical_draw_prob numeric not null,
  statistical_away_prob numeric not null,

  llm_home_prob numeric,
  llm_draw_prob numeric,
  llm_away_prob numeric,
  llm_factors jsonb,

  ensemble_weight_statistical numeric not null default 0.7,
  final_home_prob numeric not null,
  final_draw_prob numeric not null,
  final_away_prob numeric not null,
  statistical_factors jsonb,

  actual_home_goals int,
  actual_away_goals int,
  actual_result text check (actual_result in ('home', 'draw', 'away')),

  predicted_at timestamptz not null default now(),
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint statistical_probs_sum_to_one
    check (abs(statistical_home_prob + statistical_draw_prob + statistical_away_prob - 1) < 0.01),
  constraint final_probs_sum_to_one
    check (abs(final_home_prob + final_draw_prob + final_away_prob - 1) < 0.01)
);

create index if not exists predictions_fixture_idx on public.predictions (fixture_id);
