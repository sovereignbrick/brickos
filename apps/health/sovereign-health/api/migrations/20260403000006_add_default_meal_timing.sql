-- Add default meal timing to user preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS default_meal_timing TEXT;
