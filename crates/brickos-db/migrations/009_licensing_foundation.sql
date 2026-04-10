-- ============================================================================
-- Migration 009: Licensing Foundation (Sprint 040, design 022)
--
-- Creates the platform-wide brickos-licensing schema:
--   * feature_registry      -- master feature catalog with app_slug namespace
--   * tier_features         -- which tier includes which feature (with limits)
--   * org_licenses          -- signed RS256 JWT certificates per organization
--   * org_licenses_revoked  -- revocation list for live JWTs
--   * admin_audit_log       -- audit trail for licensing-related admin actions
--
-- ADOPTS the existing brickos.license_tiers as the tier definitions table
-- (no rename, no data move). The new brickos.tier_features is a NEW table in
-- the brickos schema -- the SHI public.tier_features remains in place until
-- the SHI tier.rs facade refactor (#467) migrates SHI to the brickos source.
--
-- DOES NOT TOUCH the existing SHI public.product_features or public.tier_features
-- tables. They continue to serve SHI as-is until the facade refactor lands.
--
-- See: docs/design/022-licensing-model.md (sections 3.3, 4.7)
-- See: docs/sprint-planning/sprints/sprint-040.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. feature_registry -- the master catalog
--
-- Every BrickOS feature lives here exactly once with a namespaced slug:
--   shi.csv_export, crm.lead_capture, link.api_access, branding.custom_logo
-- Cross-app features (branding/support) use app_slug = '_platform'.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.feature_registry (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(100) UNIQUE NOT NULL,    -- e.g. 'shi.csv_export'
    app_slug        VARCHAR(50)  NOT NULL,           -- 'sovereign-health', 'sovereign-crm', '_platform'
    category        VARCHAR(50)  NOT NULL,           -- 'data_export', 'ai', 'branding', 'support', etc.
    name_en         VARCHAR(200) NOT NULL,
    name_de         VARCHAR(200) NOT NULL,
    description_en  TEXT,
    description_de  TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_registry_app
    ON brickos.feature_registry(app_slug);

CREATE INDEX IF NOT EXISTS idx_feature_registry_category
    ON brickos.feature_registry(category);

CREATE INDEX IF NOT EXISTS idx_feature_registry_active
    ON brickos.feature_registry(app_slug, is_active)
    WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 2. tier_features (brickos) -- the join table
--
-- Maps tier_slug (from existing brickos.license_tiers.slug) to feature_slug
-- (from feature_registry.slug). Carries the limit value and i18n labels.
--
-- NB: This is a NEW table in the brickos schema. The existing public.tier_features
-- in the SHI database stays in place for now -- it will be dropped by a later
-- migration after #467 (SHI tier.rs facade refactor) ships.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.tier_features (
    tier_slug       VARCHAR(50)  NOT NULL,
    feature_slug    VARCHAR(100) NOT NULL REFERENCES brickos.feature_registry(slug) ON DELETE CASCADE,
    included        BOOLEAN      NOT NULL DEFAULT true,
    limit_value     BIGINT,                          -- e.g. 10 for max active markers, NULL = unlimited
    limit_label_en  VARCHAR(100),                    -- '10 markers', 'unlimited'
    limit_label_de  VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tier_slug, feature_slug)
);

CREATE INDEX IF NOT EXISTS idx_tier_features_tier
    ON brickos.tier_features(tier_slug);

CREATE INDEX IF NOT EXISTS idx_tier_features_feature
    ON brickos.tier_features(feature_slug);

-- ----------------------------------------------------------------------------
-- 3. org_licenses -- signed JWT certificates per organization
--
-- One row per active license. The JWT is the certificate; this row is the
-- cache, the audit trail, and the link to a Stripe invoice.
--
-- New licenses set the previous active license's revoked_at = NOW().
-- The partial unique index enforces "at most one active license per org".
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.org_licenses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES brickos.organizations(id) ON DELETE CASCADE,
    tier_slug           VARCHAR(50) NOT NULL,             -- 'insight', 'horizon', 'custom', etc.
    features            JSONB NOT NULL DEFAULT '[]'::jsonb, -- ["shi.csv_export", "branding.custom_domain", ...]
    max_owners          INT NOT NULL DEFAULT 1,
    max_practitioners   INT NOT NULL DEFAULT 0,
    max_members         INT NOT NULL DEFAULT 0,           -- -1 = unlimited
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ,
    jwt_token           TEXT NOT NULL,                    -- the signed RS256 certificate
    jti                 UUID NOT NULL UNIQUE,             -- JWT ID for revocation list lookup
    issued_by           UUID REFERENCES brickos.users(id),
    notes               TEXT,
    stripe_invoice_id   TEXT,                             -- optional link to Stripe invoice
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_licenses_org
    ON brickos.org_licenses(org_id);

-- Partial index: at most one active (non-revoked, non-expired) license per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_licenses_org_active
    ON brickos.org_licenses(org_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_org_licenses_expires
    ON brickos.org_licenses(expires_at)
    WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- 4. org_licenses_revoked -- the revocation list
--
-- Looked up by jti on every license validation (cached in memory, refreshed
-- every 60s). Periodically pruned of entries whose original_exp has passed.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.org_licenses_revoked (
    jti           UUID PRIMARY KEY,
    org_id        UUID NOT NULL,                          -- denormalized for audit
    revoked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_by    UUID REFERENCES brickos.users(id),
    reason        TEXT,
    original_exp  TIMESTAMPTZ NOT NULL                    -- so we can prune after natural expiry
);

CREATE INDEX IF NOT EXISTS idx_org_licenses_revoked_prune
    ON brickos.org_licenses_revoked(original_exp);

-- ----------------------------------------------------------------------------
-- 5. admin_audit_log -- audit trail for licensing admin actions
--
-- Written by every brickos admin action that mutates licensing state:
-- license issue/revoke, admin override set/clear, member add/remove,
-- role change, dormant flag, etc.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.admin_audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES brickos.users(id),      -- nullable for system actions
    action        VARCHAR(100) NOT NULL,                  -- 'org.license.issue', 'tier.admin_override.set', etc.
    target_type   VARCHAR(50)  NOT NULL,                  -- 'organization', 'user', 'license'
    target_id     UUID         NOT NULL,
    payload       JSONB        NOT NULL DEFAULT '{}'::jsonb, -- before/after, metadata
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
    ON brickos.admin_audit_log(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target
    ON brickos.admin_audit_log(target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
    ON brickos.admin_audit_log(action, created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. Comments for documentation
-- ----------------------------------------------------------------------------

COMMENT ON TABLE brickos.feature_registry IS
  'Master catalog of all BrickOS features across all apps. Slugs are namespaced (shi.csv_export, crm.lead_capture). See docs/design/022-licensing-model.md §4.7.';

COMMENT ON TABLE brickos.tier_features IS
  'Maps tier_slug (from brickos.license_tiers) to feature_slug (from feature_registry). Carries limit values and i18n labels. NEW in brickos schema, replaces SHI public.tier_features after #467.';

COMMENT ON TABLE brickos.org_licenses IS
  'Signed RS256 JWT license certificates per organization. JWT is the source of truth; this row is the cache + audit. See design 022 §3.3, §6.';

COMMENT ON TABLE brickos.org_licenses_revoked IS
  'Revocation list for active org_license JWTs. Cached in memory by brickos-licensing service, refreshed every 60s.';

COMMENT ON TABLE brickos.admin_audit_log IS
  'Audit trail for all licensing-related admin actions. Written by handlers in brickos-platform-api.';
