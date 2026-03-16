-- Admin tier override columns on user_licenses table
ALTER TABLE user_licenses ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT FALSE;
ALTER TABLE user_licenses ADD COLUMN IF NOT EXISTS admin_override_by UUID REFERENCES users(id);
ALTER TABLE user_licenses ADD COLUMN IF NOT EXISTS admin_override_at TIMESTAMPTZ;
ALTER TABLE user_licenses ADD COLUMN IF NOT EXISTS admin_override_note TEXT;
