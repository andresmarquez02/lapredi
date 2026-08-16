export interface FinishedFixtureScore {
  homeGoals: number;
  awayGoals: number;
}

export interface LeagueAverageGoals {
  home: number;
  away: number;
}

/** Computes league-average goals per match from stored finished fixtures for a league/season, instead of a fixed constant. */
export function computeLeagueAverageGoals(fixtures: FinishedFixtureScore[]): LeagueAverageGoals {
  if (fixtures.length === 0) {
    throw new Error("Cannot compute league average goals from an empty fixture list");
  }

  const totals = fixtures.reduce(
    (acc, f) => ({
      home: acc.home + f.homeGoals,
      away: acc.away + f.awayGoals,
    }),
    { home: 0, away: 0 }
  );

  return {
    home: totals.home / fixtures.length,
    away: totals.away / fixtures.length,
  };
}
