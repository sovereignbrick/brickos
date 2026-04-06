-- ============================================================================
-- Migration 002: Service accounts, key rotation, and reserved codes
-- Sprint 028 Day 4 - Issue #330
--
-- Creates infrastructure for cross-app API access (service accounts) and
-- reserves URL codes/org slugs for BrickOS product names.
--
-- Service accounts allow apps like Sovereign Voice to call Sovereign Link
-- APIs without human credentials. Keys are SHA-256 hashed, never stored
-- in plaintext.
--
-- See: docs/design/006-platform-schema-elevation.md (sections 5, 9)
-- ============================================================================

-- ============================================================================
-- Step 1: Ensure the BrickOS platform organization exists
--
-- Well-known UUID: 00000000-0000-0000-0000-000000000000
-- This is the root org for platform-level service accounts.
-- ============================================================================

INSERT INTO brickos.organizations (id, name, slug, org_type, is_active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'BrickOS',
    'brickos',
    'platform',
    true,
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Step 2: Service accounts table
--
-- Each service account belongs to an org and has scoped API access.
-- The api_key_hash column stores SHA-256 of the API key (not reversible).
-- ============================================================================

CREATE TABLE IF NOT EXISTS brickos.service_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200),
    org_id UUID NOT NULL REFERENCES brickos.organizations(id),
    api_key_hash VARCHAR(64) NOT NULL,
    scopes TEXT[] NOT NULL,
    rate_limit_daily INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES brickos.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_service_accounts_org
    ON brickos.service_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_service_accounts_active
    ON brickos.service_accounts(is_active) WHERE is_active = true;

-- ============================================================================
-- Step 3: Service account key rotation table
--
-- Supports overlap periods during key rotation. Old key stays valid until
-- expires_at, while new key is already active.
-- ============================================================================

CREATE TABLE IF NOT EXISTS brickos.service_account_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_account_id UUID NOT NULL REFERENCES brickos.service_accounts(id),
    api_key_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_account_keys_account
    ON brickos.service_account_keys(service_account_id);
CREATE INDEX IF NOT EXISTS idx_service_account_keys_expires
    ON brickos.service_account_keys(expires_at)
    WHERE expires_at IS NOT NULL;

-- ============================================================================
-- Step 4: Reserved codes table
--
-- Prevents URL codes and org slugs from being claimed by users.
-- Reserved for BrickOS product names, common words, and platform routes.
-- ============================================================================

CREATE TABLE IF NOT EXISTS brickos.reserved_codes (
    code VARCHAR(50) PRIMARY KEY,
    reason TEXT NOT NULL,
    reserved_by UUID REFERENCES brickos.users(id),
    reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 5: Seed reserved codes for BrickOS product names and platform routes
-- ============================================================================

INSERT INTO brickos.reserved_codes (code, reason) VALUES
    -- BrickOS product names
    ('brickos',           'Platform brand name'),
    ('shi',               'Sovereign Health Intelligence - product name'),
    ('sovereign-health',  'Sovereign Health Intelligence - full product name'),
    ('voice',             'Sovereign Voice - product name'),
    ('sovereign-voice',   'Sovereign Voice - full product name'),
    ('link',              'Sovereign Link - product name'),
    ('sovereign-link',    'Sovereign Link - full product name'),
    ('health',            'Health app namespace'),
    ('bitcoin',           'Bitcoin/BTC app namespace'),
    ('btc',               'Bitcoin/BTC shorthand'),
    ('nostr',             'NOSTR protocol namespace'),
    ('lightning',         'Lightning Network namespace'),

    -- Platform routes and system slugs
    ('admin',             'Platform admin panel'),
    ('api',               'API namespace'),
    ('auth',              'Authentication routes'),
    ('app',               'Application namespace'),
    ('platform',          'Platform namespace'),
    ('system',            'System namespace'),
    ('support',           'Support namespace'),
    ('help',              'Help namespace'),
    ('docs',              'Documentation namespace'),
    ('demo',              'Demo organization slug'),
    ('status',            'Status page namespace'),
    ('billing',           'Billing namespace'),
    ('settings',          'Settings namespace'),
    ('dashboard',         'Dashboard namespace'),
    ('login',             'Login route'),
    ('signup',            'Signup route'),
    ('register',          'Registration route'),
    ('reset',             'Password reset route'),
    ('verify',            'Email verification route'),
    ('unsubscribe',       'Email unsubscribe route'),

    -- Common words that should not be org slugs
    ('www',               'Web subdomain'),
    ('mail',              'Email subdomain'),
    ('ftp',               'FTP subdomain'),
    ('test',              'Testing namespace'),
    ('staging',           'Staging environment'),
    ('dev',               'Development environment'),
    ('prod',              'Production environment'),
    ('root',              'System root'),
    ('null',              'Reserved keyword'),
    ('undefined',         'Reserved keyword')
ON CONFLICT (code) DO NOTHING;

-- NOTE on encryption:
-- Service account display_name may contain PII. Encrypt at rest via
-- brickos-crypto crate in a future migration.
