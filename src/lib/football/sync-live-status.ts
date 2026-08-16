import type { SupabaseClient } from "@supabase/supabase-js";
import { TRACKED_COMPETITIONS } from "./competitions";
import { fetchMatchesForDate } from "./highlightly-client";
import { upsertFixture } from "./upsert";
import { safeFetch } from "./safe-fetch";

// A fixture is worth polling Highlightly for once it's within this window of
// its scheduled kickoff and hasn't already been marked finished - covers
// delayed kickoffs and normal 90+ minute-plus-stoppage match length without
// polling fixtures that are definitely still hours away.
const LIVE_WINDOW_BEFORE_MS = 10 * 60 * 1000;
const LIVE_WINDOW_AFTER_MS = 3 * 60 * 60 * 1000;

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface SyncLiveResult {
  leaguesPolled: number;
  fixturesUpdated: number;
  failures: string[];
}

/**
 * Finds fixtures currently inside their live window and refreshes only the
 * competitions that actually have one - avoids spending Highlightly's daily
 * quota polling all 7 tracked leagues every tick when nothing is playing.
 */
export async function syncLiveFixtures(supabase: SupabaseClient): Promise<SyncLiveResult> {
  const now = Date.now();
  const windowStart = new Date(now - LIVE_WINDOW_AFTER_MS).toISOString();
  const windowEnd = new Date(now + LIVE_WINDOW_BEFORE_MS).toISOString();

  const { data: candidates, error } = await supabase
    .from("fixtures")
    .select("league_external_id, kickoff_at")
    .neq("status", "finished")
    .neq("status", "cancelled")
    .neq("status", "postponed")
    .gte("kickoff_at", windowStart)
    .lte("kickoff_at", windowEnd);

  if (error) throw new Error(`Failed to find live candidates: ${error.message}`);
  if (!candidates || candidates.length === 0) {
    return { leaguesPolled: 0, fixturesUpdated: 0, failures: [] };
  }

  const leagueIds = new Set(candidates.map((c) => c.league_external_id as number));
  const today = toDateString(new Date());

  let fixturesUpdated = 0;
  const failures: string[] = [];

  for (const competition of TRACKED_COMPETITIONS.filter((c) => leagueIds.has(c.highlightlyLeagueId))) {
    const result = await safeFetch(`highlightly:live:${competition.slug}:${today}`, () =>
      fetchMatchesForDate(competition.highlightlyLeagueId, today)
    );

    if (!result.ok) {
      failures.push(`${competition.name}: ${result.error}`);
      continue;
    }

    for (const match of result.data) {
      try {
        await upsertFixture(supabase, match, competition.highlightlyLeagueId);
        fixturesUpdated++;
      } catch (err) {
        failures.push(`${competition.name} fixture ${match.id}: ${(err as Error).message}`);
      }
    }
  }

  return { leaguesPolled: leagueIds.size, fixturesUpdated, failures };
}
