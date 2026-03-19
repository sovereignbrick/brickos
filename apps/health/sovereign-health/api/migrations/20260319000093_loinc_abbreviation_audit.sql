-- LOINC Abbreviation Audit
-- Updates marker abbreviations to align with LOINC/clinical standard conventions.
-- Also adds LOINC code column for future enrichment (nullable, populated incrementally).
-- Reference: https://loinc.org/ — LOINC is copyright Regenstrief Institute, Inc.

-- ── Step 1: Add LOINC columns (nullable, no data yet) ────────────────────────
ALTER TABLE markers ADD COLUMN IF NOT EXISTS loinc_code VARCHAR(20);
ALTER TABLE markers ADD COLUMN IF NOT EXISTS loinc_system TEXT;
ALTER TABLE markers ADD COLUMN IF NOT EXISTS loinc_class TEXT;

CREATE INDEX IF NOT EXISTS idx_markers_loinc_code ON markers(loinc_code);

-- ── Step 2: Update abbreviations to LOINC standard ───────────────────────────
UPDATE markers SET abbreviation = CASE marker_slug
  -- Metabolic
  WHEN 'glucose'            THEN 'GLU'
  WHEN 'insulin'            THEN 'INS'
  WHEN 'creatinine'         THEN 'CREA'
  -- Liver
  WHEN 'albumin'            THEN 'ALB'
  WHEN 'bilirubin_total'    THEN 'BILI'
  WHEN 'bilirubin_direct'   THEN 'BILI-D'
  -- Hematology
  WHEN 'hemoglobin'         THEN 'HGB'
  WHEN 'ferritin'           THEN 'Ferritin'
  WHEN 'transferrin'        THEN 'Transferrin'
  -- Differential (capitalize)
  WHEN 'neutrophils_pct'    THEN 'NEUT%'
  WHEN 'neutrophils_abs'    THEN 'NEUT#'
  WHEN 'lymphocytes_pct'    THEN 'LYMPH%'
  WHEN 'lymphocytes_abs'    THEN 'LYMPH#'
  WHEN 'monocytes_pct'      THEN 'MONO%'
  WHEN 'monocytes_abs'      THEN 'MONO#'
  WHEN 'eosinophils_pct'    THEN 'EOS%'
  WHEN 'eosinophils_abs'    THEN 'EOS#'
  WHEN 'basophils_pct'      THEN 'BASO%'
  WHEN 'basophils_abs'      THEN 'BASO#'
  -- Hormones
  WHEN 'testosterone'       THEN 'TEST'
  WHEN 'free_testosterone'  THEN 'fTEST'
  WHEN 'progesterone'       THEN 'PROG'
  WHEN 'cortisol'           THEN 'CORT'
  -- Vitamins
  WHEN 'vitamin_d'          THEN '25(OH)D'
  WHEN 'folate'             THEN 'Folate'
  ELSE abbreviation
END
WHERE marker_slug IN (
  'glucose', 'insulin', 'creatinine',
  'albumin', 'bilirubin_total', 'bilirubin_direct',
  'hemoglobin', 'ferritin', 'transferrin',
  'neutrophils_pct', 'neutrophils_abs', 'lymphocytes_pct', 'lymphocytes_abs',
  'monocytes_pct', 'monocytes_abs', 'eosinophils_pct', 'eosinophils_abs',
  'basophils_pct', 'basophils_abs',
  'testosterone', 'free_testosterone', 'progesterone', 'cortisol',
  'vitamin_d', 'folate'
);

