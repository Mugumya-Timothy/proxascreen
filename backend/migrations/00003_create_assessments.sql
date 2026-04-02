-- +goose Up
CREATE TABLE assessments (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id              UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinician_id            UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    age                     FLOAT       NOT NULL,
    bmi                     FLOAT       NOT NULL,
    smoker                  BOOLEAN     NOT NULL,
    diet_type               VARCHAR     NOT NULL CHECK (diet_type IN ('fatty', 'mixed', 'healthy')),
    physical_activity_level VARCHAR     NOT NULL CHECK (physical_activity_level IN ('low', 'moderate', 'high')),
    family_history          BOOLEAN     NOT NULL,
    regular_health_checkup  BOOLEAN     NOT NULL,
    prostate_exam_done      BOOLEAN     NOT NULL,
    risk_level              VARCHAR     NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
    low_percentage          FLOAT       NOT NULL,
    medium_percentage       FLOAT       NOT NULL,
    high_percentage         FLOAT       NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS assessments;
