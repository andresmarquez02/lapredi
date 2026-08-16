create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  external_id bigint not null unique,
  name text not null,
  country text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teams_external_id_idx on public.teams (external_id);
