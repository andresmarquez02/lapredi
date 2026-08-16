import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";

export interface FollowRow {
  id: string;
  kind: "team" | "league";
  team_id: string | null;
  league_external_id: number | null;
  display_name: string;
}

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("follows").select("id, kind, team_id, league_external_id, display_name").order("display_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ follows: (data ?? []) as FollowRow[] });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    kind?: "team" | "league";
    teamId?: string;
    leagueExternalId?: number;
    displayName?: string;
  };

  if (!body.kind || !body.displayName) return NextResponse.json({ error: "Missing kind or displayName" }, { status: 400 });
  if (body.kind === "team" && !body.teamId) return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  if (body.kind === "league" && body.leagueExternalId === undefined) return NextResponse.json({ error: "Missing leagueExternalId" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("follows").insert({
    kind: body.kind,
    team_id: body.kind === "team" ? body.teamId : null,
    league_external_id: body.kind === "league" ? body.leagueExternalId : null,
    display_name: body.displayName,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
