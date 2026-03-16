-- M03: Calculated markers — derived biomarkers computed from base measurements.
-- The 7 free-tier markers use only home devices (Fora 6, Qardio, manual tape + profile height).
-- default_thresholds and protocol_overrides are JSONB following the same green/orange logic
-- as reference_ranges: orange range wraps green; outside orange = red.
-- base_markers_required: array of marker_slugs needed to compute this marker.

CREATE TABLE IF NOT EXISTS calculated_markers (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_slug           TEXT        NOT NULL UNIQUE,
    marker_name           TEXT        NOT NULL,
    zone_id               UUID        NOT NULL REFERENCES zones(id),
    formula_description   TEXT        NOT NULL,   -- human-readable; computation is in Rust
    base_markers_required TEXT[]      NOT NULL,   -- marker_slugs from markers table (or 'profile_height')
    source_type           TEXT        NOT NULL,   -- home | lab | hybrid
    free_tier             BOOLEAN     NOT NULL DEFAULT true,
    protocol_aware        BOOLEAN     NOT NULL DEFAULT false,
    display_order         INT         NOT NULL,
    default_thresholds    JSONB       NOT NULL DEFAULT '{}',
    protocol_overrides    JSONB       NOT NULL DEFAULT '{}',  -- keyed by protocol_context
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SEED: 7 free-tier calculated markers
-- ============================================================

-- 1. GKI — Glucose-Ketone Index (Thomas Seyfried / fasting depth proxy)
INSERT INTO calculated_markers (
    id, marker_slug, marker_name, zone_id,
    formula_description, base_markers_required,
    source_type, free_tier, protocol_aware, display_order,
    default_thresholds, protocol_overrides
)
SELECT
    gen_random_uuid(),
    'gki', 'GKI — Glucose-Ketone Index', z.id,
    'Glucose (mmol/L) ÷ Ketones (mmol/L)',
    ARRAY['glucose', 'ketones'],
    'home', true, true, 1,
    '{"orange_min": 3.0, "green_min": 3.0, "green_max": 6.0, "orange_max": 9.0}'::jsonb,
    '{
        "standard_keto":    {"orange_min": 3.0, "green_min": 3.0, "green_max": 6.0, "orange_max": 9.0},
        "fasting_16_8":     {"orange_min": 3.0, "green_min": 3.0, "green_max": 9.0, "orange_max": 15.0},
        "fasting_48h":      {"orange_min": 1.0, "green_min": 1.0, "green_max": 3.0, "orange_max": 6.0},
        "fasting_extended": {"orange_min": 0.0, "green_min": 0.0, "green_max": 1.0, "orange_max": 3.0}
    }'::jsonb
FROM zones z WHERE z.zone_slug = 'energy_metabolic'
ON CONFLICT (marker_slug) DO NOTHING;

-- 2. Dr. Boz Ratio (US popular GKI variant — displayed as secondary readout under GKI)
INSERT INTO calculated_markers (
    id, marker_slug, marker_name, zone_id,
    formula_description, base_markers_required,
    source_type, free_tier, protocol_aware, display_order,
    default_thresholds, protocol_overrides
)
SELECT
    gen_random_uuid(),
    'dr_boz_ratio', 'Dr. Boz Ratio', z.id,
    'Glucose (mg/dL) ÷ Ketones (mmol/L)  [= GKI × 18]',
    ARRAY['glucose', 'ketones'],
    'home', true, false, 2,
    '{"orange_min": 0.0, "green_min": 0.0, "green_max": 40.0, "orange_max": 80.0}'::jsonb,
    '{}'::jsonb
FROM zones z WHERE z.zone_slug = 'energy_metabolic'
ON CONFLICT (marker_slug) DO NOTHING;

-- 3. WHtR — Waist-to-Height Ratio (best simple visceral fat proxy; better than BMI)
INSERT INTO calculated_markers (
    id, marker_slug, marker_name, zone_id,
    formula_description, base_markers_required,
    source_type, free_tier, protocol_aware, display_order,
    default_thresholds, protocol_overrides
)
SELECT
    gen_random_uuid(),
    'whtr', 'WHtR — Waist-to-Height Ratio', z.id,
    'Waist Circumference (cm) ÷ Height (cm)',
    ARRAY['waist_circumference', 'profile_height'],
    'home', true, false, 3,
    '{"orange_min": 0.35, "green_min": 0.40, "green_max": 0.50, "orange_max": 0.58}'::jsonb,
    '{}'::jsonb
