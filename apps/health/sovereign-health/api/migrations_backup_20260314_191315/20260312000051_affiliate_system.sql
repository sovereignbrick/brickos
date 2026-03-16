-- Affiliate / Referral System
-- Adds affiliate codes to users and tracking tables for clicks, conversions, payouts.

-- Add affiliate columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_code VARCHAR(8) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(8);
ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_settings JSONB;

-- Backfill existing users with unique random 8-char lowercase alphanumeric codes
-- Uses a DO block with collision retry
DO $$
DECLARE
    r RECORD;
    new_code VARCHAR(8);
    collision BOOLEAN;
BEGIN
    FOR r IN SELECT id FROM users WHERE affiliate_code IS NULL LOOP
        collision := true;
        WHILE collision LOOP
            new_code := substr(md5(gen_random_uuid()::text), 1, 8);
            -- Ensure only lowercase alphanumeric (md5 already is, but be explicit)
            new_code := lower(new_code);
            BEGIN
                UPDATE users SET affiliate_code = new_code WHERE id = r.id AND affiliate_code IS NULL;
                collision := false;
            EXCEPTION WHEN unique_violation THEN
                collision := true;
            END;
        END LOOP;
    END LOOP;
END $$;

-- Affiliate clicks tracking (no IP or user_agent — privacy by design)
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_code VARCHAR(8) NOT NULL,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_code ON affiliate_clicks(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_time ON affiliate_clicks(clicked_at);

-- Affiliate conversions (when a referred user purchases a subscription)
CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_code VARCHAR(8) NOT NULL,
    referred_user_id UUID NOT NULL,
    order_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    commission_amount_cents INTEGER,
    commission_btc_sats BIGINT,
    rejection_reason VARCHAR(255),
    evaluation_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_code ON affiliate_conversions(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_status ON affiliate_conversions(status);

-- Affiliate payouts (grouped approved conversions paid out to affiliates)
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_code VARCHAR(8) NOT NULL,
    amount_cents INTEGER,
    amount_btc_sats BIGINT,
    payout_method VARCHAR(20) NOT NULL,
    payout_reference VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_code ON affiliate_payouts(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON affiliate_payouts(status);
