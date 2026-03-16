-- Migration 027: Batch 10 fixes
-- 1. SYNLAB Vienna device for demo user
-- 2. Assign device to orphaned lab measurements
-- 3. Measurement templates table + seed
-- 4. Alternative units column on markers + conversion data

-- ============================================================
-- 1. Add SYNLAB Vienna device for demo user
-- ============================================================
INSERT INTO devices (id, user_id, device_name, device_type, markers_measured, status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000001',
  'SYNLAB Vienna',
  'lab',
  ARRAY['insulin', 'hba1c', 'ldl_c', 'hdl_c', 'triglycerides', 'apob', 'hs_crp', 'alt', 'ggt', 'creatinine', 'egfr', 'iron', 'ferritin', 'vitamin_d', 'tsh', 'ft4', 'ft3', 'testosterone', 'cortisol', 'dheas', 'homocysteine'],
  'active',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Update demo lab measurements with NULL device_id
-- ============================================================
UPDATE measurements
SET device_id = '00000000-0000-0000-0000-000000000014',
    updated_at = NOW()
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND is_demo = true
  AND device_id IS NULL
  AND marker_id IN (
    SELECT id FROM markers WHERE marker_slug IN (
      'insulin', 'hba1c', 'ldl_c', 'hdl_c', 'triglycerides', 'apob',
      'hs_crp', 'alt', 'ggt', 'creatinine', 'egfr', 'iron', 'ferritin',
      'vitamin_d', 'tsh', 'ft4', 'ft3', 'testosterone', 'cortisol',
      'dheas', 'homocysteine'
    )
  );

-- ============================================================
-- 3. Create measurement_templates table
-- ============================================================
CREATE TABLE IF NOT EXISTS measurement_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    marker_slugs TEXT[] NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON measurement_templates(user_id);

-- ============================================================
-- 4. Seed default template for demo user
-- ============================================================
INSERT INTO measurement_templates (user_id, name, marker_slugs, is_default, display_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Morning Home Test',
  ARRAY['glucose', 'ketones', 'total_cholesterol', 'uric_acid', 'hemoglobin', 'hematocrit', 'bp_systolic', 'bp_diastolic', 'heart_rate', 'weight'],
  true,
  0
);

-- ============================================================
-- 5. Add alternative_units column to markers
-- ============================================================
ALTER TABLE markers ADD COLUMN IF NOT EXISTS alternative_units JSONB DEFAULT NULL;

-- ============================================================
-- 6. Populate alternative_units for markers with recognized conversions
--    Format: {"alternatives": [{"unit": "...", "factor": N, "direction": "multiply"}]}
--    Factor converts FROM canonical unit TO alternative unit.
-- ============================================================

-- Glucose: mmol/L -> mg/dL (x 18.0182)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 18.0182, "direction": "multiply"}]}'
WHERE marker_slug = 'glucose';

-- Ketones: mmol/L -> mg/dL (x 10.417)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 10.417, "direction": "multiply"}]}'
WHERE marker_slug = 'ketones';

-- Total cholesterol: mmol/L -> mg/dL (x 38.67)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 38.67, "direction": "multiply"}]}'
WHERE marker_slug = 'total_cholesterol';

-- LDL-C: mmol/L -> mg/dL (x 38.67)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 38.67, "direction": "multiply"}]}'
WHERE marker_slug = 'ldl_c';

-- HDL-C: mmol/L -> mg/dL (x 38.67)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 38.67, "direction": "multiply"}]}'
WHERE marker_slug = 'hdl_c';

-- Triglycerides: mmol/L -> mg/dL (x 88.57)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 88.57, "direction": "multiply"}]}'
WHERE marker_slug = 'triglycerides';

-- Uric acid: µmol/L -> mg/dL (x 0.01681)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 0.01681, "direction": "multiply"}]}'
WHERE marker_slug = 'uric_acid';

-- Creatinine: µmol/L -> mg/dL (x 0.01131)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 0.01131, "direction": "multiply"}]}'
WHERE marker_slug = 'creatinine';

-- Iron: µmol/L -> µg/dL (x 5.585)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "µg/dL", "factor": 5.585, "direction": "multiply"}]}'
WHERE marker_slug = 'iron';

-- Vitamin D: nmol/L -> ng/mL (x 0.4006)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "ng/mL", "factor": 0.4006, "direction": "multiply"}]}'
WHERE marker_slug = 'vitamin_d';

-- Hemoglobin: mmol/L -> g/dL (x 1.6114)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "g/dL", "factor": 1.6114, "direction": "multiply"}]}'
WHERE marker_slug = 'hemoglobin';

-- DHEA-S: µmol/L -> µg/dL (x 36.84)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "µg/dL", "factor": 36.84, "direction": "multiply"}]}'
WHERE marker_slug = 'dheas';

-- Free T4: pmol/L -> ng/dL (x 0.07769)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "ng/dL", "factor": 0.07769, "direction": "multiply"}]}'
WHERE marker_slug = 'ft4';

-- Free T3: pmol/L -> pg/mL (x 0.6513)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "pg/mL", "factor": 0.6513, "direction": "multiply"}]}'
WHERE marker_slug = 'ft3';

