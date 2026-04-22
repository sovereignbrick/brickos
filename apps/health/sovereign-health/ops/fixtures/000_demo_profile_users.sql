-- Sprint 049 #049-28: seed the 3 risk-profile demo users for localhost.
--
-- Fixture 003_test_measurements.sql clones measurement history from
-- these users into the 5 fixture patients. On fresh localhost DBs
-- (without the bootstrap_brickos_schema_for_dev migration having
-- created them) fixture 003 no-ops with a RAISE NOTICE. This file
-- fixes that -- applied BEFORE 003 so the clone source exists.
--
-- Conventions (per ops/fixtures/README.md):
--   - Idempotent: ON CONFLICT (email) DO NOTHING.
--   - Locked passwords: `$LOCKED` argon2 sentinel matches the
--     Sprint 049 #049-11 production state -- the 3 demo users are
--     never meant to be logged into. They exist solely to back the
--     /demo/* read endpoints on eval.sovereignhealth.io.
--   - Pre-Sprint-049 bootstrap used 'dev_no_login' as the hash;
--     anything that doesn't verify against argon2 is fine. We use
--     the same LOCKED sentinel as the production lock migration
--     for consistency across environments.
--
-- Only creates the users. Measurements are populated separately:
--   - Localhost: fixture 003 clones into test-clinic patients.
--   - Prod: migration 20260407000002_reassign_demo_profile_measurements.sql
--     (already applied).

INSERT INTO users (
    email, password_hash, display_name, role,
    email_verified, email_verified_at, locale
)
VALUES
    ('optimized@sovereignhealth.io',
     '$argon2id$v=19$m=65536,t=3,p=4$LOCKED$LOCKED-Sprint049-fixture',
     'Optimized Profile',
     'user', true, NOW(), 'en'),
    ('average@sovereignhealth.io',
     '$argon2id$v=19$m=65536,t=3,p=4$LOCKED$LOCKED-Sprint049-fixture',
     'Average Profile',
     'user', true, NOW(), 'en'),
    ('atrisk@sovereignhealth.io',
     '$argon2id$v=19$m=65536,t=3,p=4$LOCKED$LOCKED-Sprint049-fixture',
     'At Risk Profile',
     'user', true, NOW(), 'en')
ON CONFLICT (email) DO NOTHING;
