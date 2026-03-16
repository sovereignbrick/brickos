-- Migration 036: Email infrastructure (Batch 20)
-- Consent columns on user_profile, user_segments table,
-- email_campaigns + email_sends tracking tables.

-- 1. Consent management columns on user_profile
ALTER TABLE user_profile
    ADD COLUMN IF NOT EXISTS consent_product_updates BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS consent_newsletter       BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS consent_partner_offers   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS mailgun_synced           BOOLEAN NOT NULL DEFAULT false;

-- 2. User segments (internal targeting -- NEVER sent to Mailgun)
CREATE TABLE IF NOT EXISTS user_segments (
    user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    diet_protocol          TEXT,       -- standard | keto | carnivore | fasting | mixed
    age_bracket            TEXT,       -- 18-29 | 30-39 | 40-49 | 50-59 | 60+
    health_goal            TEXT,       -- weight_loss | metabolic | longevity | athletic | general
    engagement             TEXT,       -- active | moderate | dormant
    onboarding             TEXT,       -- incomplete | complete
    measurement_frequency  TEXT,       -- daily | weekly | monthly | rare
    marker_count_bracket   TEXT,       -- 0 | 1-5 | 6-15 | 16+
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_segments_engagement ON user_segments(engagement);
CREATE INDEX IF NOT EXISTS idx_user_segments_diet ON user_segments(diet_protocol);

-- 3. Email campaigns (admin-initiated sends)
CREATE TABLE IF NOT EXISTS email_campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject         TEXT NOT NULL,
    template_name   TEXT NOT NULL,
    segment_filters JSONB NOT NULL DEFAULT '{}',
    recipient_count INT NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'draft',  -- draft | sending | sent | failed
    sent_by         UUID REFERENCES users(id),
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Individual email send log
CREATE TABLE IF NOT EXISTS email_sends (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id  UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    email        TEXT NOT NULL,
    template     TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'sent',  -- sent | failed | bounced
    error_msg    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_user ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_created ON email_sends(created_at);
