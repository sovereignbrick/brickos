-- Add email_unsubscribed flag to user_preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN NOT NULL DEFAULT false;

-- Index for demo trends query optimization (LOAD-005)
CREATE INDEX IF NOT EXISTS idx_measurements_demo_trends
    ON measurements (is_demo, demo_profile, marker_id, timestamp)
    WHERE is_deleted = false;
