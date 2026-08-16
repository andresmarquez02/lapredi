## Purpose

Uses an LLM to reason over verified qualitative match context — injuries, narrow-margin form streaks, lineup rotation, temperature deltas — and produce an independent probability distribution, without inventing facts not present in the stored data.

## ADDED Requirements

### Requirement: LLM input is restricted to verified stored facts
The system SHALL construct the LLM's input only from structured facts already verified and stored in the database (e.g. injured key players, recent narrow-margin results, lineup rotation signals, temperature deltas). The system SHALL NOT rely on the LLM's own general knowledge of teams, players, or match history.

#### Scenario: Qualitative analysis requested for a fixture
- **WHEN** the system requests an LLM analysis for a fixture
- **THEN** the prompt includes only facts retrieved from the database for that fixture, and instructs the model to reason solely from those facts

### Requirement: LLM output is a structured probability distribution
The system SHALL require the LLM to return its analysis as a structured (JSON) object containing home win, draw, and away win probabilities, not free-form prose.

#### Scenario: LLM responds to an analysis request
- **WHEN** the LLM returns a response for a fixture analysis
- **THEN** the response conforms to the expected JSON schema with three numeric probabilities

### Requirement: Malformed or invalid LLM output falls back gracefully
The system SHALL detect when the LLM's output is malformed, missing, or does not represent a valid probability distribution (three non-negative numbers summing to ~1), and SHALL treat that fixture as having no LLM probability rather than using invalid data.

#### Scenario: LLM returns invalid output
- **WHEN** the LLM response cannot be parsed as the expected JSON schema, or the probabilities do not sum to ~1
- **THEN** the system discards that output and records the fixture as having no usable LLM probability for this analysis
