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
-- Portable across environments: target user_ids are looked up by email,
-- not hardcoded. The re-seed is idempotent: it first deletes any
-- existing measurements for the target user_id, then inserts a fresh
-- copy.

DO $$
DECLARE
    optimized_id UUID;
    average_id UUID;
    at_risk_id UUID;

    anna_id UUID;
    bert_id UUID;
    carla_id UUID;
    dieter_id UUID;
    eva_id UUID;
BEGIN
    -- Demo-profile users (sources of measurement history).
    SELECT id INTO optimized_id FROM users WHERE email = 'optimized@sovereignhealth.io';
    SELECT id INTO average_id   FROM users WHERE email = 'average@sovereignhealth.io';
    SELECT id INTO at_risk_id   FROM users WHERE email = 'atrisk@sovereignhealth.io';

    IF optimized_id IS NULL OR average_id IS NULL OR at_risk_id IS NULL THEN
        RAISE NOTICE 'Demo-profile users not found -- skipping measurement clone. This is expected if the bootstrap migration has not run.';
        RETURN;
    END IF;

    -- Fixture patients (targets for cloned measurements).
    SELECT id INTO anna_id   FROM users WHERE email = 'anna.meier@patients.clinic.com';
    SELECT id INTO bert_id   FROM users WHERE email = 'bert.schmidt@patients.clinic.com';
    SELECT id INTO carla_id  FROM users WHERE email = 'carla.schulz@patients.clinic.com';
    SELECT id INTO dieter_id FROM users WHERE email = 'dieter.koenig@patients.clinic.com';
    SELECT id INTO eva_id    FROM users WHERE email = 'eva.lange@patients.clinic.com';

    IF anna_id IS NULL OR bert_id IS NULL OR carla_id IS NULL
       OR dieter_id IS NULL OR eva_id IS NULL THEN
        RAISE NOTICE 'One or more fixture patients not found -- run 002_test_users.sql first.';
        RETURN;
    END IF;

    -- Anna Meier -> optimized
    DELETE FROM measurements WHERE user_id = anna_id;
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical
    )
    SELECT gen_random_uuid(), anna_id,
           marker_id, device_id, timestamp,
           value_canonical, unit_canonical
    FROM measurements WHERE user_id = optimized_id;

    -- Bert Schmidt -> average
    DELETE FROM measurements WHERE user_id = bert_id;
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical
    )
    SELECT gen_random_uuid(), bert_id,
           marker_id, device_id, timestamp,
           value_canonical, unit_canonical
    FROM measurements WHERE user_id = average_id;

    -- Carla Schulz -> at_risk
    DELETE FROM measurements WHERE user_id = carla_id;
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical
    )
    SELECT gen_random_uuid(), carla_id,
           marker_id, device_id, timestamp,
           value_canonical, unit_canonical
    FROM measurements WHERE user_id = at_risk_id;

    -- Dieter König -> average (placeholder; swap to cardio-risk seed once available)
    DELETE FROM measurements WHERE user_id = dieter_id;
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical
    )
    SELECT gen_random_uuid(), dieter_id,
           marker_id, device_id, timestamp,
           value_canonical, unit_canonical
    FROM measurements WHERE user_id = average_id;

    -- Eva Lange: sparse-data -- seed 3 individual measurements, 15+ days old.
    DELETE FROM measurements WHERE user_id = eva_id;
    INSERT INTO measurements (
        id, user_id, marker_id, device_id, timestamp,
        value_canonical, unit_canonical
    )
    SELECT gen_random_uuid(), eva_id,
           m.marker_id, m.device_id,
           NOW() - INTERVAL '15 days' - (row_number() OVER () - 1) * INTERVAL '7 days',
           m.value_canonical, m.unit_canonical
    FROM measurements m WHERE m.user_id = average_id
    LIMIT 3;

    RAISE NOTICE 'Fixture measurements cloned for 5 test patients.';
END$$;
