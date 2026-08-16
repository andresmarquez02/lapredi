## Why

"lapredi" needs its foundational data and prediction pipeline built out: right now the project is an empty Next.js scaffold with API keys in `.env` and no database, no data ingestion, no prediction logic, and no UI. This change builds the full path from raw football data to a displayed match prediction, so there is a working end-to-end slice to iterate on.

## What Changes

- Add a Supabase (Postgres) schema for teams, fixtures, team form stats, and predictions, used as the caching/historical layer for all external API calls.
- Add a data ingestion layer that pulls from Highlightly (primary source for current-season fixtures, teams, and lineups — confirmed live to cover the 2026 season, unlike the other two keys), API-Football (secondary, restricted to 2022-2024 seasons on the free plan, used only for historical reference data), and TheStatsAPI (currently disabled — its key has no active subscription; re-enable once reactivated), normalizes results, and writes them into Supabase instead of hitting the APIs on every request.
- Add scheduled jobs (Supabase `pg_cron` + Edge Functions) to refresh upcoming fixtures daily and refresh lineups at short intervals near kickoff.
- Add a statistical prediction engine using a Poisson goal model (attack/defense strength, home advantage, recent form, key absences) with a Dixon-Coles correction, and a dynamically computed league average goals figure (replacing any fixed constant).
- Add an LLM qualitative analysis layer (Gemini, structured/JSON output) that reasons over verified structured facts (injuries, narrow-margin win streaks, lineup rotation, temperature deltas) already stored in Supabase, and returns its own win/draw/loss probability distribution.
- Add an ensemble step that combines the statistical model's probabilities with the LLM's probabilities via a configurable weighted average (starting around 70/30 favoring the statistical model), and persists the final prediction plus both component probabilities for later backtesting.
- Add a prediction dashboard UI (Next.js) showing the probability bar for an upcoming fixture and a breakdown of the statistical and qualitative factors behind it.

## Capabilities

### New Capabilities
- `db-schema`: Supabase Postgres schema for teams, fixtures, team form stats, and predictions, including the historical record needed for backtesting.
- `data-ingestion`: fetching, normalizing, and caching data from API-Football, TheStatsAPI, and Highlightly into Supabase.
- `scheduled-refresh`: pg_cron + Edge Function jobs that keep fixtures and lineups up to date on a daily / near-kickoff cadence.
- `poisson-prediction-engine`: statistical goal-expectancy model with Dixon-Coles correction and dynamic league average goals.
- `llm-qualitative-analysis`: Gemini-based structured-output reasoning over verified qualitative signals, producing its own probability distribution.
- `prediction-ensemble`: weighted combination of statistical and LLM probabilities into a single stored prediction.
- `prediction-dashboard`: Next.js UI displaying a fixture's prediction and the factors behind it.

### Modified Capabilities
(none — this is the first change in the project)

## Impact

- New Supabase project/schema (tables, `pg_cron` jobs, Edge Functions).
- New Next.js API routes / server actions for ingestion, prediction computation, and serving predictions to the UI.
- New dependencies: `@supabase/supabase-js`, Gemini SDK (`@google/genai`), env vars for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or anon key as appropriate) alongside the existing `GEMINI_API_KEY`, `APIFOOTBALL_API_KEY`, `THESTATS_API_KEY`, `HIGHLIGHTLY_API_KEY` already in `.env`.
- No existing code is modified since this is the project's first real feature slice.
