-- M03: Measurements — the core fact table. Every user-entered data point lives here.
-- Extended lifestyle context fields are optional (extended_entry_enabled in user_preferences).
-- status (green/orange/red) is computed by the app and stored for query performance.

CREATE TABLE IF NOT EXISTS measurements (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    marker_id           UUID        NOT NULL REFERENCES markers(id),
    device_id           UUID        REFERENCES devices(id),          -- NULL = manually typed
    timestamp           TIMESTAMPTZ NOT NULL,                        -- when the measurement was taken
    value_canonical     NUMERIC(12,4) NOT NULL,                      -- stored in unit_canonical
    unit_canonical      TEXT        NOT NULL,
    status              TEXT,                                        -- green | orange | red (cached)

    -- Protocol context
    protocol_tag        TEXT        NOT NULL DEFAULT 'standard',     -- standard | fasting
    diet_protocol       TEXT,  -- carnivore | keto | vegan | only_fish | mixed | custom (when standard)
    fasting_protocol    TEXT,  -- 16_8 | omad | 36h | 48h | 72h | extended | custom (when fasting)
    fast_start_datetime TIMESTAMPTZ,                                 -- links measurements within a fast
    fasting_hours       INT,                                         -- auto-calc or manual override

    -- Meal timing
    meal_timing_tag     TEXT        NOT NULL DEFAULT 'no_tag',       -- before | 30m_after | 1h_after | 2h_after | 3h_after | no_tag

    -- Lifestyle context (shown when extended_entry_enabled = true)
    exercise_activity   TEXT,   -- none | light | moderate | intense
    exercise_timing     TEXT,   -- pre | during | post
    sleep_hours         NUMERIC(4,1),
    sleep_quality       TEXT,   -- poor | fair | good | excellent
    stress_level        INT     CHECK (stress_level BETWEEN 1 AND 10),
    lifestyle_note      TEXT    CHECK (char_length(lifestyle_note) <= 300),

    -- Soft delete
    is_deleted          BOOLEAN     NOT NULL DEFAULT false,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Required indexes (acceptance criteria)
CREATE INDEX IF NOT EXISTS idx_measurements_user_timestamp ON measurements(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_marker_id      ON measurements(marker_id);

-- Supporting indexes
CREATE INDEX IF NOT EXISTS idx_measurements_user_marker    ON measurements(user_id, marker_id);
CREATE INDEX IF NOT EXISTS idx_measurements_active         ON measurements(user_id, timestamp DESC)
    WHERE is_deleted = false;
