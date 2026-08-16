import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchMatchDetail, fetchLineups } from "./highlightly-client";
import { upsertFixture } from "./upsert";
import type { HighlightlyMatchSummary } from "./highlightly-client";
import { safeFetch } from "./safe-fetch";

const CACHE_TTL_MS = 5 * 60 * 1000;

export interface FixtureDetailRow {
  id: string;
  external_id: number;
  venue: string | null;
  temperature_celsius: number | null;
  lineup_home: unknown;
  lineup_away: unknown;
  updated_at: string;
}

/**
 * Fixture-detail view trigger: serves cached data if refreshed within the
 * last 5 minutes, otherwise refreshes it from Highlightly before returning.
 * See data-ingestion spec's "Cached fixture-detail data is reused within a
 * 5-minute window" requirement.
 */
export async function getFixtureDetail(
  supabase: SupabaseClient,
  fixtureExternalId: number,
  leagueExternalId: number
): Promise<FixtureDetailRow> {
  const { data: existing } = await supabase
    .from("fixtures")
    .select("id, external_id, venue, temperature_celsius, lineup_home, lineup_away, updated_at")
    .eq("external_id", fixtureExternalId)
    .maybeSingle();

  if (existing && Date.now() - new Date(existing.updated_at).getTime() < CACHE_TTL_MS) {
    return existing as FixtureDetailRow;
  }

  const refreshed = await refreshFixtureDetail(supabase, fixtureExternalId, leagueExternalId);
  if (refreshed) return refreshed;

  // Highlightly call failed - fall back to whatever cached data exists
  // (even if stale) rather than failing the whole request, per
  // data-ingestion spec's graceful-degradation requirement.
  if (existing) return existing as FixtureDetailRow;

  throw new Error(`No cached data and Highlightly refresh failed for fixture ${fixtureExternalId}`);
}

async function refreshFixtureDetail(
  supabase: SupabaseClient,
  fixtureExternalId: number,
  leagueExternalId: number
): Promise<FixtureDetailRow | null> {
  const detailResult = await safeFetch("highlightly:matchDetail", () => fetchMatchDetail(fixtureExternalId));
  if (!detailResult.ok) return null;
  const detail = detailResult.data;

  const lineupsResult = await safeFetch("highlightly:lineups", () => fetchLineups(fixtureExternalId));
  const lineups = lineupsResult.ok ? lineupsResult.data : null;

  const summary: HighlightlyMatchSummary = detail;
  const fixtureId = await upsertFixture(supabase, summary, leagueExternalId);

  const { data, error } = await supabase
    .from("fixtures")
    .update({
      venue: detail.venue.name,
      temperature_celsius: detail.forecast.temperature,
      lineup_home: lineups?.homeTeam ?? null,
      lineup_away: lineups?.awayTeam ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fixtureId)
    .select("id, external_id, venue, temperature_celsius, lineup_home, lineup_away, updated_at")
    .single();

  if (error) throw new Error(`Failed to refresh fixture detail ${fixtureExternalId}: ${error.message}`);
  return data as FixtureDetailRow;
}
