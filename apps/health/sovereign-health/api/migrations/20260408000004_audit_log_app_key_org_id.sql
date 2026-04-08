-- Add app_key and org_id columns to audit tables for platform data scoping.
-- These columns allow filtering audit logs by app context and organization.

-- Access logs (admin-initiated access audits)
ALTER TABLE data_access_log ADD COLUMN IF NOT EXISTS app_key TEXT;
ALTER TABLE data_access_log ADD COLUMN IF NOT EXISTS org_id UUID;

-- Event logs (user-triggered events)
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS app_key TEXT DEFAULT 'shi';
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS org_id UUID;

-- Indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_data_access_log_app_key ON data_access_log(app_key) WHERE app_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_access_log_org_id ON data_access_log(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_app_key ON audit_log(app_key) WHERE app_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id) WHERE org_id IS NOT NULL;
