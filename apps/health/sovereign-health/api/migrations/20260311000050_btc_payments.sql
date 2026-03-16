-- Migration 050: Bitcoin payment support via Strike API
-- Track payment method on licenses + BTC payment records

ALTER TABLE user_licenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'stripe';
-- Values: 'stripe', 'strike_btc', 'admin_override'

CREATE TABLE IF NOT EXISTS btc_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    strike_invoice_id VARCHAR(100) UNIQUE,
    tier VARCHAR(20) NOT NULL,
    period_months INT NOT NULL,
    amount_eur DECIMAL(10,2) NOT NULL,
    amount_btc DECIMAL(16,8),
    amount_sats BIGINT,
    btc_discount_percent DECIMAL(5,2) DEFAULT 5.0,
    promo_code VARCHAR(50),
    promo_discount_eur DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    prepaid_from TIMESTAMPTZ,
    prepaid_until TIMESTAMPTZ,
    strike_payment_id VARCHAR(100),
    lightning_invoice VARCHAR(1000),
    on_chain_address VARCHAR(100),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_btc_payments_user ON btc_payments(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_btc_payments_status ON btc_payments(status);
CREATE INDEX IF NOT EXISTS idx_btc_payments_strike ON btc_payments(strike_invoice_id);
