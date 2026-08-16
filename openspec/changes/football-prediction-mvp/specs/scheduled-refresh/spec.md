## Purpose

Keeps fixture and lineup data current automatically, via scheduled jobs, so predictions are computed against up-to-date information without manual triggering.

## ADDED Requirements

### Requirement: Upcoming fixtures refresh daily
The system SHALL refresh the list of upcoming fixtures for tracked leagues on a daily schedule.

#### Scenario: Daily fixture refresh runs
- **WHEN** the daily fixture refresh job runs
- **THEN** upcoming fixtures for all tracked leagues are fetched and upserted into the database

### Requirement: Lineups refresh frequently near kickoff
The system SHALL refresh lineup data for a fixture at short intervals as its kickoff time approaches.

#### Scenario: Fixture approaching kickoff
- **WHEN** a fixture's kickoff time is within the near-kickoff window
- **THEN** the lineup refresh job runs at short intervals for that fixture until the lineup is confirmed or the match starts

### Requirement: Lineup refresh stops once no longer needed
The system SHALL stop refreshing lineups for a fixture once the lineup is confirmed or the match has started.

#### Scenario: Lineup confirmed
- **WHEN** a fixture's official lineup has been confirmed
- **THEN** no further lineup refresh calls are made for that fixture
