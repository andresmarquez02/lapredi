// Secondary data source, historical reference data only. Confirmed live
// 2026-08-16: this project's free-plan key only has access to the
// 2022-2024 seasons - current-season queries are rejected outright, so this
// client must never be used for live/upcoming fixtures. See design.md.

const BASE_URL = "https://v3.football.api-sports.io";
export const HISTORICAL_SEASONS = [2022, 2023, 2024] as const;

export interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { long: string; short: string };
  };
  league: { id: number; season: number; round: string };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
}

export class ApiFootballError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiFootballError";
  }
}

function getApiKey(): string {
  const key = process.env.APIFOOTBALL_API_KEY;
  if (!key) throw new Error("APIFOOTBALL_API_KEY is not set");
  return key;
}

// API-Football's free plan caps at 10 requests/minute (separate from the
// 100/day quota - confirmed live 2026-08-16 when concurrent calls from a
// window-generation run mostly failed with a rateLimit error while daily
// usage barely moved). Serialize every call through this queue, spaced out,
// instead of trusting callers not to fire them concurrently.
const MIN_INTERVAL_MS = 6500; // 60_000 / 10 + margin
let queue: Promise<void> = Promise.resolve();
let lastCallAt = 0;

function throttle(): Promise<void> {
  const next = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
  });
  queue = next;
  return next;
}

/**
 * Shared low-level GET for every API-Football endpoint: builds the URL,
 * attaches the key, rate-limits to the free plan's 10/min cap, and validates
 * both the HTTP status and the API's own `errors` field before returning
 * `response`. All API-Football callers (historical-form.ts, team-form.ts)
 * must go through this instead of reimplementing the fetch, so a
 * revoked/rate-limited key fails with a clear `ApiFootballError` everywhere
 * rather than an unhandled `undefined` read in some call sites and not
 * others.
 */
export async function apiFootballRequest<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  await throttle();

  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const response = await fetch(url, { headers: { "x-apisports-key": getApiKey() } });
  if (!response.ok) {
    throw new ApiFootballError(`API-Football ${path} failed (${response.status})`, response.status);
  }

  const body = (await response.json()) as { response: T; errors: unknown };
  if (Array.isArray(body.errors) ? body.errors.length > 0 : Object.keys(body.errors ?? {}).length > 0) {
    throw new ApiFootballError(`API-Football ${path} returned errors: ${JSON.stringify(body.errors)}`, response.status);
  }

  return body.response;
}

/**
 * Finished fixtures for a league/round in a historical (2022-2024) season -
 * used as a baseline input to the statistical model, never for live fixtures.
 */
export async function fetchHistoricalFixturesByRound(
  leagueId: number,
  season: (typeof HISTORICAL_SEASONS)[number],
  round: string
): Promise<ApiFootballFixture[]> {
  return apiFootballRequest<ApiFootballFixture[]>("/fixtures", { league: leagueId, season, round });
}
