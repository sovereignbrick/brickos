-- Add cancellation_reason column to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);
