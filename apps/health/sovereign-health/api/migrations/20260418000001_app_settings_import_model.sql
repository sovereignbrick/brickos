-- Sprint 043 #529: Add import model key to app_settings.
-- Import handlers (vision, CSV extraction, classification, marker matching)
-- use a separate model from Dr. Alex chat -- typically a cheaper/faster model
-- since imports are high-volume batch operations.

INSERT INTO app_settings (key, value, description, category)
VALUES
    ('dr_alex_import_model', '"claude-sonnet-4-20250514"', 'AI model used for Smart Import (vision, CSV, classification)', 'dr_alex')
ON CONFLICT (key) DO NOTHING;
