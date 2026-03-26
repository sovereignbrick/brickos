-- Migration: Seed calculated_marker_values for 'average' and 'at_risk' demo profiles.
-- The 'optimized' profile already has values (migration 012). These profiles had only
-- raw measurements seeded (migration 021) but no computed calculated markers.
--
-- Computes GKI, dr_boz_ratio, BMI, WHtR, homa_ir from existing demo measurements.
-- Uses the same formulas as services/calculated.rs.
-- Height from user_profile: 182.0 cm for the demo user.
--
-- Note: tg_hdl_ratio and hct_hb_ratio are skipped because the demo profiles use
-- 'hdl_c' (not 'hdl') and lack hematocrit/hemoglobin measurements.

-- ============================================================
-- Helper: compute calculated markers from co-located demo measurements
-- For each timestamp that has BOTH required inputs, compute the result.
-- ============================================================

-- GKI = glucose / ketones (both in mmol/L)
-- Match by closest timestamp (same generate_series interval = exact match)
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND((g.val / k.val)::numeric, 4),
    CASE
        WHEN (g.val / k.val) <= 9.0 THEN 'green'
        WHEN (g.val / k.val) <= 20.0 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    g.ts,
    true,
    p.profile,
    false,
    now()
FROM calculated_markers cm,
     (VALUES ('average'), ('at_risk')) AS p(profile),
     LATERAL (
         SELECT ms.timestamp AS ts, ms.value_canonical::float8 AS val
         FROM measurements ms
         JOIN markers mk ON mk.id = ms.marker_id
         WHERE mk.marker_slug = 'glucose'
           AND ms.is_demo = true AND ms.demo_profile = p.profile
           AND ms.is_deleted = false
     ) g,
     LATERAL (
         SELECT ms.value_canonical::float8 AS val
         FROM measurements ms
         JOIN markers mk ON mk.id = ms.marker_id
         WHERE mk.marker_slug = 'ketones'
           AND ms.is_demo = true AND ms.demo_profile = p.profile
           AND ms.is_deleted = false
           AND ms.timestamp = g.ts
         LIMIT 1
     ) k
WHERE cm.marker_slug = 'gki'
  AND k.val > 0;

-- Dr. Boz Ratio = (glucose_mmol * 18.0) / ketones_mmol
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND(((g.val * 18.0) / k.val)::numeric, 4),
    CASE
        WHEN ((g.val * 18.0) / k.val) <= 40.0 THEN 'green'
        WHEN ((g.val * 18.0) / k.val) <= 80.0 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    g.ts,
    true,
    p.profile,
    false,
    now()
FROM calculated_markers cm,
     (VALUES ('average'), ('at_risk')) AS p(profile),
     LATERAL (
         SELECT ms.timestamp AS ts, ms.value_canonical::float8 AS val
         FROM measurements ms
         JOIN markers mk ON mk.id = ms.marker_id
         WHERE mk.marker_slug = 'glucose'
           AND ms.is_demo = true AND ms.demo_profile = p.profile
           AND ms.is_deleted = false
     ) g,
     LATERAL (
         SELECT ms.value_canonical::float8 AS val
         FROM measurements ms
         JOIN markers mk ON mk.id = ms.marker_id
         WHERE mk.marker_slug = 'ketones'
           AND ms.is_demo = true AND ms.demo_profile = p.profile
           AND ms.is_deleted = false
           AND ms.timestamp = g.ts
         LIMIT 1
     ) k
WHERE cm.marker_slug = 'dr_boz_ratio'
  AND k.val > 0;

-- BMI = weight_kg / (height_m ^ 2), height = 182 cm = 1.82 m
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND((w.val / (1.82 * 1.82))::numeric, 4),
    CASE
        WHEN (w.val / (1.82 * 1.82)) BETWEEN 18.5 AND 24.9 THEN 'green'
        WHEN (w.val / (1.82 * 1.82)) BETWEEN 25.0 AND 29.9 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    w.ts,
    true,
    p.profile,
    false,
    now()
FROM calculated_markers cm,
     (VALUES ('average'), ('at_risk')) AS p(profile),
     LATERAL (
         SELECT ms.timestamp AS ts, ms.value_canonical::float8 AS val
         FROM measurements ms
         JOIN markers mk ON mk.id = ms.marker_id
         WHERE mk.marker_slug = 'weight'
           AND ms.is_demo = true AND ms.demo_profile = p.profile
           AND ms.is_deleted = false
     ) w
WHERE cm.marker_slug = 'bmi';

-- WHtR = waist_cm / height_cm, height = 182 cm
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND((wc.val / 182.0)::numeric, 4),
    CASE
        WHEN (wc.val / 182.0) < 0.5 THEN 'green'
        WHEN (wc.val / 182.0) < 0.6 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    wc.ts,
    true,
    p.profile,
    false,
    now()
FROM calculated_markers cm,
     (VALUES ('average'), ('at_risk')) AS p(profile),
     LATERAL (
         SELECT ms.timestamp AS ts, ms.value_canonical::float8 AS val
         FROM measurements ms
         JOIN markers mk ON mk.id = ms.marker_id
         WHERE mk.marker_slug = 'waist_circumference'
           AND ms.is_demo = true AND ms.demo_profile = p.profile
           AND ms.is_deleted = false
     ) wc
WHERE cm.marker_slug = 'whtr';

-- HOMA-IR = (glucose_mmol * 18.018 * insulin_uIU) / 405.0
INSERT INTO calculated_marker_values (
    id, user_id, calculated_marker_id, value, status, protocol_tag, measured_at,
    is_demo, demo_profile, is_deleted, created_at
)
SELECT
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001'::uuid,
    cm.id,
    ROUND(((g.val * 18.018 * ins.val) / 405.0)::numeric, 4),
    CASE
        WHEN ((g.val * 18.018 * ins.val) / 405.0) < 1.0 THEN 'green'
        WHEN ((g.val * 18.018 * ins.val) / 405.0) < 2.5 THEN 'orange'
        ELSE 'red'
    END,
    'standard',
    g.ts,
    true,
    p.profile,
    false,
    now()
FROM calculated_markers cm,
     (VALUES ('average'), ('at_risk')) AS p(profile),
     LATERAL (
         SELECT ms.timestamp AS ts, ms.value_canonical::float8 AS val
         FROM measurements ms
         JOIN markers mk ON mk.id = ms.marker_id
         WHERE mk.marker_slug = 'glucose'
           AND ms.is_demo = true AND ms.demo_profile = p.profile
           AND ms.is_deleted = false
     ) g,
     LATERAL (
         SELECT ms.value_canonical::float8 AS val
         FROM measurements ms
         JOIN markers mk ON mk.id = ms.marker_id
         WHERE mk.marker_slug = 'insulin'
           AND ms.is_demo = true AND ms.demo_profile = p.profile
           AND ms.is_deleted = false
           AND ms.timestamp = g.ts
         LIMIT 1
     ) ins
WHERE cm.marker_slug = 'homa_ir';