FROM zones z WHERE z.zone_slug = 'structural'
ON CONFLICT (marker_slug) DO NOTHING;

-- 4. BMI — Body Mass Index (universal reference; less useful than WHtR for metabolic risk)
INSERT INTO calculated_markers (
    id, marker_slug, marker_name, zone_id,
    formula_description, base_markers_required,
    source_type, free_tier, protocol_aware, display_order,
    default_thresholds, protocol_overrides
)
SELECT
    gen_random_uuid(),
    'bmi', 'BMI — Body Mass Index', z.id,
    'Weight (kg) ÷ Height² (m²)',
    ARRAY['weight', 'profile_height'],
    'home', true, false, 4,
    '{"orange_min": 17.0, "green_min": 18.5, "green_max": 24.9, "orange_max": 29.9}'::jsonb,
    '{}'::jsonb
FROM zones z WHERE z.zone_slug = 'structural'
ON CONFLICT (marker_slug) DO NOTHING;

-- 5. HCT/HB Ratio — estimates MCV; flags hydration status during fasting
-- Note: Fora 6 reports HB in mmol/L; app converts to g/dL (× 1.61) before calculation
INSERT INTO calculated_markers (
    id, marker_slug, marker_name, zone_id,
    formula_description, base_markers_required,
    source_type, free_tier, protocol_aware, display_order,
    default_thresholds, protocol_overrides
)
SELECT
    gen_random_uuid(),
    'hct_hb_ratio', 'HCT/HB Ratio', z.id,
    'Hematocrit (%) ÷ Hemoglobin (g/dL)  [HB mmol/L × 1.61 → g/dL first]',
    ARRAY['hematocrit', 'hemoglobin'],
    'home', true, true, 5,
    '{"orange_min": 2.5, "green_min": 2.7, "green_max": 3.5, "orange_max": 3.7}'::jsonb,
    '{
        "fasting_extended": {"orange_min": 2.5, "green_min": 2.7, "green_max": 3.3, "orange_max": 3.7}
    }'::jsonb
FROM zones z WHERE z.zone_slug = 'structural'
ON CONFLICT (marker_slug) DO NOTHING;

-- 6. TG/HDL Ratio — best lipid-panel predictor of insulin resistance (lab required)
INSERT INTO calculated_markers (
    id, marker_slug, marker_name, zone_id,
    formula_description, base_markers_required,
    source_type, free_tier, protocol_aware, display_order,
    default_thresholds, protocol_overrides
)
SELECT
    gen_random_uuid(),
    'tg_hdl_ratio', 'TG/HDL Ratio', z.id,
    'Triglycerides ÷ HDL (both in mmol/L)',
    ARRAY['triglycerides', 'hdl'],
    'lab', true, false, 6,
    '{"orange_min": 0.0, "green_min": 0.0, "green_max": 1.5, "orange_max": 3.0}'::jsonb,
    '{}'::jsonb
FROM zones z WHERE z.zone_slug = 'cardiovascular'
ON CONFLICT (marker_slug) DO NOTHING;

-- 7. HOMA-IR — direct insulin resistance index (hybrid: home glucose + lab insulin)
-- Formula uses mg/dL glucose; app converts mmol/L → mg/dL (× 18.018) before calc
INSERT INTO calculated_markers (
    id, marker_slug, marker_name, zone_id,
    formula_description, base_markers_required,
    source_type, free_tier, protocol_aware, display_order,
    default_thresholds, protocol_overrides
)
SELECT
    gen_random_uuid(),
    'homa_ir', 'HOMA-IR', z.id,
    '(Glucose mg/dL × Insulin µIU/mL) ÷ 405  [glucose mmol/L × 18.018 to convert]',
    ARRAY['glucose', 'insulin'],
    'hybrid', true, false, 7,
    '{"orange_min": 0.0, "green_min": 0.0, "green_max": 1.0, "orange_max": 2.0}'::jsonb,
    '{}'::jsonb
FROM zones z WHERE z.zone_slug = 'energy_metabolic'
ON CONFLICT (marker_slug) DO NOTHING;
