-- Migration 015: Full marker catalog, zone_markers join table, zone display_order fix.
-- Adds source_type to markers, inserts ~70 new lab markers, creates zone_markers,
-- updates zone display_orders (nutritional=6, hormonal=7, detoxification=8),
-- and populates all zone↔marker relationships per spec.

-- ============================================================
-- 1. Add source_type column to markers (home | lab | calculated)
-- ============================================================
ALTER TABLE markers ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'home';

-- Existing markers: set correct source_type
UPDATE markers SET source_type = 'lab' WHERE marker_slug = 'insulin';
-- All others stay 'home' (glucose, ketones, total_cholesterol, uric_acid,
-- hemoglobin, hematocrit, bp_systolic, bp_diastolic, heart_rate, weight,
-- waist_circumference)

-- ============================================================
-- 2. Insert missing lab markers
-- ============================================================
INSERT INTO markers (id, marker_slug, marker_name, zone_id, unit_canonical, source_type, display_order)
SELECT gen_random_uuid(), m.marker_slug, m.marker_name, z.id, m.unit_canonical, 'lab', m.display_order
FROM (VALUES
    -- Metabolic / Thyroid
    ('hba1c',              'HbA1c',                      'energy_metabolic',  '%',       13),
    ('tsh',                'TSH',                        'energy_metabolic',  'mIU/L',   14),
    ('ft4',                'Free T4',                    'energy_metabolic',  'pmol/L',  15),
    ('ft3',                'Free T3',                    'energy_metabolic',  'pmol/L',  16),
    -- Lipids / Cardiovascular
    ('ldl_c',              'LDL Cholesterol',            'cardiovascular',    'mmol/L',  17),
    ('hdl_c',              'HDL Cholesterol',            'cardiovascular',    'mmol/L',  18),
    ('triglycerides',      'Triglycerides',              'cardiovascular',    'mmol/L',  19),
    ('apob',               'ApoB',                       'cardiovascular',    'g/L',     20),
    ('lpa',                'Lp(a)',                      'cardiovascular',    'nmol/L',  21),
    ('hs_crp',             'hs-CRP',                     'cardiovascular',    'mg/L',    22),
    ('non_hdl_c',          'Non-HDL Cholesterol',        'cardiovascular',    'mmol/L',  23),
    -- Structural / Proteins
    ('albumin',            'Albumin',                    'structural',        'g/L',     24),
    ('total_protein',      'Total Protein',              'structural',        'g/L',     25),
    ('calcium',            'Calcium',                    'structural',        'mmol/L',  26),
    ('magnesium',          'Magnesium',                  'structural',        'mmol/L',  27),
    ('potassium',          'Potassium',                  'structural',        'mmol/L',  28),
    ('phosphate',          'Phosphate',                  'structural',        'mmol/L',  29),
    -- Kidney / Detoxification
    ('creatinine',         'Creatinine',                 'detoxification',    'µmol/L',  30),
    ('egfr',               'eGFR',                       'detoxification',    'mL/min',  31),
    ('cystatin_c',         'Cystatin C',                 'detoxification',    'mg/L',    32),
    -- Liver / Detoxification
    ('alt',                'ALT',                        'detoxification',    'U/L',     33),
    ('ast',                'AST',                        'detoxification',    'U/L',     34),
    ('ggt',                'GGT',                        'detoxification',    'U/L',     35),
    ('alp',                'ALP',                        'detoxification',    'U/L',     36),
    ('ldh',                'LDH',                        'detoxification',    'U/L',     37),
    ('bilirubin_total',    'Bilirubin (Total)',           'detoxification',    'µmol/L',  38),
    ('bilirubin_direct',   'Bilirubin (Direct)',          'detoxification',    'µmol/L',  39),
    -- Hormonal
    ('testosterone',       'Testosterone',               'hormonal',          'nmol/L',  40),
    ('free_testosterone',  'Free Testosterone',          'hormonal',          'pmol/L',  41),
    ('free_androgen_index','Free Androgen Index',        'hormonal',          'ratio',   42),
    ('shbg',               'SHBG',                       'hormonal',          'nmol/L',  43),
    ('estradiol',          'Estradiol (E2)',              'hormonal',          'pmol/L',  44),
    ('progesterone',       'Progesterone',               'hormonal',          'nmol/L',  45),
    ('prolactin',          'Prolactin',                  'hormonal',          'mIU/L',   46),
    ('fsh',                'FSH',                        'hormonal',          'IU/L',    47),
    ('lh',                 'LH',                         'hormonal',          'IU/L',    48),
    ('dheas',              'DHEA-S',                     'hormonal',          'µmol/L',  49),
    -- Iron Panel
    ('iron',               'Iron',                       'nutritional',       'µmol/L',  50),
    ('ferritin',           'Ferritin',                   'nutritional',       'µg/L',    51),
    ('transferrin',        'Transferrin',                'nutritional',       'g/L',     52),
    ('transferrin_sat',    'Transferrin Saturation',     'nutritional',       '%',       53),
    -- Vitamins
    ('vitamin_d',          'Vitamin D (25-OH)',           'nutritional',       'nmol/L',  54),
    ('vitamin_b12',        'Vitamin B12',                'nutritional',       'pmol/L',  55),
    ('holo_tc',            'Holotranscobalamin (HoloTC)', 'nutritional',      'pmol/L',  56),
    ('vitamin_b1',         'Vitamin B1 (Thiamine)',       'nutritional',      'nmol/L',  57),
    ('vitamin_b2',         'Vitamin B2 (Riboflavin)',     'nutritional',      'nmol/L',  58),
    ('vitamin_b3',         'Vitamin B3 (Niacin)',         'nutritional',      'nmol/L',  59),
    ('vitamin_b5',         'Vitamin B5 (Pantothenic)',    'nutritional',      'nmol/L',  60),
    ('vitamin_b6',         'Vitamin B6',                 'nutritional',       'nmol/L',  61),
    ('folate',             'Folate',                     'nutritional',       'µg/L',    62),
    ('vitamin_a',          'Vitamin A (Retinol)',         'nutritional',      'µmol/L',  63),
    ('vitamin_e',          'Vitamin E (Alpha-Toc.)',      'nutritional',      'µmol/L',  64),
    -- Electrolytes / Minerals
    ('sodium',             'Sodium',                     'nutritional',       'mmol/L',  65),
    ('zinc',               'Zinc',                       'nutritional',       'µmol/L',  66),
    ('selenium',           'Selenium',                   'nutritional',       'µg/L',    67),
    ('homocysteine',       'Homocysteine',               'nutritional',       'µmol/L',  68),
    -- Omega-3
    ('epa',                'EPA',                        'nutritional',       'g/L',     69),
    ('dha',                'DHA',                        'nutritional',       'g/L',     70),
    ('omega3_index',       'Omega-3 Index',              'nutritional',       '%',       71),
    -- Full Blood Count
    ('wbc',                'WBC (Leukocytes)',            'immune',           'Gpt/L',   72),
    ('rbc',                'RBC (Erythrocytes)',          'immune',           'Tpt/L',   73),
    ('platelets',          'Platelets (Thrombocytes)',    'immune',           'Gpt/L',   74),
    ('neutrophils_pct',    'Neutrophils %',              'immune',            '%',       75),
    ('neutrophils_abs',    'Neutrophils (Abs)',           'immune',           'Gpt/L',   76),
    ('lymphocytes_pct',    'Lymphocytes %',              'immune',            '%',       77),
    ('lymphocytes_abs',    'Lymphocytes (Abs)',           'immune',           'Gpt/L',   78),
    ('monocytes_pct',      'Monocytes %',                'immune',            '%',       79),
    ('monocytes_abs',      'Monocytes (Abs)',             'immune',           'Gpt/L',   80),
    ('eosinophils_pct',    'Eosinophils %',              'immune',            '%',       81),
    ('eosinophils_abs',    'Eosinophils (Abs)',           'immune',           'Gpt/L',   82),
    ('basophils_pct',      'Basophils %',                'immune',            '%',       83),
    ('basophils_abs',      'Basophils (Abs)',             'immune',           'Gpt/L',   84)
) AS m(marker_slug, marker_name, zone_slug, unit_canonical, display_order)
JOIN zones z ON z.zone_slug = m.zone_slug
ON CONFLICT (marker_slug) DO NOTHING;