-- ── Step 3: Populate LOINC codes for all lab markers ─────────────────────────
UPDATE markers SET loinc_code = v.code, loinc_system = v.system, loinc_class = v.class
FROM (VALUES
  ('glucose',            '2345-7',  'Serum',  'CHEM'),
  ('hba1c',              '4548-4',  'Blood',  'CHEM'),
  ('insulin',            '14959-1', 'Serum',  'ENDOCRINE'),
  ('ketones',            '13969-1', 'Blood',  'CHEM'),
  ('sodium',             '2951-2',  'Serum',  'CHEM'),
  ('potassium',          '2823-3',  'Serum',  'CHEM'),
  ('chloride',           '2075-0',  'Serum',  'CHEM'),
  ('bicarbonate',        '1963-8',  'Serum',  'CHEM'),
  ('calcium',            '17861-6', 'Serum',  'CHEM'),
  ('magnesium',          '19123-9', 'Serum',  'CHEM'),
  ('phosphate',          '14879-1', 'Serum',  'CHEM'),
  ('creatinine',         '2160-0',  'Serum',  'CHEM'),
  ('bun',                '3094-0',  'Serum',  'CHEM'),
  ('egfr',               '33914-3', 'Serum',  'CHEM'),
  ('uric_acid',          '3084-1',  'Serum',  'CHEM'),
  ('total_cholesterol',  '2093-3',  'Serum',  'CHEM'),
  ('hdl_c',              '2085-9',  'Serum',  'CHEM'),
  ('ldl_c',              '13457-7', 'Serum',  'CHEM'),
  ('triglycerides',      '2571-8',  'Serum',  'CHEM'),
  ('non_hdl_c',          '18262-6', 'Serum',  'CHEM'),
  ('lpa',                '10839-9', 'Serum',  'CHEM'),
  ('apob',               '1884-6',  'Serum',  'CHEM'),
  ('alt',                '1742-6',  'Serum',  'CHEM'),
  ('ast',                '1920-8',  'Serum',  'CHEM'),
  ('alp',                '6768-6',  'Serum',  'CHEM'),
  ('ggt',                '2324-2',  'Serum',  'CHEM'),
  ('bilirubin_total',    '1975-2',  'Serum',  'CHEM'),
  ('bilirubin_direct',   '1968-7',  'Serum',  'CHEM'),
  ('total_protein',      '1925-7',  'Serum',  'CHEM'),
  ('albumin',            '1751-7',  'Serum',  'CHEM'),
  ('crp',                '1989-3',  'Serum',  'CHEM'),
  ('hs_crp',             '30522-7', 'Serum',  'CHEM'),
  ('esr',                '4537-7',  'Blood',  'HEMAT'),
  ('ferritin',           '32623-1', 'Serum',  'CHEM'),
  ('iron',               '2500-7',  'Serum',  'CHEM'),
  ('transferrin',        '2502-3',  'Serum',  'CHEM'),
  ('hemoglobin',         '718-7',   'Blood',  'HEMAT'),
  ('rbc',                '789-8',   'Blood',  'HEMAT'),
  ('wbc',                '6690-2',  'Blood',  'HEMAT'),
  ('platelets',          '777-3',   'Blood',  'HEMAT'),
  ('hematocrit',         '4544-3',  'Blood',  'HEMAT'),
  ('mcv',                '787-2',   'Blood',  'HEMAT'),
  ('mch',                '785-6',   'Blood',  'HEMAT'),
  ('mchc',               '786-4',   'Blood',  'HEMAT'),
  ('rdw',                '788-0',   'Blood',  'HEMAT'),
  ('neutrophils_pct',    '731-0',   'Blood',  'HEMAT'),
  ('lymphocytes_pct',    '736-9',   'Blood',  'HEMAT'),
  ('monocytes_pct',      '742-7',   'Blood',  'HEMAT'),
  ('eosinophils_pct',    '713-8',   'Blood',  'HEMAT'),
  ('basophils_pct',      '706-2',   'Blood',  'HEMAT'),
  ('vitamin_d',          '14682-9', 'Serum',  'CHEM'),
  ('vitamin_b12',        '2132-9',  'Serum',  'CHEM'),
  ('folate',             '2284-8',  'Serum',  'CHEM'),
  ('tsh',                '3016-3',  'Serum',  'ENDOCRINE'),
  ('ft4',                '3024-7',  'Serum',  'ENDOCRINE'),
  ('ft3',                '3053-6',  'Serum',  'ENDOCRINE'),
  ('testosterone',       '2986-8',  'Serum',  'ENDOCRINE'),
  ('free_testosterone',  '2991-8',  'Serum',  'ENDOCRINE'),
  ('cortisol',           '8310-5',  'Serum',  'ENDOCRINE'),
  ('estradiol',          '2143-6',  'Serum',  'ENDOCRINE'),
  ('progesterone',       '10501-5', 'Serum',  'ENDOCRINE'),
  ('fsh',                '8302-2',  'Serum',  'ENDOCRINE'),
  ('lh',                 '10505-6', 'Serum',  'ENDOCRINE'),
  ('prolactin',          '2842-3',  'Serum',  'ENDOCRINE'),
  ('shbg',               '2211-0',  'Serum',  'ENDOCRINE'),
  ('dheas',              '2191-4',  'Serum',  'ENDOCRINE'),
  ('homocysteine',       '2028-9',  'Serum',  'CHEM'),
  ('psa',                '2857-1',  'Serum',  'CHEM'),
  -- Home device markers
  ('weight',             '29463-7', 'Patient','PHYSIOL'),
  ('heart_rate',         '8867-4',  'Patient','PHYSIOL'),
  ('bp_systolic',        '8480-6',  'Patient','PHYSIOL'),
  ('bp_diastolic',       '8462-4',  'Patient','PHYSIOL'),
  ('waist_circumference','56086-2', 'Patient','PHYSIOL')
) AS v(slug, code, system, class)
WHERE markers.marker_slug = v.slug;
