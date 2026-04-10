-- ============================================================================
-- Migration 010: Individual pseudo-org + lifecycle + admin override extensions
-- Sprint 040, design 022, issue #461
--
-- Three coupled changes that close out Phase A's data model work:
--
-- 1. Insert the 'individual' system org with a fixed UUID.
--    Replaces N+1 personal-org-per-user pollution. Users with no org_members
--    row are implicitly individuals (handler fallback to this UUID).
--
-- 2. Delete all rows where org_type='personal'. Their org_members rows are
--    cascade-deleted via the FK in the existing schema (or explicitly here
--    if the FK is not ON DELETE CASCADE).
--
-- 3. Add lifecycle and admin-override-extension columns:
--      users.lifecycle_status                       -- 'active' | 'dormant' | 'scheduled_deletion'
--      user_licenses.admin_override_tier_slug       -- which tier the override grants
--      user_licenses.admin_override_expires_at      -- optional time-bounded override
--    The existing admin_override BOOLEAN, admin_override_by, admin_override_at,
--    and admin_override_note columns from sprint 011 are unchanged.
--
-- IMPACT: SHI middleware does not query brickos.org_members for normal user
-- requests, so deleting personal orgs has zero impact on individual user flows.
-- Admin endpoints that join on org_members take an org_id parameter and only
-- return members of that specific org -- they don't see individuals.
--
-- See: docs/design/022-licensing-model.md §2.4, §2.5, §2.6
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Insert the 'individual' system organization
--
-- Fixed UUID 00000000-0000-0000-0000-000000000001 so handlers can hardcode
-- the fallback. The org_type 'system' distinguishes it from real customer
-- organizations (clinic, family, business, enterprise).
--
-- ON CONFLICT DO NOTHING so the migration is idempotent.
-- ----------------------------------------------------------------------------

INSERT INTO brickos.organizations (
    id,
    name,
    slug,
    org_type,
    billing_email,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Individual User',
    'individual',
    'system',
    NULL,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Delete personal org pollution
--
-- Every user that signed up since sprint 035 had a personal org auto-created
-- via migration 006_backfill_personal_orgs. We undo that now: each individual
-- user is implicitly a member of the 'individual' system org via handler
-- fallback (no org_members row needed).
--
-- Step 2a: delete the org_members rows that link users to their personal orgs.
-- Step 2b: delete the personal organizations themselves.
--
-- Both wrapped in WHERE conditions that are no-ops if no personal orgs exist
-- (e.g. on a fresh dev DB or in CI).
-- ----------------------------------------------------------------------------

DELETE FROM brickos.org_members
WHERE org_id IN (
    SELECT id FROM brickos.organizations WHERE org_type = 'personal'
);

DELETE FROM brickos.organizations
WHERE org_type = 'personal';

-- ----------------------------------------------------------------------------
-- 3. Add users.lifecycle_status
--
-- States:
--   'active'              -- normal user (default)
--   'dormant'             -- Glimpse user with no activity for 365 days
--   'scheduled_deletion'  -- flagged by admin for manual purge after notice
--
-- Per locked decision Q3: only Glimpse users transition to 'dormant'. No
-- automatic deletion. The brickos admin reviews the dormant cohort manually.
-- ----------------------------------------------------------------------------

ALTER TABLE brickos.users
    ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(30) NOT NULL DEFAULT 'active';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_schema = 'brickos'
          AND table_name = 'users'
          AND constraint_name = 'users_lifecycle_status_check'
    ) THEN
        ALTER TABLE brickos.users
            ADD CONSTRAINT users_lifecycle_status_check
            CHECK (lifecycle_status IN ('active', 'dormant', 'scheduled_deletion'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_lifecycle_dormant
    ON brickos.users(lifecycle_status, last_active_at)
    WHERE lifecycle_status = 'dormant';

-- ----------------------------------------------------------------------------
-- 4. Extend user_licenses for time-bounded admin override
--
-- The existing admin_override BOOLEAN flag is audit-only today (the resolver
-- ignores it). After #467 (SHI tier.rs facade refactor), the resolver will
-- short-circuit on admin_override = TRUE AND admin_override_tier_slug IS NOT
-- NULL AND (admin_override_expires_at IS NULL OR admin_override_expires_at > NOW()).
--
-- This lets brickos admins grant a free tier with optional expiry, e.g.
-- "Insight for 90 days while a journalist evaluates the product".
-- ----------------------------------------------------------------------------

ALTER TABLE brickos.user_licenses
    ADD COLUMN IF NOT EXISTS admin_override_tier_slug VARCHAR(50);

ALTER TABLE brickos.user_licenses
    ADD COLUMN IF NOT EXISTS admin_override_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_licenses_admin_override_active
    ON brickos.user_licenses(user_id)
    WHERE admin_override = true
      AND admin_override_tier_slug IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. Comments for documentation
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN brickos.users.lifecycle_status IS
  'User account lifecycle state. Only Glimpse users transition to dormant after 365 days of inactivity. No automatic deletion. See design 022 §2.5.';

COMMENT ON COLUMN brickos.user_licenses.admin_override_tier_slug IS
  'When set with admin_override=true, the effective tier resolver returns this tier instead of the Stripe-driven tier. Honored only when admin_override_expires_at is NULL or in the future.';

COMMENT ON COLUMN brickos.user_licenses.admin_override_expires_at IS
  'Optional expiry for an admin tier override. NULL = permanent. After expiry the resolver falls through to the Stripe tier. See design 022 §2.6.';
