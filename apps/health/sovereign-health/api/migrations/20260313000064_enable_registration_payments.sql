-- Enable registration and payments by default
-- These can be toggled from the admin panel at runtime
UPDATE app_settings SET value = 'true' WHERE key = 'registration_enabled';
UPDATE app_settings SET value = 'true' WHERE key = 'payment_enabled';

-- Ensure BTC discount setting exists
INSERT INTO app_settings (key, value, description, category)
VALUES ('btc_discount_percent', '5', 'BTC payment discount percentage', 'payment')
ON CONFLICT (key) DO NOTHING;

-- Ensure whitelist IPs setting exists with both IPs
INSERT INTO app_settings (key, value, description, category)
VALUES ('admin_whitelist_ips', '["212.103.60.5", "212.103.61.58"]', 'Master IP whitelist - bypasses all feature gates', 'security')
ON CONFLICT (key) DO UPDATE SET value = '["212.103.60.5", "212.103.61.58"]';
