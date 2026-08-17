import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { ingestUpcomingFixtures } from "@/lib/football/ingest-upcoming";
import { syncLiveFixtures } from "@/lib/football/sync-live-status";

/**
 * Same work as the manual "Actualizar datos" button (POST /api/refresh-all),
 * exposed as GET for Vercel Cron - Vercel invokes cron targets with GET, and
 * refresh-all only ever accepted POST. Scheduled weekly via `vercel.json`'s
 * `crons` entry; only fires automatically once this app is deployed
 * (Vercel's scheduler needs a publicly routable URL to hit).
 */
export async function GET() {
  const supabase = getSupabaseAdminClient();
  try {
    const ingest = await ingestUpcomingFixtures(supabase, 7);
    const live = await syncLiveFixtures(supabase);
    return NextResponse.json({ ok: true, ingest, live });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
