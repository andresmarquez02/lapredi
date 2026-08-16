## Context

Fresh Next.js 16 (App Router, TypeScript, Tailwind) project with no backend logic yet. Chosen stack: Supabase (Postgres) for storage, `pg_cron` + Supabase Edge Functions for scheduling (Vercel Cron's free tier is too coarse-grained for near-kickoff lineup refresh), Gemini (free tier, structured output) for the qualitative LLM layer. Three football data providers are keyed in `.env`; live testing against this project's actual keys (2026-08-16) found API-Football's free plan locked to the 2022-2024 seasons (no current-season access at all) and the TheStatsAPI key revoked (no active subscription) — see the source-routing decision below for how this reshuffled which provider is primary. See proposal.md for motivation; see specs/ for behavior requirements.

## Goals / Non-Goals

**Goals:**
- Land one coherent architecture spanning schema → ingestion → scheduling → statistical model → LLM layer → ensemble → dashboard, so every capability in specs/ has an obvious implementation home.
- Keep the scheduled pipeline runnable independently of whether the Next.js app happens to be up (cron correctness shouldn't depend on Vercel deploy state).

**Non-Goals:**
- Tuning the exact ensemble weight or freshness windows to real-world accuracy — that requires backtesting data this change only makes possible, not something to solve now.
- Supporting arbitrary/unbounded league coverage — free-tier API quotas make that infeasible; league scope is a config concern, not an architectural one.

## Decisions

**Scheduled work runs in Supabase Edge Functions, not Next.js API routes.**
`pg_cron` schedules Postgres jobs that call Edge Functions via `pg_net`. This keeps ingestion/lineup-refresh/prediction-generation co-located with the database they write to, and independent of the Next.js app's deployment/uptime. Next.js server code (API routes / server actions) is reserved for on-demand, user-triggered reads (serving the dashboard), with one narrow exception: the fixture-detail cache-refresh trigger below, which is on-demand by nature. Alternative considered: trigger everything from Vercel Cron hitting Next.js API routes — rejected because the free tier's daily-only granularity can't satisfy the near-kickoff lineup refresh requirement.

**Fixture-detail data refreshes on-demand with a 5-minute cache TTL, not a generic background freshness sweep.**
Opening a fixture's detail view (stats, injuries, lineup, weather) is the trigger: if that fixture's cached data is under 5 minutes old, it's served straight from Supabase; if it's 5 minutes old or missing, the Next.js route handler calls the same shared ingestion module used by the scheduled Edge Functions to refresh it before rendering. This is the main lever for not burning the free-tier API quotas on repeated detail views, and runs independently of (not instead of) the daily fixture-list and near-kickoff lineup `pg_cron` jobs, which refresh data regardless of whether anyone is viewing it. Alternative considered: a single global TTL applied uniformly in the background — rejected as unnecessary complexity when the actual quota pressure comes specifically from users re-opening the same fixture's detail view.

**Tracked competitions are a fixed, named config list, not an open set.**
Serie A, Ligue 1, Premier League, La Liga, Bundesliga, UEFA Champions League, UEFA Europa League. Fixed at 7 competitions to keep free-tier quota usage predictable; adding a competition later is a config change, not an architecture change.

**The Poisson/Dixon-Coles engine is a framework-agnostic TypeScript module.**
Written with no Node- or Deno-specific APIs so the identical module is imported by both Edge Functions (Deno) and Next.js server code (Node), avoiding a duplicated/drifting implementation of the same math.

**Predictions are computed proactively by the scheduled pipeline, not lazily on page view.**
After fixture/form/lineup data refreshes, a prediction-generation step (statistical → LLM → ensemble) runs and persists the result. The dashboard only ever reads stored predictions. Alternative considered: compute on-demand when a user opens a fixture — rejected because it would make page load latency depend on 2+ external API calls and an LLM call, and it doesn't naturally support the "predict before kickoff, reconcile after fulltime" backtesting flow required by db-schema and prediction-ensemble specs.

**Per-field source routing instead of a generic multi-source merge engine — with Highlightly as primary, not API-Football.**
Which provider serves which field is a static config map, not a generic reconciliation/merge layer across all three APIs. The original plan (API-Football primary; TheStatsAPI/Highlightly supplemental for weather and live lineups) assumed all three keys had current-season access. Live verification against this project's actual keys found otherwise: API-Football's free plan only serves 2022-2024 seasons (confirmed via repeated `date`/`season`/`next` query attempts, all rejected with "Free plans do not have access to this season"), and TheStatsAPI returns `KEY_REVOKED - no active subscription plan`. Only Highlightly returned real 2026-season fixture data. Routing is now: `fixtures / teams / lineups → highlightly` (primary, current season), `historical reference stats → api-football` (secondary, 2022-2024 only, useful for the Poisson model's baselines but not live fixtures), `(all fields) → thestatsapi` disabled until its subscription is reactivated. Three sources with very different schemas still don't justify a generalized merge engine; a lookup table is enough and keeps data-ingestion simple.

**LLM structured output is enforced twice: schema at the API call, validation on receipt.**
The Gemini call constrains the model's output shape at generation time via `response_format` on `interactions.create()` (model `gemini-3.6-flash`); the response is still validated server-side (with `zod`) against the same shape and checked that probabilities are non-negative and sum to ~1 before being trusted. Belt-and-suspenders because schema-conformant output can still be numerically invalid (e.g. sums to 0.8). Note: the older `generateContent` + `responseSchema`/`responseMimeType` config (and `gemini-2.5-*` model names) is deprecated for new API keys, which now get routed to the newer Interactions API — confirmed directly against this project's key before writing the integration.

**Ensemble weight is a stored config value, not a hardcoded constant.**
Defaults to 0.7 statistical / 0.3 LLM. Stored so it can be adjusted later from backtesting (comparing stored predictions vs actual results) without a code change.

## Risks / Trade-offs

- [Risk] Free-tier API quotas (~100 req/day on API-Football) cap how many leagues/fixtures can be tracked → Mitigation: aggressive caching (data-ingestion spec), a config-bounded list of tracked leagues, prioritizing the near-term fixture window.
- [Risk] Gemini free-tier rate limits could throttle prediction generation if many fixtures need analysis in the same window → Mitigation: stagger/batch LLM calls across the scheduled run instead of firing them concurrently; ensemble already falls back to statistical-only on LLM failure.
- [Risk] Schema-valid LLM output can still be numerically inconsistent → Mitigation: explicit sum/range validation before use, discard and fall back if invalid (per llm-qualitative-analysis spec).
- [Risk] Statistical model needs enough historical matches per team for attack/defense strength to mean anything; early-season or newly-promoted teams will have thin data → Mitigation: out of scope to solve fully now; the model still runs with whatever data exists, flagged as a known accuracy limitation rather than blocked.
- [Risk] `pg_cron`/`pg_net` must be enabled as Postgres extensions on the Supabase project, which is easy to forget → Mitigation: called out explicitly in the migration plan below.
- [Risk] With TheStatsAPI disabled, its `injuries-suspensions` endpoint (the cleanest source for the "key absences" qualitative factor) is unavailable until the subscription is reactivated; Highlightly's injury coverage has not yet been verified as equivalent → Mitigation: build the ingestion source-routing config so re-enabling TheStatsAPI later is a config change, not a rewrite; the LLM layer already degrades gracefully (empty absences list) rather than failing when this data is missing.
- [Risk] Highlightly's own free-tier rate limits/quota have not been fully characterized (only confirmed it returns current-season data, not its request ceiling) → Mitigation: the fixture-detail 5-minute cache TTL and daily/near-kickoff scheduled refresh already minimize call volume regardless of the exact quota; watch for 429s once real traffic starts.

## Migration Plan

This is the project's first feature slice, so "migration" is initial setup rather than a change to existing behavior:

1. Create the Supabase project; enable the `pg_cron` and `pg_net` extensions.
2. Apply the schema migration for `teams`, `fixtures`, `team_form_stats`, `predictions`.
3. Implement and deploy the Edge Functions for ingestion, scheduled refresh, and prediction generation.
4. Register `pg_cron` schedules pointing at those Edge Functions (daily fixture refresh, near-kickoff lineup refresh).
5. Add `@supabase/supabase-js` and the Gemini SDK to the Next.js app; add `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (or anon key with RLS, for the dashboard's read path) to `.env` alongside the existing API keys.
6. Build the dashboard reading from Supabase.

No rollback complexity: nothing pre-existing depends on this schema/pipeline yet, so abandoning the change means dropping the new schema and functions.

