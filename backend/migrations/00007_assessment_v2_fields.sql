-- +goose Up
-- New columns introduced by the v2 model update:
-- • family_history fields replace the legacy boolean with a weighted float score
-- • symptom fields store the clinical symptom assessment layer
-- • base/final risk level distinguish raw model output from symptom-adjusted output
-- • age_advisory stores the 40-44 caution text when applicable

ALTER TABLE assessments
    ADD COLUMN family_history_score       FLOAT   NOT NULL DEFAULT 0.0,
    ADD COLUMN family_history_relatives   TEXT    NOT NULL DEFAULT '[]',
    ADD COLUMN family_history_detail      JSONB   NOT NULL DEFAULT '{}',
    ADD COLUMN symptom_score              FLOAT   NOT NULL DEFAULT 0.0,
    ADD COLUMN symptoms_present           TEXT    NOT NULL DEFAULT '[]',
    ADD COLUMN symptom_adjustment_applied BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN symptom_adjustment         JSONB   NOT NULL DEFAULT '{}',
    ADD COLUMN base_risk_level            TEXT    NOT NULL DEFAULT '',
    ADD COLUMN final_risk_level           TEXT    NOT NULL DEFAULT '',
    ADD COLUMN age_advisory_shown         BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN age_advisory               TEXT    NOT NULL DEFAULT '',
    ADD COLUMN raw_symptom_dict           JSONB   NOT NULL DEFAULT '{}';

-- +goose Down
ALTER TABLE assessments
    DROP COLUMN IF EXISTS family_history_score,
    DROP COLUMN IF EXISTS family_history_relatives,
    DROP COLUMN IF EXISTS family_history_detail,
    DROP COLUMN IF EXISTS symptom_score,
    DROP COLUMN IF EXISTS symptoms_present,
    DROP COLUMN IF EXISTS symptom_adjustment_applied,
    DROP COLUMN IF EXISTS symptom_adjustment,
    DROP COLUMN IF EXISTS base_risk_level,
    DROP COLUMN IF EXISTS final_risk_level,
    DROP COLUMN IF EXISTS age_advisory_shown,
    DROP COLUMN IF EXISTS age_advisory,
    DROP COLUMN IF EXISTS raw_symptom_dict;
