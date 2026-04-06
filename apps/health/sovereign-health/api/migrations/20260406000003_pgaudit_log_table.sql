-- Queryable pgAudit log table for admin panel
CREATE TABLE IF NOT EXISTS pgaudit_events (
    id BIGSERIAL PRIMARY KEY,
    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    audit_type VARCHAR(20) NOT NULL,  -- SESSION or OBJECT
    statement_id BIGINT,
    substatement_id INT,
    class VARCHAR(20),                -- READ, WRITE, DDL, ROLE, etc.
    command VARCHAR(50),              -- SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP
    object_type VARCHAR(50),          -- TABLE, INDEX, etc.
    object_name VARCHAR(200),         -- schema.table
    statement TEXT,                   -- SQL statement (truncated)
    parameter TEXT,                   -- bind parameters
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pgaudit_events_time ON pgaudit_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_pgaudit_events_command ON pgaudit_events(command);
CREATE INDEX IF NOT EXISTS idx_pgaudit_events_object ON pgaudit_events(object_name);

-- Auto-purge events older than 90 days
-- (Called by the daily cron in main.rs)
CREATE OR REPLACE FUNCTION purge_old_pgaudit_events() RETURNS void AS $$
BEGIN
    DELETE FROM pgaudit_events WHERE event_time < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;
