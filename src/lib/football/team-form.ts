import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLeagueAverageGoals, type FinishedFixtureScore } from "../prediction/league-average-goals";
import { computeHistoricalGoalStats, findApiFootballTeamId } from "./historical-form";
import { apiFootballRequest } from "./api-football-client";
import type { RecentResult } from "../llm/context";

async function fetchFullSeasonFixtureScores(apiFootballLeagueId: number, season: 2022 | 2023 | 2024): Promise<FinishedFixtureScore[]> {
  const fixtures = await apiFootballRequest<
    Array<{
      fixture: { status: { short: string } };
      goals: { home: number | null; away: number | null };
    }>
  >("/fixtures", { league: apiFootballLeagueId, season });
  return fixtures
    .filter((f) => f.fixture.status.short === "FT")
    .map((f) => ({ homeGoals: f.goals.home ?? 0, awayGoals: f.goals.away ?? 0 }));
}

/**
 * League-wide average goals per team per match for a historical season - one
 * API call, meant to be computed once per league and reused across every
 * team in it (the naive per-team version was wasting quota re-fetching the
 * same 380-fixture list for every single team).
 */
export async function computeLeagueAvgPerTeam(apiFootballLeagueId: number, season: 2022 | 2023 | 2024): Promise<number> {
  const leagueFixtures = await fetchFullSeasonFixtureScores(apiFootballLeagueId, season);
  const leagueAvg = computeLeagueAverageGoals(leagueFixtures);
  return (leagueAvg.home + leagueAvg.away) / 2;
}

/** Below this many historical matches, computed strength is noise (often literal 0 for a newly-promoted team with no matches in that league/season) rather than signal - fall back to a neutral baseline instead. */
const MIN_MATCHES_FOR_RELIABLE_STRENGTH = 5;
const NEUTRAL_STRENGTH = 1.0;

export interface TeamFormResult {
  teamId: string; // internal uuid
  attackStrength: number;
  defenseStrength: number;
  goalsScoredAvg: number;
  goalsConcededAvg: number;
  matchesConsidered: number;
  recentResults: RecentResult[];
  /** True when matchesConsidered was too low to trust and strength was set to a neutral baseline instead (e.g. a newly-promoted team absent from the historical season). */
  usedNeutralFallback: boolean;
}

/**
 * Computes a team's attack/defense strength (and recent-form results) from
 * its historical (2022-2024) goal record relative to the league's average,
 * using API-Football as the historical baseline source (per
 * source-routing.ts). Team identity across Highlightly <-> API-Football is
 * resolved by name search. `leagueAvgPerTeam` should come from
 * `computeLeagueAvgPerTeam`, computed once and shared across every team in
 * the league to conserve the free-tier daily quota.
 */
export async function computeAndStoreTeamFormStats(
  supabase: SupabaseClient,
  team: { internalId: string; externalId: number; name: string },
  leagueExternalId: number, // highlightly league id, stored on the row for reference
  apiFootballLeagueId: number,
  season: 2022 | 2023 | 2024,
  leagueAvgPerTeam: number
): Promise<TeamFormResult> {
  const apiFootballTeamId = await findApiFootballTeamId(team.name);
  if (!apiFootballTeamId) throw new Error(`Could not resolve API-Football team id for "${team.name}"`);

  const teamGoals = await computeHistoricalGoalStats(apiFootballTeamId, apiFootballLeagueId, season);

  const usedNeutralFallback = teamGoals.matchesConsidered < MIN_MATCHES_FOR_RELIABLE_STRENGTH;
  const attackStrength = usedNeutralFallback ? NEUTRAL_STRENGTH : teamGoals.goalsScoredAvg / leagueAvgPerTeam;
  const defenseStrength = usedNeutralFallback ? NEUTRAL_STRENGTH : teamGoals.goalsConcededAvg / leagueAvgPerTeam;

  const { error } = await supabase.from("team_form_stats").insert({
    team_id: team.internalId,
    league_external_id: leagueExternalId,
    season,
    matches_considered: teamGoals.matchesConsidered,
    goals_scored_avg: teamGoals.goalsScoredAvg,
    goals_conceded_avg: teamGoals.goalsConcededAvg,
    attack_strength: attackStrength,
    defense_strength: defenseStrength,
    recent_results: teamGoals.recentResults,
  });
  if (error) throw new Error(`Failed to store team_form_stats for ${team.name}: ${error.message}`);

  return {
    teamId: team.internalId,
    attackStrength,
    defenseStrength,
    goalsScoredAvg: teamGoals.goalsScoredAvg,
    goalsConcededAvg: teamGoals.goalsConcededAvg,
    matchesConsidered: teamGoals.matchesConsidered,
    recentResults: teamGoals.recentResults,
    usedNeutralFallback,
  };
}

/** Returns the most recent stored form for a team, if any, to avoid recomputing (and re-spending quota) within the same run/window. */
export async function getExistingTeamForm(supabase: SupabaseClient, internalTeamId: string) {
  const { data } = await supabase
    .from("team_form_stats")
    .select("*")
    .eq("team_id", internalTeamId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
