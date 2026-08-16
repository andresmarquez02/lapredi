export interface KeyAbsence {
  playerName: string;
  role?: string;
  reason: string;
}

export interface RecentResult {
  opponent: string;
  goalsFor: number;
  goalsAgainst: number;
  result: "win" | "draw" | "loss";
  date: string;
}

export interface NewsHeadline {
  title: string;
  publishedAt: string;
}

/**
 * Facts already fetched, verified, and stored in the database for a fixture.
 * This is the ONLY information the LLM prompt is built from - it must never
 * be supplemented with the model's own general knowledge of teams/players.
 */
export interface QualitativeMatchContext {
  homeTeamName: string;
  awayTeamName: string;
  homeKeyAbsences: KeyAbsence[];
  awayKeyAbsences: KeyAbsence[];
  homeRecentResults: RecentResult[];
  awayRecentResults: RecentResult[];
  homeLineupRotationNote?: string;
  awayLineupRotationNote?: string;
  venue?: string;
  weatherCondition?: string;
  temperatureCelsius?: number;
  referee?: string;
  homeRecentNews?: NewsHeadline[];
  awayRecentNews?: NewsHeadline[];
  /** Highlightly's own prematch model prediction, shown as an external reference point - never fed as ground truth to reason from as if it were a verified fact. */
  externalModelEstimate?: { home: number; draw: number; away: number; source: string };
}
