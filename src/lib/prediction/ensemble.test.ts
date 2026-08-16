import { describe, expect, it } from "vitest";
import { combinePredictions, DEFAULT_STATISTICAL_WEIGHT } from "./ensemble";
import type { OutcomeProbabilities } from "./poisson";

const statistical: OutcomeProbabilities = { homeWin: 0.5, draw: 0.3, awayWin: 0.2 };
const llm: OutcomeProbabilities = { homeWin: 0.2, draw: 0.3, awayWin: 0.5 };

describe("combinePredictions", () => {
  it("falls back to the statistical distribution when no LLM result is available", () => {
    const { final, usedLlm } = combinePredictions({ statistical, llm: null });
    expect(usedLlm).toBe(false);
    expect(final).toEqual(statistical);
  });

  it("combines both distributions with the default weight", () => {
    const { final, usedLlm } = combinePredictions({ statistical, llm });
    expect(usedLlm).toBe(true);
    expect(final.homeWin).toBeCloseTo(
      DEFAULT_STATISTICAL_WEIGHT * statistical.homeWin + (1 - DEFAULT_STATISTICAL_WEIGHT) * llm.homeWin,
      6
    );
    expect(final.homeWin + final.draw + final.awayWin).toBeCloseTo(1, 6);
  });

  it("respects a custom statistical weight", () => {
    const { final } = combinePredictions({ statistical, llm, statisticalWeight: 0.5 });
    expect(final.homeWin).toBeCloseTo(0.35, 6);
  });

  it("rejects an out-of-range weight", () => {
    expect(() => combinePredictions({ statistical, llm, statisticalWeight: 1.5 })).toThrow();
  });
});
