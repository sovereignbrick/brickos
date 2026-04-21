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
--
-- Uses business-key lookup (email + slug) so the fixture works on any
-- environment regardless of actual UUIDs. On localhost, the fresh-DB
-- user/org UUIDs happen to match the fixture constants; on staging,
-- the org existed before Sprint 048 with a random UUID and Anna/Bert
-- already have their own UUIDs from a manual seed. Looking up by
-- email/slug here decouples from either case.
INSERT INTO org_members (id, user_id, org_id, role, joined_at)
SELECT
    gen_random_uuid(),
    u.id,
    o.id,
    CASE u.email
        WHEN 'test-clinic-admin@clinic.com' THEN 'org_owner'
        ELSE 'member'
    END,
    CASE u.email
        WHEN 'test-clinic-admin@clinic.com'     THEN NOW() - INTERVAL '30 days'
        WHEN 'anna.meier@patients.clinic.com'   THEN NOW() - INTERVAL '25 days'
        WHEN 'bert.schmidt@patients.clinic.com' THEN NOW() - INTERVAL '20 days'
        WHEN 'carla.schulz@patients.clinic.com' THEN NOW() - INTERVAL '14 days'
        WHEN 'dieter.koenig@patients.clinic.com' THEN NOW() - INTERVAL '10 days'
        WHEN 'eva.lange@patients.clinic.com'    THEN NOW() - INTERVAL '3 days'
        ELSE NOW()
    END
FROM users u
CROSS JOIN organizations o
WHERE o.slug = 'test-clinic'
  AND u.email IN (
      'test-clinic-admin@clinic.com',
      'anna.meier@patients.clinic.com',
      'bert.schmidt@patients.clinic.com',
      'carla.schulz@patients.clinic.com',
      'dieter.koenig@patients.clinic.com',
      'eva.lange@patients.clinic.com'
  )
ON CONFLICT (user_id, org_id) DO NOTHING;
