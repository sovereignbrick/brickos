-- M03: User identity tables — users, preferences, and profile.
-- user_preferences and user_profile are 1:1 with users; user_id is their PK.

CREATE TABLE IF NOT EXISTS users (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT        NOT NULL UNIQUE,
    password_hash  TEXT        NOT NULL,  -- argon2id hash
    display_name   TEXT,
    role           TEXT        NOT NULL DEFAULT 'user',  -- user | admin
    language       TEXT        NOT NULL DEFAULT 'en',
    timezone       TEXT        NOT NULL DEFAULT 'UTC',
    mfa_enabled    BOOLEAN     NOT NULL DEFAULT false,
    is_deleted     BOOLEAN     NOT NULL DEFAULT false,
    deleted_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id                 UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_format             TEXT        NOT NULL DEFAULT 'DD/MM/YYYY',  -- DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD
    time_format             TEXT        NOT NULL DEFAULT '24h',         -- 24h | 12h
    glucose_unit            TEXT        NOT NULL DEFAULT 'mmol/L',      -- mmol/L | mg/dL
    ketones_unit            TEXT        NOT NULL DEFAULT 'mmol/L',
    cholesterol_unit        TEXT        NOT NULL DEFAULT 'mmol/L',      -- mmol/L | mg/dL
    uric_acid_unit          TEXT        NOT NULL DEFAULT 'µmol/L',      -- µmol/L | mg/dL
    hemoglobin_unit         TEXT        NOT NULL DEFAULT 'mmol/L',      -- mmol/L | g/dL
    weight_unit             TEXT        NOT NULL DEFAULT 'kg',          -- kg | lbs
    height_unit             TEXT        NOT NULL DEFAULT 'cm',          -- cm | in
    bp_unit                 TEXT        NOT NULL DEFAULT 'mmHg',
    waist_unit              TEXT        NOT NULL DEFAULT 'cm',          -- cm | in
    extended_entry_enabled  BOOLEAN     NOT NULL DEFAULT false,         -- show lifestyle fields in entry form
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profile (
    user_id    UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gender     TEXT,                 -- male | female | other
    age        INT,                  -- years, used for BMR/reference range context
    height_cm  NUMERIC(5,1),         -- static; used for BMI + WHtR calculations
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted) WHERE is_deleted = false;
