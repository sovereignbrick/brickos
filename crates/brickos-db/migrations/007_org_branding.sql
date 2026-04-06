-- ============================================================================
-- Migration 007: White-label branding per organization
-- Issue #355 - Add branding column and domain_mappings table
-- ============================================================================

-- Add branding column to organizations
ALTER TABLE brickos.organizations ADD COLUMN IF NOT EXISTS
    branding JSONB DEFAULT '{}';

-- Add domain_mappings table for custom domains
CREATE TABLE IF NOT EXISTS brickos.domain_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES brickos.organizations(id),
    domain VARCHAR(255) NOT NULL UNIQUE,
    ssl_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, active, failed
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_mappings_domain ON brickos.domain_mappings(domain);
CREATE INDEX IF NOT EXISTS idx_domain_mappings_org ON brickos.domain_mappings(org_id);

COMMENT ON COLUMN brickos.organizations.branding IS
    'JSON: {"logo_url": "...", "primary_color": "#hex", "footer_text": "...", "favicon_url": "..."}';
