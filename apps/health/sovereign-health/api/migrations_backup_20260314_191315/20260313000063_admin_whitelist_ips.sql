-- Unified admin IP whitelist that bypasses ALL feature gates
INSERT INTO app_settings (key, value, description, category)
VALUES (
    'admin_whitelist_ips',
    '["212.103.60.5"]'::jsonb,
    'IPs that bypass ALL feature gates (registration, payments, etc.)',
    'security'
)
ON CONFLICT (key) DO NOTHING;
