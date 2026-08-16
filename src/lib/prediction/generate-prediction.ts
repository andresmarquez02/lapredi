import type { SupabaseClient } from "@supabase/supabase-js";
import { predictMatchOutcome, computeExpectedGoals, scorelineProbabilityGrid, type PoissonModelInputs, type OutcomeProbabilities } from "./poisson";
import { deriveMarkets } from "./markets";
import { combinePredictions } from "./ensemble";
import { persistPrediction } from "./persist";
import { analyzeQualitativeFactors } from "../llm/qualitative-analysis";
import type { QualitativeMatchContext } from "../llm/context";

export interface GeneratePredictionInput {
  fixtureId: string;
  statisticalInputs: PoissonModelInputs;
  qualitativeContext: QualitativeMatchContext;
  statisticalWeight?: number;
  /** Extra key/value pairs merged into the stored statistical_factors, e.g. data-quality notes. */
  extraFactors?: Record<string, unknown>;
  /** Highlightly's own prematch model, persisted alongside (not blended into) our ensemble, for the user to compare against. */
  market?: (OutcomeProbabilities & { source: string }) | null;
  /** Real bookmaker odds (normalized), persisted alongside (not blended into) our ensemble. */
  bookmaker?: (OutcomeProbabilities & { name: string }) | null;
}

/**
 * Full prediction pipeline for one fixture: statistical model -> LLM
 * qualitative analysis -> ensemble -> persist. Mirrors the flow design.md
 * describes running from the scheduled Edge Function pipeline; also callable
 * directly (e.g. from a Next.js route) for manual/on-demand generation.
 */
export async function generatePrediction(supabase: SupabaseClient, input: GeneratePredictionInput): Promise<void> {
  const statistical = predictMatchOutcome(input.statisticalInputs);
  const expectedGoals = computeExpectedGoals(input.statisticalInputs);
  const grid = scorelineProbabilityGrid(expectedGoals, {
    dixonColesRho: input.statisticalInputs.dixonColesRho,
    maxGoals: input.statisticalInputs.maxGoals,
  });
  const derivedMarkets = deriveMarkets(grid);

  const llmOutcome = await analyzeQualitativeFactors(input.qualitativeContext);
  const llm = llmOutcome.ok
    ? { homeWin: llmOutcome.result.homeWinProbability, draw: llmOutcome.result.drawProbability, awayWin: llmOutcome.result.awayWinProbability }
    : null;

  const { final } = combinePredictions({ statistical, llm, statisticalWeight: input.statisticalWeight });

  await persistPrediction(supabase, {
    fixtureId: input.fixtureId,
    statistical,
    statisticalFactors: {
      homeExpectedGoals: expectedGoals.home,
      awayExpectedGoals: expectedGoals.away,
      homeAttackStrength: input.statisticalInputs.homeAttackStrength,
      awayAttackStrength: input.statisticalInputs.awayAttackStrength,
      homeDefenseStrength: input.statisticalInputs.homeDefenseStrength,
      awayDefenseStrength: input.statisticalInputs.awayDefenseStrength,
      homeFormMultiplier: input.statisticalInputs.homeFormMultiplier,
      awayFormMultiplier: input.statisticalInputs.awayFormMultiplier,
      homeAbsenceImpact: input.statisticalInputs.homeAbsenceImpact,
      awayAbsenceImpact: input.statisticalInputs.awayAbsenceImpact,
      ...input.extraFactors,
    },
    llm,
    llmFactors: llmOutcome.ok ? { reasoning: llmOutcome.result.reasoning } : { unavailable: llmOutcome.reason },
    final,
    statisticalWeight: input.statisticalWeight,
    market: input.market,
    bookmaker: input.bookmaker,
    derivedMarkets,
  });
}
