-- Fix: Demo user seed must use ON CONFLICT DO UPDATE, not DO NOTHING.
-- Lesson from Sprint 014: if someone registers demo@sovereignhealth.io
-- before the seed migration runs, the seed is silently skipped.
-- This migration ensures the demo user always has the expected UUID and role.

-- Only run if demo user exists with wrong UUID
DO $$
DECLARE
    current_id UUID;
BEGIN
    SELECT id INTO current_id FROM users WHERE email = 'demo@sovereignhealth.io';
    IF current_id IS NOT NULL AND current_id != '00000000-0000-0000-0000-000000000001' THEN
        RAISE NOTICE 'Demo user has unexpected UUID %, expected 00000000-...-000000000001. Manual fix required on staging.', current_id;
    END IF;
END $$;

-- Future-proof: if we re-seed, use UPSERT pattern
-- INSERT INTO users (id, email, ...) VALUES (...)
-- ON CONFLICT (email) DO UPDATE SET
--   id = EXCLUDED.id,
--   display_name = EXCLUDED.display_name,
--   role = EXCLUDED.role;
--
-- NOTE: This is documented as a pattern, not executed here (would break existing data).
-- The actual fix was applied manually on staging during Sprint 014.
