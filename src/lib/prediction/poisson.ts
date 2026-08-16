export interface PoissonModelInputs {
  homeAttackStrength: number;
  homeDefenseStrength: number;
  awayAttackStrength: number;
  awayDefenseStrength: number;
  leagueAvgGoalsHome: number;
  leagueAvgGoalsAway: number;
  homeFormMultiplier?: number;
  awayFormMultiplier?: number;
  /** Fractional impact of missing key players on attack output, e.g. 0.85 = 15% reduction. */
  homeAbsenceImpact?: number;
  awayAbsenceImpact?: number;
  /**
   * Dixon-Coles low-score correlation parameter. Negative values reduce the
   * probability of 0-0/1-1 and increase 1-0/0-1 relative to independent
   * Poisson, correcting for draws being underestimated. -0.1 is a reasonable
   * starting default; ideally fit from stored match history via MLE once
   * enough results have accumulated.
   */
  dixonColesRho?: number;
  maxGoals?: number;
}

export interface ExpectedGoals {
  home: number;
  away: number;
}

export interface OutcomeProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
}

const DEFAULT_DIXON_COLES_RHO = -0.1;
const DEFAULT_MAX_GOALS = 10;

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poissonPmf(k: number, lambda: number): number {
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/** Dixon-Coles (1997) tau adjustment for low-scoring correlation between home and away goals. */
function dixonColesTau(homeGoals: number, awayGoals: number, lambda: number, mu: number, rho: number): number {
  if (homeGoals === 0 && awayGoals === 0) return 1 - lambda * mu * rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + lambda * rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + mu * rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}

export function computeExpectedGoals(inputs: PoissonModelInputs): ExpectedGoals {
  const home =
    inputs.leagueAvgGoalsHome *
    inputs.homeAttackStrength *
    inputs.awayDefenseStrength *
    (inputs.homeFormMultiplier ?? 1) *
    (inputs.homeAbsenceImpact ?? 1);

  const away =
    inputs.leagueAvgGoalsAway *
    inputs.awayAttackStrength *
    inputs.homeDefenseStrength *
    (inputs.awayFormMultiplier ?? 1) *
    (inputs.awayAbsenceImpact ?? 1);

  return { home, away };
}

/** Scoreline probability grid, indexed [homeGoals][awayGoals], Dixon-Coles adjusted and renormalized. */
export function scorelineProbabilityGrid(
  expectedGoals: ExpectedGoals,
  options?: { dixonColesRho?: number; maxGoals?: number }
): number[][] {
  const rho = options?.dixonColesRho ?? DEFAULT_DIXON_COLES_RHO;
  const maxGoals = options?.maxGoals ?? DEFAULT_MAX_GOALS;
  const { home: lambda, away: mu } = expectedGoals;

  const grid: number[][] = [];
  let total = 0;

  for (let h = 0; h <= maxGoals; h++) {
    const row: number[] = [];
    for (let a = 0; a <= maxGoals; a++) {
      const base = poissonPmf(h, lambda) * poissonPmf(a, mu);
      const adjusted = base * dixonColesTau(h, a, lambda, mu, rho);
      row.push(adjusted);
      total += adjusted;
    }
    grid.push(row);
  }

  // The tau adjustment shifts a small amount of mass on/off the low-score
  // cells, so the raw grid no longer sums to exactly 1 - renormalize so the
  // derived outcome probabilities are a valid distribution.
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      grid[h][a] /= total;
    }
  }

  return grid;
}

export function outcomeProbabilitiesFromGrid(grid: number[][]): OutcomeProbabilities {
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h].length; a++) {
      const p = grid[h][a];
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
  }

  return { homeWin, draw, awayWin };
}

export function predictMatchOutcome(inputs: PoissonModelInputs): OutcomeProbabilities {
  const expectedGoals = computeExpectedGoals(inputs);
  const grid = scorelineProbabilityGrid(expectedGoals, {
    dixonColesRho: inputs.dixonColesRho,
    maxGoals: inputs.maxGoals,
  });
  return outcomeProbabilitiesFromGrid(grid);
}
