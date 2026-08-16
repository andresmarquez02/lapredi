import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

export async function POST(request: Request) {
  const body = (await request.json()) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth }, { onConflict: "endpoint" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
