-- Migration 006: Backfill personal organizations for legacy users
--
-- Problem: Users created before migration 076 don't have personal organizations.
-- The platform DB integrity test (check #10) flags these as consistency violations.
--
-- This migration creates a personal org for every user that doesn't have one,
-- mirroring the logic from the original SHI migration 076.
--
-- Safe to run multiple times (ON CONFLICT DO NOTHING).

-- Create personal org for each user that doesn't have one
DO $$
DECLARE
    r RECORD;
    new_org_id UUID;
BEGIN
    FOR r IN
        SELECT u.id AS user_id,
               COALESCE(u.display_name, split_part(u.email, '@', 1), 'User') AS name,
               u.email,
               u.created_at
        FROM brickos.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM brickos.org_members om
            JOIN brickos.organizations o ON o.id = om.org_id
            WHERE om.user_id = u.id AND o.org_type = 'personal'
        )
    LOOP
        new_org_id := gen_random_uuid();

        -- Create personal organization
        INSERT INTO brickos.organizations (id, name, slug, org_type, billing_email, created_at)
        VALUES (
            new_org_id,
            r.name,
            'personal-' || r.user_id::text,
            'personal',
            r.email,
            r.created_at
        )
        ON CONFLICT (slug) DO NOTHING;

        -- If org was created (not a conflict), add user as owner
        IF FOUND THEN
            INSERT INTO brickos.org_members (org_id, user_id, role, joined_at)
            VALUES (new_org_id, r.user_id, 'org_owner', r.created_at)
            ON CONFLICT (org_id, user_id) DO NOTHING;

            -- Set default_org_id if not already set
            UPDATE brickos.users
            SET default_org_id = new_org_id
            WHERE id = r.user_id AND default_org_id IS NULL;

            RAISE NOTICE 'Created personal org for user % (%)', r.email, r.user_id;
        END IF;
    END LOOP;
END $$;
