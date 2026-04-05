-- Mark system/demo accounts as protected.
-- Protected accounts cannot be deleted, reset, or have their role changed.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT false;

-- Protect existing system accounts
UPDATE users SET is_protected = true WHERE email LIKE '%@sovereignhealth.io';

-- Comment for documentation
COMMENT ON COLUMN users.is_protected IS 'Protected accounts cannot be deleted, reset, or demoted. Used for demo profiles and admin accounts.';
