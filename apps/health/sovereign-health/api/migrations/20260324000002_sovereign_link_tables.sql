-- Sovereign Link: URL shortener tables
-- Design doc: docs/project-files/design/024-url-shortener-service.md
--
-- Tables:
--   1. app_prefixes    — 2-char app codes for fast-path redirect routing
--   2. short_links     — short codes → target URLs
--   3. short_link_clicks — privacy-preserving click analytics
--   4. Backfill: auto-create short_links for all existing affiliate codes
--
-- ALL statements use IF NOT EXISTS — safe to re-run.

-- =========================================================================
-- 1. App Prefixes (platform-level routing)
-- =========================================================================

CREATE TABLE IF NOT EXISTS app_prefixes (
    prefix VARCHAR(2) PRIMARY KEY,
    app_key VARCHAR(50) NOT NULL,
    domain VARCHAR(30) NOT NULL,
    base_url TEXT NOT NULL,
    signup_path TEXT NOT NULL DEFAULT '/?ref=',
    is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO app_prefixes (prefix, app_key, domain, base_url, signup_path) VALUES
    ('sh', 'sovereign-health', 'health', 'https://app.sovereignhealth.io', '/?ref=')
ON CONFLICT (prefix) DO NOTHING;

-- Future apps (inactive until launched):
-- INSERT INTO app_prefixes VALUES ('bt', 'btc-tracker', 'finance', 'https://app.btctracker.io', '/?ref=')
-- INSERT INTO app_prefixes VALUES ('bn', 'bitcoin-node', 'infrastructure', 'https://node.brickos.io', '/?ref=')

-- =========================================================================
-- 2. Short Links
-- =========================================================================

CREATE TABLE IF NOT EXISTS short_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL,
    target_url TEXT NOT NULL,
    link_type VARCHAR(20) NOT NULL DEFAULT 'affiliate',

    -- Hierarchy for reporting
    domain VARCHAR(30) NOT NULL DEFAULT 'health',
    app_key VARCHAR(50) NOT NULL DEFAULT 'sovereign-health',

    -- Ownership
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- Affiliate linkage (joins to users.affiliate_code)
    affiliate_code VARCHAR(8),

    -- Metadata
    title VARCHAR(100),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT short_links_code_unique UNIQUE (code)
);

-- Hot path: redirect lookup by code
CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);

-- Reporting: filter by app hierarchy
CREATE INDEX IF NOT EXISTS idx_short_links_domain_app ON short_links(domain, app_key);

-- Lookup by affiliate code (for affiliate page)
CREATE INDEX IF NOT EXISTS idx_short_links_affiliate ON short_links(affiliate_code);

-- Lookup by owner (for /api/v1/links)
CREATE INDEX IF NOT EXISTS idx_short_links_owner ON short_links(owner_user_id);

-- =========================================================================
-- 3. Short Link Clicks (privacy-preserving analytics)
-- =========================================================================

CREATE TABLE IF NOT EXISTS short_link_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_link_id UUID NOT NULL REFERENCES short_links(id) ON DELETE CASCADE,

    -- Privacy: no IP stored, no user agent
    referrer_domain VARCHAR(255),
    country_code VARCHAR(2),

    -- Daily dedup: SHA256(IP + code + date), rotates daily, one-way
    visitor_hash VARCHAR(64),

    clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time-series: clicks per link
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_link_time
    ON short_link_clicks(short_link_id, clicked_at);

-- Rollup queries: all clicks by time
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_time
    ON short_link_clicks(clicked_at);

-- =========================================================================
-- 4. Backfill: create short_links for all existing affiliate codes
-- =========================================================================

INSERT INTO short_links (id, code, target_url, link_type, domain, app_key, owner_user_id, affiliate_code)
SELECT
    gen_random_uuid(),
    'sh' || u.affiliate_code,
    'https://app.sovereignhealth.io/?ref=' || u.affiliate_code,
    'affiliate',
    'health',
    'sovereign-health',
    u.id,
    u.affiliate_code
FROM users u
WHERE u.affiliate_code IS NOT NULL
  AND u.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM short_links sl WHERE sl.code = 'sh' || u.affiliate_code
  );
