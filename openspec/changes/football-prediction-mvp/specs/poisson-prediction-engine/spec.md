## Purpose

Computes a statistical win/draw/loss probability distribution for a fixture using a Poisson goal-expectancy model corrected with Dixon-Coles, forming the quantitative half of the final prediction.

## ADDED Requirements

### Requirement: Expected goals derived from team strength and context
The system SHALL compute each team's expected goals for a fixture from its attack/defense strength, home advantage, recent form, and key player absences.

#### Scenario: Expected goals computed for a fixture
- **WHEN** a prediction is requested for a fixture with available team form stats
- **THEN** expected goals for the home and away team are computed incorporating attack/defense strength, home advantage, recent form, and any key absences

### Requirement: Dixon-Coles correction is applied
The system SHALL apply a Dixon-Coles correction to low-scoring outcome probabilities so draws are not systematically underestimated relative to the plain independent-Poisson assumption.

#### Scenario: Low-scoring outcomes evaluated
- **WHEN** the raw Poisson probabilities for low-scoring results (0-0, 1-0, 0-1, 1-1) are computed
- **THEN** the Dixon-Coles adjustment is applied to those outcomes before deriving win/draw/loss probabilities

### Requirement: League average goals is computed dynamically
The system SHALL compute the league average goals figure used by the model from current season data, rather than using a fixed constant.

#### Scenario: Prediction computed for a league fixture
- **WHEN** the model needs a league average goals value for a fixture's league/season
- **THEN** it is derived from the aggregated goals data of teams in that league/season stored in the database

### Requirement: Output is a normalized probability distribution
The system SHALL output home win, draw, and away win probabilities that sum to 1 (within floating point tolerance).

#### Scenario: Prediction generated
- **WHEN** the statistical model finishes computing a prediction for a fixture
- **THEN** the three outcome probabilities sum to 1 within a small floating point tolerance
