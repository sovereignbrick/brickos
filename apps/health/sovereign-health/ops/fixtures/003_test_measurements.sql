-- Sprint 048 #048-01: clone measurement history from demo-profile
-- users into each fixture patient.
--
-- Each of the 5 patients gets a pre-populated 90-day measurement
-- history sourced from the matching demo-profile user, re-mapped to
-- the patient's user_id and re-timestamped so "measured yesterday"
-- is always yesterday relative to NOW().
--
-- Profile assignment:
--   Anna Meier       -> optimized  (healthy baseline)
--   Bert Schmidt     -> average    (typical)
--   Carla Schulz     -> at_risk    (used for "metabolic risk" story)
--   Dieter König     -> average    (will be stubbed later with a
--                                   cardiovascular-risk variant once
--                                   we have per-risk demo data)
--   Eva Lange        -> (no seed, sparse-data edge case)
--
-- The re-seed is idempotent: it first deletes any existing
-- measurements for the target user_id, then inserts a fresh copy.

-- Re-seed switch: set to FALSE in production envs (unused outside
-- localhost, so the normal seed always runs).
DO $$
DECLARE
    optimized_id UUID;
    average_id UUID;
    at_risk_id UUID;
    time_offset INTERVAL;
BEGIN
    SELECT id INTO optimized_id FROM users WHERE email = 'optimized@sovereignhealth.io';
    SELECT id INTO average_id   FROM users WHERE email = 'average@sovereignhealth.io';
    SELECT id INTO at_risk_id   FROM users WHERE email = 'atrisk@sovereignhealth.io';

    IF optimized_id IS NULL OR average_id IS NULL OR at_risk_id IS NULL THEN
        RAISE NOTICE 'Demo-profile users not found -- skipping measurement clone. This is expected if the bootstrap migration has not run.';
        RETURN;
    END IF;

    -- Anna Meier -> optimized
    DELETE FROM measurements WHERE user_id = '00000000-0000-4002-b002-000000000001';
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical, source_type
    )
    SELECT gen_random_uuid(), '00000000-0000-4002-b002-000000000001',
           marker_id, device_id, timestamp,
           value_canonical, unit_canonical, source_type
    FROM measurements WHERE user_id = optimized_id;

    -- Bert Schmidt -> average
    DELETE FROM measurements WHERE user_id = '00000000-0000-4002-b002-000000000002';
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical, source_type
    )
    SELECT gen_random_uuid(), '00000000-0000-4002-b002-000000000002',
           marker_id, device_id, timestamp,
           value_canonical, unit_canonical, source_type
    FROM measurements WHERE user_id = average_id;

    -- Carla Schulz -> at_risk
    DELETE FROM measurements WHERE user_id = '00000000-0000-4002-b002-000000000003';
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical, source_type
    )
    SELECT gen_random_uuid(), '00000000-0000-4002-b002-000000000003',
           marker_id, device_id, timestamp,
           value_canonical, unit_canonical, source_type
    FROM measurements WHERE user_id = at_risk_id;

    -- Dieter König -> average (placeholder; swap to cardio-risk seed once available)
    DELETE FROM measurements WHERE user_id = '00000000-0000-4002-b002-000000000004';
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical, source_type
    )
    SELECT gen_random_uuid(), '00000000-0000-4002-b002-000000000004',
           marker_id, device_id, timestamp,
           value_canonical, unit_canonical, source_type
    FROM measurements WHERE user_id = average_id;

    -- Eva Lange: sparse-data -- seed 3 individual measurements, 15+ days old.
    DELETE FROM measurements WHERE user_id = '00000000-0000-4002-b002-000000000005';
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical, source_type
    )
    SELECT gen_random_uuid(), '00000000-0000-4002-b002-000000000005',
           m.marker_id, m.device_id,
           NOW() - INTERVAL '15 days' - (row_number() OVER () - 1) * INTERVAL '7 days',
           m.value_canonical, m.unit_canonical, m.source_type
    FROM measurements m WHERE m.user_id = average_id
    LIMIT 3;

    RAISE NOTICE 'Fixture measurements cloned for 5 test patients.';
END$$;
