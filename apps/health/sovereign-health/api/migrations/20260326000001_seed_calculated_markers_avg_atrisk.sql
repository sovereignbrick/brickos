-- Migration: Seed calculated_marker_values for 'average' and 'at_risk' demo profiles.
-- The 'optimized' profile already has values (migration 012). These profiles had only
-- raw measurements seeded (migration 021) but no computed calculated markers.
--
-- Computes GKI, dr_boz_ratio, BMI, WHtR, homa_ir from the KNOWN seed ranges
-- (not from the measurements table, which stores encrypted values).
-- Uses the same formulas as services/calculated.rs.
-- Height from user_profile: 182.0 cm for the demo user.
--
-- Seed ranges (from migration 20260309000021):
--   AVERAGE: glucose 5.27-6.38, ketones 0.1-0.4, weight 88-92, waist 96-100, insulin 10-18
--   AT_RISK: glucose 6.66-8.60, ketones 0.05-0.2, weight 102-108, waist 108-115, insulin 18-30

-- ============================================================
-- GKI = glucose_mmol / ketones_mmol
-- ============================================================

-- AVERAGE: glucose 5.27-6.38, ketones 0.1-0.4 → GKI ~13-64
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND((g / k)::numeric, 4),
    CASE
        WHEN (g / k) <= 9.0 THEN 'green'
        WHEN (g / k) <= 20.0 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'average',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 5.27 + random() * 1.11 AS g) glucose_val,
     LATERAL (SELECT 0.1 + random() * 0.3 AS k) ketone_val
WHERE cm.marker_slug = 'gki'
  AND k > 0
;

-- AT_RISK: glucose 6.66-8.60, ketones 0.05-0.2 → GKI ~33-172
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND((g / k)::numeric, 4),
    CASE
        WHEN (g / k) <= 9.0 THEN 'green'
        WHEN (g / k) <= 20.0 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'at_risk',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 6.66 + random() * 1.94 AS g) glucose_val,
     LATERAL (SELECT 0.05 + random() * 0.15 AS k) ketone_val
WHERE cm.marker_slug = 'gki'
  AND k > 0
;

-- ============================================================
-- Dr. Boz Ratio = (glucose_mmol * 18.0) / ketones_mmol
-- ============================================================

-- AVERAGE
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND(((g * 18.0) / k)::numeric, 4),
    CASE
        WHEN ((g * 18.0) / k) <= 40.0 THEN 'green'
        WHEN ((g * 18.0) / k) <= 80.0 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'average',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 5.27 + random() * 1.11 AS g) glucose_val,
     LATERAL (SELECT 0.1 + random() * 0.3 AS k) ketone_val
WHERE cm.marker_slug = 'dr_boz_ratio'
  AND k > 0
;

-- AT_RISK
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND(((g * 18.0) / k)::numeric, 4),
    CASE
        WHEN ((g * 18.0) / k) <= 40.0 THEN 'green'
        WHEN ((g * 18.0) / k) <= 80.0 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'at_risk',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 6.66 + random() * 1.94 AS g) glucose_val,
     LATERAL (SELECT 0.05 + random() * 0.15 AS k) ketone_val
WHERE cm.marker_slug = 'dr_boz_ratio'
  AND k > 0
;

-- ============================================================
-- BMI = weight_kg / (height_m ^ 2), height = 182 cm = 1.82 m
-- ============================================================

-- AVERAGE: weight 88-92 kg → BMI ~26.6-27.8
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND((w / (1.82 * 1.82))::numeric, 4),
    CASE
        WHEN (w / (1.82 * 1.82)) BETWEEN 18.5 AND 24.9 THEN 'green'
        WHEN (w / (1.82 * 1.82)) BETWEEN 25.0 AND 29.9 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'average',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 88.0 + random() * 4.0 AS w) weight_val
WHERE cm.marker_slug = 'bmi'
;

-- AT_RISK: weight 102-108 kg → BMI ~30.8-32.6
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND((w / (1.82 * 1.82))::numeric, 4),
    CASE
        WHEN (w / (1.82 * 1.82)) BETWEEN 18.5 AND 24.9 THEN 'green'
        WHEN (w / (1.82 * 1.82)) BETWEEN 25.0 AND 29.9 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'at_risk',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 102.0 + random() * 6.0 AS w) weight_val
WHERE cm.marker_slug = 'bmi'
;

-- ============================================================
-- WHtR = waist_cm / height_cm, height = 182 cm
-- ============================================================

-- AVERAGE: waist 96-100 cm → WHtR ~0.527-0.549
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND((wc / 182.0)::numeric, 4),
    CASE
        WHEN (wc / 182.0) < 0.5 THEN 'green'
        WHEN (wc / 182.0) < 0.6 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'average',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 96.0 + random() * 4.0 AS wc) waist_val
WHERE cm.marker_slug = 'whtr'
;

-- AT_RISK: waist 108-115 cm → WHtR ~0.593-0.632
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND((wc / 182.0)::numeric, 4),
    CASE
        WHEN (wc / 182.0) < 0.5 THEN 'green'
        WHEN (wc / 182.0) < 0.6 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'at_risk',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 108.0 + random() * 7.0 AS wc) waist_val
WHERE cm.marker_slug = 'whtr'
;

-- ============================================================
-- HOMA-IR = (glucose_mmol * 18.018 * insulin_uIU) / 405.0
-- ============================================================

-- AVERAGE: glucose 5.27-6.38 mmol/L, insulin 10-18 µIU/mL → HOMA-IR ~2.3-5.1
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND(((g * 18.018 * ins) / 405.0)::numeric, 4),
    CASE
        WHEN ((g * 18.018 * ins) / 405.0) < 1.0 THEN 'green'
        WHEN ((g * 18.018 * ins) / 405.0) < 2.5 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'average',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 5.27 + random() * 1.11 AS g) glucose_val,
     LATERAL (SELECT 10.0 + random() * 8.0 AS ins) insulin_val
WHERE cm.marker_slug = 'homa_ir'
;

-- AT_RISK: glucose 6.66-8.60 mmol/L, insulin 18-30 µIU/mL → HOMA-IR ~5.3-11.5
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND(((g * 18.018 * ins) / 405.0)::numeric, 4),
    CASE
        WHEN ((g * 18.018 * ins) / 405.0) < 1.0 THEN 'green'
        WHEN ((g * 18.018 * ins) / 405.0) < 2.5 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    ts,
    true,
    'at_risk',
    false,
    now()
FROM calculated_markers cm,
     generate_series('2025-12-01'::timestamptz, '2026-02-28'::timestamptz, '4 days'::interval) ts,
     LATERAL (SELECT 6.66 + random() * 1.94 AS g) glucose_val,
     LATERAL (SELECT 18.0 + random() * 12.0 AS ins) insulin_val
WHERE cm.marker_slug = 'homa_ir'
;
