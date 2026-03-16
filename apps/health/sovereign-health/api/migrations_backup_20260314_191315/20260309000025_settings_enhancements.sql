-- Migration 025: Settings enhancements (batch-8)
-- Adds country_code to user_profile, lifestyle defaults to user_preferences

-- Task 1: Add country_code to user_profile (stored as plaintext ISO 3166-1 alpha-2)
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Task 4: Add lifestyle default fields to user_preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS show_extended_lifestyle BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_diet_protocol TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_fasting_protocol TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_exercise TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_sleep_hours NUMERIC(3,1);
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_sleep_quality TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_stress_level INTEGER;
