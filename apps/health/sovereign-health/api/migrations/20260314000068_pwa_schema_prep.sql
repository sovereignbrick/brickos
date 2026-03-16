-- T-0217: PWA Schema Prep (Pre-Launch Database Foundation)
-- This migration adds columns and triggers needed for offline-first PWA sync:
--   1. updated_at auto-trigger on ALL tables
--   2. client_id for multi-device conflict resolution
--   3. idempotency_key for replay-safe offline writes
--   4. deleted_at for soft-delete sync
--   5. sync_version monotonic counter for efficient delta sync
--
-- ALL statements use IF NOT EXISTS / idempotent checks — safe to re-run.

-- =========================================================================
-- 1. updated_at trigger function + add column + trigger to ALL tables
-- =========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column and trigger to every table that lacks them
DO $$
DECLARE
    tbl RECORD;
    trig_name TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name != '_sqlx_migrations'
    LOOP
        -- Add updated_at column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = tbl.table_name
              AND column_name = 'updated_at'
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now()',
                tbl.table_name
            );
        END IF;

        -- Add trigger if missing
        trig_name := 'trg_' || tbl.table_name || '_updated_at';
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE event_object_table = tbl.table_name
              AND trigger_name = trig_name
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                trig_name, tbl.table_name
            );
        END IF;
    END LOOP;
END;
$$;

-- =========================================================================
-- 2. client_id for multi-device identification
-- =========================================================================

-- User-writable tables that receive data from PWA clients
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS client_id TEXT;

-- Composite indexes for sync queries: "rows from this client since version X"
CREATE INDEX IF NOT EXISTS idx_measurements_client_updated ON measurements(client_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_measurement_templates_client_updated ON measurement_templates(client_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_user_medications_client_updated ON user_medications(client_id, updated_at);

-- =========================================================================
-- 3. idempotency_key for replay-safe offline writes
-- =========================================================================

ALTER TABLE measurements ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Partial unique indexes (only non-null keys must be unique)
-- Drop any auto-created unique constraints first (from ADD COLUMN ... UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_idempotency
    ON measurements(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_measurement_templates_idempotency
    ON measurement_templates(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_medications_idempotency
    ON user_medications(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- =========================================================================
-- 4. deleted_at timestamp for soft-delete sync
-- =========================================================================

-- measurements already has is_deleted (boolean); add timestamp for sync
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes for efficient "non-deleted" queries
CREATE INDEX IF NOT EXISTS idx_measurements_not_deleted
    ON measurements(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_measurement_templates_not_deleted
    ON measurement_templates(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_medications_not_deleted
    ON user_medications(user_id) WHERE deleted_at IS NULL;

-- =========================================================================
-- 5. sync_version monotonic counter for efficient delta sync
-- =========================================================================

CREATE SEQUENCE IF NOT EXISTS sync_version_seq;

ALTER TABLE measurements ADD COLUMN IF NOT EXISTS sync_version BIGINT;
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS sync_version BIGINT;
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS sync_version BIGINT;

-- Set defaults for new rows (existing rows get NULL, which is fine — they predate sync)
-- We use a trigger instead of DEFAULT to also bump on UPDATE

CREATE OR REPLACE FUNCTION update_sync_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sync_version = nextval('sync_version_seq');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync version triggers (fire on both INSERT and UPDATE)
DO $$
DECLARE
    tbl TEXT;
    trig_name TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY['measurements', 'measurement_templates', 'user_medications'])
    LOOP
        trig_name := 'trg_' || tbl || '_sync_version';
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE event_object_table = tbl AND trigger_name = trig_name
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_sync_version()',
                trig_name, tbl
            );
        END IF;
    END LOOP;
END;
$$;

-- Indexes for sync queries: "give me everything with sync_version > X"
CREATE INDEX IF NOT EXISTS idx_measurements_sync_version ON measurements(sync_version);
CREATE INDEX IF NOT EXISTS idx_measurement_templates_sync_version ON measurement_templates(sync_version);
CREATE INDEX IF NOT EXISTS idx_user_medications_sync_version ON user_medications(sync_version);
