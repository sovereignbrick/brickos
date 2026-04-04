-- Backfill measurement_ids for confirmed import sessions that don't have them.
-- This enables rollback for imports created before v0.32.0.
-- Uses timestamp correlation: measurements created within 5 seconds of the session's updated_at.

UPDATE import_sessions s
SET measurement_ids = (
    SELECT ARRAY_AGG(m.id)
    FROM measurements m
    WHERE m.user_id = s.user_id
      AND m.is_deleted = false
      AND m.created_at >= s.updated_at - INTERVAL '5 seconds'
      AND m.created_at <= s.updated_at + INTERVAL '5 seconds'
)
WHERE s.status = 'confirmed'
  AND (s.measurement_ids IS NULL OR array_length(s.measurement_ids, 1) IS NULL)
  AND s.markers_imported > 0;
