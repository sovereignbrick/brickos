-- Migration 023: Expand food categories and reclassify + add new foods.
-- New categories: poultry, seafood, organ_meat, egg, fermented, oil_fat, beverage
-- (herb_spice already exists; meat, fish, vegetable, fruit, nut_seed, legume, dairy, grain, other remain)

-- ============================================================
-- PART 1: Reclassify existing foods to correct categories
-- ============================================================

-- Organ meats: "Beef liver" from meat -> organ_meat
UPDATE marker_foods SET food_category = 'organ_meat' WHERE food_name = 'Beef liver' AND food_category = 'meat';

-- Eggs: from other -> egg
UPDATE marker_foods SET food_category = 'egg' WHERE food_name IN ('Eggs', 'Egg yolks', 'Egg whites') AND food_category = 'other';

-- Poultry: from meat -> poultry
UPDATE marker_foods SET food_category = 'poultry' WHERE food_name = 'Skinless chicken' AND food_category = 'meat';

-- Oils/fats: from other/dairy -> oil_fat
UPDATE marker_foods SET food_category = 'oil_fat' WHERE food_name IN ('Olive oil (extra virgin)', 'Coconut oil') AND food_category = 'other';
UPDATE marker_foods SET food_category = 'oil_fat' WHERE food_name = 'Butter' AND food_category = 'dairy';

-- Beverages: from other -> beverage
UPDATE marker_foods SET food_category = 'beverage' WHERE food_name IN ('Coffee (unsweetened)', 'Coffee', 'Green tea', 'Apple cider vinegar') AND food_category = 'other';

-- Seafood: Oysters from fish -> seafood
UPDATE marker_foods SET food_category = 'seafood' WHERE food_name = 'Oysters' AND food_category = 'fish';

-- ============================================================
-- PART 2: Add new foods per marker (skip if already exists)
-- ============================================================

-- Helper: use a DO block to insert only if food_name doesn't already exist for that marker
DO $$
DECLARE
  v_max_order INT;
BEGIN

  -- === iron ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'iron';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('iron', 'Chicken Thighs', 'poultry', v_max_order + 1),
    ('iron', 'Mussels', 'seafood', v_max_order + 2),
    ('iron', 'Bone Broth', 'beverage', v_max_order + 3)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === vitamin_d ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'vitamin_d';
  -- Cod Liver Oil (new)
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT 'vitamin_d', 'Cod Liver Oil', 'oil_fat', v_max_order + 1
  WHERE NOT EXISTS (SELECT 1 FROM marker_foods WHERE marker_id = 'vitamin_d' AND food_name = 'Cod Liver Oil');

  -- === hemoglobin ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'hemoglobin';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('hemoglobin', 'Turkey', 'poultry', v_max_order + 1),
    ('hemoglobin', 'Clams', 'seafood', v_max_order + 2),
    ('hemoglobin', 'Bone Broth', 'beverage', v_max_order + 3)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === blood_glucose (glucose) ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'glucose';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('glucose', 'Apple Cider Vinegar', 'beverage', v_max_order + 1),
    ('glucose', 'Olive Oil (extra virgin)', 'oil_fat', v_max_order + 2),
    ('glucose', 'Eggs', 'egg', v_max_order + 3)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === ketones ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'ketones';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('ketones', 'Ghee', 'oil_fat', v_max_order + 1),
    ('ketones', 'Bone Broth', 'beverage', v_max_order + 2)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === hdl_c ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'hdl_c';
  -- Eggs already exists, will be reclassified. No new inserts needed besides checking.
  -- Olive oil already exists.

  -- === triglycerides ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'triglycerides';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('triglycerides', 'Olive Oil (extra virgin)', 'oil_fat', v_max_order + 1),
    ('triglycerides', 'Green Tea', 'beverage', v_max_order + 2)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === hs_crp ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'hs_crp';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('hs_crp', 'Green Tea', 'beverage', v_max_order + 1),
    ('hs_crp', 'Bone Broth', 'beverage', v_max_order + 2),
    ('hs_crp', 'Sauerkraut', 'fermented', v_max_order + 3),
    ('hs_crp', 'Kimchi', 'fermented', v_max_order + 4)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === alt ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'alt';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('alt', 'Turmeric', 'herb_spice', v_max_order + 1),
    ('alt', 'Sauerkraut', 'fermented', v_max_order + 2)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === ggt ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'ggt';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('ggt', 'Artichoke', 'vegetable', v_max_order + 1),
    ('ggt', 'Lemon Water', 'beverage', v_max_order + 2)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === uric_acid ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'uric_acid';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('uric_acid', 'Lemon Water', 'beverage', v_max_order + 1),
    ('uric_acid', 'Parsley', 'herb_spice', v_max_order + 2),
    ('uric_acid', 'Bone Broth', 'beverage', v_max_order + 3)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === creatinine ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'creatinine';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('creatinine', 'Parsley', 'herb_spice', v_max_order + 1),
    ('creatinine', 'Cranberries', 'fruit', v_max_order + 2),
    ('creatinine', 'Lemon Water', 'beverage', v_max_order + 3)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === egfr ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'egfr';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('egfr', 'Parsley', 'herb_spice', v_max_order + 1),
    ('egfr', 'Lemon Water', 'beverage', v_max_order + 2)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === hba1c ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'hba1c';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('hba1c', 'Cinnamon', 'herb_spice', v_max_order + 1),
    ('hba1c', 'Apple Cider Vinegar', 'beverage', v_max_order + 2),
    ('hba1c', 'Eggs', 'egg', v_max_order + 3),
    ('hba1c', 'Olive Oil (extra virgin)', 'oil_fat', v_max_order + 4)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === apob ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'apob';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('apob', 'Green Tea', 'beverage', v_max_order + 1)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === ferritin (same additions as iron) ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'ferritin';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('ferritin', 'Chicken Thighs', 'poultry', v_max_order + 1),
    ('ferritin', 'Mussels', 'seafood', v_max_order + 2),
    ('ferritin', 'Bone Broth', 'beverage', v_max_order + 3)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === insulin ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'insulin';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('insulin', 'Cinnamon', 'herb_spice', v_max_order + 1),
    ('insulin', 'Coconut Oil', 'oil_fat', v_max_order + 2)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === total_cholesterol ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'total_cholesterol';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('total_cholesterol', 'Eggs', 'egg', v_max_order + 1),
    ('total_cholesterol', 'Ghee', 'oil_fat', v_max_order + 2)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

  -- === hematocrit ===
  SELECT COALESCE(MAX(display_order), -1) INTO v_max_order FROM marker_foods WHERE marker_id = 'hematocrit';
  INSERT INTO marker_foods (marker_id, food_name, food_category, display_order)
  SELECT * FROM (VALUES
    ('hematocrit', 'Bone Broth', 'beverage', v_max_order + 1),
    ('hematocrit', 'Kidney', 'organ_meat', v_max_order + 2)
  ) AS t(marker_id, food_name, food_category, display_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM marker_foods mf WHERE mf.marker_id = t.marker_id AND mf.food_name = t.food_name
  );

END $$;
