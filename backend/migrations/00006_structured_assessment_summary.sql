-- +goose Up
ALTER TABLE assessments
    ADD COLUMN active_risk_factors    JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN protective_factors     JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN summary_text           TEXT  NOT NULL DEFAULT '',
    ADD COLUMN lifestyle_factor_notes JSONB NOT NULL DEFAULT '[]';

-- Drop defaults so new rows must supply real values.
ALTER TABLE assessments
    ALTER COLUMN active_risk_factors    DROP DEFAULT,
    ALTER COLUMN protective_factors     DROP DEFAULT,
    ALTER COLUMN summary_text           DROP DEFAULT,
    ALTER COLUMN lifestyle_factor_notes DROP DEFAULT;

-- +goose Down
ALTER TABLE assessments
    DROP COLUMN IF EXISTS active_risk_factors,
    DROP COLUMN IF EXISTS protective_factors,
    DROP COLUMN IF EXISTS summary_text,
    DROP COLUMN IF EXISTS lifestyle_factor_notes;
