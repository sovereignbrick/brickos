-- M05: Stores computed values for calculated markers (GKI, WHtR, BMI, HCT/HB, etc.)
-- These are auto-computed whenever base measurements are saved.

CREATE TABLE IF NOT EXISTS calculated_marker_values (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    calculated_marker_id  UUID        NOT NULL REFERENCES calculated_markers(id),
    value                 NUMERIC(12,4) NOT NULL,
    status                TEXT,                                    -- green | orange | red
    protocol_tag          TEXT        NOT NULL DEFAULT 'standard',
    fasting_protocol      TEXT,
    measured_at           TIMESTAMPTZ NOT NULL,                    -- same as source measurements
    is_deleted            BOOLEAN     NOT NULL DEFAULT false,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cmv_user_id     ON calculated_marker_values(user_id);
CREATE INDEX IF NOT EXISTS idx_cmv_marker_id   ON calculated_marker_values(calculated_marker_id);
CREATE INDEX IF NOT EXISTS idx_cmv_measured_at ON calculated_marker_values(user_id, measured_at DESC)
    WHERE is_deleted = false;
