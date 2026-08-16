// Primary data source for current-season fixtures, teams, and lineups.
// Base URL and shapes confirmed live against this project's real API key on
// 2026-08-16 (see design.md: API-Football's free plan is season-locked to
// 2022-2024 and can't serve current fixtures at all; TheStatsAPI's key has
// no active subscription).

const BASE_URL = "https://soccer.highlightly.net";

export interface HighlightlyTeamRef {
  id: number;
  name: string;
  logo: string | null;
}

export interface HighlightlyMatchSummary {
  id: number;
  round: string;
  date: string; // ISO 8601
  state: {
    clock: string | null;
    score: { current: string | null; penalties: string | null };
    description: string;
  };
  homeTeam: HighlightlyTeamRef;
  awayTeam: HighlightlyTeamRef;
  league: { id: number; name: string; season: number };
}

export interface HighlightlyPrematchPrediction {
  type: "prematch" | "live";
  modelType: string;
  description: string;
  generatedAt: string;
  probabilities: { home: string; draw: string; away: string }; // e.g. "46.43%"
}

export interface HighlightlyMatchDetail extends HighlightlyMatchSummary {
  venue: { name: string | null; city: string | null; country: string | null; capacity: number | null };
  // temperature is a string like "25.19°C", not a bare number - confirmed live 2026-08-16.
  forecast: { status: string | null; temperature: string | null };
  referee: { name: string | null; nationality: string | null };
  // Highlightly's own predictive model, evolving over time; only populated
  // close to kickoff. Not raw bookmaker odds (those need a paid plan) but
  // the closest external "market consensus" signal available on Basic.
  predictions: { prematch: HighlightlyPrematchPrediction[]; live: HighlightlyPrematchPrediction[] } | null;
}

export interface HighlightlyLineupPlayer {
  id: number;
  name: string;
  position?: string;
  number?: number;
}

export interface HighlightlyLineups {
  homeTeam: {
    id: number;
    name: string;
    formation: string;
    initialLineup: HighlightlyLineupPlayer[];
    substitutes: HighlightlyLineupPlayer[];
  };
  awayTeam: {
    id: number;
    name: string;
    formation: string;
    initialLineup: HighlightlyLineupPlayer[];
    substitutes: HighlightlyLineupPlayer[];
  };
}

export class HighlightlyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "HighlightlyApiError";
  }
}

function getApiKey(): string {
  const key = process.env.HIGHLIGHTLY_API_KEY;
  if (!key) throw new Error("HIGHLIGHTLY_API_KEY is not set");
  return key;
}

async function request<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const response = await fetch(url, {
    headers: { "x-rapidapi-key": getApiKey() },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new HighlightlyApiError(`Highlightly ${path} failed (${response.status}): ${body}`, response.status);
  }

  return response.json() as Promise<T>;
}

/**
 * First page (up to 100) of a league/season's matches. NOT chronologically
 * from today - Highlightly returns whatever page it defaults to (observed:
 * mid-season rounds, not the current/upcoming ones), and there is no
 * date-range param. Use `fetchMatchesForDate` for real current/upcoming
 * fixtures; this is only useful for a broad historical scan.
 */
export async function fetchMatchesForLeagueSeason(leagueId: number, season: number): Promise<HighlightlyMatchSummary[]> {
  const result = await request<{ data: HighlightlyMatchSummary[] }>("/matches", { leagueId, season });
  return result.data;
}

/** Matches for a league on one specific calendar date ("YYYY-MM-DD") - the reliable way to get real current/upcoming fixtures. */
export async function fetchMatchesForDate(leagueId: number, date: string, season = 2026): Promise<HighlightlyMatchSummary[]> {
  const result = await request<{ data: HighlightlyMatchSummary[] }>("/matches", { leagueId, date, season });
  return result.data;
}

export async function fetchMatchDetail(matchId: number): Promise<HighlightlyMatchDetail> {
  const result = await request<HighlightlyMatchDetail[]>(`/matches/${matchId}`);
  const detail = result[0];
  if (!detail) throw new Error(`Highlightly returned no match detail for ${matchId}`);
  return detail;
}

export async function fetchLineups(matchId: number): Promise<HighlightlyLineups> {
  return request<HighlightlyLineups>(`/lineups/${matchId}`);
}
