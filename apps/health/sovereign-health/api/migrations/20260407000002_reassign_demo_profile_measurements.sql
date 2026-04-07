-- Reassign demo profile measurements from the original demo user
-- (demo@sovereignhealth.io) to the dedicated profile user accounts.
--
-- The measurements table has a demo_profile column tagging which profile
-- each measurement belongs to. The dedicated users were created but their
-- measurements were never moved from the original account.
--
-- This migration copies (not moves) measurements to preserve the original
-- demo account data. Existing measurements on profile users are kept.

-- Step 1: Copy optimized measurements to optimized@sovereignhealth.io
INSERT INTO measurements (
    id, user_id, marker_id, value_canonical, unit_canonical, timestamp,
    status, protocol_tag, diet_protocol, fasting_protocol, fasting_hours,
    meal_timing_tag, exercise_activity, sleep_hours, sleep_quality,
    stress_level, lifestyle_note, device_id, lab_provider_name,
    is_deleted, demo_profile, created_at, updated_at
)
SELECT
    gen_random_uuid(), -- new ID to avoid conflicts
    (SELECT id FROM brickos.users WHERE email = 'optimized@sovereignhealth.io'),
    marker_id, value_canonical, unit_canonical, timestamp,
    status, protocol_tag, diet_protocol, fasting_protocol, fasting_hours,
    meal_timing_tag, exercise_activity, sleep_hours, sleep_quality,
    stress_level, lifestyle_note, device_id, lab_provider_name,
    is_deleted, demo_profile, created_at, updated_at
FROM measurements
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND demo_profile = 'optimized'
  AND NOT EXISTS (
    -- Skip if we already copied (idempotent: check by marker + timestamp)
    SELECT 1 FROM measurements m2
    WHERE m2.user_id = (SELECT id FROM brickos.users WHERE email = 'optimized@sovereignhealth.io')
      AND m2.marker_id = measurements.marker_id
      AND m2.timestamp = measurements.timestamp
  );

-- Step 2: Copy average measurements to average@sovereignhealth.io
INSERT INTO measurements (
    id, user_id, marker_id, value_canonical, unit_canonical, timestamp,
    status, protocol_tag, diet_protocol, fasting_protocol, fasting_hours,
    meal_timing_tag, exercise_activity, sleep_hours, sleep_quality,
    stress_level, lifestyle_note, device_id, lab_provider_name,
    is_deleted, demo_profile, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    (SELECT id FROM brickos.users WHERE email = 'average@sovereignhealth.io'),
    marker_id, value_canonical, unit_canonical, timestamp,
    status, protocol_tag, diet_protocol, fasting_protocol, fasting_hours,
    meal_timing_tag, exercise_activity, sleep_hours, sleep_quality,
    stress_level, lifestyle_note, device_id, lab_provider_name,
    is_deleted, demo_profile, created_at, updated_at
FROM measurements
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND demo_profile = 'average'
  AND NOT EXISTS (
    SELECT 1 FROM measurements m2
    WHERE m2.user_id = (SELECT id FROM brickos.users WHERE email = 'average@sovereignhealth.io')
      AND m2.marker_id = measurements.marker_id
      AND m2.timestamp = measurements.timestamp
  );

-- Step 3: Copy at_risk measurements to atrisk@sovereignhealth.io
INSERT INTO measurements (
    id, user_id, marker_id, value_canonical, unit_canonical, timestamp,
    status, protocol_tag, diet_protocol, fasting_protocol, fasting_hours,
    meal_timing_tag, exercise_activity, sleep_hours, sleep_quality,
    stress_level, lifestyle_note, device_id, lab_provider_name,
    is_deleted, demo_profile, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    (SELECT id FROM brickos.users WHERE email = 'atrisk@sovereignhealth.io'),
    marker_id, value_canonical, unit_canonical, timestamp,
    status, protocol_tag, diet_protocol, fasting_protocol, fasting_hours,
    meal_timing_tag, exercise_activity, sleep_hours, sleep_quality,
    stress_level, lifestyle_note, device_id, lab_provider_name,
    is_deleted, demo_profile, created_at, updated_at
FROM measurements
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND demo_profile = 'at_risk'
  AND NOT EXISTS (
    SELECT 1 FROM measurements m2
    WHERE m2.user_id = (SELECT id FROM brickos.users WHERE email = 'atrisk@sovereignhealth.io')
      AND m2.marker_id = measurements.marker_id
      AND m2.timestamp = measurements.timestamp
  );
