-- Sprint 020 / #317: Add format classification columns to import_sessions
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS detected_category TEXT;
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS detected_language TEXT;
