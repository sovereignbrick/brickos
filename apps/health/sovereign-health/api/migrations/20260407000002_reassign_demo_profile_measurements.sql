-- Reassign demo profile measurements from the original demo user
-- (demo@sovereignhealth.io) to the dedicated profile user accounts.
--
-- The measurements were tagged with demo_profile but never moved to
-- the dedicated user accounts, causing empty trends for demo profiles.
--
-- Sprint 041 #491 hardening: each step is wrapped in a defensive guard.
-- The original migration unconditionally referenced brickos.users, which
-- broke cold-boot dev (the brickos schema did not exist yet) and would
-- also break true two-pool prod (where brickos.users lives in a separate
-- physical postgres).
--
-- The guards are nested rather than ANDed, and the data-modifying
-- statement is dispatched via EXECUTE so PostgreSQL never parses the
-- brickos.users reference unless the schema is actually present.
-- Without dynamic SQL, the planner would resolve the name on first
-- entry into the DO block and fail before the IF condition saves us.
--
-- The data backfill only runs on environments where brickos.users is
-- co-located with public.measurements AND has been seeded with the
-- 3 demo profile users (which the bootstrap migration does in dev).

-- Step 1: Copy optimized measurements to optimized@sovereignhealth.io
DO $outer$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'brickos' AND table_name = 'users') THEN
        EXECUTE $sql$
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
                target_user.id,
                marker_id, device_id, timestamp,
                value_canonical, unit_canonical, status, protocol_tag,
                diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
                meal_timing_tag, exercise_activity, exercise_timing,
                sleep_hours, sleep_quality, stress_level, lifestyle_note,
                is_deleted, created_at, updated_at, is_demo, demo_profile,
                NULL, NULL, deleted_at, sync_version, lab_id
            FROM measurements
            CROSS JOIN (SELECT id FROM brickos.users WHERE email = 'optimized@sovereignhealth.io' LIMIT 1) target_user
            WHERE user_id = '00000000-0000-0000-0000-000000000001'
              AND demo_profile = 'optimized'
              AND NOT EXISTS (
                SELECT 1 FROM measurements m2
                WHERE m2.user_id = target_user.id
                  AND m2.marker_id = measurements.marker_id
                  AND m2.timestamp = measurements.timestamp
              );
        $sql$;
    END IF;
END $outer$;

-- Step 2: Copy average measurements to average@sovereignhealth.io
DO $outer$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'brickos' AND table_name = 'users') THEN
        EXECUTE $sql$
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
                target_user.id,
                marker_id, device_id, timestamp,
                value_canonical, unit_canonical, status, protocol_tag,
                diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
                meal_timing_tag, exercise_activity, exercise_timing,
                sleep_hours, sleep_quality, stress_level, lifestyle_note,
                is_deleted, created_at, updated_at, is_demo, demo_profile,
                NULL, NULL, deleted_at, sync_version, lab_id
            FROM measurements
            CROSS JOIN (SELECT id FROM brickos.users WHERE email = 'average@sovereignhealth.io' LIMIT 1) target_user
            WHERE user_id = '00000000-0000-0000-0000-000000000001'
              AND demo_profile = 'average'
              AND NOT EXISTS (
                SELECT 1 FROM measurements m2
                WHERE m2.user_id = target_user.id
                  AND m2.marker_id = measurements.marker_id
                  AND m2.timestamp = measurements.timestamp
              );
        $sql$;
    END IF;
END $outer$;

-- Step 3: Copy at_risk measurements to atrisk@sovereignhealth.io
DO $outer$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'brickos' AND table_name = 'users') THEN
        EXECUTE $sql$
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
                target_user.id,
                marker_id, device_id, timestamp,
                value_canonical, unit_canonical, status, protocol_tag,
                diet_protocol, fasting_protocol, fast_start_datetime, fasting_hours,
                meal_timing_tag, exercise_activity, exercise_timing,
                sleep_hours, sleep_quality, stress_level, lifestyle_note,
                is_deleted, created_at, updated_at, is_demo, demo_profile,
                NULL, NULL, deleted_at, sync_version, lab_id
            FROM measurements
            CROSS JOIN (SELECT id FROM brickos.users WHERE email = 'atrisk@sovereignhealth.io' LIMIT 1) target_user
            WHERE user_id = '00000000-0000-0000-0000-000000000001'
              AND demo_profile = 'at_risk'
              AND NOT EXISTS (
                SELECT 1 FROM measurements m2
                WHERE m2.user_id = target_user.id
                  AND m2.marker_id = measurements.marker_id
                  AND m2.timestamp = measurements.timestamp
              );
        $sql$;
    END IF;
END $outer$;
