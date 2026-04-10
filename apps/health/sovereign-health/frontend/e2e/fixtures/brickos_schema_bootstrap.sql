-- Sprint 040 #471 -- E2E test fixture
--
-- Creates the brickos schema tables (sub-set of brickos-db migrations 009-011)
-- WITHOUT the foreign key constraints that reference brickos.users /
-- brickos.organizations. The FKs are dropped because in production those
-- tables live in a separate physical database; in our single-DB E2E setup
-- the user/organization records stay in public schema.
--
-- This is a TEST FIXTURE only. Production migrations 009-011 in
-- crates/brickos-db/migrations/ keep the FK constraints. Do NOT use this
-- file in production.

CREATE SCHEMA IF NOT EXISTS brickos;

-- ----------------------------------------------------------------------------
-- 1. feature_registry (from 009)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brickos.feature_registry (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(100) UNIQUE NOT NULL,
    app_slug        VARCHAR(50)  NOT NULL,
    category        VARCHAR(50)  NOT NULL,
    name_en         VARCHAR(200) NOT NULL,
    name_de         VARCHAR(200) NOT NULL,
    description_en  TEXT,
    description_de  TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. tier_features (from 009)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brickos.tier_features (
    tier_slug       VARCHAR(50)  NOT NULL,
    feature_slug    VARCHAR(100) NOT NULL REFERENCES brickos.feature_registry(slug) ON DELETE CASCADE,
    included        BOOLEAN      NOT NULL DEFAULT true,
    limit_value     BIGINT,
    limit_label_en  VARCHAR(100),
    limit_label_de  VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tier_slug, feature_slug)
);

-- ----------------------------------------------------------------------------
-- 3. org_licenses (from 009) -- FK to brickos.organizations REMOVED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brickos.org_licenses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,  -- FK removed for E2E
    tier_slug           VARCHAR(50) NOT NULL,
    features            JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_owners          INT NOT NULL DEFAULT 1,
    max_practitioners   INT NOT NULL DEFAULT 0,
    max_members         INT NOT NULL DEFAULT 0,
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL,
    revoked_at          TIMESTAMPTZ,
    jwt_token           TEXT NOT NULL,
    jti                 UUID NOT NULL UNIQUE,
    issued_by           UUID,            -- FK to brickos.users removed for E2E
    notes               TEXT,
    stripe_invoice_id   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_licenses_org_active
    ON brickos.org_licenses(org_id) WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- 4. org_licenses_revoked (from 009) -- FK to brickos.users REMOVED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brickos.org_licenses_revoked (
    jti           UUID PRIMARY KEY,
    org_id        UUID NOT NULL,
    revoked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_by    UUID,           -- FK removed for E2E
    reason        TEXT,
    original_exp  TIMESTAMPTZ NOT NULL
);

-- ----------------------------------------------------------------------------
-- 5. admin_audit_log (from 009) -- FK to brickos.users REMOVED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brickos.admin_audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,           -- FK removed for E2E
    action        VARCHAR(100) NOT NULL,
    target_type   VARCHAR(50)  NOT NULL,
    target_id     UUID         NOT NULL,
    payload       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. organizations (E2E shim)
--
-- Test-only stub of brickos.organizations matching the columns SHI's
-- admin_orgs.rs expects (id, name, slug, org_type, billing_email, is_active,
-- is_deleted). Independent of public.organizations -- the test inserts here
-- directly when creating an org.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brickos.organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    slug          TEXT UNIQUE NOT NULL,
    org_type      TEXT NOT NULL DEFAULT 'clinic',
    billing_email TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    is_deleted    BOOLEAN NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. org_members (E2E shim) -- references brickos.organizations + public.users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brickos.org_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     UUID NOT NULL REFERENCES brickos.organizations(id),
    user_id    UUID NOT NULL,                  -- FK removed; references public.users
    role       TEXT NOT NULL,
    invited_by UUID,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT org_members_role_check CHECK (role IN ('org_owner', 'practitioner', 'member'))
);
