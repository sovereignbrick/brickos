-- Add missing indexes for query performance at scale (Sprint 003 P1-9)

-- calculated_marker_values: composite index for trend queries
-- Queries filter by user + marker + order by measured_at DESC
CREATE INDEX IF NOT EXISTS idx_cmv_user_marker_measured
  ON calculated_marker_values(user_id, calculated_marker_id, measured_at DESC);

-- audit_log: index for admin page pagination (ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log(created_at DESC);

-- reference_ranges: composite index for user custom ranges lookup
CREATE INDEX IF NOT EXISTS idx_reference_ranges_user_marker
  ON reference_ranges(user_id, marker_id)
  WHERE user_id IS NOT NULL;

-- measurements: composite index for zone/trend queries
-- Most measurement queries filter by user_id + is_deleted + order by timestamp
CREATE INDEX IF NOT EXISTS idx_measurements_user_active_time
  ON measurements(user_id, timestamp DESC)
  WHERE is_deleted = false;
