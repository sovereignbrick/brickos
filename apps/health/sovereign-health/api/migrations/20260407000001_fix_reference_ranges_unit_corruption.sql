-- One-time fix: convert user-customized reference ranges back to canonical units.
--
-- Bug: the frontend Settings > Reference Ranges page saved values in the user's
-- display unit (e.g. mg/dL) instead of canonical (e.g. mmol/L). The DB has no unit
-- column, so the API always returns values tagged as canonical, causing double
-- conversion on the marker detail page.
--
-- This migration reverses the conversion for all user-customized ranges (is_custom = true)
-- by dividing by the appropriate conversion factor based on the user's unit preference.
--
-- STAGING/DEV ONLY - production was not affected because unit preferences were not
-- changed from defaults on production accounts.

-- Step 1: Fix glucose-group markers (mmol/L -> mg/dL factor = 18.0182)
UPDATE reference_ranges rr
SET green_min  = rr.green_min  / 18.0182,
    green_max  = rr.green_max  / 18.0182,
    orange_min = rr.orange_min / 18.0182,
    orange_max = rr.orange_max / 18.0182,
    updated_at = now()
FROM markers m, user_preferences up
WHERE rr.marker_id = m.id
  AND rr.user_id = up.user_id
  AND rr.is_custom = true
  AND m.marker_slug IN ('glucose', 'fasting_glucose')
  AND m.unit_canonical = 'mmol/L'
  AND up.glucose_unit = 'mg/dL'
  AND rr.green_max > 15;

-- Step 2: Fix cholesterol-group markers (mmol/L -> mg/dL factor = 38.67)
UPDATE reference_ranges rr
SET green_min  = rr.green_min  / 38.67,
    green_max  = rr.green_max  / 38.67,
    orange_min = rr.orange_min / 38.67,
    orange_max = rr.orange_max / 38.67,
    updated_at = now()
FROM markers m, user_preferences up
WHERE rr.marker_id = m.id
  AND rr.user_id = up.user_id
  AND rr.is_custom = true
  AND m.marker_slug IN ('total_cholesterol', 'ldl_c', 'hdl_c', 'vldl', 'non_hdl_c')
  AND m.unit_canonical = 'mmol/L'
  AND up.cholesterol_unit = 'mg/dL'
  AND rr.green_max > 20;

-- Step 3: Fix triglycerides (mmol/L -> mg/dL factor = 88.57)
UPDATE reference_ranges rr
SET green_min  = rr.green_min  / 88.57,
    green_max  = rr.green_max  / 88.57,
    orange_min = rr.orange_min / 88.57,
    orange_max = rr.orange_max / 88.57,
    updated_at = now()
FROM markers m, user_preferences up
WHERE rr.marker_id = m.id
  AND rr.user_id = up.user_id
  AND rr.is_custom = true
  AND m.marker_slug = 'triglycerides'
  AND m.unit_canonical = 'mmol/L'
  AND up.cholesterol_unit = 'mg/dL'
  AND rr.green_max > 10;

-- Step 4: Fix uric acid (umol/L -> mg/dL factor = 1/59.48)
-- Reverse: values were divided by 59.48, so they're tiny. Multiply back.
UPDATE reference_ranges rr
SET green_min  = rr.green_min  * 59.48,
    green_max  = rr.green_max  * 59.48,
    orange_min = rr.orange_min * 59.48,
    orange_max = rr.orange_max * 59.48,
    updated_at = now()
FROM markers m, user_preferences up
WHERE rr.marker_id = m.id
  AND rr.user_id = up.user_id
  AND rr.is_custom = true
  AND m.marker_slug = 'uric_acid'
  AND m.unit_canonical = 'µmol/L'
  AND up.uric_acid_unit = 'mg/dL'
  AND rr.green_max < 10;

-- Step 5: Fix hemoglobin (mmol/L -> g/dL factor = 1.61)
UPDATE reference_ranges rr
SET green_min  = rr.green_min  / 1.61,
    green_max  = rr.green_max  / 1.61,
    orange_min = rr.orange_min / 1.61,
    orange_max = rr.orange_max / 1.61,
    updated_at = now()
FROM markers m, user_preferences up
WHERE rr.marker_id = m.id
  AND rr.user_id = up.user_id
  AND rr.is_custom = true
  AND m.marker_slug = 'hemoglobin'
  AND m.unit_canonical = 'mmol/L'
  AND up.hemoglobin_unit = 'g/dL'
  AND rr.green_max > 15;

-- Step 6: Fix weight (kg -> lbs factor = 2.205)
UPDATE reference_ranges rr
SET green_min  = rr.green_min  / 2.205,
    green_max  = rr.green_max  / 2.205,
    orange_min = rr.orange_min / 2.205,
    orange_max = rr.orange_max / 2.205,
    updated_at = now()
FROM markers m, user_preferences up
WHERE rr.marker_id = m.id
  AND rr.user_id = up.user_id
  AND rr.is_custom = true
  AND m.marker_slug = 'weight'
  AND m.unit_canonical = 'kg'
  AND up.weight_unit = 'lbs'
  AND rr.green_max > 150;
