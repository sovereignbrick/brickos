-- Add app_key column to ai_usage_log for platform data scoping.
-- Default 'shi' since all existing AI usage comes from SHI health coach.

ALTER TABLE ai_usage_log ADD COLUMN IF NOT EXISTS app_key TEXT DEFAULT 'shi';
CREATE INDEX IF NOT EXISTS idx_ai_usage_app_key ON ai_usage_log(app_key) WHERE app_key IS NOT NULL;
