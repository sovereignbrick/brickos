-- Migration 021: Seed demo measurement data for 'average' and 'at_risk' profiles
-- The 'optimized' profile already exists (relabeled in migration 020).
-- Same demo user: 00000000-0000-0000-0000-000000000001
--
-- 20 markers per profile using generate_series with random() variation.
-- Data spans Dec 2025 through Feb 2026 (~23 data points per marker at 4-day interval).
-- body_fat_pct is not in the markers table, so 19 markers are used instead.
-- All values stored in canonical units (mmol/L for lipids/glucose, nmol/L for vitamin D, etc).
-- Total: 2 profiles x 19 markers x ~23 points = ~874 measurements
-- ============================================================

-- ============================================================
-- AVERAGE PROFILE (demo_profile = 'average')
-- Standard mixed diet, borderline insulin sensitivity
-- ============================================================

-- Glucose: 95-115 mg/dL = 5.27-6.38 mmol/L, mostly orange with some green
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((5.27 + random() * 1.11)::numeric, 2),
    'mmol/L',
    CASE WHEN random() > 0.7 THEN 'green' ELSE 'orange' END,
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'glucose';

-- Ketones: 0.1-0.4 mmol/L, green (low ketones normal for standard diet)
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((0.1 + random() * 0.3)::numeric, 2),
    'mmol/L',
    'green',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'ketones';

-- Total Cholesterol: 200-240 mg/dL = 5.17-6.21 mmol/L, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((5.17 + random() * 1.04)::numeric, 2),
    'mmol/L',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'total_cholesterol';

-- LDL: 130-160 mg/dL = 3.36-4.14 mmol/L, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((3.36 + random() * 0.78)::numeric, 2),
    'mmol/L',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'ldl_c';

-- HDL: 40-55 mg/dL = 1.03-1.42 mmol/L, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((1.03 + random() * 0.39)::numeric, 2),
    'mmol/L',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'hdl_c';

-- Triglycerides: 150-220 mg/dL = 1.69-2.48 mmol/L, orange to red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((1.69 + random() * 0.79)::numeric, 2),
    'mmol/L',
    CASE WHEN random() > 0.7 THEN 'red' ELSE 'orange' END,
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'triglycerides';

-- HbA1c: 5.5-5.9 %, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((5.5 + random() * 0.4)::numeric, 1),
    '%',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'hba1c';

-- Fasting Insulin: 10-18 uIU/mL, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((10.0 + random() * 8.0)::numeric, 1),
    'µIU/mL',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'insulin';

-- Systolic BP: 130-145 mmHg, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((130 + random() * 15)::numeric, 0),
    'mmHg',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'bp_systolic';

-- Diastolic BP: 82-92 mmHg, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((82 + random() * 10)::numeric, 0),
    'mmHg',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'bp_diastolic';

-- Weight: 88-92 kg, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((88.0 + random() * 4.0)::numeric, 1),
    'kg',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'weight';

-- Waist Circumference: 96-100 cm, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((96 + random() * 4)::numeric, 1),
    'cm',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'waist_circumference';

-- hs-CRP: 2.0-4.5 mg/L, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((2.0 + random() * 2.5)::numeric, 1),
    'mg/L',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'hs_crp';

-- Vitamin D: 22-32 ng/mL = 54.9-79.9 nmol/L, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((54.9 + random() * 25.0)::numeric, 1),
    'nmol/L',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'vitamin_d';

-- Ferritin: 35-80 ng/mL = 35-80 ug/L, green to orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((35 + random() * 45)::numeric, 0),
    'µg/L',
    CASE WHEN random() > 0.5 THEN 'green' ELSE 'orange' END,
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'ferritin';

-- Magnesium: 1.7-2.0 mg/dL = 0.70-0.82 mmol/L, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((0.70 + random() * 0.12)::numeric, 2),
    'mmol/L',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'magnesium';

-- TSH: 2.5-4.0 mIU/L, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((2.5 + random() * 1.5)::numeric, 2),
    'mIU/L',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'tsh';

