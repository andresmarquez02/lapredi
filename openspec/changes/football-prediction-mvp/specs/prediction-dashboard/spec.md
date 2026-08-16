## Purpose

Displays a fixture's prediction to the user with an intuitive breakdown of the statistical and qualitative factors that drove it, so predictions are useful for decision-making rather than an opaque number.

## ADDED Requirements

### Requirement: Fixture view shows the probability breakdown
The system SHALL display a probability bar (or equivalent visual) for home win, draw, and away win for a fixture that has a stored prediction.

#### Scenario: User views a fixture with a prediction
- **WHEN** a user opens a fixture that has a stored prediction
- **THEN** the home win / draw / away win probabilities are shown visually

### Requirement: Fixture view shows contributing factors
The system SHALL display the factors behind the prediction, including statistical factors (e.g. recent form, home advantage, key absences) and qualitative factors the LLM considered (e.g. injury context, rotation, temperature deltas).

#### Scenario: User inspects why a prediction looks the way it does
- **WHEN** a user views a fixture's prediction detail
- **THEN** both the statistical factors and the LLM's qualitative factors are listed alongside the probabilities

### Requirement: Missing prediction is communicated clearly
The system SHALL indicate to the user when no prediction exists yet for a fixture, rather than showing empty or broken UI.

#### Scenario: Fixture has no prediction yet
- **WHEN** a user opens a fixture that has no stored prediction
- **THEN** the UI clearly states that a prediction is not yet available for that fixture
