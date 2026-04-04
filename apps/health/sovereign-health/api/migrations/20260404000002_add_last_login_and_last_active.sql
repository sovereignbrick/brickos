-- Add dedicated user activity tracking columns
-- Replaces the misleading alias of updated_at as last_login_at in admin queries

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Backfill last_login_at from updated_at as best approximation
UPDATE users SET last_login_at = updated_at WHERE last_login_at IS NULL;

-- Index for admin sorting/filtering by activity
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users (last_login_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users (last_active_at DESC NULLS LAST);
