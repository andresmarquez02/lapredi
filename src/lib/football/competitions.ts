export interface TrackedCompetition {
  slug: string;
  name: string;
  /** Highlightly league ID (primary source for current-season data). Confirmed live 2026-08-16. */
  highlightlyLeagueId: number;
  /** API-Football league ID (secondary source, historical 2022-2024 seasons only on the free plan). Confirmed live 2026-08-16. */
  apiFootballLeagueId: number;
  /** odds-api.io league slug for bookmaker odds. Confirmed live 2026-08-16. UCL/UEL have no clean main-phase slug yet this early in the season (only qualifying/playoff entries exist) - null until it appears. */
  oddsApiSlug: string | null;
  /** Highlightly's own league badge, observed live 2026-08-16 following the pattern .../leagues/{highlightlyLeagueId}.png. */
  logoUrl: string;
}

export const TRACKED_COMPETITIONS: TrackedCompetition[] = [
  {
    slug: "serie-a",
    name: "Serie A",
    highlightlyLeagueId: 115669,
    apiFootballLeagueId: 135,
    oddsApiSlug: "italy-serie-a",
    logoUrl: "https://highlightly.net/soccer/images/leagues/115669.png",
  },
  {
    slug: "ligue-1",
    name: "Ligue 1",
    highlightlyLeagueId: 52695,
    apiFootballLeagueId: 61,
    oddsApiSlug: "france-ligue-1",
    logoUrl: "https://highlightly.net/soccer/images/leagues/52695.png",
  },
  {
    slug: "premier-league",
    name: "Premier League",
    highlightlyLeagueId: 33973,
    apiFootballLeagueId: 39,
    oddsApiSlug: "england-premier-league",
    logoUrl: "https://highlightly.net/soccer/images/leagues/33973.png",
  },
  {
    slug: "la-liga",
    name: "La Liga",
    highlightlyLeagueId: 119924,
    apiFootballLeagueId: 140,
    oddsApiSlug: "spain-laliga",
    logoUrl: "https://highlightly.net/soccer/images/leagues/119924.png",
  },
  {
    slug: "bundesliga",
    name: "Bundesliga",
    highlightlyLeagueId: 67162,
    apiFootballLeagueId: 78,
    oddsApiSlug: "germany-bundesliga",
    logoUrl: "https://highlightly.net/soccer/images/leagues/67162.png",
  },
  {
    slug: "champions-league",
    name: "UEFA Champions League",
    highlightlyLeagueId: 2486,
    apiFootballLeagueId: 2,
    oddsApiSlug: null,
    logoUrl: "https://highlightly.net/soccer/images/leagues/2486.png",
  },
  {
    slug: "europa-league",
    name: "UEFA Europa League",
    highlightlyLeagueId: 3337,
    apiFootballLeagueId: 3,
    oddsApiSlug: null,
    logoUrl: "https://highlightly.net/soccer/images/leagues/3337.png",
  },
];
