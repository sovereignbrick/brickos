-- Migration 047: Enhanced medication management
-- Adds new columns to user_medications for richer data,
-- plus medication_categories with translations

-- Add new columns to existing user_medications table
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS generic_name VARCHAR(200);
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS form VARCHAR(50);
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS prescriber VARCHAR(200);
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS original_images JSONB;
ALTER TABLE user_medications ADD COLUMN IF NOT EXISTS ai_extracted_data JSONB;

-- Backfill name from custom_name or medication_catalog
UPDATE user_medications um
SET name = COALESCE(
    um.custom_name,
    (SELECT mc.name FROM medication_catalog mc WHERE mc.slug = um.medication_slug),
    'Unknown'
)
WHERE um.name IS NULL;

-- Medication categories (admin-managed, translatable)
CREATE TABLE IF NOT EXISTS medication_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_category_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES medication_categories(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    UNIQUE(category_id, locale)
);

-- Seed categories
INSERT INTO medication_categories (slug, sort_order) VALUES
    ('cardiovascular', 1),
    ('diabetes', 2),
    ('thyroid', 3),
    ('hormones', 4),
    ('vitamins-minerals', 5),
    ('supplements', 6),
    ('pain-management', 7),
    ('mental-health', 8),
    ('gastrointestinal', 9),
    ('other', 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO medication_category_translations (category_id, locale, name, description)
SELECT id, 'en',
    CASE slug
        WHEN 'cardiovascular' THEN 'Cardiovascular'
        WHEN 'diabetes' THEN 'Diabetes'
        WHEN 'thyroid' THEN 'Thyroid'
        WHEN 'hormones' THEN 'Hormones'
        WHEN 'vitamins-minerals' THEN 'Vitamins & Minerals'
        WHEN 'supplements' THEN 'Supplements'
        WHEN 'pain-management' THEN 'Pain Management'
        WHEN 'mental-health' THEN 'Mental Health'
        WHEN 'gastrointestinal' THEN 'Gastrointestinal'
        WHEN 'other' THEN 'Other'
    END,
    NULL
FROM medication_categories
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO medication_category_translations (category_id, locale, name, description)
SELECT id, 'de',
    CASE slug
        WHEN 'cardiovascular' THEN 'Herz-Kreislauf'
        WHEN 'diabetes' THEN 'Diabetes'
        WHEN 'thyroid' THEN 'Schilddrüse'
        WHEN 'hormones' THEN 'Hormone'
        WHEN 'vitamins-minerals' THEN 'Vitamine & Mineralien'
        WHEN 'supplements' THEN 'Nahrungsergänzung'
        WHEN 'pain-management' THEN 'Schmerzmanagement'
        WHEN 'mental-health' THEN 'Psychische Gesundheit'
        WHEN 'gastrointestinal' THEN 'Magen-Darm'
        WHEN 'other' THEN 'Sonstiges'
    END,
    NULL
FROM medication_categories
ON CONFLICT (category_id, locale) DO NOTHING;

-- UI strings for medication feature (inserted via ui_strings + ui_string_translations FK pattern)
-- Strings are hardcoded in the frontend component for now; content system integration can be added later.
