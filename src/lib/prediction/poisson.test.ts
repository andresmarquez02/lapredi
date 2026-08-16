import { describe, expect, it } from "vitest";
import { predictMatchOutcome, type PoissonModelInputs } from "./poisson";
import { computeLeagueAverageGoals } from "./league-average-goals";

const baseInputs: PoissonModelInputs = {
  homeAttackStrength: 1.2,
  homeDefenseStrength: 0.9,
  awayAttackStrength: 0.8,
  awayDefenseStrength: 1.1,
  leagueAvgGoalsHome: 1.5,
  leagueAvgGoalsAway: 1.1,
};

describe("predictMatchOutcome", () => {
  it("returns a probability distribution that sums to 1 within tolerance", () => {
    const { homeWin, draw, awayWin } = predictMatchOutcome(baseInputs);
    expect(homeWin + draw + awayWin).toBeCloseTo(1, 6);
  });

  it("sums to 1 across a range of strengths, form, and absence adjustments", () => {
    const variants: PoissonModelInputs[] = [
      baseInputs,
      { ...baseInputs, homeFormMultiplier: 1.3, awayFormMultiplier: 0.7 },
      { ...baseInputs, homeAbsenceImpact: 0.7, awayAbsenceImpact: 0.9 },
      { ...baseInputs, dixonColesRho: -0.2 },
      { ...baseInputs, homeAttackStrength: 0.5, awayAttackStrength: 2.0 },
    ];

    for (const inputs of variants) {
      const { homeWin, draw, awayWin } = predictMatchOutcome(inputs);
      expect(homeWin + draw + awayWin).toBeCloseTo(1, 6);
      expect(homeWin).toBeGreaterThanOrEqual(0);
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(awayWin).toBeGreaterThanOrEqual(0);
    }
  });

  it("favors the stronger home attacker over a weaker away side", () => {
    const { homeWin, awayWin } = predictMatchOutcome(baseInputs);
    expect(homeWin).toBeGreaterThan(awayWin);
  });
});

describe("computeLeagueAverageGoals", () => {
  it("averages home and away goals across finished fixtures", () => {
    const result = computeLeagueAverageGoals([
      { homeGoals: 2, awayGoals: 1 },
      { homeGoals: 0, awayGoals: 0 },
      { homeGoals: 4, awayGoals: 2 },
    ]);
    expect(result.home).toBeCloseTo(2, 6);
    expect(result.away).toBeCloseTo(1, 6);
  });

  it("throws on an empty fixture list instead of returning a fake average", () => {
    expect(() => computeLeagueAverageGoals([])).toThrow();
  });
});
