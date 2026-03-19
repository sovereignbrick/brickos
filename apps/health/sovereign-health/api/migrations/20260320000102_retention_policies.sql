-- Retention policies (Sprint 003 P4-2)
-- Store retention config in app_settings for admin-adjustable values.
-- Cleanup runs at backend startup via cron_cleanup_stale_data().

DROP TABLE IF EXISTS health_check;

INSERT INTO app_settings (key, value) VALUES
  ('retention_ai_usage_days', '180'),
  ('retention_data_access_days', '365'),
  ('retention_payment_events_days', '730')
ON CONFLICT (key) DO NOTHING;
