-- Add is_protected flag to users table.
-- Protected users cannot be soft-deleted or hard-purged.
-- Use case: demo account and primary admin must survive cleanup operations.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT false;

-- Mark the demo user and admin as protected
UPDATE users SET is_protected = true WHERE email IN (
    'demo@sovereignhealth.io',
    'admin@schindlwick.com'
);

-- Trigger: prevent DELETE on protected users
CREATE OR REPLACE FUNCTION prevent_protected_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_protected = true THEN
        RAISE EXCEPTION 'Cannot delete protected user: % (%)', OLD.email, OLD.id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_protected_user_delete ON users;
CREATE TRIGGER trg_prevent_protected_user_delete
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_protected_user_delete();

-- Trigger: prevent soft-delete (is_deleted = true) on protected users
CREATE OR REPLACE FUNCTION prevent_protected_user_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_protected = true AND NEW.is_deleted = true AND OLD.is_deleted = false THEN
        RAISE EXCEPTION 'Cannot soft-delete protected user: % (%)', OLD.email, OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_protected_user_soft_delete ON users;
CREATE TRIGGER trg_prevent_protected_user_soft_delete
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_protected_user_soft_delete();
