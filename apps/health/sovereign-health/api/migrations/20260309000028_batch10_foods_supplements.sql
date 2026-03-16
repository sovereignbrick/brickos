-- Migration 028: Add missing foods and supplements for biomarker content pages.
-- Uses NOT EXISTS to avoid duplicate inserts. display_order starts at 50.

-- ============================================================
-- TOTAL CHOLESTEROL (total_cholesterol)
-- ============================================================

-- Foods (10)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('total_cholesterol', 'Salmon', 'fish', 50),
  ('total_cholesterol', 'Sardines', 'fish', 51),
  ('total_cholesterol', 'Avocado', 'fruit', 52),
  ('total_cholesterol', 'Olive Oil', 'oil_fat', 53),
  ('total_cholesterol', 'Almonds', 'nut_seed', 54),
  ('total_cholesterol', 'Eggs', 'egg', 55),
  ('total_cholesterol', 'Grass-Fed Beef', 'meat', 56),
  ('total_cholesterol', 'Dark Chocolate', 'other', 57),
  ('total_cholesterol', 'Garlic', 'herb_spice', 58),
  ('total_cholesterol', 'Oats', 'grain', 59)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (4)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('total_cholesterol', 'Fish Oil (Omega-3)', '2-4g EPA+DHA/day', 'Improves lipid ratios, lowers triglycerides', 50),
  ('total_cholesterol', 'Red Yeast Rice', '600-1200mg 2x/day', 'Contains natural lovastatin; discuss with doctor before use', 51),
  ('total_cholesterol', 'Plant Sterols', '2g/day', 'Blocks cholesterol absorption, found in fortified foods', 52),
  ('total_cholesterol', 'Berberine', '500mg 2-3x/day', 'Comparable to mild statin effect in studies', 53)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- TRIGLYCERIDES (triglycerides)
-- ============================================================

