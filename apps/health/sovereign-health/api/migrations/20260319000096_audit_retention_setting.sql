-- Audit log retention setting
INSERT INTO app_settings (key, value, description, category) VALUES
  ('audit_retention_days', '90', 'Number of days to keep audit logs (minimum 7)', 'security')
ON CONFLICT (key) DO NOTHING;
