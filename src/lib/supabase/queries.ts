import { getSupabaseAdminClient } from "./admin-client";

export interface DashboardPrediction {
  statistical_home_prob: number;
  statistical_draw_prob: number;
  statistical_away_prob: number;
  statistical_factors: Record<string, unknown> | null;
  llm_home_prob: number | null;
  llm_draw_prob: number | null;
  llm_away_prob: number | null;
  llm_factors: Record<string, unknown> | null;
  final_home_prob: number;
  final_draw_prob: number;
  final_away_prob: number;
  actual_result: string | null;
  market_home_prob: number | null;
  market_draw_prob: number | null;
  market_away_prob: number | null;
  market_source: string | null;
  bookmaker_name: string | null;
  bookmaker_home_prob: number | null;
  bookmaker_draw_prob: number | null;
  bookmaker_away_prob: number | null;
  derived_markets: DerivedMarketsSummary | null;
}

export interface DerivedMarketsSummary {
  overUnder: { line: number; over: number; under: number }[];
  btts: { yes: number; no: number };
  handicaps: { line: number; homeCovers: number; awayCovers: number }[];
  topScores: { home: number; away: number; probability: number }[];
  scoreGrid: number[][];
}

export interface LineupSummary {
  formation: string;
  initialLineup: { name: string; position?: string; number?: number }[];
}

export interface NewsArticleSummary {
  title: string;
  url: string;
  image: string | null;
  publishedAt: string;
  sourceName: string;
}

export interface RecentResultSummary {
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  result: "win" | "draw" | "loss";
  date: string;
}

export interface DashboardTeam {
  name: string;
  logo_url: string | null;
  news: { articles: NewsArticleSummary[] } | null;
  recentResults: RecentResultSummary[];
}

export interface DashboardFixture {
  id: string;
  external_id: number;
  league_external_id: number;
  kickoff_at: string;
  status: string;
  live_minute: string | null;
  live_home_score: number | null;
  live_away_score: number | null;
  venue: string | null;
  referee: string | null;
  temperature_celsius: number | null;
  lineup_home: LineupSummary | null;
  lineup_away: LineupSummary | null;
  home_team: DashboardTeam | null;
  away_team: DashboardTeam | null;
  prediction: DashboardPrediction | null;
}

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

const FIXTURE_SELECT = `id, external_id, league_external_id, kickoff_at, status, live_minute, live_home_score, live_away_score, venue, referee, temperature_celsius, lineup_home, lineup_away,
       home_team:teams!fixtures_home_team_id_fkey(name, logo_url, news:team_news(articles), form:team_form_stats(recent_results, computed_at)),
       away_team:teams!fixtures_away_team_id_fkey(name, logo_url, news:team_news(articles), form:team_form_stats(recent_results, computed_at)),
       prediction:predictions(statistical_home_prob, statistical_draw_prob, statistical_away_prob, statistical_factors,
         llm_home_prob, llm_draw_prob, llm_away_prob, llm_factors,
         final_home_prob, final_draw_prob, final_away_prob, actual_result,
         market_home_prob, market_draw_prob, market_away_prob, market_source,
         bookmaker_name, bookmaker_home_prob, bookmaker_draw_prob, bookmaker_away_prob, derived_markets)`;

function unwrapTeam(value: unknown): DashboardTeam | null {
  const team = unwrapRelation(
    value as
      | { name: string; logo_url: string | null; news: unknown; form: unknown }
      | { name: string; logo_url: string | null; news: unknown; form: unknown }[]
      | null
  );
  if (!team) return null;

  const formRows = (Array.isArray(team.form) ? team.form : team.form ? [team.form] : []) as {
    recent_results: RecentResultSummary[];
    computed_at: string;
  }[];
  const latestForm = formRows.sort((a, b) => new Date(b.computed_at).getTime() - new Date(a.computed_at).getTime())[0];

  return {
    ...team,
    news: unwrapRelation(team.news as { articles: NewsArticleSummary[] } | { articles: NewsArticleSummary[] }[] | null),
    recentResults: latestForm?.recent_results ?? [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFixtureRow(row: any): DashboardFixture {
  return {
    id: row.id,
    external_id: row.external_id,
    league_external_id: row.league_external_id,
    kickoff_at: row.kickoff_at,
    status: row.status,
    live_minute: row.live_minute,
    live_home_score: row.live_home_score,
    live_away_score: row.live_away_score,
    venue: row.venue,
    referee: row.referee,
    temperature_celsius: row.temperature_celsius,
    lineup_home: row.lineup_home,
    lineup_away: row.lineup_away,
    home_team: unwrapTeam(row.home_team),
    away_team: unwrapTeam(row.away_team),
    prediction: unwrapRelation(row.prediction),
  } as DashboardFixture;
}

/**
 * Single query for the whole dashboard: every tracked fixture with its full
 * prediction detail (and each team's cached news), so the UI can render the
 * fixture list and the selected fixture's detail panel from the same
 * in-memory dataset - no per-fixture navigation or route change required.
 */
export async function getDashboardFixtures(): Promise<DashboardFixture[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("fixtures").select(FIXTURE_SELECT).order("kickoff_at", { ascending: true });

  if (error) throw new Error(`Failed to load dashboard fixtures: ${error.message}`);
  return (data ?? []).map(mapFixtureRow);
}

/** Single-fixture lookup for the shareable read-only prediction page. */
export async function getFixtureById(id: string): Promise<DashboardFixture | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("fixtures").select(FIXTURE_SELECT).eq("id", id).maybeSingle();

  if (error) throw new Error(`Failed to load fixture ${id}: ${error.message}`);
  if (!data) return null;
  return mapFixtureRow(data);
}
