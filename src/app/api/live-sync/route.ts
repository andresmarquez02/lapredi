import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { syncLiveFixtures } from "@/lib/football/sync-live-status";

export interface LiveFixtureUpdate {
  id: string;
  status: string;
  live_minute: string | null;
  live_home_score: number | null;
  live_away_score: number | null;
}

/**
 * Polled by the dashboard (client-side interval, no route navigation) to
 * refresh live status/minute/score for whichever tracked fixtures are
 * currently inside their live window. Cheap no-op when nothing is playing -
 * syncLiveFixtures skips calling Highlightly entirely in that case.
 */
export async function GET() {
  const supabase = getSupabaseAdminClient();

  try {
    const result = await syncLiveFixtures(supabase);

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("fixtures")
      .select("id, status, live_minute, live_home_score, live_away_score")
      .in("status", ["live", "finished"])
      .gte("kickoff_at", sixHoursAgo);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      updates: (data ?? []) as LiveFixtureUpdate[],
      leaguesPolled: result.leaguesPolled,
      failures: result.failures,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
