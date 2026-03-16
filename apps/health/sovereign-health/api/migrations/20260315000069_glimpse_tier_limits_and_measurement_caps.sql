-- B-0097: Tighten Glimpse tier limits and add measurement caps

-- 1. Add max_measurements column to license_tiers (NULL = unlimited)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'license_tiers' AND column_name = 'max_measurements'
    ) THEN
        ALTER TABLE license_tiers ADD COLUMN max_measurements INTEGER;
    END IF;
END $$;

-- 2. Update Glimpse tier limits
UPDATE license_tiers SET
    max_markers = 8,
    max_history_days = 30,
    max_calculated_markers = 1,
    max_medications = 2,
    chat_general_monthly = 1,
    chat_trends_monthly = 0,
    chat_labs_monthly = 0,
    max_measurements = 100,
    updated_at = NOW()
WHERE slug = 'glimpse';

-- 3. Set measurement caps for paid tiers
UPDATE license_tiers SET max_measurements = 250, updated_at = NOW()
WHERE slug = 'focus';

UPDATE license_tiers SET max_measurements = NULL, updated_at = NOW()
WHERE slug IN ('insight', 'clarity', 'horizon');
