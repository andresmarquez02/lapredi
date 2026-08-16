// Derives additional betting-style markets from the same scoreline
// probability grid the 1X2 outcome already comes from (see poisson.ts) - no
// new external data needed, since the grid already encodes the full
// home/away goal distribution. Mirrors the market depth of prediction-market
// sites (winner, over/under, both teams to score, handicap) using our own
// model instead of scraping/replicating theirs.

export interface OverUnderLine {
  line: number; // e.g. 2.5 total goals
  over: number;
  under: number;
}

export interface BttsMarket {
  yes: number;
  no: number;
}

export interface HandicapLine {
  /** Applied to the home team's scoreline; e.g. -1.5 means home must win by 2+ to cover. */
  line: number;
  homeCovers: number;
  awayCovers: number;
}

export interface ExactScoreProbability {
  home: number;
  away: number;
  probability: number;
}

export interface DerivedMarkets {
  overUnder: OverUnderLine[];
  btts: BttsMarket;
  handicaps: HandicapLine[];
  topScores: ExactScoreProbability[];
  /** Home 0..5 x Away 0..5 probability grid for the scoreline heatmap - a slice of the full model grid, not the raw scoreline market. */
  scoreGrid: number[][];
}

const OVER_UNDER_LINES = [0.5, 1.5, 2.5, 3.5];
const HANDICAP_LINES = [-1.5, -0.5, 0.5, 1.5];
const HEATMAP_MAX_GOALS = 5;

function computeOverUnder(grid: number[][], line: number): OverUnderLine {
  let over = 0;
  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h].length; a++) {
      if (h + a > line) over += grid[h][a];
    }
  }
  return { line, over, under: 1 - over };
}

function computeBtts(grid: number[][]): BttsMarket {
  let yes = 0;
  for (let h = 1; h < grid.length; h++) {
    for (let a = 1; a < grid[h].length; a++) {
      yes += grid[h][a];
    }
  }
  return { yes, no: 1 - yes };
}

function computeHandicap(grid: number[][], line: number): HandicapLine {
  let homeCovers = 0;
  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h].length; a++) {
      if (h + line > a) homeCovers += grid[h][a];
    }
  }
  return { line, homeCovers, awayCovers: 1 - homeCovers };
}

function computeTopScores(grid: number[][], count: number): ExactScoreProbability[] {
  const flat: ExactScoreProbability[] = [];
  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h].length; a++) {
      flat.push({ home: h, away: a, probability: grid[h][a] });
    }
  }
  return flat.sort((a, b) => b.probability - a.probability).slice(0, count);
}

function extractHeatmapSlice(grid: number[][], maxGoals: number): number[][] {
  return grid.slice(0, maxGoals + 1).map((row) => row.slice(0, maxGoals + 1));
}

export function deriveMarkets(grid: number[][]): DerivedMarkets {
  return {
    overUnder: OVER_UNDER_LINES.map((line) => computeOverUnder(grid, line)),
    btts: computeBtts(grid),
    handicaps: HANDICAP_LINES.map((line) => computeHandicap(grid, line)),
    topScores: computeTopScores(grid, 5),
    scoreGrid: extractHeatmapSlice(grid, HEATMAP_MAX_GOALS),
  };
}
