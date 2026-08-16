## Purpose

Combines the statistical model's probability distribution with the LLM's probability distribution into a single final prediction, and persists all components so the weighting can be evaluated and tuned later via backtesting.

## ADDED Requirements

### Requirement: Final prediction is a weighted average of both components
The system SHALL compute the final probability distribution as a weighted average of the statistical model's distribution and the LLM's distribution, using a configurable weight that defaults to favoring the statistical model.

#### Scenario: Both components available
- **WHEN** both a statistical probability distribution and a valid LLM probability distribution exist for a fixture
- **THEN** the final distribution is their weighted average using the configured weight

### Requirement: Missing LLM probability falls back to the statistical model
The system SHALL use the statistical model's probability distribution as the final prediction when no valid LLM probability distribution is available for a fixture.

#### Scenario: LLM analysis unavailable or invalid
- **WHEN** the LLM probability distribution for a fixture is missing or was discarded as invalid
- **THEN** the final prediction equals the statistical model's distribution

### Requirement: All prediction components are persisted for backtesting
The system SHALL persist the statistical probability, the LLM probability (when available), and the final ensemble probability for every generated prediction.

#### Scenario: Prediction generated and stored
- **WHEN** a final prediction is computed for a fixture
- **THEN** the statistical, LLM (if present), and final probabilities are all saved to the prediction record
