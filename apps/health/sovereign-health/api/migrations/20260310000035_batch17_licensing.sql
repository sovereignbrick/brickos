-- Batch 17: Licensing tables, tier definitions, enforcement infrastructure
-- M16+M17: License tiers, user licenses, per-agent chat quota, license events

-- ── Tier definitions (seeded, not user-editable) ─────────────────────────────

CREATE TABLE IF NOT EXISTS license_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    tagline VARCHAR(100),
    description TEXT,
    price_monthly_eur DECIMAL(10,2),
    price_annual_eur DECIMAL(10,2),
    -- Feature limits (NULL = unlimited)
    max_markers INT,
    max_history_days INT,
    max_calculated_markers INT,
    max_templates INT,
    max_medications INT,
    -- Doctor Chat quotas per agent (NULL = unlimited, 0 = disabled)
    chat_general_monthly INT,
    chat_trends_monthly INT,
    chat_labs_monthly INT,
    chat_diet_monthly INT,
    chat_supplements_monthly INT,
    chat_protocols_monthly INT,
    chat_lab_import_monthly INT,
    chat_med_import_monthly INT,
    -- Report limits
    pdf_reports_monthly INT,
    -- Feature flags
    csv_export BOOLEAN NOT NULL DEFAULT false,
    json_export BOOLEAN NOT NULL DEFAULT false,
    custom_thresholds BOOLEAN NOT NULL DEFAULT false,
    lifestyle_presets BOOLEAN NOT NULL DEFAULT false,
    protocol_comparison BOOLEAN NOT NULL DEFAULT false,
    body_composition BOOLEAN NOT NULL DEFAULT false,
    supplement_marker_impact BOOLEAN NOT NULL DEFAULT false,
    ai_dashboard_insights BOOLEAN NOT NULL DEFAULT false,
    cohort_comparison BOOLEAN NOT NULL DEFAULT false,
    mfa_totp BOOLEAN NOT NULL DEFAULT false,
    api_access BOOLEAN NOT NULL DEFAULT false,
    self_hosted_hybrid BOOLEAN NOT NULL DEFAULT false,
    team_sharing BOOLEAN NOT NULL DEFAULT false,
    max_team_members INT,
    -- Support
    support_level VARCHAR(20) NOT NULL DEFAULT 'community',
    -- Display
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    highlight BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User licenses (one active per user) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tier_id UUID NOT NULL REFERENCES license_tiers(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    downgraded_at TIMESTAMPTZ,
    grace_period_ends TIMESTAMPTZ,
    previous_tier_slug VARCHAR(20),
    payment_provider VARCHAR(20),
    payment_ref VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ── Per-agent chat quota tracking (monthly reset) ────────────────────────────

CREATE TABLE IF NOT EXISTS chat_agent_quota (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    month_year VARCHAR(7) NOT NULL,
    agent_type VARCHAR(30) NOT NULL,
    used_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, month_year, agent_type)
);

-- ── License events (audit trail) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS license_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    event_type VARCHAR(30) NOT NULL,
    from_tier_slug VARCHAR(20),
    to_tier_slug VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_licenses_user ON user_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_quota_user_month ON chat_agent_quota(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_license_events_user ON license_events(user_id);
CREATE INDEX IF NOT EXISTS idx_license_events_type ON license_events(event_type);

-- ── Seed tier data ───────────────────────────────────────────────────────────

INSERT INTO license_tiers (slug, name, tagline, description, price_monthly_eur, price_annual_eur,
  max_markers, max_history_days, max_calculated_markers, max_templates, max_medications,
  chat_general_monthly, chat_trends_monthly, chat_labs_monthly, chat_diet_monthly, chat_supplements_monthly, chat_protocols_monthly, chat_lab_import_monthly, chat_med_import_monthly,
  pdf_reports_monthly,
  csv_export, json_export, custom_thresholds, lifestyle_presets, protocol_comparison, body_composition, supplement_marker_impact, ai_dashboard_insights, cohort_comparison, mfa_totp, api_access, self_hosted_hybrid, team_sharing, max_team_members,
  support_level, display_order, highlight) VALUES

('core', 'Core', 'Your server, your rules', 'Self-hosted open source edition. Full access, no limits, complete data sovereignty.', NULL, NULL,
  NULL, NULL, NULL, NULL, NULL,
  0, 0, 0, 0, 0, 0, 0, 0,
  0,
  true, true, true, true, true, true, true, false, false, true, true, true, false, NULL,
  'community', 0, false),

('glimpse', 'Glimpse', 'Start your health journey', 'Free access to explore your health data. Track your most important markers and get a taste of AI-powered health insights.', 0, 0,
  15, 90, 3, 1, 5,
  3, 1, 1, 0, 0, 0, 0, 0,
  0,
  false, false, false, false, false, false, false, false, false, false, false, false, false, NULL,
  'community', 1, false),

('focus', 'Focus', 'Take control of your health', 'Unlock all markers, full history, and personalized targets. The essential toolkit for anyone serious about their health.', 9.99, 99.90,
  NULL, NULL, NULL, 3, 10,
  10, 3, 3, 3, 3, 0, 0, 0,
  0,
  true, true, true, true, true, true, true, false, false, true, false, false, false, NULL,
  'community', 2, true),

('insight', 'Insight', 'Understand the full picture', 'Advanced AI analysis, smart lab import, and detailed health reports. For the health-conscious who want deeper understanding.', 24.99, 249.90,
  NULL, NULL, NULL, NULL, NULL,
  30, 10, 10, 10, 10, 5, 3, 1,
  1,
  true, true, true, true, true, true, true, true, false, true, false, false, false, NULL,
  'email', 3, false),

('clarity', 'Clarity', 'Optimize every marker', 'Unlimited AI access, cohort comparison, and team sharing. For biohackers and health optimizers who track everything.', 49.99, 499.90,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, 4, 2,
  2,
  true, true, true, true, true, true, true, true, true, true, false, false, true, 2,
  'priority', 4, false),

('horizon', 'Horizon', 'Complete health sovereignty', 'Everything unlimited. API access, self-hosted hybrid, 10-member team sharing, and dedicated support. For professionals and power users.', 99.99, 999.90,
  NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL,
  true, true, true, true, true, true, true, true, true, true, true, true, true, 10,
  'dedicated', 5, false)

ON CONFLICT (slug) DO NOTHING;

-- ── Assign Glimpse license to existing users who don't have one ──────────────

INSERT INTO user_licenses (user_id, tier_id, status)
SELECT u.id, lt.id, 'active'
FROM users u
CROSS JOIN license_tiers lt
WHERE lt.slug = 'glimpse'
  AND NOT EXISTS (SELECT 1 FROM user_licenses ul WHERE ul.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- ── Assign Clarity to Helmut (first non-demo user) ──────────────────────────

UPDATE user_licenses
SET tier_id = (SELECT id FROM license_tiers WHERE slug = 'clarity'),
    updated_at = NOW()
WHERE user_id = (
    SELECT id FROM users
    WHERE is_deleted = false
    ORDER BY created_at ASC
    LIMIT 1
);

-- Log tier_assigned event for Helmut
INSERT INTO license_events (user_id, event_type, to_tier_slug)
SELECT u.id, 'tier_assigned', 'clarity'
FROM users u
WHERE u.is_deleted = false
ORDER BY u.created_at ASC
LIMIT 1;

-- ── Update users.tier column from user_licenses ──────────────────────────────

UPDATE users u
SET tier = lt.slug
FROM user_licenses ul
JOIN license_tiers lt ON lt.id = ul.tier_id
WHERE ul.user_id = u.id;
