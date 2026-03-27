-- Fill reference ranges for 10 markers that had no rows at all.
-- Evidence-based standard adult ranges.

-- MCV (Mean Corpuscular Volume) -- red blood cell size
-- Normal: 80-100 fL; <80 microcytic (iron deficiency), >100 macrocytic (B12/folate deficiency)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', 75, 80, 100, 105 FROM markers WHERE marker_slug = 'mcv'
ON CONFLICT DO NOTHING;

-- MCH (Mean Corpuscular Hemoglobin) -- hemoglobin per red blood cell
-- Normal: 27-33 pg
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', 25, 27, 33, 36 FROM markers WHERE marker_slug = 'mch'
ON CONFLICT DO NOTHING;

-- MCHC (Mean Corpuscular Hemoglobin Concentration) -- hemoglobin concentration in RBCs
-- Normal: 32-36 g/dL
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', 30, 32, 36, 38 FROM markers WHERE marker_slug = 'mchc'
ON CONFLICT DO NOTHING;

-- RDW (Red Cell Distribution Width) -- variation in red blood cell size
-- Normal: 11.5-14.5%; higher indicates mixed cell populations (iron + B12 deficiency)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', NULL, 11.5, 14.5, 16.0 FROM markers WHERE marker_slug = 'rdw'
ON CONFLICT DO NOTHING;

-- VLDL Cholesterol -- very low density lipoprotein
-- Normal: 0.1-0.8 mmol/L (calculated from TG/2.2 in mmol/L)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', NULL, 0.1, 0.8, 1.2 FROM markers WHERE marker_slug = 'vldl_c'
ON CONFLICT DO NOTHING;

-- BUN/Urea -- kidney function marker
-- Normal: 2.5-7.1 mmol/L
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', 1.8, 2.5, 7.1, 10.0 FROM markers WHERE marker_slug = 'bun'
ON CONFLICT DO NOTHING;

-- Amylase (Pancreatic) -- pancreatic enzyme
-- Normal: 25-125 U/L; elevated in pancreatitis
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', NULL, 25, 125, 200 FROM markers WHERE marker_slug = 'amylase'
ON CONFLICT DO NOTHING;

-- Lipase -- pancreatic enzyme (more specific than amylase)
-- Normal: 10-73 U/L; >3x upper limit strongly suggests acute pancreatitis
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', NULL, 10, 73, 150 FROM markers WHERE marker_slug = 'lipase'
ON CONFLICT DO NOTHING;

-- IgG (Immunoglobulin G) -- primary antibody class
-- Normal: 7.0-16.0 g/L
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', 5.0, 7.0, 16.0, 20.0 FROM markers WHERE marker_slug = 'igg'
ON CONFLICT DO NOTHING;

-- Total Fatty Acids -- broad lipid marker
-- No universally standardized range; using functional medicine reference: 250-500 mg/L
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard', 150, 250, 500, 700 FROM markers WHERE marker_slug = 'total_fatty_acids'
ON CONFLICT DO NOTHING;

-- Fix emdashes in calculated marker names
UPDATE calculated_markers SET marker_name = 'BMI - Body Mass Index' WHERE marker_slug = 'bmi';
UPDATE calculated_markers SET marker_name = 'GKI - Glucose-Ketone Index' WHERE marker_slug = 'gki';
UPDATE calculated_markers SET marker_name = 'WHtR - Waist-to-Height Ratio' WHERE marker_slug = 'whtr';

-- Fix emdashes in marker_translations and marker_content
UPDATE marker_translations SET name = REPLACE(name, '—', '-') WHERE name LIKE '%—%';
UPDATE marker_translations SET tooltip = REPLACE(tooltip, '—', '-') WHERE tooltip LIKE '%—%';
UPDATE marker_content SET title = REPLACE(title, '—', '-') WHERE title LIKE '%—%';
UPDATE marker_content SET body_text = REPLACE(body_text, '—', '-') WHERE body_text LIKE '%—%';
