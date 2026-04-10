-- Sprint 040 #480 -- per-org branding (logo, colors, role labels) and
-- custom-domain mappings.
--
-- Mirrors crates/brickos-db/migrations/007_org_branding.sql which lives
-- on the production two-pool brickos schema. We need the same shape on
-- the SHI single-DB so the platform admin Branding tab works locally.
-- Both columns/tables are namespaced JSONB with no FK to legacy tables,
-- so the migration is safe and idempotent.

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS branding JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS domain_mappings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain      VARCHAR(255) NOT NULL UNIQUE,
    ssl_status  VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending | active | failed
    verified_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_mappings_domain ON domain_mappings(domain);
CREATE INDEX IF NOT EXISTS idx_domain_mappings_org    ON domain_mappings(org_id);

COMMENT ON COLUMN organizations.branding IS
    'JSONB: { logo_url, logo_base64, primary_color, accent_color, role_labels: { org_owner, practitioner, member }, footer_text }';
