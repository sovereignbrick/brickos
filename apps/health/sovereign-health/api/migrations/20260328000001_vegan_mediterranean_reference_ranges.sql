-- Migration: Vegan and Mediterranean diet protocol reference ranges
-- Sprint 017, Issue #270
--
-- Adds protocol_context = 'standard_vegan' and 'standard_mediterranean'
-- for markers where these diets shift expected values.
-- Fallback chain: user-specific -> protocol-specific -> standard
-- IMPORTANT: All ON CONFLICT DO NOTHING to be idempotent.

-- ============================================================
-- PART 1: VEGAN PROTOCOL REFERENCE RANGES (standard_vegan)
-- Adjusts lower bounds for nutrients with lower bioavailability
-- on plant-based diets.
-- ============================================================

-- Vegan: Vitamin B12 -- tighter lower bound (high deficiency risk without supplementation)
-- Standard: orange 150, green 200-600
-- Vegan: raise green_min to 250 (supplementation should achieve higher levels)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_vegan', 180.0, 250.0, 600.0, NULL FROM markers WHERE marker_slug = 'vitamin_b12'
ON CONFLICT DO NOTHING;

-- Vegan: Iron -- tighter lower bound (non-heme iron has lower bioavailability)
-- Standard: orange 7, green 11-30
-- Vegan: raise green_min to 13 (need higher intake to compensate absorption)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_vegan', 9.0, 13.0, 30.0, 40.0 FROM markers WHERE marker_slug = 'iron'
ON CONFLICT DO NOTHING;

-- Vegan: Ferritin -- tighter lower bound (plant-based iron stores deplete faster)
-- Standard: orange 15, green 30-400
-- Vegan: raise green_min to 40
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_vegan', 20.0, 40.0, 400.0, 500.0 FROM markers WHERE marker_slug = 'ferritin'
ON CONFLICT DO NOTHING;

-- Vegan: Zinc -- tighter lower bound (phytates reduce zinc absorption 30-50%)
-- Standard: orange 8, green 11-23
-- Vegan: raise green_min to 12.5
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_vegan', 9.0, 12.5, 23.0, NULL FROM markers WHERE marker_slug = 'zinc'
ON CONFLICT DO NOTHING;

-- Vegan: Homocysteine -- tighter upper bound (B12 deficiency elevates homocysteine)
-- Standard: green 5-12, orange_max 15
-- Vegan: lower green_max to 10 (B12-dependent, should be watched closely)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_vegan', NULL, 5.0, 10.0, 13.0 FROM markers WHERE marker_slug = 'homocysteine'
ON CONFLICT DO NOTHING;

-- Vegan: Omega-3 Index -- tighter lower bound (no direct EPA/DHA, must convert from ALA)
-- Standard: orange 4, green 8-12
-- Vegan: raise orange_min and green_min (conversion from ALA is only 5-10%)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_vegan', 3.0, 6.0, 12.0, NULL FROM markers WHERE marker_slug = 'omega3_index'
ON CONFLICT DO NOTHING;

-- Vegan: Vitamin D -- same as standard (sun-exposure driven, not diet-specific)
-- No override needed; fallback to standard ranges is correct.

-- ============================================================
-- PART 2: MEDITERRANEAN PROTOCOL REFERENCE RANGES (standard_mediterranean)
-- Mediterranean diet: high olive oil, fish, vegetables, moderate wine.
-- Expect improved lipid profile and lower inflammation.
-- ============================================================

-- Mediterranean: HDL -- higher floor expected (olive oil + fish intake raises HDL)
-- Standard: orange 0.8, green 1.0-2.5
-- Mediterranean: raise green_min to 1.2 (diet should achieve higher HDL)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_mediterranean', 1.0, 1.2, 2.5, NULL FROM markers WHERE marker_slug = 'hdl_c'
ON CONFLICT DO NOTHING;

-- Mediterranean: Triglycerides -- tighter upper bound (diet should lower TG)
-- Standard: orange 0.2, green 0.4-1.7, orange_max 2.3
-- Mediterranean: lower green_max to 1.4
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_mediterranean', 0.2, 0.4, 1.4, 2.0 FROM markers WHERE marker_slug = 'triglycerides'
ON CONFLICT DO NOTHING;

-- Mediterranean: hs-CRP -- tighter upper bound (anti-inflammatory dietary pattern)
-- Standard: green_max 1.0, orange_max 3.0
-- Mediterranean: lower green_max to 0.7 and orange_max to 2.0
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_mediterranean', NULL, NULL, 0.7, 2.0 FROM markers WHERE marker_slug = 'hs_crp'
ON CONFLICT DO NOTHING;
