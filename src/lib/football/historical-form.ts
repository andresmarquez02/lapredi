// Bridges Highlightly (primary, current teams/fixtures) with API-Football
// (secondary, historical-only). The two providers use unrelated internal
// team IDs, so team identity across them is resolved by name search - a
// deliberately narrow, name-matched lookup for feeding the statistical
// model's baseline, not a general cross-provider entity-resolution system.

import { apiFootballRequest } from "./api-football-client";
import type { RecentResult } from "../llm/context";

/** API-Football's /teams search rejects non-alphanumeric characters (confirmed live: "Deportivo La Coruña" is rejected outright) - strip diacritics before searching. */
function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export async function findApiFootballTeamId(teamName: string): Promise<number | null> {
  const searchTerm = stripDiacritics(teamName);
  const results = await apiFootballRequest<Array<{ team: { id: number; name: string } }>>("/teams", { search: searchTerm });
  const exact = results.find((r) => stripDiacritics(r.team.name).toLowerCase() === searchTerm.toLowerCase());
  return (exact ?? results[0])?.team.id ?? null;
}

export interface HistoricalGoalStats {
  matchesConsidered: number;
  goalsScoredAvg: number;
  goalsConcededAvg: number;
  /** Most recent 5 finished matches, newest first - feeds the LLM's qualitative read (narrow-margin streaks, etc). */
  recentResults: RecentResult[];
}

interface ApiFootballFixtureRow {
  fixture: { date: string; status: { short: string } };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
}

/**
 * Average goals scored/conceded plus the last 5 finished matches, for a team
 * across a historical (2022-2024) season - the only seasons this project's
 * API-Football free-plan key can access. One API call, reused for both the
 * statistical baseline and the LLM's recent-form context.
 */
export async function computeHistoricalGoalStats(
  apiFootballTeamId: number,
  apiFootballLeagueId: number,
  season: 2022 | 2023 | 2024
): Promise<HistoricalGoalStats> {
  const fixtures = await apiFootballRequest<ApiFootballFixtureRow[]>("/fixtures", {
    team: apiFootballTeamId,
    league: apiFootballLeagueId,
    season,
  });

  const finished = fixtures
    .filter((f) => f.fixture.status.short === "FT")
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime());

  let scored = 0;
  let conceded = 0;
  for (const f of finished) {
    const isHome = f.teams.home.id === apiFootballTeamId;
    scored += (isHome ? f.goals.home : f.goals.away) ?? 0;
    conceded += (isHome ? f.goals.away : f.goals.home) ?? 0;
  }

  const recentResults: RecentResult[] = finished.slice(0, 5).map((f) => {
    const isHome = f.teams.home.id === apiFootballTeamId;
    const goalsFor = (isHome ? f.goals.home : f.goals.away) ?? 0;
    const goalsAgainst = (isHome ? f.goals.away : f.goals.home) ?? 0;
    return {
      opponent: isHome ? f.teams.away.name : f.teams.home.name,
      goalsFor,
      goalsAgainst,
      result: goalsFor > goalsAgainst ? "win" : goalsFor < goalsAgainst ? "loss" : "draw",
      date: f.fixture.date.slice(0, 10),
    };
  });

  const matchesConsidered = finished.length || 1; // avoid div-by-zero; caller should check finished.length separately if it matters
  return {
    matchesConsidered: finished.length,
    goalsScoredAvg: scored / matchesConsidered,
    goalsConcededAvg: conceded / matchesConsidered,
    recentResults,
  };
}
