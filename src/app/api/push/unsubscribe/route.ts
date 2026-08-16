import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

export async function POST(request: Request) {
  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
