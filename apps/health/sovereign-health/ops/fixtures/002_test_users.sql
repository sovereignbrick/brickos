-- Sprint 048 #048-01: fixture users for localhost testing.
--
-- Creates 1 org_owner + 5 patients with deterministic UUIDs so the
-- measurement clone in 003_test_measurements.sql can map them. All
-- users share the password "TestPatient1" (argon2id hash below), except
-- the admin which uses "TestClinicAdmin1".
--
-- Password hashes are committed -- these are localhost-only fixtures
-- with throwaway passwords. The same hashes are used on staging for
-- the test-clinic seed (see DB one-offs 2026-04-21).
--
-- Each patient's `display_name` identifies them uniquely; the 003
-- migration will clone measurements from the corresponding demo
-- profile user into each patient's history.

INSERT INTO users (id, email, password_hash, display_name, role, tier, email_verified, email_verified_at, locale)
VALUES
    -- org_owner (can impersonate patients, manage org)
    ('00000000-0000-4002-b001-000000000001',
     'test-clinic-admin@clinic.com',
     '$argon2id$v=19$m=65536,t=3,p=4$A/PCVObdHaVIW7cTa8CSRQ$UbuWQWnXX/DKAuEi9y6ougZNiu8MM/cayAWQjZINs1I',
     'Test Clinic Admin',
     'user', 'glimpse', true, NOW(), 'en'),

    -- Anna Meier  -- optimized profile (healthy baseline), DE
    ('00000000-0000-4002-b002-000000000001',
     'anna.meier@patients.clinic.com',
     '$argon2id$v=19$m=65536,t=3,p=4$Xo42c3budBlymQtPCO+4LA$PHkcBblbXp7dozrLA7CzkPYZSNz3bF6buhsi2/N4JQA',
     'Anna Meier',
     'user', 'glimpse', true, NOW(), 'de'),

    -- Bert Schmidt -- average profile (typical), DE
    ('00000000-0000-4002-b002-000000000002',
     'bert.schmidt@patients.clinic.com',
     '$argon2id$v=19$m=65536,t=3,p=4$Xo42c3budBlymQtPCO+4LA$PHkcBblbXp7dozrLA7CzkPYZSNz3bF6buhsi2/N4JQA',
     'Bert Schmidt',
     'user', 'glimpse', true, NOW(), 'de'),

    -- Carla Schulz -- at_risk metabolic (pre-diabetic markers), EN
    ('00000000-0000-4002-b002-000000000003',
     'carla.schulz@patients.clinic.com',
     '$argon2id$v=19$m=65536,t=3,p=4$Xo42c3budBlymQtPCO+4LA$PHkcBblbXp7dozrLA7CzkPYZSNz3bF6buhsi2/N4JQA',
     'Carla Schulz',
     'user', 'glimpse', true, NOW(), 'en'),

    -- Dieter König -- at_risk cardiovascular (lipid risk), DE
    ('00000000-0000-4002-b002-000000000004',
     'dieter.koenig@patients.clinic.com',
     '$argon2id$v=19$m=65536,t=3,p=4$Xo42c3budBlymQtPCO+4LA$PHkcBblbXp7dozrLA7CzkPYZSNz3bF6buhsi2/N4JQA',
     'Dieter König',
     'user', 'glimpse', true, NOW(), 'de'),

    -- Eva Lange -- sparse-data edge case, EN
    ('00000000-0000-4002-b002-000000000005',
     'eva.lange@patients.clinic.com',
     '$argon2id$v=19$m=65536,t=3,p=4$Xo42c3budBlymQtPCO+4LA$PHkcBblbXp7dozrLA7CzkPYZSNz3bF6buhsi2/N4JQA',
     'Eva Lange',
     'user', 'glimpse', true, NOW(), 'en')
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    email_verified = true,
    email_verified_at = NOW(),
    locale = EXCLUDED.locale;

-- Wire users into the test-clinic org with the right roles.
INSERT INTO org_members (id, user_id, org_id, role, joined_at)
VALUES
    (gen_random_uuid(), '00000000-0000-4002-b001-000000000001',
     '00000000-0000-4001-a001-000000000001', 'org_owner', NOW() - INTERVAL '30 days'),
    (gen_random_uuid(), '00000000-0000-4002-b002-000000000001',
     '00000000-0000-4001-a001-000000000001', 'member', NOW() - INTERVAL '25 days'),
    (gen_random_uuid(), '00000000-0000-4002-b002-000000000002',
     '00000000-0000-4001-a001-000000000001', 'member', NOW() - INTERVAL '20 days'),
    (gen_random_uuid(), '00000000-0000-4002-b002-000000000003',
     '00000000-0000-4001-a001-000000000001', 'member', NOW() - INTERVAL '14 days'),
    (gen_random_uuid(), '00000000-0000-4002-b002-000000000004',
     '00000000-0000-4001-a001-000000000001', 'member', NOW() - INTERVAL '10 days'),
    (gen_random_uuid(), '00000000-0000-4002-b002-000000000005',
     '00000000-0000-4001-a001-000000000001', 'member', NOW() - INTERVAL '3 days')
ON CONFLICT (user_id, org_id) DO NOTHING;
