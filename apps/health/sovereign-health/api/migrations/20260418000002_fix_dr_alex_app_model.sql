-- Fix: claude-sonnet-4-5-20250514 does not exist in the Anthropic API.
-- The correct model ID is claude-sonnet-4-20250514 (Sonnet 4, not 4.5).
-- This was seeded incorrectly in 20260312000052_app_settings.sql.

UPDATE app_settings
SET value = '"claude-sonnet-4-20250514"'::jsonb
WHERE key = 'dr_alex_app_model'
  AND value = '"claude-sonnet-4-5-20250514"'::jsonb;
