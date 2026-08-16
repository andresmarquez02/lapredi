// Real bookmaker odds. Free tier: locked to 2 chosen bookmakers for the
// whole account (Bet365 + DraftKings, already selected - re-selecting a
// different pair requires clearing via PUT /bookmakers/selected/clear first,
// see docs.odds-api.io). Confirmed live 2026-08-16: not every fixture has
// odds posted yet, especially lower-profile leagues/early in the week.

const BASE_URL = "https://api.odds-api.io/v3";
const FREE_TIER_BOOKMAKERS = ["Bet365", "DraftKings"];

export interface OddsApiEvent {
  id: number;
  home: string;
  away: string;
  date: string;
  status: string;
  league: { name: string; slug: string };
}

export interface MoneylineOdds {
  home: number;
  draw: number;
  away: number;
}

export class OddsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "OddsApiError";
  }
}

function getApiKey(): string {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("ODDS_API_KEY is not set");
  return key;
}

async function request<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  url.searchParams.set("apiKey", getApiKey());

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new OddsApiError(`odds-api.io ${path} failed (${response.status}): ${body}`, response.status);
  }
  return response.json() as Promise<T>;
}

/** Events for a league, defaulting to roughly the next 14 days per the provider. */
export async function fetchEventsForLeague(leagueSlug: string): Promise<OddsApiEvent[]> {
  const result = await request<{ events?: OddsApiEvent[] } | OddsApiEvent[]>("/events", { sport: "football", league: leagueSlug });
  return Array.isArray(result) ? result : (result.events ?? []);
}

/** Best-effort match of our fixture to an odds-api.io event by team names + same calendar day (different providers, no shared ID). */
export function findMatchingEvent(events: OddsApiEvent[], homeTeamName: string, awayTeamName: string, kickoffIso: string): OddsApiEvent | null {
  const targetDate = kickoffIso.slice(0, 10);
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const home = normalize(homeTeamName);
  const away = normalize(awayTeamName);

  return (
    events.find((e) => {
      if (e.date.slice(0, 10) !== targetDate) return false;
      const eHome = normalize(e.home);
      const eAway = normalize(e.away);
      return (eHome.includes(home) || home.includes(eHome)) && (eAway.includes(away) || away.includes(eAway));
    }) ?? null
  );
}

/** Moneyline (1X2) odds for an event from whichever allowed bookmaker has them posted, or null if none do yet. */
export async function fetchMoneylineOdds(eventId: number): Promise<{ bookmaker: string; odds: MoneylineOdds } | null> {
  const result = await request<{ bookmakers: Record<string, Array<{ name: string; odds: Array<Record<string, string>> }>> }>("/odds", {
    eventId,
    bookmakers: FREE_TIER_BOOKMAKERS.join(","),
  });

  for (const bookmaker of FREE_TIER_BOOKMAKERS) {
    const markets = result.bookmakers[bookmaker];
    if (!markets) continue;
    const moneyline = markets.find((m) => m.name === "ML");
    const row = moneyline?.odds[0];
    if (row?.home && row?.draw && row?.away) {
      return { bookmaker, odds: { home: Number(row.home), draw: Number(row.draw), away: Number(row.away) } };
    }
  }

  return null;
}

/** Converts decimal odds to a normalized (vig-free) probability distribution. */
export function decimalOddsToProbabilities(odds: MoneylineOdds): { home: number; draw: number; away: number } {
  const raw = { home: 1 / odds.home, draw: 1 / odds.draw, away: 1 / odds.away };
  const total = raw.home + raw.draw + raw.away; // > 1 due to bookmaker margin (overround)
  return { home: raw.home / total, draw: raw.draw / total, away: raw.away / total };
}
