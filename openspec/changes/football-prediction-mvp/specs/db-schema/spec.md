## Purpose

Defines the persistent Postgres schema (Supabase) that stores teams, fixtures, team form stats, and predictions, acting as the system's cache and historical record so external APIs are not re-queried for data already known.

## ADDED Requirements

### Requirement: Teams are stored with a stable identity
The system SHALL store each team with a unique identifier tied to its external API ID, so the same team is never duplicated across ingestion runs.

#### Scenario: Same team ingested twice
- **WHEN** ingestion processes a team whose external API ID already exists in the database
- **THEN** the existing team row is updated in place, not duplicated

### Requirement: Fixtures are stored with a stable identity and status
The system SHALL store each fixture keyed by its external API ID, including home team, away team, kickoff time, and match status (scheduled, live, finished).

#### Scenario: Fixture re-ingested before kickoff
- **WHEN** ingestion fetches a fixture whose external API ID already exists
- **THEN** the existing fixture row is updated (e.g. kickoff time or status change) instead of creating a second row

### Requirement: Team form stats are stored per team per period
The system SHALL store recent-form aggregates (e.g. goals scored/conceded, results over recent matches) per team, associated with the period they were computed for.

#### Scenario: Form stats refreshed after a matchday
- **WHEN** a tracked team completes a new match
- **THEN** its form stats record is refreshed to include that match in the recent-form window

### Requirement: Predictions retain both component probabilities and the outcome
The system SHALL store, per fixture prediction, the statistical model's probability distribution, the LLM's probability distribution, the final ensemble probability distribution, and (once available) the actual match result.

#### Scenario: Prediction recorded before kickoff
- **WHEN** a prediction is generated for an upcoming fixture
- **THEN** the statistical probability, LLM probability, and final probability are all persisted, with the actual result left unset until the match finishes

#### Scenario: Result reconciled after fulltime
- **WHEN** a fixture with a stored prediction reaches finished status with a final score
- **THEN** the prediction record is updated with the actual result, enabling later backtesting of both the statistical and LLM components
