-- Organizations: groups users together (personal, clinic, family, enterprise)
-- This migration is backward-compatible: existing users get auto-created personal orgs.
-- The users.tier column is NOT removed -- JWT still reads it for backward compatibility.

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    org_type TEXT NOT NULL DEFAULT 'personal',  -- personal, clinic, family, enterprise, demo
    tier_id UUID REFERENCES license_tiers(id),
    billing_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Organization membership
CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'org_member',  -- org_owner, org_admin, org_member
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- App-specific roles (for future use: practitioner, patient, viewer)
CREATE TABLE IF NOT EXISTS app_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    app_key TEXT NOT NULL,     -- health, finance, node
    role TEXT NOT NULL,        -- practitioner, patient, viewer, user
    granted_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, user_id, app_key)
);

-- Data sharing permissions (for future use: patient -> doctor)
CREATE TABLE IF NOT EXISTS data_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    granted_to_user_id UUID NOT NULL REFERENCES users(id),
    org_id UUID NOT NULL REFERENCES organizations(id),
    app_key TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'read',  -- read, read_write, full
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log (who accessed what)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    org_id UUID REFERENCES organizations(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    ip_address TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add default_org_id to users (optional convenience, nullable)
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_org_id UUID REFERENCES organizations(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_app_roles_user ON app_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_app_roles_org ON app_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_data_shares_owner ON data_shares(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_data_shares_granted ON data_shares(granted_to_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- Auto-create personal organization for each existing user
-- and set them as org_owner
INSERT INTO organizations (id, name, slug, org_type, tier_id, billing_email, created_at)
SELECT
    gen_random_uuid(),
    COALESCE(u.display_name, split_part(u.email, '@', 1)),
    'personal-' || u.id::text,
    'personal',
    lt.id,
    u.email,
    u.created_at
FROM users u
LEFT JOIN license_tiers lt ON lt.slug = u.tier
WHERE u.id != '00000000-0000-0000-0000-000000000001'  -- skip demo user
ON CONFLICT (slug) DO NOTHING;

-- Make each user the owner of their personal org
INSERT INTO org_members (org_id, user_id, role)
SELECT o.id, u.id, 'org_owner'
FROM users u
JOIN organizations o ON o.slug = 'personal-' || u.id::text
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Set default_org_id for each user
UPDATE users u SET default_org_id = o.id
FROM organizations o
WHERE o.slug = 'personal-' || u.id::text
AND u.default_org_id IS NULL;

-- Create demo organization
INSERT INTO organizations (id, name, slug, org_type, tier_id, created_at)
SELECT
    gen_random_uuid(),
    'BrickOS Demo',
    'demo',
    'demo',
    lt.id,
    NOW()
FROM license_tiers lt
WHERE lt.slug = 'insight'
ON CONFLICT (slug) DO NOTHING;

-- Add demo user to demo org
INSERT INTO org_members (org_id, user_id, role)
SELECT o.id, '00000000-0000-0000-0000-000000000001'::uuid, 'org_member'
FROM organizations o
WHERE o.slug = 'demo'
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Give demo user the health app role
INSERT INTO app_roles (org_id, user_id, app_key, role)
SELECT o.id, '00000000-0000-0000-0000-000000000001'::uuid, 'health', 'demo'
FROM organizations o
WHERE o.slug = 'demo'
ON CONFLICT (org_id, user_id, app_key) DO NOTHING;
