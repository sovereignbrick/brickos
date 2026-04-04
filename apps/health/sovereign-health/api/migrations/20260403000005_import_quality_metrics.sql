-- Sprint 020 / #325: Import quality metrics tracking
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS markers_matched INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS markers_fuzzy_matched INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS markers_ai_suggested INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS markers_user_corrected INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS markers_unmatched INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS validation_warnings_count INT DEFAULT 0;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS extraction_method TEXT DEFAULT 'text';
