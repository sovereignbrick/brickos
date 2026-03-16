-- Batch 29: Device management - extend devices table with management fields

-- Add new columns to existing devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE devices ADD COLUMN IF NOT EXISTS validation_date TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS validation_notes TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS validation_status TEXT;

-- Normalize device_type values to match the new schema
UPDATE devices SET device_type = 'home' WHERE device_type IN ('blood_analyzer', 'fora6', 'bp_monitor', 'qardio_arm', 'qardio_base');
UPDATE devices SET device_type = 'scale' WHERE device_type = 'scale';
UPDATE devices SET device_type = 'lab' WHERE device_type = 'lab';
UPDATE devices SET device_type = 'other' WHERE device_type IN ('manual', 'other') OR device_type NOT IN ('home', 'lab', 'wearable', 'scale', 'other');

-- Set manufacturer/model for known catalogue templates
UPDATE devices SET manufacturer = 'ForaCare', model = 'Fora 6 Connect'
WHERE device_name = 'Fora 6 Connect' AND manufacturer IS NULL;

UPDATE devices SET manufacturer = 'Qardio', model = 'Qardio Arm'
WHERE device_name = 'Qardio Arm' AND manufacturer IS NULL;

UPDATE devices SET manufacturer = 'Qardio', model = 'Qardiobase 2'
WHERE device_name IN ('Qardio Base', 'Qardiobase 2') AND manufacturer IS NULL;

-- Update Qardiobase markers to include body composition
UPDATE devices SET markers_measured = ARRAY['weight','body_fat_pct','body_water_pct','muscle_pct','bone_mass_pct']
WHERE device_name IN ('Qardio Base', 'Qardiobase 2') AND is_template = true;

-- Set default device for demo optimized profile (Fora 6)
UPDATE devices SET is_default = true
WHERE id = '00000000-0000-0000-0000-000000000011';

-- Set notes on demo devices
UPDATE devices SET notes = 'Left middle finger'
WHERE id = '00000000-0000-0000-0000-000000000011';

UPDATE devices SET notes = 'Left arm'
WHERE id = '00000000-0000-0000-0000-000000000012';

-- Seed devices for Helmut (real user)
-- First check if Helmut exists and seed his devices
DO $$
DECLARE
    helmut_id UUID;
BEGIN
    SELECT id INTO helmut_id FROM users WHERE email = 'helmut@sovereignhealth.io' AND is_deleted = false;
    IF helmut_id IS NOT NULL THEN
        -- Fora 6
        INSERT INTO devices (user_id, device_name, manufacturer, model, device_type, status, markers_measured, notes, is_default)
        VALUES (helmut_id, 'Fora 6', 'ForaCare', 'Fora 6 Connect', 'home', 'active',
                ARRAY['glucose','ketones','total_cholesterol','uric_acid','hemoglobin','hematocrit'],
                'Left middle finger', true)
        ON CONFLICT DO NOTHING;

        -- Qardio Arm
        INSERT INTO devices (user_id, device_name, manufacturer, model, device_type, status, markers_measured, notes)
        VALUES (helmut_id, 'Qardio Arm', 'Qardio', 'Qardio Arm', 'home', 'active',
                ARRAY['bp_systolic','bp_diastolic','heart_rate'],
                'Left arm')
        ON CONFLICT DO NOTHING;

        -- Qardiobase 2
        INSERT INTO devices (user_id, device_name, manufacturer, model, device_type, status, markers_measured)
        VALUES (helmut_id, 'Qardiobase 2', 'Qardio', 'Qardiobase 2', 'scale', 'active',
                ARRAY['weight','body_fat_pct','body_water_pct','muscle_pct','bone_mass_pct'])
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Seed devices for demo balanced profile
DO $$
DECLARE
    demo_balanced_id UUID;
BEGIN
    SELECT id INTO demo_balanced_id FROM users WHERE email = 'demo-balanced@sovereignhealth.io' AND is_deleted = false;
    IF demo_balanced_id IS NOT NULL THEN
        INSERT INTO devices (user_id, device_name, manufacturer, model, device_type, status, markers_measured, is_default)
        VALUES (demo_balanced_id, 'Generic Glucometer', NULL, NULL, 'home', 'active',
                ARRAY['glucose','ketones'], true)
        ON CONFLICT DO NOTHING;

        INSERT INTO devices (user_id, device_name, device_type, status, markers_measured)
        VALUES (demo_balanced_id, 'SYNLAB Vienna', 'lab', 'active',
                ARRAY['insulin','total_cholesterol','uric_acid','hemoglobin','hematocrit'])
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Seed devices for demo at_risk profile
DO $$
DECLARE
    demo_risk_id UUID;
BEGIN
    SELECT id INTO demo_risk_id FROM users WHERE email = 'demo-atrisk@sovereignhealth.io' AND is_deleted = false;
    IF demo_risk_id IS NOT NULL THEN
        INSERT INTO devices (user_id, device_name, device_type, status, markers_measured, is_default)
        VALUES (demo_risk_id, 'SYNLAB Vienna', 'lab', 'active',
                ARRAY['glucose','insulin','total_cholesterol','uric_acid','hemoglobin','hematocrit','bp_systolic','bp_diastolic','heart_rate'],
                true)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
