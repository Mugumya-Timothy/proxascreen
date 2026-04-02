-- +goose Up
CREATE TABLE patients (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_number       VARCHAR     UNIQUE NOT NULL,
    full_name            VARCHAR     NOT NULL,
    age                  INTEGER     NOT NULL,
    date_of_submission   DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_by           UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS patients;
