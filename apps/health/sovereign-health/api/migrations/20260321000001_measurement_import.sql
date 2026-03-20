-- Sprint 005 Phase 6: Tabular measurement import support

-- Add measurement_ids to import_sessions for rollback tracking
ALTER TABLE import_sessions
    ADD COLUMN IF NOT EXISTS measurement_ids UUID[] DEFAULT '{}';

-- Add measurement import quota to license_tiers (same tier as lab/med import = insight)
ALTER TABLE license_tiers
    ADD COLUMN IF NOT EXISTS chat_measurement_import_monthly INT;

-- Set measurement import quotas to match lab_import quotas for all tiers
UPDATE license_tiers
    SET chat_measurement_import_monthly = chat_lab_import_monthly
    WHERE chat_measurement_import_monthly IS NULL;
