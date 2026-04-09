-- Dev database initialization
-- Creates brickos schema + platform tables needed by auth handlers

CREATE SCHEMA IF NOT EXISTS brickos;
SET search_path TO public, brickos;

-- Platform: users
CREATE TABLE IF NOT EXISTS brickos.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    display_name VARCHAR,
    role VARCHAR DEFAULT 'user',
    tier VARCHAR DEFAULT 'glimpse',
    language VARCHAR DEFAULT 'en',
    timezone VARCHAR,
    mfa_enabled BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    locale VARCHAR DEFAULT 'en',
    tos_accepted_at TIMESTAMPTZ,
    affiliate_code VARCHAR UNIQUE,
    referred_by VARCHAR,
    parent_referrer_id UUID,
    stripe_customer_id VARCHAR,
    affiliate_settings JSONB,
    default_org_id UUID,
    is_protected BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    nostr_pubkey VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform: refresh_tokens
CREATE TABLE IF NOT EXISTS brickos.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES brickos.users(id),
    token_hash VARCHAR NOT NULL,
    revoked BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform: email_verifications
CREATE TABLE IF NOT EXISTS brickos.email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES brickos.users(id),
    token VARCHAR NOT NULL,
    purpose VARCHAR NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform: user_mfa
CREATE TABLE IF NOT EXISTS brickos.user_mfa (
    user_id UUID PRIMARY KEY REFERENCES brickos.users(id),
    totp_secret_encrypted VARCHAR NOT NULL,
    enabled BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    recovery_codes_encrypted VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform: user_profile
CREATE TABLE IF NOT EXISTS brickos.user_profile (
    user_id UUID PRIMARY KEY REFERENCES brickos.users(id),
    gender VARCHAR,
    age INTEGER,
    country_code VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform: organizations
CREATE TABLE IF NOT EXISTS brickos.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR,
    slug VARCHAR UNIQUE,
    org_type VARCHAR DEFAULT 'personal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform: org_members
CREATE TABLE IF NOT EXISTS brickos.org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES brickos.organizations(id),
    user_id UUID NOT NULL REFERENCES brickos.users(id),
    role VARCHAR DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- Platform: newsletter_subscribers
CREATE TABLE IF NOT EXISTS brickos.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL,
    source VARCHAR DEFAULT 'signup',
    app_source VARCHAR,
    confirmed BOOLEAN DEFAULT false,
    subscribed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: default org
INSERT INTO brickos.organizations (id, name, slug, org_type)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Org', 'dev-org', 'personal')
ON CONFLICT DO NOTHING;
