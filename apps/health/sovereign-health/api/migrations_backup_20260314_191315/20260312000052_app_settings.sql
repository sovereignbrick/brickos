-- App settings: key-value config store managed by admins
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description VARCHAR(500),
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES users(id)
);

-- Seed default settings
INSERT INTO app_settings (key, value, description, category) VALUES
-- Access Control
('registration_enabled', 'false', 'Allow new user registration', 'access'),
('registration_whitelist_ips', '["212.103.60.208"]', 'IPs that can register even when registration is disabled', 'access'),
('user_login_enabled', 'true', 'Allow non-admin users to log in (admins can always log in)', 'access'),
('maintenance_mode', 'false', 'Show maintenance page to non-admin users', 'access'),

-- Dr. Alex (App)
('dr_alex_app_enabled', 'true', 'Enable Dr. Alex AI chat in the app', 'dr_alex'),
('dr_alex_app_model', '"claude-sonnet-4-5-20250514"', 'AI model used for Dr. Alex app chat', 'dr_alex'),

-- Dr. Alex (Website / Public)
('dr_alex_web_enabled', 'true', 'Enable Dr. Alex public chat on website', 'dr_alex'),
('dr_alex_web_daily_limit', '10', 'Daily messages per visitor (public/unauthenticated)', 'dr_alex'),
('dr_alex_web_model', '"claude-haiku-4-5-20251001"', 'AI model used for Dr. Alex website chat', 'dr_alex'),

-- Integrations
('mailgun_enabled', 'true', 'Enable email sending via Mailgun', 'integrations'),
('stripe_live_mode', 'false', 'Use Stripe live mode (true) or test mode (false)', 'integrations'),
('btcpay_enabled', 'false', 'Enable BTCPay Server Bitcoin payments', 'integrations'),

-- Content & Uploads
('max_upload_files', '10', 'Maximum files per upload batch', 'content'),
('max_upload_size_mb', '50', 'Maximum file size in MB', 'content'),
('supported_lab_formats', '["pdf", "csv", "xlsx", "ods"]', 'Accepted lab report file formats', 'content'),

-- Affiliate
('affiliate_enabled', 'false', 'Enable affiliate/referral system', 'affiliate'),
('affiliate_commission_pct', '20', 'Commission percentage for affiliates', 'affiliate'),
('affiliate_min_payout_cents', '2500', 'Minimum payout threshold in EUR cents', 'affiliate'),
('affiliate_evaluation_days', '30', 'Days before commission unlocks after purchase', 'affiliate'),
('affiliate_btc_bonus_pct', '5', 'Extra commission percentage for BTC payouts', 'affiliate'),

-- Notifications
('welcome_email_enabled', 'true', 'Send welcome email on registration', 'notifications'),
('admin_alert_new_user', 'true', 'Notify admin when new user registers', 'notifications'),
('admin_alert_new_subscription', 'true', 'Notify admin on new subscription purchase', 'notifications'),

-- Rate Limiting / Security
('api_rate_limit_per_minute', '60', 'API requests per minute per user', 'security'),
('login_max_attempts', '5', 'Max failed login attempts before lockout', 'security'),
('login_lockout_minutes', '15', 'Lockout duration after max failed attempts', 'security'),

-- Promo Codes
('promo_codes_enabled', 'true', 'Enable promo code redemption', 'promo')
ON CONFLICT (key) DO NOTHING;
