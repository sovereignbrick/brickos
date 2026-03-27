-- Add UNIQUE constraint to prevent duplicate calculated marker values.
-- Enables upsert (ON CONFLICT DO UPDATE) for idempotent computation.

-- First remove any existing duplicates (keep the latest per group)
DELETE FROM calculated_marker_values a
USING calculated_marker_values b
WHERE a.user_id = b.user_id
  AND a.calculated_marker_id = b.calculated_marker_id
  AND a.measured_at = b.measured_at
  AND a.is_deleted = b.is_deleted
  AND a.id < b.id;

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_cmv_unique_user_marker_time
ON calculated_marker_values (user_id, calculated_marker_id, measured_at)
WHERE is_deleted = false;
