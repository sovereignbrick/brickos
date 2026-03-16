-- E06-P0: Payment Gateway Abstraction Layer

-- Gateway status tracking table
CREATE TABLE IF NOT EXISTS payment_gateway_status (
    gateway_id VARCHAR(20) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    is_active_fiat BOOLEAN NOT NULL DEFAULT false,
    is_active_btc BOOLEAN NOT NULL DEFAULT false,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count INTEGER NOT NULL DEFAULT 0,
    config_valid BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO payment_gateway_status (gateway_id, enabled, is_active_fiat, config_valid)
VALUES ('stripe', true, true, false)
ON CONFLICT (gateway_id) DO NOTHING;

INSERT INTO payment_gateway_status (gateway_id, enabled, is_active_btc, config_valid)
VALUES ('strike', true, true, false)
ON CONFLICT (gateway_id) DO NOTHING;

-- Gateway selection settings
INSERT INTO app_settings (key, value, category, description)
VALUES ('payment_fiat_gateway', '"stripe"', 'payments', 'Active gateway for EUR payments')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, category, description)
VALUES ('payment_btc_gateway', '"strike"', 'payments', 'Active gateway for Bitcoin payments')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, category, description)
VALUES ('gateway_stripe_enabled', 'true', 'payments', 'Enable/disable Stripe gateway')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, category, description)
VALUES ('gateway_strike_enabled', 'true', 'payments', 'Enable/disable Strike gateway')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value, category, description)
VALUES ('btc_discount_percent', '5', 'payments', 'Discount percentage for Bitcoin payments')
ON CONFLICT (key) DO NOTHING;
