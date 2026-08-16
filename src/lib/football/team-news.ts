import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchTeamNews, type NewsArticle } from "./gnews-client";
import { safeFetch } from "./safe-fetch";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // matches GNews free tier's own ~12h data delay, with margin

/** Cached-first team news lookup: reuses stored articles within the TTL instead of spending GNews's 100/day quota on repeat views. */
export async function getTeamNews(supabase: SupabaseClient, teamInternalId: string, teamName: string): Promise<NewsArticle[]> {
  const { data: existing } = await supabase.from("team_news").select("articles, fetched_at").eq("team_id", teamInternalId).maybeSingle();

  if (existing && Date.now() - new Date(existing.fetched_at).getTime() < CACHE_TTL_MS) {
    return existing.articles as NewsArticle[];
  }

  const result = await safeFetch(`gnews:${teamName}`, () => fetchTeamNews(teamName));
  if (!result.ok) {
    // Fall back to stale cache rather than showing nothing, per the same graceful-degradation pattern as the football data sources.
    return (existing?.articles as NewsArticle[] | undefined) ?? [];
  }

  const { error } = await supabase
    .from("team_news")
    .upsert({ team_id: teamInternalId, articles: result.data, fetched_at: new Date().toISOString() }, { onConflict: "team_id" });
  if (error) throw new Error(`Failed to cache news for ${teamName}: ${error.message}`);

  return result.data;
}
