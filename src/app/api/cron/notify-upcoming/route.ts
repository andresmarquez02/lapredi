import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { checkUpcomingAndNotify } from "@/lib/notifications/check-upcoming";

/**
 * The actual notify check - callable manually (e.g. this session's own
 * testing) or by an external scheduler. Note: nothing inside this repo calls
 * this route on its own. pg_cron/pg_net can only reach a publicly routable
 * URL, and this app has only ever run via `next dev` on localhost, so
 * automatic unattended firing needs this app deployed publicly first.
 */
export async function GET() {
  const supabase = getSupabaseAdminClient();
  try {
    const result = await checkUpcomingAndNotify(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
