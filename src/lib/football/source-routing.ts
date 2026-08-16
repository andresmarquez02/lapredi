import { THESTATS_ENABLED } from "./thestats-client";

export type DataSource = "highlightly" | "api-football" | "thestats" | "disabled";

/**
 * Which provider serves which field. See design.md's "Per-field source
 * routing" decision: Highlightly is primary for current data (only source
 * confirmed to have 2026-season fixtures); API-Football is historical-only
 * (2022-2024 seasons); TheStatsAPI is disabled until its subscription is
 * reactivated.
 */
export const DATA_SOURCE_ROUTING: Record<string, DataSource> = {
  fixtures: "highlightly",
  teams: "highlightly",
  lineups: "highlightly",
  weather: "highlightly",
  historicalBaseline: "api-football",
  injuries: THESTATS_ENABLED ? "thestats" : "disabled",
};