-- ============================================================
-- 3. Add tyg_index to calculated_markers (8th calculated marker)
-- ============================================================
INSERT INTO calculated_markers (
    id, marker_slug, marker_name, zone_id,
    formula_description, base_markers_required,
    source_type, free_tier, protocol_aware, display_order,
    default_thresholds, protocol_overrides
)
SELECT
    gen_random_uuid(),
    'tyg_index', 'TyG Index', z.id,
    'ln(Triglycerides mg/dL × Glucose mg/dL ÷ 2)  [convert mmol/L: TG×88.57, Glu×18.018]',
    ARRAY['triglycerides', 'glucose'],
    'hybrid', true, false, 8,
    '{"orange_min": 0.0, "green_min": 0.0, "green_max": 8.5, "orange_max": 9.0}'::jsonb,
    '{}'::jsonb
FROM zones z WHERE z.zone_slug = 'energy_metabolic'
ON CONFLICT (marker_slug) DO NOTHING;

-- ============================================================
-- 4. Update zone display_orders
--    nutritional=6, hormonal=7, detoxification=8
-- ============================================================
UPDATE zones SET display_order = 6 WHERE zone_slug = 'nutritional';
UPDATE zones SET display_order = 7 WHERE zone_slug = 'hormonal';
UPDATE zones SET display_order = 8 WHERE zone_slug = 'detoxification';

