import type { SupabaseClient } from "@supabase/supabase-js";
import type { OutcomeProbabilities } from "./poisson";
import { DEFAULT_STATISTICAL_WEIGHT } from "./ensemble";

export interface PersistPredictionInput {
  fixtureId: string;
  statistical: OutcomeProbabilities;
  statisticalFactors?: Record<string, unknown>;
  llm?: OutcomeProbabilities | null;
  llmFactors?: Record<string, unknown> | null;
  final: OutcomeProbabilities;
  statisticalWeight?: number;
  /** Highlightly's own prematch model, shown as an external comparison point - never blended into our ensemble. */
  market?: (OutcomeProbabilities & { source: string }) | null;
  /** Real bookmaker odds (normalized), shown as another comparison point - never blended into our ensemble. */
  bookmaker?: (OutcomeProbabilities & { name: string }) | null;
  /** Our own over/under, BTTS, handicap, and top-scoreline breakdown - see markets.ts. */
  derivedMarkets?: unknown;
}

/** Persists statistical, LLM (if present), and final probabilities for a fixture prediction, per db-schema/prediction-ensemble specs. */
export async function persistPrediction(supabase: SupabaseClient, input: PersistPredictionInput): Promise<void> {
  const { error } = await supabase.from("predictions").upsert(
    {
      fixture_id: input.fixtureId,
      statistical_home_prob: input.statistical.homeWin,
      statistical_draw_prob: input.statistical.draw,
      statistical_away_prob: input.statistical.awayWin,
      statistical_factors: input.statisticalFactors ?? null,
      llm_home_prob: input.llm?.homeWin ?? null,
      llm_draw_prob: input.llm?.draw ?? null,
      llm_away_prob: input.llm?.awayWin ?? null,
      llm_factors: input.llmFactors ?? null,
      ensemble_weight_statistical: input.statisticalWeight ?? DEFAULT_STATISTICAL_WEIGHT,
      final_home_prob: input.final.homeWin,
      final_draw_prob: input.final.draw,
      final_away_prob: input.final.awayWin,
      market_home_prob: input.market?.homeWin ?? null,
      market_draw_prob: input.market?.draw ?? null,
      market_away_prob: input.market?.awayWin ?? null,
      market_source: input.market?.source ?? null,
      bookmaker_name: input.bookmaker?.name ?? null,
      bookmaker_home_prob: input.bookmaker?.homeWin ?? null,
      bookmaker_draw_prob: input.bookmaker?.draw ?? null,
      bookmaker_away_prob: input.bookmaker?.awayWin ?? null,
      derived_markets: input.derivedMarkets ?? null,
      predicted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "fixture_id" }
  );

  if (error) throw new Error(`Failed to persist prediction for fixture ${input.fixtureId}: ${error.message}`);
}

/** Reconciles a stored prediction with the fixture's actual final result, per db-schema's "Result reconciled after fulltime" scenario. */
export async function reconcilePredictionResult(
  supabase: SupabaseClient,
  fixtureId: string,
  homeGoals: number,
  awayGoals: number
): Promise<void> {
  const actualResult = homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";

  const { error } = await supabase
    .from("predictions")
    .update({
      actual_home_goals: homeGoals,
      actual_away_goals: awayGoals,
      actual_result: actualResult,
      reconciled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("fixture_id", fixtureId);

  if (error) throw new Error(`Failed to reconcile prediction for fixture ${fixtureId}: ${error.message}`);
}