-- ALT: 30-50 U/L, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((30 + random() * 20)::numeric, 0),
    'U/L',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'alt';

-- AST: 28-45 U/L, orange
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((28 + random() * 17)::numeric, 0),
    'U/L',
    'orange',
    'standard',
    true,
    'average',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'ast';


-- ============================================================
-- AT_RISK PROFILE (demo_profile = 'at_risk')
-- Pre-diabetic, metabolic syndrome, worsening trends
-- ============================================================

-- Glucose: 120-155 mg/dL = 6.66-8.60 mmol/L, mostly red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((6.66 + random() * 1.94)::numeric, 2),
    'mmol/L',
    CASE WHEN random() > 0.85 THEN 'orange' ELSE 'red' END,
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'glucose';

-- Ketones: 0.05-0.2 mmol/L, green
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((0.05 + random() * 0.15)::numeric, 2),
    'mmol/L',
    'green',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'ketones';

-- Total Cholesterol: 240-280 mg/dL = 6.21-7.24 mmol/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((6.21 + random() * 1.03)::numeric, 2),
    'mmol/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'total_cholesterol';

-- LDL: 160-200 mg/dL = 4.14-5.17 mmol/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((4.14 + random() * 1.03)::numeric, 2),
    'mmol/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'ldl_c';

-- HDL: 30-42 mg/dL = 0.78-1.09 mmol/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((0.78 + random() * 0.31)::numeric, 2),
    'mmol/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'hdl_c';

-- Triglycerides: 220-350 mg/dL = 2.48-3.95 mmol/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((2.48 + random() * 1.47)::numeric, 2),
    'mmol/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'triglycerides';

-- HbA1c: 6.0-6.8 %, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((6.0 + random() * 0.8)::numeric, 1),
    '%',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'hba1c';

-- Fasting Insulin: 18-30 uIU/mL, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((18.0 + random() * 12.0)::numeric, 1),
    'µIU/mL',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'insulin';

-- Systolic BP: 145-165 mmHg, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((145 + random() * 20)::numeric, 0),
    'mmHg',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'bp_systolic';

-- Diastolic BP: 92-105 mmHg, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((92 + random() * 13)::numeric, 0),
    'mmHg',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'bp_diastolic';

-- Weight: 102-108 kg, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((102.0 + random() * 6.0)::numeric, 1),
    'kg',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'weight';

-- Waist Circumference: 108-115 cm, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((108 + random() * 7)::numeric, 1),
    'cm',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'waist_circumference';

-- hs-CRP: 5.0-12.0 mg/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((5.0 + random() * 7.0)::numeric, 1),
    'mg/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'hs_crp';

-- Vitamin D: 12-22 ng/mL = 30.0-54.9 nmol/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((30.0 + random() * 24.9)::numeric, 1),
    'nmol/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'vitamin_d';

-- Ferritin: 180-350 ng/mL = 180-350 ug/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((180 + random() * 170)::numeric, 0),
    'µg/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'ferritin';

-- Magnesium: 1.4-1.7 mg/dL = 0.58-0.70 mmol/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((0.58 + random() * 0.12)::numeric, 2),
    'mmol/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'magnesium';

-- TSH: 4.5-7.0 mIU/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((4.5 + random() * 2.5)::numeric, 2),
    'mIU/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'tsh';

-- ALT: 50-85 U/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((50 + random() * 35)::numeric, 0),
    'U/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'alt';

-- AST: 45-70 U/L, red
INSERT INTO measurements (id, user_id, marker_id, timestamp, value_canonical, unit_canonical, status, protocol_tag, is_demo, demo_profile, is_deleted, created_at)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    mk.id,
    ts,
    ROUND((45 + random() * 25)::numeric, 0),
    'U/L',
    'red',
    'standard',
    true,
    'at_risk',
    false,
    now()
FROM markers mk,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts
WHERE mk.marker_slug = 'ast';
