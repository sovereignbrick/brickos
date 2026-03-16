-- Add last_used_at column for template auto-selection
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
