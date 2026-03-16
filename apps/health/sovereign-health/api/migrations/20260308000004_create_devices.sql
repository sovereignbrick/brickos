-- M03: Devices — physical measurement devices owned by users.
-- user_id is nullable: NULL rows are catalogue templates (Fora 6, Qardio Arm, Qardiobase).
-- When a user registers, templates can be copied into user-owned rows.

CREATE TABLE IF NOT EXISTS devices (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID        REFERENCES users(id) ON DELETE CASCADE,  -- NULL = catalogue template
    device_name          TEXT        NOT NULL,
    device_nickname      TEXT,                    -- user-assigned alias
    device_type          TEXT        NOT NULL,    -- blood_analyzer | bp_monitor | scale | manual | lab
    status               TEXT        NOT NULL DEFAULT 'active',  -- active | archived | decommissioned
    markers_measured     TEXT[]      NOT NULL DEFAULT '{}',      -- array of marker_slugs
    measurement_location TEXT,                    -- left_middle_finger | left_arm | etc.
    calibration_notes    TEXT,
    known_bias           TEXT,                    -- e.g. "+0.15 mmol/L glucose"
    is_template          BOOLEAN     NOT NULL DEFAULT false,
    is_deleted           BOOLEAN     NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    decommissioned_at    TIMESTAMPTZ
);

-- Seed: catalogue templates (user_id = NULL, is_template = true)
INSERT INTO devices (id, user_id, device_name, device_type, status, markers_measured, measurement_location, is_template)
VALUES
    (gen_random_uuid(), NULL, 'Fora 6 Connect', 'blood_analyzer', 'active',
     ARRAY['glucose','ketones','total_cholesterol','uric_acid','hemoglobin','hematocrit'],
     'left_middle_finger', true),

    (gen_random_uuid(), NULL, 'Qardio Arm', 'bp_monitor', 'active',
     ARRAY['bp_systolic','bp_diastolic','heart_rate'],
     'left_arm', true),

    (gen_random_uuid(), NULL, 'Qardiobase 2', 'scale', 'active',
     ARRAY['weight'],
     NULL, true)
ON CONFLICT DO NOTHING;

-- Index for user device lookups
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id) WHERE user_id IS NOT NULL;
