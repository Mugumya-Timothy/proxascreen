-- +goose Up
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id         VARCHAR     UNIQUE NOT NULL,
    full_name        VARCHAR     NOT NULL,
    email            VARCHAR     UNIQUE NOT NULL,
    phone            VARCHAR,
    role             VARCHAR     NOT NULL CHECK (role IN ('admin', 'clinician')),
    temp_password    VARCHAR,
    is_password_reset BOOLEAN    NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS users;
