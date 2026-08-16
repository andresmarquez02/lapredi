---
name: football-match-analysis
description: Use when generating or regenerating match predictions for the lapredi project, when a prediction looks thin/generic/unjustified, or when the user asks to analyze a specific fixture in depth. Encodes the full checklist of data sources, quota constraints, and output-quality bar the project settled on after multiple rounds of fixing vague/English/unjustified predictions.
---

# Football match analysis methodology

This project blends a statistical model (Poisson + Dixon-Coles) with an LLM qualitative read into one prediction per fixture. A prediction is only "done" when every applicable data source below was checked and the LLM's reasoning names specific facts — not when the pipeline merely ran without erroring.

## Data sources and their role

| Source | Role | Client | Notes |
|---|---|---|---|
| Highlightly | Primary: fixtures, teams, lineups, venue, weather, referee, its own prematch model | `src/lib/football/highlightly-client.ts` | Weather/referee/lineups are only populated close to kickoff — null for fixtures far in the future is expected, not a bug. |
| API-Football | Secondary: historical (2022-2024 only) goal record for attack/defense strength and last-5 results | `src/lib/football/historical-form.ts`, `team-form.ts` | Free plan: 100 req/day, and rejects non-alphanumeric search (`stripDiacritics` handles this — don't remove it). |
| GNews | Recent headlines per team | `src/lib/football/gnews-client.ts`, `team-news.ts` | 100 req/day, cached 24h per team in `team_news`. Headlines are low-confidence signal — the prompt already instructs the LLM to weigh only match-relevant ones (injury/suspension/dispute), never transfer gossip alone. |
| TheStatsAPI | Dedicated injuries/suspensions endpoint | `src/lib/football/thestats-client.ts` | Disabled (`THESTATS_ENABLED = false`) until its subscription is reactivated — check `THESTATS_ENABLED` before assuming it's live. |

## Before generating a prediction, confirm each of these was attempted

1. **Statistical**: team form computed via `computeAndStoreTeamFormStats` (or reused via `getExistingTeamForm`). If `matchesConsidered < 5`, the neutral-fallback (1.0) kicked in — this MUST be surfaced in `statisticalFactors` (the `*DataQuality` keys), never silently hidden.
2. **Match context**: `fetchMatchDetail` for venue, weather, referee, and Highlightly's own prematch prediction (stored as `market_*` on `predictions` — an external reference point, never blended into our ensemble).
3. **Lineups**: `fetchLineups` — if formation is `"Unknown"`, say so rather than omitting the field.
4. **News**: `getTeamNews` for both teams.
5. **Recent form**: last 5 results per team (already returned by `computeHistoricalGoalStats`).

`generatePredictionsForWindow` (`src/lib/prediction/generate-for-window.ts`) already does all five for whatever date window you give it — prefer calling it over hand-assembling a `QualitativeMatchContext`, so no source gets silently skipped.

## Quota discipline

API-Football (100/day) and GNews (100/day) are the binding constraints, not Highlightly (generous on Basic). Before running for a large batch of fixtures:
- Count unique teams (`home_team_id`/`away_team_id`) in the target window — each new team costs ~2 API-Football calls.
- Reuse existing `team_form_stats`/`team_news` rows instead of recomputing (both cache layers already do this — don't bypass them).
- Scope the window narrow (a day or two) rather than generating for everything at once; widen incrementally.

## Output quality bar

- **Language**: the LLM reasoning is requested and validated in Spanish (`prompt.ts`, `schema.ts`) — this app's default/primary language. Don't revert to English prompting.
- **Specific, not generic**: the prompt explicitly bans generic phrasing and requires naming concrete supplied facts (an actual injury, an actual scoreline, an actual headline). If a regenerated prediction still reads as filler ("ambos equipos tienen posibilidades similares"), the underlying context was probably thin (check whether venue/news/form actually came back non-empty) rather than a prompt problem.
- **Every stat needs a "why"**: `statisticalFactors` must carry enough for `MatchFactorsPanel` to show *why* the percentages are what they are (attack/defense strength numbers, data-quality warnings), not just the final numbers.
- **External comparison, not a merge**: Highlightly's own prematch model is shown to the user as a labeled comparison point (`market_*` fields, "Comparación con modelo externo" in the UI) — it is reference material for a sanity check, never averaged into `final_*`.

## Known gaps (don't re-solve blindly — check status first)

- Injuries have no dedicated source right now (TheStatsAPI disabled) — the LLM only sees absences the user manually supplies or that surface incidentally in news headlines. Reactivating TheStatsAPI is the intended fix, not scraping.
- `findApiFootballTeamId` resolves cross-provider team identity by name search — it can mismatch on ambiguous names. If a team's stats look wrong, check what API-Football id it actually resolved to before assuming the math is broken.
