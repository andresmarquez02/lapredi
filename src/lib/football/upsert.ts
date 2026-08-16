import type { SupabaseClient } from "@supabase/supabase-js";
import type { HighlightlyMatchSummary, HighlightlyTeamRef } from "./highlightly-client";

const LIVE_DESCRIPTION_MARKERS = [
  "1st half",
  "2nd half",
  "half time",
  "halftime",
  "extra time",
  "in progress",
  "penalty",
  "live",
];

/**
 * Defaults to "scheduled" for anything unrecognized: a fixture must be
 * positively identified as in-progress to be marked "live", since that
 * status drives the dashboard's pulsing "EN VIVO" badge - a wrong default
 * here means a match that hasn't even started shows as live indefinitely,
 * because syncLiveFixtures only re-checks fixtures inside their live time
 * window and this fallback previously fired on far-future ingestion runs.
 */
function mapStatus(description: string): "scheduled" | "live" | "finished" | "postponed" | "cancelled" {
  const d = description.toLowerCase();
  if (d.includes("finished") || d.includes("full-time") || d === "ft") return "finished";
  if (d.includes("postponed")) return "postponed";
  if (d.includes("cancel")) return "cancelled";
  if (d.includes("not started")) return "scheduled";
  if (LIVE_DESCRIPTION_MARKERS.some((marker) => d.includes(marker))) return "live";
  return "scheduled";
}

/** Parses a scoreline string of unknown exact format ("1-0", "1 - 0", "1:0", ...) into two ints, defensively. */
function parseScore(current: string | null): { home: number | null; away: number | null } {
  if (!current) return { home: null, away: null };
  const numbers = current.match(/\d+/g);
  if (!numbers || numbers.length < 2) return { home: null, away: null };
  return { home: Number(numbers[0]), away: Number(numbers[1]) };
}

/** Upserts a team keyed by its Highlightly external ID (no duplicates on re-ingestion). Returns the internal row id. */
export async function upsertTeam(supabase: SupabaseClient, team: HighlightlyTeamRef): Promise<string> {
  const { data, error } = await supabase
    .from("teams")
    .upsert(
      {
        external_id: team.id,
        name: team.name,
        logo_url: team.logo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_id" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`Failed to upsert team ${team.id}: ${error.message}`);
  return data.id as string;
}

/** Upserts a fixture keyed by its Highlightly external ID (no duplicates on re-ingestion), upserting its two teams first. */
export async function upsertFixture(
  supabase: SupabaseClient,
  match: HighlightlyMatchSummary,
  leagueExternalId: number
): Promise<string> {
  const [homeTeamId, awayTeamId] = await Promise.all([
    upsertTeam(supabase, match.homeTeam),
    upsertTeam(supabase, match.awayTeam),
  ]);

  const status = mapStatus(match.state.description);
  const score = parseScore(match.state.score.current);

  const { data, error } = await supabase
    .from("fixtures")
    .upsert(
      {
        external_id: match.id,
        league_external_id: leagueExternalId,
        season: match.league.season,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        kickoff_at: match.date,
        status,
        live_minute: status === "live" ? match.state.clock : null,
        live_home_score: score.home,
        live_away_score: score.away,
        live_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_id" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`Failed to upsert fixture ${match.id}: ${error.message}`);
  return data.id as string;
}
