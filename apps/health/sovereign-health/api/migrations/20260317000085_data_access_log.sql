-- Migration 085: Data access audit log
-- Tracks who accessed what data and when.
-- Required for GDPR Art. 15 (right to know who accessed your data)
-- and for future practitioner/clinic data sharing audit trail.
--
-- Issue: https://github.com/sovereignbrick/brickos/issues/45

CREATE TABLE IF NOT EXISTS data_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,              -- whose data was accessed
    accessed_by UUID NOT NULL,          -- who accessed it
    share_id UUID REFERENCES data_shares(id),  -- via which data share (NULL = own data or admin)
    action TEXT NOT NULL,               -- 'view', 'export_csv', 'export_json', 'export_pdf', 'print'
    resource TEXT NOT NULL,             -- 'measurements', 'trends', 'chat', 'profile', 'settings', 'devices'
    resource_id UUID,                   -- specific record ID if applicable
    ip_hash TEXT,                       -- SHA-256 of IP (no raw IP stored)
    metadata JSONB,                     -- additional context (filters, date range, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_access_log_user ON data_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_log_accessed_by ON data_access_log(accessed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_log_created ON data_access_log(created_at DESC);

-- RLS: users can see access logs for their own data
ALTER TABLE data_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_log FORCE ROW LEVEL SECURITY;
CREATE POLICY user_own_access_log ON data_access_log
    FOR SELECT USING (user_id = app_current_user_id());
-- Insert allowed for any authenticated user (the app logs on their behalf)
CREATE POLICY insert_access_log ON data_access_log
    FOR INSERT WITH CHECK (true);
