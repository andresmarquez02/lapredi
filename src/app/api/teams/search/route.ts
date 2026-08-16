import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ teams: [] });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("teams").select("id, name, logo_url").ilike("name", `%${q}%`).order("name").limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ teams: data ?? [] });
}
