-- Payment gate settings: global enable + IP whitelist for test mode
INSERT INTO app_settings (key, value, description, category) VALUES
('payment_enabled', 'false', 'Enable subscription payments globally', 'integrations'),
('payment_whitelist_ips', '["212.103.60.208"]', 'IPs that can make payments even when payments are disabled globally', 'integrations')
ON CONFLICT (key) DO NOTHING;
