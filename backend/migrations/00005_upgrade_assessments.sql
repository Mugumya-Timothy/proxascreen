-- +goose Up
ALTER TABLE assessments
    ADD COLUMN alcohol_consumption      VARCHAR NOT NULL DEFAULT 'no',
    ADD COLUMN model_confidence         FLOAT   NOT NULL DEFAULT 0,
    ADD COLUMN risk_explanation         TEXT    NOT NULL DEFAULT '',
    ADD COLUMN top_contributing_factors JSONB   NOT NULL DEFAULT '[]',
    ADD COLUMN clinical_recommendation  TEXT    NOT NULL DEFAULT '',
    ADD COLUMN feature_importances      JSONB   NOT NULL DEFAULT '{}';

-- Drop the temporary defaults so new rows must supply real values.
ALTER TABLE assessments
    ALTER COLUMN alcohol_consumption      DROP DEFAULT,
    ALTER COLUMN model_confidence         DROP DEFAULT,
    ALTER COLUMN risk_explanation         DROP DEFAULT,
    ALTER COLUMN top_contributing_factors DROP DEFAULT,
    ALTER COLUMN clinical_recommendation  DROP DEFAULT,
    ALTER COLUMN feature_importances      DROP DEFAULT;

-- +goose Down
ALTER TABLE assessments
    DROP COLUMN IF EXISTS alcohol_consumption,
    DROP COLUMN IF EXISTS model_confidence,
    DROP COLUMN IF EXISTS risk_explanation,
    DROP COLUMN IF EXISTS top_contributing_factors,
    DROP COLUMN IF EXISTS clinical_recommendation,
    DROP COLUMN IF EXISTS feature_importances;
