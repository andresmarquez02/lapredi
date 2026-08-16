import type { SupabaseClient } from "@supabase/supabase-js";
import { TRACKED_COMPETITIONS } from "../football/competitions";
import { computeAndStoreTeamFormStats, computeLeagueAvgPerTeam, getExistingTeamForm } from "../football/team-form";
import { getTeamNews } from "../football/team-news";
import { fetchMatchDetail, fetchLineups } from "../football/highlightly-client";
import { fetchEventsForLeague, findMatchingEvent, fetchMoneylineOdds, decimalOddsToProbabilities } from "../football/odds-client";
import { safeFetch } from "../football/safe-fetch";
import { generatePrediction } from "./generate-prediction";
import type { QualitativeMatchContext } from "../llm/context";

interface FixtureRow {
  id: string;
  external_id: number;
  league_external_id: number;
  kickoff_at: string;
  home_team_id: string;
  away_team_id: string;
  home_team: { name: string } | { name: string }[] | null;
  away_team: { name: string } | { name: string }[] | null;
}

function parseTemperature(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const match = raw.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function parsePercent(raw: string): number {
  return Number(raw.replace("%", "")) / 100;
}

function unwrap<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export interface GenerateForWindowResult {
  fixturesProcessed: number;
  teamsComputed: number;
  teamsReused: number;
  apiFootballCallsSpent: number;
  errors: string[];
}

/**
 * Generates real predictions for fixtures within [fromDate, toDate] (inclusive,
 * "YYYY-MM-DD"), scoped deliberately narrow to respect API-Football's
 * 100-request/day free quota: league averages and each team's form are
 * computed once and reused across every fixture that needs them.
 */
export async function generatePredictionsForWindow(
  supabase: SupabaseClient,
  fromDate: string,
  toDate: string,
  season: 2022 | 2023 | 2024 = 2024
): Promise<GenerateForWindowResult> {
  const result: GenerateForWindowResult = {
    fixturesProcessed: 0,
    teamsComputed: 0,
    teamsReused: 0,
    apiFootballCallsSpent: 0,
    errors: [],
  };

  const { data: fixtures, error } = await supabase
    .from("fixtures")
    .select(
      `id, external_id, league_external_id, kickoff_at, home_team_id, away_team_id,
       home_team:teams!fixtures_home_team_id_fkey(name),
       away_team:teams!fixtures_away_team_id_fkey(name)`
    )
    .gte("kickoff_at", `${fromDate}T00:00:00Z`)
    .lte("kickoff_at", `${toDate}T23:59:59Z`)
    .order("kickoff_at", { ascending: true }); // nearest fixtures first, so quota exhaustion never skips today's/tomorrow's matches in favor of later ones

  if (error) throw new Error(`Failed to load fixtures for window: ${error.message}`);
  if (!fixtures || fixtures.length === 0) return result;

  const leagueAvgCache = new Map<number, number>();
  const teamFormCache = new Map<
    string,
    { attackStrength: number; defenseStrength: number; recentResults: QualitativeMatchContext["homeRecentResults"]; usedNeutralFallback: boolean; matchesConsidered: number }
  >();

  async function getTeamForm(teamInternalId: string, teamName: string, highlightlyLeagueId: number) {
    if (teamFormCache.has(teamInternalId)) return teamFormCache.get(teamInternalId)!;

    const existing = await getExistingTeamForm(supabase, teamInternalId);
    if (existing) {
      result.teamsReused++;
      const form = {
        attackStrength: existing.attack_strength,
        defenseStrength: existing.defense_strength,
        recentResults: (existing.recent_results ?? []) as QualitativeMatchContext["homeRecentResults"],
        usedNeutralFallback: existing.matches_considered < 5,
        matchesConsidered: existing.matches_considered,
      };
      teamFormCache.set(teamInternalId, form);
      return form;
    }

    const competition = TRACKED_COMPETITIONS.find((c) => c.highlightlyLeagueId === highlightlyLeagueId);
    if (!competition) throw new Error(`No tracked competition for Highlightly league ${highlightlyLeagueId}`);

    if (!leagueAvgCache.has(competition.apiFootballLeagueId)) {
      const avg = await computeLeagueAvgPerTeam(competition.apiFootballLeagueId, season);
      leagueAvgCache.set(competition.apiFootballLeagueId, avg);
      result.apiFootballCallsSpent++;
    }
    const leagueAvgPerTeam = leagueAvgCache.get(competition.apiFootballLeagueId)!;

    const computed = await computeAndStoreTeamFormStats(
      supabase,
      { internalId: teamInternalId, externalId: 0, name: teamName },
      highlightlyLeagueId,
      competition.apiFootballLeagueId,
      season,
      leagueAvgPerTeam
    );
    result.apiFootballCallsSpent += 2; // team search + team fixtures
    result.teamsComputed++;

    const form = {
      attackStrength: computed.attackStrength,
      defenseStrength: computed.defenseStrength,
      recentResults: computed.recentResults,
      usedNeutralFallback: computed.usedNeutralFallback,
      matchesConsidered: computed.matchesConsidered,
    };
    teamFormCache.set(teamInternalId, form);
    return form;
  }

  const newsCache = new Map<string, QualitativeMatchContext["homeRecentNews"]>();
  async function getNews(teamInternalId: string, teamName: string) {
    if (newsCache.has(teamInternalId)) return newsCache.get(teamInternalId)!;
    const articles = await getTeamNews(supabase, teamInternalId, teamName);
    const headlines = articles.slice(0, 5).map((a) => ({ title: a.title, publishedAt: a.publishedAt }));
    newsCache.set(teamInternalId, headlines);
    return headlines;
  }

  const oddsEventsCache = new Map<string, Awaited<ReturnType<typeof fetchEventsForLeague>>>();
  async function getBookmakerOdds(highlightlyLeagueId: number, homeName: string, awayName: string, kickoffIso: string) {
    const competition = TRACKED_COMPETITIONS.find((c) => c.highlightlyLeagueId === highlightlyLeagueId);
    if (!competition?.oddsApiSlug) return null;

    if (!oddsEventsCache.has(competition.oddsApiSlug)) {
      const eventsResult = await safeFetch(`odds-api:events:${competition.oddsApiSlug}`, () => fetchEventsForLeague(competition.oddsApiSlug!));
      oddsEventsCache.set(competition.oddsApiSlug, eventsResult.ok ? eventsResult.data : []);
    }
    const events = oddsEventsCache.get(competition.oddsApiSlug)!;
    const match = findMatchingEvent(events, homeName, awayName, kickoffIso);
    if (!match) return null;

    const oddsResult = await safeFetch(`odds-api:odds:${match.id}`, () => fetchMoneylineOdds(match.id));
    if (!oddsResult.ok || !oddsResult.data) return null;

    const probs = decimalOddsToProbabilities(oddsResult.data.odds);
    return { name: oddsResult.data.bookmaker, homeWin: probs.home, draw: probs.draw, awayWin: probs.away };
  }

  for (const row of fixtures as unknown as FixtureRow[]) {
    const homeTeam = unwrap(row.home_team);
    const awayTeam = unwrap(row.away_team);
    if (!homeTeam || !awayTeam) continue;

    try {
      const [homeForm, awayForm, homeNews, awayNews, detailResult, lineupsResult, bookmaker] = await Promise.all([
        getTeamForm(row.home_team_id, homeTeam.name, row.league_external_id),
        getTeamForm(row.away_team_id, awayTeam.name, row.league_external_id),
        getNews(row.home_team_id, homeTeam.name),
        getNews(row.away_team_id, awayTeam.name),
        safeFetch(`highlightly:matchDetail:${row.external_id}`, () => fetchMatchDetail(row.external_id)),
        safeFetch(`highlightly:lineups:${row.external_id}`, () => fetchLineups(row.external_id)),
        getBookmakerOdds(row.league_external_id, homeTeam.name, awayTeam.name, row.kickoff_at),
      ]);

      const detail = detailResult.ok ? detailResult.data : null;
      const lineups = lineupsResult.ok ? lineupsResult.data : null;
      const temperatureCelsius = parseTemperature(detail?.forecast.temperature ?? null);

      const homeLineupNote =
        lineups && lineups.homeTeam.formation !== "Unknown"
          ? `Formación confirmada: ${lineups.homeTeam.formation} (${lineups.homeTeam.initialLineup.length} titulares)`
          : undefined;
      const awayLineupNote =
        lineups && lineups.awayTeam.formation !== "Unknown"
          ? `Formación confirmada: ${lineups.awayTeam.formation} (${lineups.awayTeam.initialLineup.length} titulares)`
          : undefined;

      if (detail) {
        await supabase
          .from("fixtures")
          .update({
            venue: detail.venue.name,
            temperature_celsius: temperatureCelsius ?? null,
            referee: detail.referee.name,
            lineup_home: lineups?.homeTeam ?? null,
            lineup_away: lineups?.awayTeam ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }

      const latestPrematch = detail?.predictions?.prematch?.at(-1);
      const market = latestPrematch
        ? {
            homeWin: parsePercent(latestPrematch.probabilities.home),
            draw: parsePercent(latestPrematch.probabilities.draw),
            awayWin: parsePercent(latestPrematch.probabilities.away),
            source: "highlightly",
          }
        : null;

      const qualitativeContext: QualitativeMatchContext = {
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
        homeKeyAbsences: [],
        awayKeyAbsences: [],
        homeRecentResults: homeForm.recentResults,
        awayRecentResults: awayForm.recentResults,
        homeRecentNews: homeNews,
        awayRecentNews: awayNews,
        venue: detail?.venue.name ?? undefined,
        referee: detail?.referee.name ?? undefined,
        weatherCondition: detail?.forecast.status ?? undefined,
        temperatureCelsius,
        homeLineupRotationNote: homeLineupNote,
        awayLineupRotationNote: awayLineupNote,
        externalModelEstimate: market ? { home: market.homeWin, draw: market.draw, away: market.awayWin, source: market.source } : undefined,
      };

      await generatePrediction(supabase, {
        fixtureId: row.id,
        statisticalInputs: {
          homeAttackStrength: homeForm.attackStrength,
          homeDefenseStrength: homeForm.defenseStrength,
          awayAttackStrength: awayForm.attackStrength,
          awayDefenseStrength: awayForm.defenseStrength,
          leagueAvgGoalsHome: 1.5,
          leagueAvgGoalsAway: 1.1,
        },
        qualitativeContext,
        market,
        bookmaker,
        extraFactors: {
          ...(homeForm.usedNeutralFallback && {
            homeDataQuality: `insufficient historical data (${homeForm.matchesConsidered} matches) - used neutral baseline`,
          }),
          ...(awayForm.usedNeutralFallback && {
            awayDataQuality: `insufficient historical data (${awayForm.matchesConsidered} matches) - used neutral baseline`,
          }),
        },
      });

      result.fixturesProcessed++;
    } catch (err) {
      result.errors.push(`${homeTeam.name} vs ${awayTeam.name}: ${(err as Error).message}`);
    }
  }

  return result;
}
