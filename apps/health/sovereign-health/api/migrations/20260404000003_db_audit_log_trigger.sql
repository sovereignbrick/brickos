-- DB-level audit logging via trigger function.
-- Captures INSERT, UPDATE, DELETE on key tables into a queryable db_audit_log table.
-- Complements pgaudit (which logs to stdout) with in-DB queryable records for admin panel.

CREATE TABLE IF NOT EXISTS db_audit_log (
    id          BIGSERIAL PRIMARY KEY,
    table_name  TEXT NOT NULL,
    operation   TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
    row_id      UUID,
    user_id     UUID,          -- from app.current_user_id RLS var
    old_data    JSONB,
    new_data    JSONB,
    changed_fields TEXT[],     -- list of columns that changed (UPDATE only)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_db_audit_log_created_at ON db_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_db_audit_log_table_name ON db_audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_db_audit_log_operation ON db_audit_log (operation);
CREATE INDEX IF NOT EXISTS idx_db_audit_log_user_id ON db_audit_log (user_id);

-- Trigger function: captures the RLS user_id, old/new row data, and changed columns.
CREATE OR REPLACE FUNCTION fn_db_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    _user_id UUID;
    _row_id UUID;
    _old JSONB;
    _new JSONB;
    _changed TEXT[];
    _key TEXT;
BEGIN
    -- Try to get the current app user from RLS session variable
    BEGIN
        _user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        _user_id := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        _old := to_jsonb(OLD);
        _row_id := OLD.id;
        INSERT INTO db_audit_log (table_name, operation, row_id, user_id, old_data)
        VALUES (TG_TABLE_NAME, 'DELETE', _row_id, _user_id, _old);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        _new := to_jsonb(NEW);
        _row_id := NEW.id;
        INSERT INTO db_audit_log (table_name, operation, row_id, user_id, new_data)
        VALUES (TG_TABLE_NAME, 'INSERT', _row_id, _user_id, _new);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        _old := to_jsonb(OLD);
        _new := to_jsonb(NEW);
        _row_id := NEW.id;
        -- Compute changed fields
        _changed := ARRAY(
            SELECT key FROM jsonb_each(_new) AS n(key, val)
            WHERE _old->key IS DISTINCT FROM n.val
              AND key NOT IN ('updated_at', 'last_active_at')  -- skip noise
        );
        -- Only log if something actually changed (beyond timestamps)
        IF array_length(_changed, 1) > 0 THEN
            INSERT INTO db_audit_log (table_name, operation, row_id, user_id, old_data, new_data, changed_fields)
            VALUES (TG_TABLE_NAME, 'UPDATE', _row_id, _user_id, _old, _new, _changed);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to key tables (security-sensitive + data tables)
DO $$
DECLARE
    _tables TEXT[] := ARRAY[
        'users',
        'measurements',
        'user_preferences',
        'user_profile',
        'reference_ranges',
        'import_sessions',
        'devices',
        'labs',
        'data_shares',
        'organizations',
        'user_licenses'
    ];
    _t TEXT;
BEGIN
    FOREACH _t IN ARRAY _tables LOOP
        -- Skip if table doesn't exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = _t) THEN
            EXECUTE format(
                'DROP TRIGGER IF EXISTS trg_db_audit ON %I; CREATE TRIGGER trg_db_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_db_audit_trigger();',
                _t, _t
            );
        END IF;
    END LOOP;
END $$;
