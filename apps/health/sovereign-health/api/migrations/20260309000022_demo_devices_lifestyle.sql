-- Migration 022: Fix demo device names, assign lab device, add lifestyle context

-- Rename Lab XYZ to SYNLAB Vienna
UPDATE devices
SET device_name = 'SYNLAB Vienna', device_type = 'lab'
WHERE id = '00000000-0000-0000-0000-000000000014';

-- Assign SYNLAB Vienna device to all lab-sourced demo measurements
UPDATE measurements m
SET device_id = '00000000-0000-0000-0000-000000000014'
FROM markers mk
WHERE mk.id = m.marker_id
  AND mk.source_type = 'lab'
  AND m.is_demo = true
  AND m.device_id IS NULL;

-- Add lifestyle context: optimized profile
-- Vary sleep/exercise/stress using modular arithmetic on row_number
WITH numbered AS (
  SELECT m.id, ROW_NUMBER() OVER (ORDER BY m.timestamp) AS rn
  FROM measurements m
  WHERE m.is_demo = true AND m.demo_profile = 'optimized'
)
UPDATE measurements m
SET
  sleep_hours = CASE (n.rn % 5)
    WHEN 0 THEN 7.5
    WHEN 1 THEN 8.0
    WHEN 2 THEN 7.0
    WHEN 3 THEN 7.5
    WHEN 4 THEN 8.5
  END,
  sleep_quality = CASE (n.rn % 4)
    WHEN 0 THEN 'good'
    WHEN 1 THEN 'good'
    WHEN 2 THEN 'excellent'
    WHEN 3 THEN 'good'
  END,
  exercise_activity = CASE (n.rn % 5)
    WHEN 0 THEN 'strength training'
    WHEN 1 THEN 'walking'
    WHEN 2 THEN 'cycling'
    WHEN 3 THEN 'strength training'
    WHEN 4 THEN 'yoga'
  END,
  stress_level = CASE (n.rn % 4)
    WHEN 0 THEN 2
    WHEN 1 THEN 3
    WHEN 2 THEN 1
    WHEN 3 THEN 2
  END,
  diet_protocol = 'carnivore'
FROM numbered n
WHERE m.id = n.id;

-- Add lifestyle context: balanced profile
WITH numbered AS (
  SELECT m.id, ROW_NUMBER() OVER (ORDER BY m.timestamp) AS rn
  FROM measurements m
  WHERE m.is_demo = true AND m.demo_profile = 'balanced'
)
UPDATE measurements m
SET
  sleep_hours = CASE (n.rn % 5)
    WHEN 0 THEN 6.5
    WHEN 1 THEN 7.0
    WHEN 2 THEN 6.0
    WHEN 3 THEN 7.5
    WHEN 4 THEN 6.5
  END,
  sleep_quality = CASE (n.rn % 4)
    WHEN 0 THEN 'fair'
    WHEN 1 THEN 'good'
    WHEN 2 THEN 'fair'
    WHEN 3 THEN 'fair'
  END,
  exercise_activity = CASE (n.rn % 5)
    WHEN 0 THEN 'walking'
    WHEN 1 THEN 'jogging'
    WHEN 2 THEN 'walking'
    WHEN 3 THEN 'none'
    WHEN 4 THEN 'walking'
  END,
  stress_level = CASE (n.rn % 4)
    WHEN 0 THEN 5
    WHEN 1 THEN 4
    WHEN 2 THEN 6
    WHEN 3 THEN 5
  END,
  diet_protocol = 'mixed'
FROM numbered n
WHERE m.id = n.id;

-- Add lifestyle context: at_risk profile
WITH numbered AS (
  SELECT m.id, ROW_NUMBER() OVER (ORDER BY m.timestamp) AS rn
  FROM measurements m
  WHERE m.is_demo = true AND m.demo_profile = 'at_risk'
)
UPDATE measurements m
SET
  sleep_hours = CASE (n.rn % 5)
    WHEN 0 THEN 5.5
    WHEN 1 THEN 5.0
    WHEN 2 THEN 6.0
    WHEN 3 THEN 4.5
    WHEN 4 THEN 5.5
  END,
  sleep_quality = CASE (n.rn % 4)
    WHEN 0 THEN 'poor'
    WHEN 1 THEN 'poor'
    WHEN 2 THEN 'fair'
    WHEN 3 THEN 'poor'
  END,
  exercise_activity = CASE (n.rn % 5)
    WHEN 0 THEN 'none'
    WHEN 1 THEN 'walking'
    WHEN 2 THEN 'none'
    WHEN 3 THEN 'none'
    WHEN 4 THEN 'walking'
  END,
  stress_level = CASE (n.rn % 4)
    WHEN 0 THEN 8
    WHEN 1 THEN 7
    WHEN 2 THEN 9
    WHEN 3 THEN 7
  END,
  diet_protocol = 'mixed'
FROM numbered n
WHERE m.id = n.id;