-- ============================================================
-- 5. Create zone_markers join table (many-to-many, supports both
--    markers and calculated_markers via slug + type)
-- ============================================================
CREATE TABLE IF NOT EXISTS zone_markers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_slug     TEXT NOT NULL REFERENCES zones(zone_slug),
    marker_slug   TEXT NOT NULL,
    marker_type   TEXT NOT NULL DEFAULT 'standard', -- 'standard' | 'calculated'
    display_order INT  NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(zone_slug, marker_slug)
);

CREATE INDEX IF NOT EXISTS idx_zone_markers_zone ON zone_markers(zone_slug);
CREATE INDEX IF NOT EXISTS idx_zone_markers_marker ON zone_markers(marker_slug);

-- ============================================================
-- 6. Populate zone_markers — TRUNCATE + re-INSERT for idempotency
-- ============================================================
TRUNCATE TABLE zone_markers;

INSERT INTO zone_markers (zone_slug, marker_slug, marker_type, display_order) VALUES

-- ENERGY & METABOLIC
('energy_metabolic', 'glucose',          'standard',    1),
('energy_metabolic', 'insulin',          'standard',    2),
('energy_metabolic', 'hba1c',            'standard',    3),
('energy_metabolic', 'ketones',          'standard',    4),
('energy_metabolic', 'tsh',              'standard',    5),
('energy_metabolic', 'ft4',              'standard',    6),
('energy_metabolic', 'ft3',              'standard',    7),
('energy_metabolic', 'dheas',            'standard',    8),
('energy_metabolic', 'weight',           'standard',    9),
('energy_metabolic', 'gki',              'calculated',  10),
('energy_metabolic', 'dr_boz_ratio',     'calculated',  11),
('energy_metabolic', 'homa_ir',          'calculated',  12),
('energy_metabolic', 'tyg_index',        'calculated',  13),

-- STRUCTURAL
('structural', 'albumin',         'standard',    1),
('structural', 'total_protein',   'standard',    2),
('structural', 'calcium',         'standard',    3),
('structural', 'magnesium',       'standard',    4),
('structural', 'potassium',       'standard',    5),
('structural', 'creatinine',      'standard',    6),
('structural', 'vitamin_d',       'standard',    7),
('structural', 'iron',            'standard',    8),
('structural', 'phosphate',       'standard',    9),
('structural', 'whtr',            'calculated',  10),
('structural', 'bmi',             'calculated',  11),

-- CARDIOVASCULAR
('cardiovascular', 'bp_systolic',       'standard',    1),
('cardiovascular', 'bp_diastolic',      'standard',    2),
('cardiovascular', 'heart_rate',        'standard',    3),
('cardiovascular', 'total_cholesterol', 'standard',    4),
('cardiovascular', 'ldl_c',            'standard',    5),
('cardiovascular', 'hdl_c',            'standard',    6),
('cardiovascular', 'triglycerides',    'standard',    7),
('cardiovascular', 'apob',             'standard',    8),
('cardiovascular', 'lpa',              'standard',    9),
('cardiovascular', 'hs_crp',           'standard',    10),
('cardiovascular', 'tg_hdl_ratio',     'calculated',  11),

