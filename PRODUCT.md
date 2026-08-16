# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router, TypeScript, Tailwind CSS), Supabase (Postgres) for data, Gemini for LLM analysis. Existing codebase - not greenfield.

## Users

Single user (the project owner) only. A personal analysis tool, not a multi-tenant product — no accounts, no audience beyond the owner.

## Product Purpose

Helps the owner make more informed judgments about upcoming football matches by combining a statistical model (Poisson expected-goals with Dixon-Coles correction, derived from real historical results) with an LLM's qualitative read of verified match context (injuries, form streaks, rotation, weather), shown as a single blended prediction with its reasoning exposed — not a black-box number.

## Positioning

Unlike bookmaker odds or single-number prediction sites, this tool shows *why* — the statistical factors and the LLM's qualitative reasoning side by side with the final blended probability, so the owner can judge the prediction's credibility, not just read it.

## Operating Context

Daily/weekly use: the owner opens the dashboard to scan upcoming fixtures across 7 tracked competitions (Serie A, Ligue 1, Premier League, La Liga, Bundesliga, UEFA Champions League, UEFA Europa League), and drills into a specific fixture to see its full prediction breakdown before it kicks off.

## Capabilities and Constraints

- Data comes from free-tier APIs (Highlightly primary, API-Football historical-only, TheStatsAPI currently disabled) — quota-constrained, so the UI should not assume unlimited/instant data.
- Predictions are precomputed and stored (not generated on page view).
- Single-user: no auth/login flows, no multi-tenant concerns, no billing.
- Fixture detail must be viewable without leaving the overview screen (in-place, not a separate route) — an explicit product requirement, not a visual preference.

## Evidence on Hand

One real fixture with a full generated prediction exists in the database (Manchester City vs Chelsea, 2026-12-12) — real statistical factors and real LLM reasoning text, usable as authentic content for the redesign rather than lorem ipsum.

## Product Principles

1. Show the reasoning, not just the number — statistical and qualitative factors stay visible, never collapsed away.
2. Built for one person's daily scan-and-drill workflow, not for onboarding or persuading a new audience.
3. Respect data scarcity — the UI must look intentional with a handful of fixtures and gracefully communicate "no prediction yet," not assume a dense dataset.
4. Fixture detail lives in-place on the overview — no route change breaks the scanning flow.