-- Eosinophils (abs): Gpt/L -> cells/µL (x 1000)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "cells/µL", "factor": 1000, "direction": "multiply"}]}'
WHERE marker_slug = 'eosinophils_abs';

-- Neutrophils (abs): Gpt/L -> cells/µL (x 1000)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "cells/µL", "factor": 1000, "direction": "multiply"}]}'
WHERE marker_slug = 'neutrophils_abs';

-- Lymphocytes (abs): Gpt/L -> cells/µL (x 1000)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "cells/µL", "factor": 1000, "direction": "multiply"}]}'
WHERE marker_slug = 'lymphocytes_abs';

-- Monocytes (abs): Gpt/L -> cells/µL (x 1000)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "cells/µL", "factor": 1000, "direction": "multiply"}]}'
WHERE marker_slug = 'monocytes_abs';

-- Basophils (abs): Gpt/L -> cells/µL (x 1000)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "cells/µL", "factor": 1000, "direction": "multiply"}]}'
WHERE marker_slug = 'basophils_abs';

-- Platelets: Gpt/L -> 10³/µL (factor 1, label change only)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "10³/µL", "factor": 1, "direction": "multiply"}]}'
WHERE marker_slug = 'platelets';

-- WBC: Gpt/L -> 10³/µL (factor 1, label change only)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "10³/µL", "factor": 1, "direction": "multiply"}]}'
WHERE marker_slug = 'wbc';

-- RBC: Tpt/L -> 10⁶/µL (factor 1, label change only)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "10⁶/µL", "factor": 1, "direction": "multiply"}]}'
WHERE marker_slug = 'rbc';

-- Vitamin A: µmol/L -> µg/dL (x 28.65)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "µg/dL", "factor": 28.65, "direction": "multiply"}]}'
WHERE marker_slug = 'vitamin_a';

-- Vitamin E: µmol/L -> mg/dL (x 0.04307)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 0.04307, "direction": "multiply"}]}'
WHERE marker_slug = 'vitamin_e';

-- Bilirubin (total): µmol/L -> mg/dL (x 0.05847)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 0.05847, "direction": "multiply"}]}'
WHERE marker_slug = 'bilirubin_total';

-- Bilirubin (direct): µmol/L -> mg/dL (x 0.05847)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 0.05847, "direction": "multiply"}]}'
WHERE marker_slug = 'bilirubin_direct';

-- Ferritin: µg/L -> ng/mL (factor 1, same thing)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "ng/mL", "factor": 1, "direction": "multiply"}]}'
WHERE marker_slug = 'ferritin';

-- Albumin: g/L -> g/dL (x 0.1)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "g/dL", "factor": 0.1, "direction": "multiply"}]}'
WHERE marker_slug = 'albumin';

-- Total protein: g/L -> g/dL (x 0.1)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "g/dL", "factor": 0.1, "direction": "multiply"}]}'
WHERE marker_slug = 'total_protein';

-- Testosterone: nmol/L -> ng/dL (x 28.842)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "ng/dL", "factor": 28.842, "direction": "multiply"}]}'
WHERE marker_slug = 'testosterone';

-- Free testosterone: pmol/L -> pg/mL (x 0.2884)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "pg/mL", "factor": 0.2884, "direction": "multiply"}]}'
WHERE marker_slug = 'free_testosterone';

-- Estradiol: pmol/L -> pg/mL (x 0.2724)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "pg/mL", "factor": 0.2724, "direction": "multiply"}]}'
WHERE marker_slug = 'estradiol';

-- Progesterone: nmol/L -> ng/mL (x 0.3145)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "ng/mL", "factor": 0.3145, "direction": "multiply"}]}'
WHERE marker_slug = 'progesterone';

-- Prolactin: mIU/L -> ng/mL (x 0.04722)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "ng/mL", "factor": 0.04722, "direction": "multiply"}]}'
WHERE marker_slug = 'prolactin';

-- Selenium: µg/L -> µmol/L (x 0.01266)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "µmol/L", "factor": 0.01266, "direction": "multiply"}]}'
WHERE marker_slug = 'selenium';

-- Zinc: µmol/L -> µg/dL (x 6.538)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "µg/dL", "factor": 6.538, "direction": "multiply"}]}'
WHERE marker_slug = 'zinc';

-- Phosphate: mmol/L -> mg/dL (x 3.097)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 3.097, "direction": "multiply"}]}'
WHERE marker_slug = 'phosphate';

-- Lp(a): nmol/L -> mg/dL (x 0.4167, approximate)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mg/dL", "factor": 0.4167, "direction": "multiply"}]}'
WHERE marker_slug = 'lpa';

-- TSH: mIU/L -> µIU/mL (factor 1, same thing)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "µIU/mL", "factor": 1, "direction": "multiply"}]}'
WHERE marker_slug = 'tsh';

-- FSH: IU/L -> mIU/mL (factor 1, same thing)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mIU/mL", "factor": 1, "direction": "multiply"}]}'
WHERE marker_slug = 'fsh';

-- LH: IU/L -> mIU/mL (factor 1, same thing)
UPDATE markers SET alternative_units = '{"alternatives": [{"unit": "mIU/mL", "factor": 1, "direction": "multiply"}]}'
WHERE marker_slug = 'lh';
