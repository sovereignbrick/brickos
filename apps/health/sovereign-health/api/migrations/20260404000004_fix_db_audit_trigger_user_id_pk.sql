-- Fix: db_audit_log trigger fails on tables with user_id PK instead of id PK
-- (e.g. user_preferences, user_profile, reference_ranges)
-- Now tries id first, falls back to user_id, then NULL.

CREATE OR REPLACE FUNCTION fn_db_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    _user_id UUID;
    _row_id UUID;
    _old JSONB;
    _new JSONB;
    _changed TEXT[];
BEGIN
    -- Try to get the current app user from RLS session variable
    BEGIN
        _user_id := current_setting('app.current_user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        _user_id := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        _old := to_jsonb(OLD);
        _row_id := COALESCE((_old->>'id')::UUID, (_old->>'user_id')::UUID);
        INSERT INTO db_audit_log (table_name, operation, row_id, user_id, old_data)
        VALUES (TG_TABLE_NAME, 'DELETE', _row_id, _user_id, _old);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        _new := to_jsonb(NEW);
        _row_id := COALESCE((_new->>'id')::UUID, (_new->>'user_id')::UUID);
        INSERT INTO db_audit_log (table_name, operation, row_id, user_id, new_data)
        VALUES (TG_TABLE_NAME, 'INSERT', _row_id, _user_id, _new);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        _old := to_jsonb(OLD);
        _new := to_jsonb(NEW);
        _row_id := COALESCE((_new->>'id')::UUID, (_new->>'user_id')::UUID);
        -- Compute changed fields
        _changed := ARRAY(
            SELECT key FROM jsonb_each(_new) AS n(key, val)
            WHERE _old->key IS DISTINCT FROM n.val
              AND key NOT IN ('updated_at', 'last_active_at')
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
