import type { SupabaseClient } from "@supabase/supabase-js";
import { TRACKED_COMPETITIONS } from "./competitions";
import { fetchMatchesForDate } from "./highlightly-client";
import { upsertFixture } from "./upsert";
import { safeFetch } from "./safe-fetch";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface IngestUpcomingResult {
  fixturesUpserted: number;
  callsMade: number;
  failures: string[];
}

/**
 * Real ingestion pass: for every tracked competition, fetches each of the
 * next `daysAhead` calendar days individually (Highlightly's /matches has no
 * date-range param, only a single `date`) and upserts whatever fixtures come
 * back. This is what a daily scheduled-refresh Edge Function would run.
 */
export async function ingestUpcomingFixtures(supabase: SupabaseClient, daysAhead = 7): Promise<IngestUpcomingResult> {
  let fixturesUpserted = 0;
  let callsMade = 0;
  const failures: string[] = [];

  const dates = Array.from({ length: daysAhead }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i);
    return toDateString(d);
  });

  for (const competition of TRACKED_COMPETITIONS) {
    for (const date of dates) {
      callsMade++;
      const result = await safeFetch(`highlightly:matches:${competition.slug}:${date}`, () =>
        fetchMatchesForDate(competition.highlightlyLeagueId, date)
      );

      if (!result.ok) {
        failures.push(`${competition.name} ${date}: ${result.error}`);
        continue;
      }

      for (const match of result.data) {
        try {
          await upsertFixture(supabase, match, competition.highlightlyLeagueId);
          fixturesUpserted++;
        } catch (error) {
          failures.push(`${competition.name} ${date} fixture ${match.id}: ${(error as Error).message}`);
        }
      }
    }
  }

  return { fixturesUpserted, callsMade, failures };
}
