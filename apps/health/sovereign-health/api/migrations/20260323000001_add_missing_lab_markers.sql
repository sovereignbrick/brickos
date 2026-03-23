-- Migration: Add 5 missing lab markers discovered from production import testing.
-- Each marker includes LOINC code per design doc 011.
-- Reference: https://loinc.org/ -- copyright Regenstrief Institute, Inc.

-- ============================================================
-- 1. Insert new markers
-- ============================================================
INSERT INTO markers (id, marker_slug, marker_name, zone_id, unit_canonical, source_type, display_order,
                     loinc_code, loinc_system, loinc_class)
SELECT gen_random_uuid(), m.marker_slug, m.marker_name, z.id, m.unit_canonical, 'lab', m.display_order,
       m.loinc_code, m.loinc_system, m.loinc_class
FROM (VALUES
    ('amylase',  'Amylase (Pancreatic)', 'detoxification', 'U/L',   85, '1805-1',  'Serum', 'CHEM'),
    ('lipase',   'Lipase',               'detoxification', 'U/L',   86, '3040-3',  'Serum', 'CHEM'),
    ('bun',      'Urea (BUN)',           'detoxification', 'mmol/L', 87, '3094-0',  'Serum', 'CHEM'),
    ('igg',      'IgG',                  'immune',         'g/L',   88, '2465-3',  'Serum', 'CHEM'),
    ('vldl_c',   'VLDL Cholesterol',     'cardiovascular', 'mmol/L', 89, '13458-5', 'Serum', 'CHEM')
) AS m(marker_slug, marker_name, zone_slug, unit_canonical, display_order, loinc_code, loinc_system, loinc_class)
JOIN zones z ON z.zone_slug = m.zone_slug
ON CONFLICT (marker_slug) DO NOTHING;

-- ============================================================
-- 2. Add zone_markers entries
-- ============================================================
INSERT INTO zone_markers (zone_slug, marker_slug, marker_type, display_order) VALUES
('detoxification', 'amylase',  'standard', 15),
('detoxification', 'lipase',   'standard', 16),
('detoxification', 'bun',      'standard', 17),
('immune',         'igg',      'standard', 21),
('cardiovascular', 'vldl_c',   'standard', 12)
ON CONFLICT (zone_slug, marker_slug) DO NOTHING;

-- ============================================================
-- 3. Add LOINC code for transferrin_sat (was missing in migration 093)
-- ============================================================
UPDATE markers SET loinc_code = '2502-3', loinc_system = 'Serum', loinc_class = 'CHEM'
WHERE marker_slug = 'transferrin_sat' AND loinc_code IS NULL;

-- ============================================================
-- 4. Add LOINC codes for new nutritional markers missing from 093
-- ============================================================
UPDATE markers SET loinc_code = v.code, loinc_system = v.system, loinc_class = v.class
FROM (VALUES
    ('dha',          '35174-2', 'Serum', 'CHEM'),
    ('epa',          '35173-4', 'Serum', 'CHEM'),
    ('omega3_index', '88998-0', 'Serum', 'CHEM'),
    ('vitamin_b2',   '2924-9',  'Serum', 'CHEM'),
    ('vitamin_b6',   '30552-4', 'Serum', 'CHEM')
) AS v(slug, code, system, class)
WHERE markers.marker_slug = v.slug AND markers.loinc_code IS NULL;