-- Foods (11)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('triglycerides', 'Salmon', 'fish', 50),
  ('triglycerides', 'Mackerel', 'fish', 51),
  ('triglycerides', 'Sardines', 'fish', 52),
  ('triglycerides', 'Walnuts', 'nut_seed', 53),
  ('triglycerides', 'Avocado', 'fruit', 54),
  ('triglycerides', 'Olive Oil', 'oil_fat', 55),
  ('triglycerides', 'Grass-Fed Beef', 'meat', 56),
  ('triglycerides', 'Eggs', 'egg', 57),
  ('triglycerides', 'Garlic', 'herb_spice', 58),
  ('triglycerides', 'Green Tea', 'beverage', 59),
  ('triglycerides', 'Coconut Oil', 'oil_fat', 60)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('triglycerides', 'Fish Oil (Omega-3)', '2-4g EPA+DHA/day', 'Proven to lower TG 15-30%', 50),
  ('triglycerides', 'Niacin (Vitamin B3)', '500-2000mg/day', 'Very effective for TG; causes flushing at higher doses', 51),
  ('triglycerides', 'Berberine', '500mg 2-3x/day', 'Reduces TG and improves insulin sensitivity', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- GLUCOSE (glucose) - Add missing animal-based foods
-- ============================================================

-- Foods (8)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('glucose', 'Grass-Fed Beef', 'meat', 50),
  ('glucose', 'Chicken Breast', 'poultry', 51),
  ('glucose', 'Turkey', 'poultry', 52),
  ('glucose', 'Sardines', 'fish', 53),
  ('glucose', 'Shrimp', 'seafood', 54),
  ('glucose', 'Liver', 'organ_meat', 55),
  ('glucose', 'Sauerkraut', 'fermented', 56),
  ('glucose', 'Cheese', 'dairy', 57)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- ============================================================
-- KETONES (ketones) - Add missing foods
-- ============================================================

-- Foods (8)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('ketones', 'Grass-Fed Beef', 'meat', 50),
  ('ketones', 'Ribeye Steak', 'meat', 51),
  ('ketones', 'Bacon', 'meat', 52),
  ('ketones', 'Chicken Thighs', 'poultry', 53),
  ('ketones', 'Sardines', 'fish', 54),
  ('ketones', 'Liver', 'organ_meat', 55),
  ('ketones', 'Cream Cheese', 'dairy', 56),
  ('ketones', 'Heavy Cream', 'dairy', 57)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- ============================================================
-- INSULIN (insulin) - Add animal-based options
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('insulin', 'Grass-Fed Beef', 'meat', 50),
  ('insulin', 'Salmon', 'fish', 51),
  ('insulin', 'Eggs', 'egg', 52),
  ('insulin', 'Liver', 'organ_meat', 53),
  ('insulin', 'Bone Broth', 'beverage', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- ============================================================
-- HBA1C (hba1c) - Add animal-based options
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('hba1c', 'Grass-Fed Beef', 'meat', 50),
  ('hba1c', 'Salmon', 'fish', 51),
  ('hba1c', 'Sardines', 'fish', 52),
  ('hba1c', 'Eggs', 'egg', 53),
  ('hba1c', 'Liver', 'organ_meat', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- ============================================================
-- LDL_C (ldl_c) - Add animal-based options
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('ldl_c', 'Salmon', 'fish', 50),
  ('ldl_c', 'Sardines', 'fish', 51),
  ('ldl_c', 'Eggs', 'egg', 52),
  ('ldl_c', 'Grass-Fed Beef', 'meat', 53),
  ('ldl_c', 'Olive Oil', 'oil_fat', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('ldl_c', 'Fish Oil (Omega-3)', '2-4g EPA+DHA/day', 'Supports healthy LDL particle size', 50),
  ('ldl_c', 'Plant Sterols', '2g/day', 'Reduces LDL absorption', 51),
  ('ldl_c', 'CoQ10', '100-200mg/day', 'Important if taking statins; supports heart health', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- HDL_C (hdl_c) - Add animal-based options
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('hdl_c', 'Salmon', 'fish', 50),
  ('hdl_c', 'Eggs', 'egg', 51),
  ('hdl_c', 'Grass-Fed Beef', 'meat', 52),
  ('hdl_c', 'Olive Oil', 'oil_fat', 53),
  ('hdl_c', 'Avocado', 'fruit', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('hdl_c', 'Fish Oil (Omega-3)', '2-4g EPA+DHA/day', 'Raises HDL levels', 50),
  ('hdl_c', 'Niacin (Vitamin B3)', '500-1500mg/day', 'Most effective supplement for raising HDL', 51),
  ('hdl_c', 'Curcumin', '500mg 2x/day', 'Anti-inflammatory, supports healthy lipid profile', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- APOB (apob) - Add foods and supplements
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('apob', 'Salmon', 'fish', 50),
  ('apob', 'Sardines', 'fish', 51),
  ('apob', 'Olive Oil', 'oil_fat', 52),
  ('apob', 'Walnuts', 'nut_seed', 53),
  ('apob', 'Avocado', 'fruit', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('apob', 'Fish Oil (Omega-3)', '2-4g EPA+DHA/day', 'Reduces ApoB particle count', 50),
  ('apob', 'Berberine', '500mg 2-3x/day', 'Lowers ApoB and LDL-C', 51),
  ('apob', 'Plant Sterols', '2g/day', 'Blocks cholesterol absorption, lowers ApoB', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- HEMOGLOBIN (hemoglobin) - Add animal-based options
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('hemoglobin', 'Grass-Fed Beef', 'meat', 50),
  ('hemoglobin', 'Liver', 'organ_meat', 51),
  ('hemoglobin', 'Lamb', 'meat', 52),
  ('hemoglobin', 'Oysters', 'seafood', 53),
  ('hemoglobin', 'Eggs', 'egg', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('hemoglobin', 'Iron Bisglycinate', '25-50mg/day', 'Best-absorbed iron form, less GI upset', 50),
  ('hemoglobin', 'Vitamin B12', '1000mcg/day', 'Essential for red blood cell production', 51),
  ('hemoglobin', 'Folate (5-MTHF)', '400-800mcg/day', 'Active form; supports hemoglobin synthesis', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- HEMATOCRIT (hematocrit)
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('hematocrit', 'Grass-Fed Beef', 'meat', 50),
  ('hematocrit', 'Liver', 'organ_meat', 51),
  ('hematocrit', 'Sardines', 'fish', 52),
  ('hematocrit', 'Eggs', 'egg', 53),
  ('hematocrit', 'Spinach', 'vegetable', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('hematocrit', 'Iron Bisglycinate', '25-50mg/day', 'Raises hematocrit via red blood cell production', 50),
  ('hematocrit', 'Vitamin B12', '1000mcg/day', 'Supports RBC production', 51),
  ('hematocrit', 'Copper', '1-2mg/day', 'Required for iron metabolism and RBC formation', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- URIC_ACID (uric_acid)
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('uric_acid', 'Chicken Breast', 'poultry', 50),
  ('uric_acid', 'Eggs', 'egg', 51),
  ('uric_acid', 'Salmon', 'fish', 52),
  ('uric_acid', 'Cherries', 'fruit', 53),
  ('uric_acid', 'Lemon', 'fruit', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('uric_acid', 'Vitamin C', '500-1000mg/day', 'Promotes uric acid excretion via kidneys', 50),
  ('uric_acid', 'Quercetin', '500mg 2x/day', 'Inhibits xanthine oxidase, lowers uric acid', 51),
  ('uric_acid', 'Tart Cherry Extract', '1000mg/day', 'Shown to reduce uric acid and gout flares', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- ALT (alt)
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('alt', 'Salmon', 'fish', 50),
  ('alt', 'Eggs', 'egg', 51),
  ('alt', 'Avocado', 'fruit', 52),
  ('alt', 'Broccoli', 'vegetable', 53),
  ('alt', 'Garlic', 'herb_spice', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('alt', 'Milk Thistle (Silymarin)', '200-400mg/day', 'Gold standard for liver support', 50),
  ('alt', 'NAC (N-Acetyl Cysteine)', '600-1200mg/day', 'Boosts glutathione, protects liver cells', 51),
  ('alt', 'Alpha Lipoic Acid', '300-600mg/day', 'Antioxidant that supports liver detoxification', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- GGT (ggt)
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('ggt', 'Salmon', 'fish', 50),
  ('ggt', 'Eggs', 'egg', 51),
  ('ggt', 'Turmeric', 'herb_spice', 52),
  ('ggt', 'Beets', 'vegetable', 53),
  ('ggt', 'Cruciferous Vegetables', 'vegetable', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('ggt', 'Milk Thistle (Silymarin)', '200-400mg/day', 'Supports liver enzyme normalization', 50),
  ('ggt', 'NAC (N-Acetyl Cysteine)', '600-1200mg/day', 'Glutathione precursor, liver protectant', 51),
  ('ggt', 'Vitamin E (Mixed Tocopherols)', '400IU/day', 'Reduces oxidative stress on liver', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- CREATININE (creatinine)
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('creatinine', 'Salmon', 'fish', 50),
  ('creatinine', 'Chicken Breast', 'poultry', 51),
  ('creatinine', 'Eggs', 'egg', 52),
  ('creatinine', 'Blueberries', 'fruit', 53),
  ('creatinine', 'Cucumber', 'vegetable', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('creatinine', 'Alpha Lipoic Acid', '300-600mg/day', 'Supports kidney function and reduces oxidative stress', 50),
  ('creatinine', 'Omega-3 Fish Oil', '2-4g/day', 'Anti-inflammatory, supports kidney health', 51),
  ('creatinine', 'CoQ10', '100-200mg/day', 'Antioxidant that may support renal function', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- EGFR (egfr)
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('egfr', 'Salmon', 'fish', 50),
  ('egfr', 'Blueberries', 'fruit', 51),
  ('egfr', 'Red Bell Pepper', 'vegetable', 52),
  ('egfr', 'Eggs', 'egg', 53),
  ('egfr', 'Olive Oil', 'oil_fat', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('egfr', 'Omega-3 Fish Oil', '2-4g/day', 'Reduces kidney inflammation', 50),
  ('egfr', 'CoQ10', '100-200mg/day', 'May slow kidney function decline', 51),
  ('egfr', 'Astragalus', '500-1000mg/day', 'Traditional herb used for kidney support', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- FERRITIN (ferritin)
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('ferritin', 'Liver', 'organ_meat', 50),
  ('ferritin', 'Grass-Fed Beef', 'meat', 51),
  ('ferritin', 'Oysters', 'seafood', 52),
  ('ferritin', 'Sardines', 'fish', 53),
  ('ferritin', 'Eggs', 'egg', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('ferritin', 'Iron Bisglycinate', '25-50mg/day', 'Best-absorbed form for raising ferritin', 50),
  ('ferritin', 'Vitamin C', '500mg with iron', 'Enhances iron absorption by 2-3x', 51),
  ('ferritin', 'Lactoferrin', '100-200mg/day', 'Improves iron absorption and storage', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- VITAMIN_D (vitamin_d)
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('vitamin_d', 'Salmon', 'fish', 50),
  ('vitamin_d', 'Sardines', 'fish', 51),
  ('vitamin_d', 'Eggs', 'egg', 52),
  ('vitamin_d', 'Liver', 'organ_meat', 53),
  ('vitamin_d', 'Mackerel', 'fish', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('vitamin_d', 'Vitamin D3', '2000-5000IU/day', 'Cholecalciferol, best-absorbed form; take with fat', 50),
  ('vitamin_d', 'Vitamin K2 (MK-7)', '100-200mcg/day', 'Directs calcium to bones; always pair with D3', 51),
  ('vitamin_d', 'Magnesium Glycinate', '200-400mg/day', 'Required for vitamin D activation in the body', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- HS_CRP (hs_crp) - inflammation marker
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('hs_crp', 'Salmon', 'fish', 50),
  ('hs_crp', 'Sardines', 'fish', 51),
  ('hs_crp', 'Turmeric', 'herb_spice', 52),
  ('hs_crp', 'Olive Oil', 'oil_fat', 53),
  ('hs_crp', 'Blueberries', 'fruit', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('hs_crp', 'Omega-3 Fish Oil', '2-4g EPA+DHA/day', 'Proven to lower CRP in clinical trials', 50),
  ('hs_crp', 'Curcumin', '500mg 2x/day', 'Potent anti-inflammatory, pair with piperine for absorption', 51),
  ('hs_crp', 'Vitamin D3', '2000-5000IU/day', 'Low vitamin D strongly linked to elevated CRP', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);

-- ============================================================
-- IRON (iron)
-- ============================================================

-- Foods (5)
INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
SELECT v.marker_id, v.food_name, v.food_category, v.display_order
FROM (VALUES
  ('iron', 'Liver', 'organ_meat', 50),
  ('iron', 'Grass-Fed Beef', 'meat', 51),
  ('iron', 'Oysters', 'seafood', 52),
  ('iron', 'Sardines', 'fish', 53),
  ('iron', 'Eggs', 'egg', 54)
) AS v(marker_id, food_name, food_category, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_foods mf
  WHERE mf.marker_id = v.marker_id AND mf.food_name = v.food_name
);

-- Supplements (3)
INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order)
SELECT v.marker_id, v.supplement_name, v.typical_dose, v.notes, v.display_order
FROM (VALUES
  ('iron', 'Iron Bisglycinate', '25-50mg/day', 'Gentle on stomach, high bioavailability', 50),
  ('iron', 'Vitamin C', '500mg with iron', 'Dramatically improves non-heme iron absorption', 51),
  ('iron', 'Lactoferrin', '100-200mg/day', 'Enhances iron uptake and regulates iron homeostasis', 52)
) AS v(marker_id, supplement_name, typical_dose, notes, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM marker_supplements ms
  WHERE ms.marker_id = v.marker_id AND ms.supplement_name = v.supplement_name
);
