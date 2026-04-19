-- Sprint 044 #552: Org-scoped data isolation
--
-- Adds org_id to data tables so RLS can enforce org boundaries.
-- IS NULL fallback ensures individual users (no org) keep working.
-- Backfills org_id from org_members lookup.

-- 1. Add org_id column to measurements (the main data table)
ALTER TABLE measurements
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_measurements_org_id
    ON measurements(org_id) WHERE org_id IS NOT NULL;

-- 2. Backfill org_id from org_members (non-personal orgs only)
UPDATE measurements m
SET org_id = om.org_id
FROM org_members om
JOIN organizations o ON o.id = om.org_id
WHERE m.user_id = om.user_id
  AND m.org_id IS NULL
  AND o.org_type != 'personal';

-- 3. Enable RLS on measurements (if not already)
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- 4. Drop old user-only policy if exists, create org-aware policy
DROP POLICY IF EXISTS measurements_user_isolation ON measurements;
DROP POLICY IF EXISTS measurements_org_isolation ON measurements;

-- Users see their own measurements, scoped to org if in org context.
-- IS NULL fallback: if app.current_org_id is not set (individual user),
-- they see all their own measurements regardless of org_id.
CREATE POLICY measurements_org_isolation ON measurements
    FOR ALL
    USING (
        user_id = current_setting('app.current_user_id', true)::uuid
        AND (
            -- No org context: see all own data (individual users)
            current_setting('app.current_org_id', true) IS NULL
            OR current_setting('app.current_org_id', true) = ''
            -- Org context: only see data from this org (or unscoped)
            OR org_id = current_setting('app.current_org_id', true)::uuid
            OR org_id IS NULL
        )
    );

-- 5. Admin bypass: platform admins see everything
DROP POLICY IF EXISTS measurements_admin_bypass ON measurements;
CREATE POLICY measurements_admin_bypass ON measurements
    FOR ALL
    USING (
        current_setting('app.current_user_id', true) IN (
            SELECT id::text FROM users WHERE role = 'admin'
        )
    );