-- COGNITIVE
('cognitive', 'vitamin_b12',   'standard',    1),
('cognitive', 'folate',        'standard',    2),
('cognitive', 'vitamin_b6',    'standard',    3),
('cognitive', 'magnesium',     'standard',    4),
('cognitive', 'testosterone',  'standard',    5),
('cognitive', 'estradiol',     'standard',    6),
('cognitive', 'ft3',           'standard',    7),
('cognitive', 'creatinine',    'standard',    8),

-- IMMUNE
('immune', 'wbc',              'standard',    1),
('immune', 'rbc',              'standard',    2),
('immune', 'hemoglobin',       'standard',    3),
('immune', 'hematocrit',       'standard',    4),
('immune', 'platelets',        'standard',    5),
('immune', 'neutrophils_pct',  'standard',    6),
('immune', 'neutrophils_abs',  'standard',    7),
('immune', 'lymphocytes_pct',  'standard',    8),
('immune', 'lymphocytes_abs',  'standard',    9),
('immune', 'monocytes_pct',    'standard',    10),
('immune', 'monocytes_abs',    'standard',    11),
('immune', 'eosinophils_pct',  'standard',    12),
('immune', 'eosinophils_abs',  'standard',    13),
('immune', 'basophils_pct',    'standard',    14),
('immune', 'basophils_abs',    'standard',    15),
('immune', 'hs_crp',           'standard',    16),
('immune', 'vitamin_d',        'standard',    17),
('immune', 'selenium',         'standard',    18),
('immune', 'zinc',             'standard',    19),
('immune', 'hct_hb_ratio',     'calculated',  20),

-- NUTRITIONAL (display_order = 6)
('nutritional', 'vitamin_a',        'standard',    1),
('nutritional', 'vitamin_d',        'standard',    2),
('nutritional', 'vitamin_e',        'standard',    3),
('nutritional', 'vitamin_b1',       'standard',    4),
('nutritional', 'vitamin_b2',       'standard',    5),
('nutritional', 'vitamin_b3',       'standard',    6),
('nutritional', 'vitamin_b5',       'standard',    7),
('nutritional', 'vitamin_b6',       'standard',    8),
('nutritional', 'vitamin_b12',      'standard',    9),
('nutritional', 'folate',           'standard',    10),
('nutritional', 'calcium',          'standard',    11),
('nutritional', 'magnesium',        'standard',    12),
('nutritional', 'potassium',        'standard',    13),
('nutritional', 'sodium',           'standard',    14),
('nutritional', 'iron',             'standard',    15),
('nutritional', 'selenium',         'standard',    16),
('nutritional', 'zinc',             'standard',    17),
('nutritional', 'epa',              'standard',    18),
('nutritional', 'dha',              'standard',    19),
('nutritional', 'omega3_index',     'standard',    20),
('nutritional', 'homocysteine',     'standard',    21),

-- HORMONAL (display_order = 7)
('hormonal', 'testosterone',        'standard',    1),
('hormonal', 'free_testosterone',   'standard',    2),
('hormonal', 'free_androgen_index', 'standard',    3),
('hormonal', 'shbg',                'standard',    4),
('hormonal', 'estradiol',           'standard',    5),
('hormonal', 'progesterone',        'standard',    6),
('hormonal', 'prolactin',           'standard',    7),
('hormonal', 'fsh',                 'standard',    8),
('hormonal', 'lh',                  'standard',    9),
('hormonal', 'dheas',               'standard',    10),

-- DETOXIFICATION (display_order = 8)
('detoxification', 'alt',              'standard',    1),
('detoxification', 'ast',              'standard',    2),
('detoxification', 'ggt',              'standard',    3),
('detoxification', 'alp',              'standard',    4),
('detoxification', 'ldh',              'standard',    5),
('detoxification', 'bilirubin_total',  'standard',    6),
('detoxification', 'bilirubin_direct', 'standard',    7),
('detoxification', 'creatinine',       'standard',    8),
('detoxification', 'egfr',             'standard',    9),
('detoxification', 'cystatin_c',       'standard',    10),
('detoxification', 'uric_acid',        'standard',    11),
('detoxification', 'albumin',          'standard',    12),
('detoxification', 'total_protein',    'standard',    13),
('detoxification', 'magnesium',        'standard',    14);
