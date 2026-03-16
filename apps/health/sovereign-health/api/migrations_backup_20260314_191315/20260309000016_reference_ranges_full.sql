-- Migration 016: Default reference ranges for ALL markers.
-- reference_ranges.marker_id references markers(id) only.
-- Calculated markers use default_thresholds JSONB in calculated_markers table.
-- All rows are ON CONFLICT DO NOTHING — safe to re-run.
-- orange_min/orange_max = acceptable bounds; green_min/green_max = optimal.
-- NULL boundary = no limit in that direction.

-- ============================================================
-- HOME MARKERS — UPDATE existing system defaults to spec values,
-- then INSERT any that are missing.
-- ============================================================

UPDATE reference_ranges rr SET
    orange_min = r.orange_min,
    green_min  = r.green_min,
    green_max  = r.green_max,
    orange_max = r.orange_max,
    updated_at = now()
FROM (VALUES
    ('glucose',            3.5::numeric,   4.0::numeric,  5.6::numeric,   6.9::numeric),
    ('ketones',            0.0::numeric,   0.1::numeric,  3.0::numeric,   5.0::numeric),
    ('total_cholesterol',  2.5::numeric,   3.5::numeric,  5.2::numeric,   6.2::numeric),
    ('uric_acid',          150.0::numeric, 200.0::numeric,360.0::numeric, 480.0::numeric),
    ('hemoglobin',         7.5::numeric,   8.5::numeric,  11.2::numeric,  12.0::numeric),
    ('hematocrit',         35.0::numeric,  38.3::numeric, 48.6::numeric,  52.0::numeric),
    ('bp_systolic',        80.0::numeric,  90.0::numeric, 120.0::numeric, 140.0::numeric),
    ('bp_diastolic',       50.0::numeric,  60.0::numeric, 80.0::numeric,  90.0::numeric),
    ('heart_rate',         40.0::numeric,  50.0::numeric, 80.0::numeric,  100.0::numeric),
    ('insulin',            1.0::numeric,   2.0::numeric,  8.0::numeric,   15.0::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
WHERE rr.marker_id = m.id
  AND rr.protocol_context = 'standard'
  AND rr.user_id IS NULL;

-- Insert missing home marker rows
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('glucose',            3.5::numeric,   4.0::numeric,  5.6::numeric,   6.9::numeric),
    ('ketones',            0.0::numeric,   0.1::numeric,  3.0::numeric,   5.0::numeric),
    ('total_cholesterol',  2.5::numeric,   3.5::numeric,  5.2::numeric,   6.2::numeric),
    ('uric_acid',          150.0::numeric, 200.0::numeric,360.0::numeric, 480.0::numeric),
    ('hemoglobin',         7.5::numeric,   8.5::numeric,  11.2::numeric,  12.0::numeric),
    ('hematocrit',         35.0::numeric,  38.3::numeric, 48.6::numeric,  52.0::numeric),
    ('bp_systolic',        80.0::numeric,  90.0::numeric, 120.0::numeric, 140.0::numeric),
    ('bp_diastolic',       50.0::numeric,  60.0::numeric, 80.0::numeric,  90.0::numeric),
    ('heart_rate',         40.0::numeric,  50.0::numeric, 80.0::numeric,  100.0::numeric),
    ('weight',             NULL::numeric,  NULL::numeric, NULL::numeric,  NULL::numeric),
    ('waist_circumference',NULL::numeric,  NULL::numeric, NULL::numeric,  NULL::numeric),
    ('insulin',            1.0::numeric,   2.0::numeric,  8.0::numeric,   15.0::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- FASTING PROTOCOL OVERRIDES
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('glucose',   2.8::numeric,   3.5::numeric,  5.5::numeric,  6.5::numeric),
    ('ketones',   0.1::numeric,   0.5::numeric,  5.0::numeric,  8.0::numeric),
    ('uric_acid', 150.0::numeric, 200.0::numeric,450.0::numeric,550.0::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- LIPIDS / CARDIOVASCULAR
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('ldl_c',         0.5::numeric,  1.0::numeric,  3.0::numeric,  4.1::numeric),
    ('hdl_c',         0.8::numeric,  1.0::numeric,  2.5::numeric,  NULL::numeric),
    ('triglycerides', 0.2::numeric,  0.4::numeric,  1.7::numeric,  2.3::numeric),
    ('apob',          0.3::numeric,  0.4::numeric,  1.2::numeric,  1.6::numeric),
    ('lpa',           NULL::numeric, NULL::numeric, 75.0::numeric, 125.0::numeric),
    ('hs_crp',        NULL::numeric, NULL::numeric, 1.0::numeric,  3.0::numeric),
    ('non_hdl_c',     0.5::numeric,  1.0::numeric,  3.8::numeric,  4.8::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- METABOLIC
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', NULL, 4.0, 5.6, 6.4
FROM markers m WHERE m.marker_slug = 'hba1c'
ON CONFLICT DO NOTHING;

-- ============================================================
-- KIDNEY
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('creatinine', 44.0::numeric,  62.0::numeric, 106.0::numeric, 133.0::numeric),
    ('egfr',       45.0::numeric,  60.0::numeric, NULL::numeric,  NULL::numeric),
    ('cystatin_c', NULL::numeric,  0.53::numeric, 0.95::numeric,  1.2::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- LIVER / DETOXIFICATION
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('alt',             NULL::numeric, 7.0::numeric,   35.0::numeric,  50.0::numeric),
    ('ast',             NULL::numeric, 8.0::numeric,   33.0::numeric,  50.0::numeric),
    ('ggt',             NULL::numeric, 8.0::numeric,   61.0::numeric,  100.0::numeric),
    ('alp',             NULL::numeric, 40.0::numeric,  130.0::numeric, 200.0::numeric),
    ('ldh',             NULL::numeric, 120.0::numeric, 246.0::numeric, 300.0::numeric),
    ('bilirubin_total', NULL::numeric, 3.4::numeric,   20.5::numeric,  35.0::numeric),
    ('bilirubin_direct',NULL::numeric, 0.0::numeric,   5.1::numeric,   10.0::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- THYROID
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('tsh', 0.1::numeric,  0.4::numeric,  4.0::numeric,  10.0::numeric),
    ('ft4', 9.0::numeric,  12.0::numeric, 22.0::numeric, 30.0::numeric),
    ('ft3', 2.0::numeric,  3.1::numeric,  6.8::numeric,  10.0::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- HORMONES (male 56yo defaults)
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('testosterone',        5.0::numeric,   8.0::numeric,   30.0::numeric,  NULL::numeric),
    ('free_testosterone',   100.0::numeric, 200.0::numeric, 600.0::numeric, NULL::numeric),
    ('free_androgen_index', 15.0::numeric,  30.0::numeric,  100.0::numeric, NULL::numeric),
    ('shbg',                NULL::numeric,  10.0::numeric,  57.0::numeric,  80.0::numeric),
    ('estradiol',           NULL::numeric,  40.0::numeric,  160.0::numeric, 250.0::numeric),
    ('progesterone',        NULL::numeric,  0.3::numeric,   1.2::numeric,   3.0::numeric),
    ('prolactin',           NULL::numeric,  86.0::numeric,  324.0::numeric, 500.0::numeric),
    ('fsh',                 NULL::numeric,  1.5::numeric,   12.4::numeric,  20.0::numeric),
    ('lh',                  NULL::numeric,  1.7::numeric,   8.6::numeric,   15.0::numeric),
    ('dheas',               0.5::numeric,   1.0::numeric,   9.0::numeric,   15.0::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- PROTEINS / IRON PANEL
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('albumin',         30.0::numeric, 35.0::numeric, 52.0::numeric,  NULL::numeric),
    ('total_protein',   55.0::numeric, 60.0::numeric, 80.0::numeric,  90.0::numeric),
    ('iron',            7.0::numeric,  11.0::numeric, 30.0::numeric,  40.0::numeric),
    ('ferritin',        15.0::numeric, 30.0::numeric, 400.0::numeric, 500.0::numeric),
    ('transferrin',     1.5::numeric,  2.0::numeric,  3.6::numeric,   4.5::numeric),
    ('transferrin_sat', 15.0::numeric, 20.0::numeric, 50.0::numeric,  60.0::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- VITAMINS / MICRONUTRIENTS
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('vitamin_d',   50.0::numeric,  75.0::numeric,  150.0::numeric, NULL::numeric),
    ('vitamin_b12', 150.0::numeric, 200.0::numeric, 600.0::numeric, NULL::numeric),
    ('holo_tc',     25.0::numeric,  35.0::numeric,  165.0::numeric, NULL::numeric),
    ('vitamin_b2',  4.0::numeric,   6.2::numeric,   39.0::numeric,  NULL::numeric),
    ('vitamin_b6',  10.0::numeric,  20.0::numeric,  200.0::numeric, NULL::numeric),
    ('folate',      3.0::numeric,   7.0::numeric,   45.0::numeric,  NULL::numeric),
    ('vitamin_a',   0.7::numeric,   1.0::numeric,   3.0::numeric,   NULL::numeric),
    ('vitamin_e',   8.0::numeric,   12.0::numeric,  42.0::numeric,  NULL::numeric),
    ('calcium',     2.0::numeric,   2.15::numeric,  2.55::numeric,  2.75::numeric),
    ('magnesium',   0.6::numeric,   0.75::numeric,  1.05::numeric,  NULL::numeric),
    ('potassium',   3.0::numeric,   3.5::numeric,   5.1::numeric,   5.5::numeric),
    ('sodium',      130.0::numeric, 136.0::numeric, 145.0::numeric, 150.0::numeric),
    ('zinc',        8.0::numeric,   11.0::numeric,  23.0::numeric,  NULL::numeric),
    ('selenium',    50.0::numeric,  70.0::numeric,  150.0::numeric, NULL::numeric),
    ('phosphate',   0.6::numeric,   0.81::numeric,  1.45::numeric,  1.8::numeric),
    ('homocysteine',NULL::numeric,  5.0::numeric,   12.0::numeric,  15.0::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;

-- vitamin_b1, b3, b5: no established numeric range
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', NULL, NULL, NULL, NULL
FROM markers m WHERE m.marker_slug IN ('vitamin_b1', 'vitamin_b3', 'vitamin_b5')
ON CONFLICT DO NOTHING;

-- ============================================================
-- OMEGA-3
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', NULL, NULL, NULL, NULL
FROM markers m WHERE m.marker_slug IN ('epa', 'dha')
ON CONFLICT DO NOTHING;

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', 4.0, 8.0, 12.0, NULL
FROM markers m WHERE m.marker_slug = 'omega3_index'
ON CONFLICT DO NOTHING;

-- ============================================================
-- FULL BLOOD COUNT
-- ============================================================

INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', r.orange_min, r.green_min, r.green_max, r.orange_max
FROM (VALUES
    ('wbc',              3.5::numeric,   4.5::numeric,   11.0::numeric, 15.0::numeric),
    ('rbc',              3.8::numeric,   4.3::numeric,   5.9::numeric,  6.5::numeric),
    ('platelets',        100.0::numeric, 150.0::numeric, 400.0::numeric,500.0::numeric),
    ('neutrophils_pct',  30.0::numeric,  40.0::numeric,  70.0::numeric, 80.0::numeric),
    ('neutrophils_abs',  1.0::numeric,   1.8::numeric,   7.7::numeric,  NULL::numeric),
    ('lymphocytes_pct',  15.0::numeric,  20.0::numeric,  44.0::numeric, 55.0::numeric),
    ('lymphocytes_abs',  0.5::numeric,   1.0::numeric,   4.8::numeric,  NULL::numeric),
    ('monocytes_pct',    NULL::numeric,  2.0::numeric,   10.0::numeric, 15.0::numeric),
    ('monocytes_abs',    NULL::numeric,  0.2::numeric,   1.0::numeric,  1.5::numeric),
    ('eosinophils_pct',  NULL::numeric,  1.0::numeric,   6.0::numeric,  10.0::numeric),
    ('eosinophils_abs',  NULL::numeric,  0.02::numeric,  0.5::numeric,  1.0::numeric),
    ('basophils_pct',    NULL::numeric,  0.0::numeric,   2.0::numeric,  3.0::numeric),
    ('basophils_abs',    NULL::numeric,  0.0::numeric,   0.1::numeric,  0.3::numeric)
) AS r(marker_slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = r.marker_slug
ON CONFLICT DO NOTHING;
