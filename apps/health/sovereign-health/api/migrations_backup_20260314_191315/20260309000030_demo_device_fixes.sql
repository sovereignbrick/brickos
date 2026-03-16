-- Fix 1A: Rename demo SYNLAB Vienna device to "Lab XYZ"
-- Only affects demo user's device (ID 00000000-...-14), not real users
UPDATE devices
SET device_name = 'Lab XYZ'
WHERE id = '00000000-0000-0000-0000-000000000014';

-- Fix 1B: Assign correct device_id to demo measurements with NULL device_id
-- These are the 322 baseline "optimized" measurements from initial seed

-- Fora 6 Connect: glucose, ketones, total_cholesterol
UPDATE measurements m
SET device_id = '00000000-0000-0000-0000-000000000011'
FROM markers mk
WHERE m.marker_id = mk.id
  AND m.is_demo = true
  AND m.device_id IS NULL
  AND mk.marker_slug IN ('glucose', 'ketones', 'total_cholesterol');

-- Qardio Arm: bp_systolic, bp_diastolic
UPDATE measurements m
SET device_id = '00000000-0000-0000-0000-000000000012'
FROM markers mk
WHERE m.marker_id = mk.id
  AND m.is_demo = true
  AND m.device_id IS NULL
  AND mk.marker_slug IN ('bp_systolic', 'bp_diastolic');

-- Qardio Base: weight
UPDATE measurements m
SET device_id = '00000000-0000-0000-0000-000000000013'
FROM markers mk
WHERE m.marker_id = mk.id
  AND m.is_demo = true
  AND m.device_id IS NULL
  AND mk.marker_slug = 'weight';

-- Tape Measure: waist_circumference
UPDATE measurements m
SET device_id = '00000000-0000-0000-0000-000000000015'
FROM markers mk
WHERE m.marker_id = mk.id
  AND m.is_demo = true
  AND m.device_id IS NULL
  AND mk.marker_slug = 'waist_circumference';
