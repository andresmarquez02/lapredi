// Currently DISABLED: this project's key returns `KEY_REVOKED - no active
// subscription plan` (confirmed live 2026-08-16). Implemented against the
// provider's published OpenAPI spec (https://api.thestatsapi.com/openapi.json)
// so it's ready to use once the subscription is reactivated - see
// THESTATS_ENABLED below and design.md's source-routing decision.

const BASE_URL = "https://api.thestatsapi.com/api";

/** Flip once the TheStatsAPI subscription is reactivated. */
export const THESTATS_ENABLED = false;

export interface TheStatsInjury {
  player_id: number;
  player_name: string;
  type: string; // e.g. "injury" | "suspension"
  reason: string | null;
  expected_return: string | null;
}

export class TheStatsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "TheStatsApiError";
  }
}

export class TheStatsDisabledError extends Error {
  constructor() {
    super("TheStatsAPI is disabled (THESTATS_ENABLED=false) - its subscription is not active");
    this.name = "TheStatsDisabledError";
  }
}

function getApiKey(): string {
  const key = process.env.THESTATS_API_KEY;
  if (!key) throw new Error("THESTATS_API_KEY is not set");
  return key;
}

async function request<T>(path: string): Promise<T> {
  if (!THESTATS_ENABLED) throw new TheStatsDisabledError();

  const response = await fetch(BASE_URL + path, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new TheStatsApiError(`TheStatsAPI ${path} failed (${response.status}): ${body}`, response.status);
  }

  return response.json() as Promise<T>;
}

export async function fetchTeamInjuriesSuspensions(teamId: number): Promise<TheStatsInjury[]> {
  return request<TheStatsInjury[]>(`/football/teams/${teamId}/injuries-suspensions`);
}
