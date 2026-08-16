import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { ingestUpcomingFixtures } from "@/lib/football/ingest-upcoming";
import { syncLiveFixtures } from "@/lib/football/sync-live-status";

/**
 * Manual "refresh" button target: re-ingests the next 7 days of fixtures
 * (status/score/teams) and force-syncs anything currently live. Does NOT
 * regenerate predictions - that's a separate, quota-heavier action left to
 * its own explicit trigger.
 */
export async function POST() {
  const supabase = getSupabaseAdminClient();
  try {
    const ingest = await ingestUpcomingFixtures(supabase, 7);
    const live = await syncLiveFixtures(supabase);
    return NextResponse.json({ ok: true, ingest, live });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
