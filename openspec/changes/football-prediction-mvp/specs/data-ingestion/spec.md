## Purpose

Fetches, normalizes, and caches football data from external providers (API-Football, TheStatsAPI, Highlightly) into the database, so the rest of the system reads from the cache instead of repeatedly hitting rate-limited external APIs.

## ADDED Requirements

### Requirement: Highlightly is the primary data source for current data
The system SHALL use Highlightly as the primary source for current-season fixtures, teams, and lineups. (API-Football's free plan only serves the 2022-2024 seasons and TheStatsAPI's key currently has no active subscription — both confirmed unusable for current data as of this capability's implementation.)

#### Scenario: Current fixture data requested
- **WHEN** the system needs current-season fixture, team, or lineup data and it is not already cached and fresh
- **THEN** it is fetched from Highlightly

### Requirement: Secondary sources are used only where they add value Highlightly doesn't cover
The system SHALL use API-Football only for historical reference data (2022-2024 seasons, e.g. as a baseline input to the statistical model), not for current-season fixtures. The system SHALL treat TheStatsAPI as disabled until its subscription is reactivated, at which point it may be used for data it covers that Highlightly doesn't (e.g. dedicated injury/suspension endpoints).

#### Scenario: Historical baseline data needed
- **WHEN** the system needs historical (2022-2024 season) match data as a statistical baseline
- **THEN** it is fetched from API-Football

#### Scenario: TheStatsAPI is disabled
- **WHEN** the system would otherwise call TheStatsAPI
- **THEN** the call is skipped and the system proceeds without that data, rather than failing, until the source is re-enabled in config

### Requirement: Cached fixture-detail data is reused within a 5-minute window
The system SHALL trigger a fixture's data refresh from the fixture-detail view being opened, not from a background sweep: if that fixture's cached data (stats, injuries, lineup, weather) is less than 5 minutes old, no external API call is made; if it is 5 minutes old or missing, the system refreshes it before returning the detail view.

#### Scenario: Fixture detail viewed with fresh cache
- **WHEN** a user opens a fixture's detail view and its cached data is less than 5 minutes old
- **THEN** no external API call is made and the cached data is returned

#### Scenario: Fixture detail viewed with stale cache
- **WHEN** a user opens a fixture's detail view and its cached data is 5 minutes old or older, or missing
- **THEN** the system refreshes that fixture's data from the appropriate source(s) before returning the detail view

### Requirement: External API failures degrade gracefully
The system SHALL NOT fail an entire ingestion run because one external API call errors or times out.

#### Scenario: One provider is unavailable
- **WHEN** an external API call to one provider fails (timeout, error response, rate limit)
- **THEN** the failure is recorded, ingestion continues for other data, and previously cached data for the failed item (if any) remains usable
