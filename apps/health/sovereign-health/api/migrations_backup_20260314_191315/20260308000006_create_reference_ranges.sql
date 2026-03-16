-- M03: Reference ranges — traffic-light thresholds per marker per protocol context.
-- Evaluation logic:
--   orange_min <= value <= orange_max  → within acceptable bounds
--   green_min  <= value <= green_max   → optimal (subset of orange range)
--   value < orange_min OR > orange_max → RED
--   value in orange but outside green  → ORANGE
--   value in green                     → GREEN
-- user_id NULL = system default; user_id set = user customisation.
-- Partial unique index prevents duplicate system defaults per marker+protocol.

CREATE TABLE IF NOT EXISTS reference_ranges (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        REFERENCES users(id) ON DELETE CASCADE,  -- NULL = system default
    marker_id        UUID        NOT NULL REFERENCES markers(id),
    protocol_context TEXT        NOT NULL DEFAULT 'standard',
        -- standard | fasting_16_8 | fasting_48h | fasting_extended
        -- standard_keto | standard_carnivore (future)
    orange_min       NUMERIC(12,4),  -- lower acceptable bound (NULL = no lower limit)
    green_min        NUMERIC(12,4),  -- lower optimal bound
    green_max        NUMERIC(12,4),  -- upper optimal bound
    orange_max       NUMERIC(12,4),  -- upper acceptable bound (NULL = no upper limit)
    is_custom        BOOLEAN     NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique: one system default per (marker, protocol_context)
CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_ranges_system_default
    ON reference_ranges (marker_id, protocol_context)
    WHERE user_id IS NULL;

-- Unique: one user override per (user, marker, protocol_context)
CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_ranges_user
    ON reference_ranges (user_id, marker_id, protocol_context)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reference_ranges_marker ON reference_ranges(marker_id);

-- ============================================================
-- SEED: Default reference ranges (user_id = NULL, protocol_context = 'standard')
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    -- glucose mmol/L: fasting optimal 3.9–5.5, acceptable 3.5–6.9
    ('glucose',             3.5,   3.9,  5.5,   6.9),
    -- ketones mmol/L: standard (non-keto) - trace is normal
    ('ketones',             0.0,   0.0,  0.5,   1.0),
    -- total_cholesterol mmol/L: optimal < 5.0, acceptable up to 6.5
    ('total_cholesterol',   3.0,   3.5,  5.0,   6.5),
    -- uric_acid µmol/L (from spec: green 280–360, orange 360–450, red >480)
    ('uric_acid',           150.0, 180.0, 360.0, 450.0),
    -- hemoglobin mmol/L (Fora 6 unit; men 8.1–11.2, women 7.4–9.9 — blended range)
    ('hemoglobin',          6.5,   7.5,  11.0,  12.5),
    -- hematocrit % (men 38–49, women 35–45 — blended range)
    ('hematocrit',          33.0,  36.0, 50.0,  53.0),
    -- bp_systolic mmHg (optimal <120, acceptable <130)
    ('bp_systolic',         80.0,  90.0, 120.0, 130.0),
    -- bp_diastolic mmHg
    ('bp_diastolic',        55.0,  60.0, 80.0,  90.0),
    -- heart_rate bpm (resting)
    ('heart_rate',          45.0,  55.0, 85.0,  100.0),
    -- weight kg: no universal range; NULL means app uses profile BMI/WHtR instead
    ('weight',              NULL,  NULL, NULL,  NULL),
    -- waist_circumference cm: no universal range; WHtR calculated marker handles risk
    ('waist_circumference', NULL,  NULL, NULL,  NULL),
    -- insulin µIU/mL: fasting; optimal <10, acceptable <18, >25 = resistance
    ('insulin',             2.0,   3.0,  10.0,  18.0)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Protocol-specific overrides for glucose, ketones, uric_acid
-- (spec: fasting shifts thresholds to accommodate expected physiological changes)
-- ============================================================

-- GLUCOSE — fasting protocol overrides (lower glucose expected during fasts)
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, r.protocol_context, r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('fasting_16_8',      3.0, 3.5, 5.0, 6.0),
    ('fasting_48h',       2.5, 3.0, 4.5, 5.5),
    ('fasting_extended',  2.0, 2.5, 4.0, 5.0)
) AS r(protocol_context, orange_min, green_min, green_max, orange_max)
CROSS JOIN markers m WHERE m.marker_slug = 'glucose'
ON CONFLICT DO NOTHING;

-- KETONES — fasting protocol overrides (higher ketones expected during fasts)
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, r.protocol_context, r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('fasting_16_8',      0.3, 0.5, 2.0, 4.0),
    ('fasting_48h',       0.5, 1.0, 3.5, 5.0),
    ('fasting_extended',  1.0, 2.0, 5.0, 7.0)  -- above 7–8 watch for DKA (non-diabetic context)
) AS r(protocol_context, orange_min, green_min, green_max, orange_max)
CROSS JOIN markers m WHERE m.marker_slug = 'ketones'
ON CONFLICT DO NOTHING;

-- URIC ACID — fasting protocol overrides (UA rises during fasting; kidneys conserve it)
-- Thresholds from spec: standard 280–360 green / 360–450 orange
--   fasting 16:8: green 280–380, orange 380–480
--   fasting 48h:  green 280–420, orange 420–520
--   fasting extended: green 280–450, orange 450–560
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, r.protocol_context, r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('fasting_16_8',      150.0, 180.0, 380.0, 480.0),
    ('fasting_48h',       150.0, 180.0, 420.0, 520.0),
    ('fasting_extended',  150.0, 180.0, 450.0, 560.0)
) AS r(protocol_context, orange_min, green_min, green_max, orange_max)
CROSS JOIN markers m WHERE m.marker_slug = 'uric_acid'
ON CONFLICT DO NOTHING;
