-- Add session defaults to measurement templates
-- Stores meal_timing, sleep, stress, protocol overrides so templates restore full form state
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS defaults JSONB;
