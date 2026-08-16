import type { OutcomeProbabilities } from "./poisson";

export const DEFAULT_STATISTICAL_WEIGHT = 0.7;

export interface EnsembleInputs {
  statistical: OutcomeProbabilities;
  /** Null/undefined when the LLM call failed or its output was invalid - see analyzeQualitativeFactors. */
  llm?: OutcomeProbabilities | null;
  /** Weight given to the statistical model in [0, 1]; the LLM gets (1 - statisticalWeight). Defaults to DEFAULT_STATISTICAL_WEIGHT. */
  statisticalWeight?: number;
}

export interface EnsembleResult {
  final: OutcomeProbabilities;
  usedLlm: boolean;
}

/**
 * Combines the statistical and LLM probability distributions into a single
 * final prediction. Falls back to the statistical distribution alone when no
 * valid LLM distribution is available, per the prediction-ensemble spec.
 */
export function combinePredictions(inputs: EnsembleInputs): EnsembleResult {
  if (!inputs.llm) {
    return { final: inputs.statistical, usedLlm: false };
  }

  const w = inputs.statisticalWeight ?? DEFAULT_STATISTICAL_WEIGHT;
  if (w < 0 || w > 1) {
    throw new Error(`statisticalWeight must be between 0 and 1, got ${w}`);
  }

  const final: OutcomeProbabilities = {
    homeWin: w * inputs.statistical.homeWin + (1 - w) * inputs.llm.homeWin,
    draw: w * inputs.statistical.draw + (1 - w) * inputs.llm.draw,
    awayWin: w * inputs.statistical.awayWin + (1 - w) * inputs.llm.awayWin,
  };

  return { final, usedLlm: true };
}
