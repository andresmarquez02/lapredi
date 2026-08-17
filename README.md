# lapredi

Football match predictions dashboard for a single user: a Poisson/Dixon-Coles statistical model blended with a Gemini LLM's qualitative read of verified match context (injuries, form, rotation, weather), shown as one final probability with the reasoning behind it exposed — not a black-box number. See [PRODUCT.md](PRODUCT.md) for the full product rationale and [DESIGN.md](DESIGN.md) for the UI/design system.

This is a personal, single-user tool — there is no login/auth, no multi-tenant support, and no billing. It's built around several free-tier external APIs, so it assumes quota-constrained, not-instant data.

## Tech stack

- **Framework**: Next.js 16 (App Router, Turbopack, TypeScript)
- **UI**: React 19, Tailwind CSS v4, [Tabler Icons](https://tabler.io/icons), [Chart.js](https://www.chartjs.org/) + `react-chartjs-2` (+ `chartjs-chart-matrix` for the scoreline heatmap), [GSAP](https://gsap.com/) for animation (some components sourced from the [react-bits](https://github.com/DavidHDev/react-bits) registry via the `shadcn` CLI — see `components.json`)
- **Database**: [Supabase](https://supabase.com/) (hosted Postgres + REST API). Schema lives in `supabase/migrations/*.sql`.
- **LLM**: Google Gemini (`@google/genai`, Interactions API)
- **Push notifications**: Web Push (`web-push`) with a service worker at `public/sw.js`
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/)

## Prerequisites

- **Node.js 20+** (this project was built against Node 22; Next.js 16 requires a recent Node LTS)
- **npm** (a `package-lock.json` is committed; use npm, not yarn/pnpm, to avoid a divergent lockfile)
- A **Supabase** account (free tier is enough) — [supabase.com](https://supabase.com/)
- Accounts/API keys for the external data providers listed below. All have a free tier; **Highlightly and Gemini are required** for the app to do anything useful. The rest are optional and the app degrades gracefully (empty sections, not crashes) if they're missing.

## 1. Clone and install

```bash
git clone <this-repo-url>
cd lapredi
npm install
```

## 2. Create a Supabase project and run the migrations

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. From the project's **Settings → API** page, note down:
   - **Project URL** → `SUPABASE_URL`
   - **`service_role` secret key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ this bypasses Row Level Security — never expose it to the browser; it's only ever read server-side, see `src/lib/supabase/admin-client.ts`)
3. Apply the schema. Two ways to do this:
   - **Supabase CLI** (recommended): install it (`npm install -g supabase`, or see the [CLI docs](https://supabase.com/docs/guides/local-development/cli/getting-started)), then from the project root:
     ```bash
     supabase login
     supabase link --project-ref <your-project-ref>   # the ref is in your project's URL/settings
     supabase db push                                  # applies every migration in supabase/migrations/
     ```
   - **Manual**: open the Supabase dashboard's SQL editor and run each file in `supabase/migrations/` **in filename order** (they're timestamp-prefixed, so sorted order is correct order — each migration only adds tables/columns/extensions, nothing destructive).
4. The migrations enable `pg_cron`/`pg_net` (see `20260816000005_enable_cron_extensions.sql`) for potential DB-side scheduling, but nothing in this repo currently wires a cron job through them — see [Keeping data fresh](#keeping-data-fresh) below.

## 3. Get the external API keys

| Env var | Provider | Required? | Notes |
|---|---|---|---|
| `HIGHLIGHTLY_API_KEY` | [Highlightly](https://highlightly.net/) (soccer API, via RapidAPI-style key) | **Required** | Primary source for current-season fixtures, teams, lineups, live scores, weather, and Highlightly's own prematch model (shown as an external comparison, never blended in). Nothing populates without this. |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/) | **Required** for the AI Analysis panel | Free tier is rate-limited (the app already handles quota-exceeded errors gracefully — see `src/lib/llm/qualitative-analysis.ts` — and never shows the raw provider error to the UI). Without it, predictions still work from the statistical model alone. |
| `APIFOOTBALL_API_KEY` | [API-Football](https://www.api-football.com/) | Optional, needed for real predictions | Historical baseline (2022-2024 seasons only on the free plan) used to compute each team's attack/defense strength — see `src/lib/football/historical-form.ts`. Free-plan quota is 100 requests/day; team-form results are cached in `team_form_stats` to conserve it. |
| `GNEWS_API_KEY` | [GNews](https://gnews.io/) | Optional | Recent news headlines per team, shown in the News panel and fed to the LLM as low-confidence context. Free tier: 100 requests/day, cached 24h per team. |
| `ODDS_API_KEY` | [The Odds API](https://the-odds-api.com/) | Optional | Real bookmaker odds shown as a comparison point (never blended into the model). |
| `THESTATS_API_KEY` | [TheStatsAPI](https://thestatsapi.com/) | Currently unused | Wired up for injuries/suspensions but **disabled in code** (`THESTATS_ENABLED = false` in `src/lib/football/thestats-client.ts`) — this project's key had no active subscription at time of writing. Flip that constant once a subscription is active; no other code changes needed. |
| `SUPABASE_URL` | Supabase | **Required** | From step 2. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | **Required** | From step 2. Server-only, never sent to the client. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Self-generated | Optional, needed for push notifications | Generate your own pair — do **not** reuse anyone else's: `npx web-push generate-vapid-keys`. Set the public key in **both** `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value — one is read server-side, the other is exposed to the browser to register a push subscription) and the private key in `VAPID_PRIVATE_KEY` only. |

## 4. Create `.env`

Create a `.env` file at the project root (already gitignored) with all of the above:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

HIGHLIGHTLY_API_KEY=your-key
GEMINI_API_KEY=your-key
APIFOOTBALL_API_KEY=your-key
GNEWS_API_KEY=your-key
ODDS_API_KEY=your-key
THESTATS_API_KEY=your-key

VAPID_PUBLIC_KEY=your-generated-public-key
VAPID_PRIVATE_KEY=your-generated-private-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-generated-public-key
```

If you're only using the Supabase CLI locally (not deploying), it also reads a `SUPABASE_DB_PASSWORD` for `supabase db push`/`db pull` — set it if prompted; it's the Postgres password from your project's connection settings, not an app-level secret.

## 5. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard queries whatever fixtures already exist in your (empty, at this point) database — see the next section to actually get data in.

## Getting data in: ingestion and predictions

There's no seed data and no scheduled job wired up yet — this is a genuine gap, documented here rather than glossed over:

- **Fixture ingestion** (teams, fixtures, live scores for the 7 tracked competitions in `src/lib/football/competitions.ts`) is triggered by the **"Actualizar datos" / refresh button** in the dashboard header, which calls `POST /api/refresh-all` → `ingestUpcomingFixtures` (`src/lib/football/ingest-upcoming.ts`). You can also call that route directly (e.g. `curl -X POST http://localhost:3000/api/refresh-all`).
- **Predictions** (the statistical model + LLM blend) are generated by `generatePredictionsForWindow` in `src/lib/prediction/generate-for-window.ts` — **this function is not currently called from any API route or script**. To generate predictions for a date range, you'd need to invoke it yourself (e.g. a temporary script, or a new route) with a Supabase client, a `fromDate`/`toDate` (`"YYYY-MM-DD"`), and a historical season (`2022 | 2023 | 2024`, since that's what the free API-Football plan can access). Mind the 100-request/day API-Football quota — the function caches per-team and per-league results to reuse across fixtures.
- **Live score sync** happens two ways: automatically via client-side polling while a live-candidate fixture is on screen (`src/app/api/live-sync/route.ts`, polled every 60s from `Dashboard.tsx`), and as part of the manual refresh above.
- A **scheduled cron endpoint** exists for "upcoming fixture" push notifications (`src/app/api/cron/notify-upcoming/route.ts`), but nothing inside this repo calls it automatically — `pg_cron`/`pg_net` can only reach a publicly routable URL, so unattended firing needs the app deployed (e.g. as a [Vercel Cron Job](https://vercel.com/docs/cron-jobs)) first.

## Available scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server (Turbopack) at `localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Serve the production build (run `build` first) |
| `npm run lint` | ESLint over the project |
| `npm run test` | Run the Vitest suite (`*.test.ts` files, currently the Poisson model and ensemble logic under `src/lib/prediction/`) |

## Project structure

```
src/
  app/                    Next.js App Router: pages, API routes, layout, PWA manifest
    api/                  refresh-all, live-sync, follows, push/*, teams/search, cron/notify-upcoming
    share/[id]/            Read-only standalone page for a shared prediction link
  components/
    dashboard/             All dashboard UI (fixture list, calendar, match detail, charts, etc.)
    AnimatedContent.tsx    react-bits GSAP scroll-reveal wrapper
    CountUp.tsx             Hand-rolled GSAP number tween (react-bits' own CountUp needs Framer Motion, avoided to keep one animation library)
  lib/
    football/               External football-data clients (Highlightly primary, API-Football historical-only, TheStatsAPI disabled), ingestion, source routing
    llm/                    Gemini prompt building, schema validation, the qualitative-analysis call
    prediction/             Poisson/Dixon-Coles model, ensemble blending, market derivation, persistence
    supabase/               Admin client (service role) and the dashboard's read queries
    i18n/                   ES/EN translation dictionary + language context (ES is default)
    notifications/          Push notification sending + the upcoming-fixture check
    hooks/                  Client hooks (e.g. favorites via localStorage)
    charts/                 Shared Chart.js registration + color tokens
supabase/
  migrations/                Timestamped SQL migrations - see step 2 above
public/
  sw.js                      Service worker (push notifications)
  icons/                     PWA icons/favicons
```

## Design system

`DESIGN.md` documents the color tokens, component patterns, and the responsive split-view layout in detail, and is kept up to date as the UI evolves — read it before making visual changes rather than re-deriving conventions from scratch. It's maintained with the `impeccable` Claude Code skill (see `.claude/skills/impeccable/`); running its mechanical detector (`node .claude/skills/impeccable/scripts/detect.mjs --scope layout <files>`) after UI changes is optional but recommended.

## Deployment

Deployed on [Vercel](https://vercel.com/). To deploy your own copy:

1. Push this repo to GitHub (or your Git provider of choice).
2. In Vercel: **Add New Project → Import** the repo. Framework preset auto-detects as Next.js.
3. Before deploying, add every variable from step 3/4 above as a Vercel **Environment Variable** (Project Settings → Environment Variables) — they're read server-side at request time, not baked in at build time, except `NEXT_PUBLIC_VAPID_PUBLIC_KEY` which does need to be present at build time since it's inlined into client code.
4. Deploy. Every subsequent push to the connected branch redeploys automatically.

`.mcp.json` (if you use Claude Code / MCP tooling with this repo) is gitignored — it can hold local secrets (e.g. a GitHub personal access token) and should never be committed.

## Known limitations

- Single-user, no auth — anyone with the deployed URL sees everything and can trigger a refresh.
- Free-tier quotas throughout: API-Football (100 req/day), GNews (100 req/day), Gemini free tier (rate-limited, handled gracefully in the UI).
- TheStatsAPI integration is implemented but disabled (no active subscription on this project's key).
- No automated prediction-generation job — see [Getting data in](#getting-data-in-ingestion-and-predictions) above.
