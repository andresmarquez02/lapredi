import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToAllSubscriptions } from "./send-push";

// Heads-up window: fixtures kicking off between now and now+65min. The 5min
// margin over a clean 60 covers this job not firing at the exact minute.
const NOTIFY_WINDOW_MS = 65 * 60 * 1000;

export interface NotifyUpcomingResult {
  candidatesChecked: number;
  notificationsSent: number;
}

/**
 * Finds scheduled fixtures kicking off soon that involve a followed team or
 * league and haven't already triggered a notification, sends one push per
 * fixture, and records it in fixture_notifications so it never double-fires.
 * Meant to be invoked on a schedule (see notes on the /api/cron route for
 * why that scheduling piece needs a public deployment).
 */
export async function checkUpcomingAndNotify(supabase: SupabaseClient): Promise<NotifyUpcomingResult> {
  const { data: follows, error: followsError } = await supabase.from("follows").select("kind, team_id, league_external_id");
  if (followsError) throw new Error(`Failed to load follows: ${followsError.message}`);
  if (!follows || follows.length === 0) return { candidatesChecked: 0, notificationsSent: 0 };

  const followedTeamIds = new Set(follows.filter((f) => f.kind === "team").map((f) => f.team_id as string));
  const followedLeagueIds = new Set(follows.filter((f) => f.kind === "league").map((f) => f.league_external_id as number));

  const windowEnd = new Date(Date.now() + NOTIFY_WINDOW_MS).toISOString();
  const now = new Date().toISOString();

  interface NotifyCandidateRow {
    id: string;
    league_external_id: number;
    kickoff_at: string;
    home_team_id: string;
    away_team_id: string;
    home_team: { name: string } | { name: string }[] | null;
    away_team: { name: string } | { name: string }[] | null;
    notified: { id: string }[] | null;
  }

  const { data: candidates, error: fixturesError } = await supabase
    .from("fixtures")
    .select(
      `id, league_external_id, kickoff_at, home_team_id, away_team_id,
       home_team:teams!fixtures_home_team_id_fkey(name),
       away_team:teams!fixtures_away_team_id_fkey(name),
       notified:fixture_notifications(id)`
    )
    .eq("status", "scheduled")
    .gte("kickoff_at", now)
    .lte("kickoff_at", windowEnd)
    .returns<NotifyCandidateRow[]>();

  if (fixturesError) throw new Error(`Failed to load notify candidates: ${fixturesError.message}`);
  if (!candidates || candidates.length === 0) return { candidatesChecked: 0, notificationsSent: 0 };

  let notificationsSent = 0;

  for (const fixture of candidates) {
    const alreadyNotified = (fixture.notified?.length ?? 0) > 0;
    if (alreadyNotified) continue;

    const matchesFollow =
      followedTeamIds.has(fixture.home_team_id) ||
      followedTeamIds.has(fixture.away_team_id) ||
      followedLeagueIds.has(fixture.league_external_id);
    if (!matchesFollow) continue;

    const homeName = (Array.isArray(fixture.home_team) ? fixture.home_team[0]?.name : fixture.home_team?.name) ?? "Local";
    const awayName = (Array.isArray(fixture.away_team) ? fixture.away_team[0]?.name : fixture.away_team?.name) ?? "Visitante";
    const minutesUntil = Math.round((new Date(fixture.kickoff_at).getTime() - Date.now()) / 60000);

    await sendPushToAllSubscriptions(supabase, {
      title: `${homeName} vs ${awayName}`,
      body: `Empieza en ${minutesUntil} min`,
      url: `/share/${fixture.id}`,
    });

    await supabase.from("fixture_notifications").insert({ fixture_id: fixture.id });
    notificationsSent++;
  }

  return { candidatesChecked: candidates.length, notificationsSent };
}
