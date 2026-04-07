-- Reassign demo profile measurements from the original demo user
-- (demo@sovereignhealth.io) to the dedicated profile user accounts.
--
-- The measurements were tagged with demo_profile but never moved to
-- the dedicated user accounts, causing empty trends for demo profiles.

-- Step 1: Copy optimized measurements to optimized@sovereignhealth.io
INSERT INTO measurements (
    id, user_id, marker_id, device_id, timestamp,
    value_canonical, unit_canonical, status, protocol_tag,
    diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
    meal_timing_tag, exercise_activity, exercise_timing,
    sleep_hours, sleep_quality, stress_level, lifestyle_note,
    is_deleted, created_at, updated_at, is_demo, demo_profile,
    client_id, idempotency_key, deleted_at, sync_version, lab_id
)
SELECT
    gen_random_uuid(),
    (SELECT id FROM brickos.users WHERE email = 'optimized@sovereignhealth.io'),
    marker_id, device_id, timestamp,
    value_canonical, unit_canonical, status, protocol_tag,
    diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
    meal_timing_tag, exercise_activity, exercise_timing,
    sleep_hours, sleep_quality, stress_level, lifestyle_note,
    is_deleted, created_at, updated_at, is_demo, demo_profile,
    NULL, NULL, deleted_at, sync_version, lab_id
FROM measurements
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND demo_profile = 'optimized'
  AND NOT EXISTS (
    SELECT 1 FROM measurements m2
    WHERE m2.user_id = (SELECT id FROM brickos.users WHERE email = 'optimized@sovereignhealth.io')
      AND m2.marker_id = measurements.marker_id
      AND m2.timestamp = measurements.timestamp
  );

-- Step 2: Copy average measurements to average@sovereignhealth.io
INSERT INTO measurements (
    id, user_id, marker_id, device_id, timestamp,
    value_canonical, unit_canonical, status, protocol_tag,
    diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
    meal_timing_tag, exercise_activity, exercise_timing,
    sleep_hours, sleep_quality, stress_level, lifestyle_note,
    is_deleted, created_at, updated_at, is_demo, demo_profile,
    client_id, idempotency_key, deleted_at, sync_version, lab_id
)
SELECT
    gen_random_uuid(),
    (SELECT id FROM brickos.users WHERE email = 'average@sovereignhealth.io'),
    marker_id, device_id, timestamp,
    value_canonical, unit_canonical, status, protocol_tag,
    diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
    meal_timing_tag, exercise_activity, exercise_timing,
    sleep_hours, sleep_quality, stress_level, lifestyle_note,
    is_deleted, created_at, updated_at, is_demo, demo_profile,
    NULL, NULL, deleted_at, sync_version, lab_id
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
    id, user_id, marker_id, device_id, timestamp,
    value_canonical, unit_canonical, status, protocol_tag,
    diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
    meal_timing_tag, exercise_activity, exercise_timing,
    sleep_hours, sleep_quality, stress_level, lifestyle_note,
    is_deleted, created_at, updated_at, is_demo, demo_profile,
    client_id, idempotency_key, deleted_at, sync_version, lab_id
)
SELECT
    gen_random_uuid(),
    (SELECT id FROM brickos.users WHERE email = 'atrisk@sovereignhealth.io'),
    marker_id, device_id, timestamp,
    value_canonical, unit_canonical, status, protocol_tag,
    diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
    meal_timing_tag, exercise_activity, exercise_timing,
    sleep_hours, sleep_quality, stress_level, lifestyle_note,
    is_deleted, created_at, updated_at, is_demo, demo_profile,
    NULL, NULL, deleted_at, sync_version, lab_id
FROM measurements
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND demo_profile = 'at_risk'
  AND NOT EXISTS (
    SELECT 1 FROM measurements m2
    WHERE m2.user_id = (SELECT id FROM brickos.users WHERE email = 'atrisk@sovereignhealth.io')
      AND m2.marker_id = measurements.marker_id
      AND m2.timestamp = measurements.timestamp
  );
