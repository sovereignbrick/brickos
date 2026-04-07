-- Update org_members role values to the new 5-role system.
-- Old: org_owner, org_admin, org_member
-- New: owner, tech_admin, commercial_admin, editor, consumer
--
-- Mapping:
--   org_owner  -> owner
--   org_admin  -> tech_admin (conservative: admins get tech role, can be upgraded)
--   org_member -> consumer
--   org_affiliate -> consumer (affiliates are consumers with referral codes)

UPDATE org_members SET role = 'owner' WHERE role = 'org_owner';
UPDATE org_members SET role = 'tech_admin' WHERE role = 'org_admin';
UPDATE org_members SET role = 'consumer' WHERE role = 'org_member';
UPDATE org_members SET role = 'consumer' WHERE role = 'org_affiliate';

-- Add CHECK constraint for allowed roles (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'org_members_role_check'
    ) THEN
        ALTER TABLE org_members
            ADD CONSTRAINT org_members_role_check
            CHECK (role IN ('owner', 'tech_admin', 'commercial_admin', 'editor', 'consumer'));
    END IF;
END $$;
