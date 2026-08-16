## 1. Project & Supabase Setup

- [x] 1.1 Create the Supabase project and record its URL and keys (project `lapredi`, ref `itftkqfdgcjfkwudoiau`, region us-east-1)
- [x] 1.2 Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` to `.env` alongside the existing API keys
- [x] 1.3 Install `@supabase/supabase-js` and the Gemini SDK in the Next.js app
- [x] 1.4 Enable the `pg_cron` and `pg_net` extensions on the Supabase project

## 2. Database Schema (db-schema)

- [x] 2.1 Write migration for `teams` (unique external API ID)
- [x] 2.2 Write migration for `fixtures` (unique external API ID, home/away team refs, kickoff time, status)
- [x] 2.3 Write migration for `team_form_stats` (per team, per period)
- [x] 2.4 Write migration for `predictions` (statistical, LLM, and final probability columns; actual result columns, nullable until fulltime)
- [x] 2.5 Apply migrations to the Supabase project and verify tables exist

## 3. Data Ingestion (data-ingestion)

- [x] 3.1 Define the tracked competitions config: Serie A, Ligue 1, Premier League, La Liga, Bundesliga, UEFA Champions League, UEFA Europa League
- [x] 3.2 Build Highlightly client (primary): leagues, fixtures/matches, teams, lineups — base `https://soccer.highlightly.net`, auth via `x-rapidapi-key` header
- [x] 3.3 Build API-Football client, scoped to historical (2022-2024 season) reference data only
- [x] 3.4 Build TheStatsAPI client, implemented but gated behind an enabled/disabled config flag (disabled until its subscription is reactivated)
- [x] 3.5 Implement per-field source-routing config (Highlightly primary; API-Football historical-only; TheStatsAPI disabled)
- [x] 3.6 Implement the fixture-detail cache check: serve cached data if refreshed within the last 5 minutes, otherwise trigger a refresh via the shared ingestion module before rendering
- [x] 3.7 Implement upsert logic for teams/fixtures keyed by external API ID (no duplicates on re-ingestion)
- [x] 3.8 Implement graceful per-provider failure handling (log and continue; keep stale cache usable)
- [x] 3.9 (gap found during implementation, not in the original breakdown) Compute and store `team_form_stats` (attack/defense strength vs. league average) from API-Football historical data, resolving Highlightly<->API-Football team identity by name search — needed because the current 2026 season has no finished matches yet to derive real recent form from

## 4. Scheduled Refresh (scheduled-refresh)

- [ ] 4.1 Implement Edge Function: daily upcoming-fixtures refresh for tracked leagues
- [ ] 4.2 Implement Edge Function: near-kickoff lineup refresh
- [ ] 4.3 Implement stop-condition for lineup refresh (confirmed lineup or match started)
- [ ] 4.4 Register `pg_cron` schedule calling the daily fixture-refresh Edge Function
- [ ] 4.5 Register `pg_cron` schedule calling the near-kickoff lineup-refresh Edge Function

## 5. Poisson Prediction Engine (poisson-prediction-engine)

- [x] 5.1 Implement framework-agnostic TS module computing expected goals (attack/defense strength, home advantage, recent form, key absences)
- [x] 5.2 Implement dynamic league-average-goals calculation from stored season data
- [x] 5.3 Implement Dixon-Coles correction on low-scoring outcome probabilities
- [x] 5.4 Implement conversion from scoreline probability grid to normalized home/draw/away distribution
- [x] 5.5 Add a test confirming the output distribution sums to 1 within tolerance

## 6. LLM Qualitative Analysis (llm-qualitative-analysis)

- [x] 6.1 Define the JSON schema for the LLM's probability output
- [x] 6.2 Implement a prompt builder that includes only verified stored facts (injuries, narrow-margin streaks, rotation, temperature deltas) — no free-form model knowledge
- [x] 6.3 Implement the Gemini call using structured output (`response_format` on `interactions.create`, model `gemini-3.6-flash` — `generateContent`/`responseSchema` and `gemini-2.5-*` are deprecated for new API keys)
- [x] 6.4 Implement server-side validation of the LLM output (schema conformance + probabilities non-negative and summing to ~1)
- [x] 6.5 Implement the fallback path when output is missing or invalid (record no LLM probability for that fixture)

## 7. Prediction Ensemble (prediction-ensemble)

- [x] 7.1 Implement a configurable ensemble weight (default 0.7 statistical / 0.3 LLM)
- [x] 7.2 Implement the weighted-average combination of statistical and LLM distributions
- [x] 7.3 Implement fallback to statistical-only when no valid LLM probability exists
- [x] 7.4 Persist statistical, LLM, and final probabilities to the `predictions` table
- [ ] 7.5 Wire prediction generation into the scheduled pipeline (runs after fixture/form/lineup refresh) — blocked on group 4 (Edge Functions)
- [x] 7.6 Implement result reconciliation: update stored predictions with the actual result once a fixture finishes

## 8. Prediction Dashboard (prediction-dashboard)

- [x] 8.1 Implement a Supabase read client for Next.js server components/route handlers
- [x] 8.2 Build a fixture view that fetches its stored prediction
- [x] 8.3 Build the probability bar component (home/draw/away)
- [x] 8.4 Build the factor breakdown component (statistical factors + LLM qualitative factors)
- [x] 8.5 Build the empty state for fixtures without a stored prediction yet

## 9. Verification

- [x] 9.1 Run the ingestion + prediction pipeline end-to-end for one real upcoming fixture (Manchester City vs Chelsea, 2026-12-12 — real Highlightly fixture, real 2024-season historical form, real Gemini analysis, persisted to Supabase)
- [x] 9.2 Confirm the dashboard renders that fixture's prediction and factor breakdown correctly
- [x] 9.3 Run `npm run dev` and confirm no console/runtime errors on the dashboard
