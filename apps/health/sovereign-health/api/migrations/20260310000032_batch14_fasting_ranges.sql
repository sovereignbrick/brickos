-- Batch 14: Fasting protocol ranges for all relevant markers
-- Adds fasting-specific reference ranges (protocol_context = 'fasting')
-- and fasting explanation content for each affected marker.

-- ============================================================
-- 1. FASTING REFERENCE RANGES FOR STANDARD MARKERS
-- ============================================================
-- These use the reference_ranges table with protocol_context = 'fasting'.
-- Existing glucose, ketones, uric_acid fasting ranges already exist from migration 016.
-- We update those if needed and add new ones for other markers.

-- INSULIN: drops substantially during fasting
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 0.5, 1.5, 5.0, 8.0
FROM markers m WHERE m.marker_slug = 'insulin'
ON CONFLICT DO NOTHING;

-- TRIGLYCERIDES: drop during fasting as body burns stored fat
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 0.1, 0.3, 1.2, 1.8
FROM markers m WHERE m.marker_slug = 'triglycerides'
ON CONFLICT DO NOTHING;

-- TOTAL CHOLESTEROL: can rise during fasting due to fat mobilization
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 3.5, 4.5, 7.5, 9.0
FROM markers m WHERE m.marker_slug = 'total_cholesterol'
ON CONFLICT DO NOTHING;

-- LDL-C: often rises during fasting and low-carb states
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 1.5, 2.5, 4.5, 5.5
FROM markers m WHERE m.marker_slug = 'ldl_c'
ON CONFLICT DO NOTHING;

-- HDL-C: may increase slightly during fasting
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 0.9, 1.1, 2.2, 3.0
FROM markers m WHERE m.marker_slug = 'hdl_c'
ON CONFLICT DO NOTHING;

-- IRON: can be higher in fasted morning samples
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 8.0, 12.0, 35.0, 45.0
FROM markers m WHERE m.marker_slug = 'iron'
ON CONFLICT DO NOTHING;

-- GGT: may drop slightly with fasting
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 5.0, 10.0, 45.0, 60.0
FROM markers m WHERE m.marker_slug = 'ggt'
ON CONFLICT DO NOTHING;

-- ALT: can decrease during fasting
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 5.0, 10.0, 35.0, 50.0
FROM markers m WHERE m.marker_slug = 'alt'
ON CONFLICT DO NOTHING;

-- CREATININE: may rise slightly due to dehydration
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 50.0, 65.0, 120.0, 140.0
FROM markers m WHERE m.marker_slug = 'creatinine'
ON CONFLICT DO NOTHING;

-- SODIUM: can drop during extended fasting
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 132.0, 134.0, 143.0, 146.0
FROM markers m WHERE m.marker_slug = 'sodium'
ON CONFLICT DO NOTHING;

-- POTASSIUM: can decrease during fasting
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 3.0, 3.3, 4.8, 5.3
FROM markers m WHERE m.marker_slug = 'potassium'
ON CONFLICT DO NOTHING;

-- MAGNESIUM: may decrease as excretion increases
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 0.55, 0.65, 0.95, 1.1
FROM markers m WHERE m.marker_slug = 'magnesium'
ON CONFLICT DO NOTHING;

-- HOMOCYSTEINE: can rise modestly during fasting
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'fasting', 4.0, 6.0, 16.0, 20.0
FROM markers m WHERE m.marker_slug = 'homocysteine'
ON CONFLICT DO NOTHING;


-- ============================================================
-- 2. FASTING OVERRIDES FOR CALCULATED MARKERS (protocol_overrides JSONB)
-- ============================================================

-- GKI: drops significantly during fasting
UPDATE calculated_markers
SET protocol_overrides = protocol_overrides || '{"fasting": {"orange_min": 0.0, "green_min": 0.5, "green_max": 3.0, "orange_max": 6.0}}'::jsonb
WHERE marker_slug = 'gki'
  AND NOT (protocol_overrides ? 'fasting');

-- HOMA-IR: drops significantly during fasting
UPDATE calculated_markers
SET protocol_overrides = protocol_overrides || '{"fasting": {"orange_min": 0.0, "green_min": 0.0, "green_max": 1.0, "orange_max": 1.5}}'::jsonb
WHERE marker_slug = 'homa_ir'
  AND NOT (protocol_overrides ? 'fasting');

-- TyG Index: drops during fasting
UPDATE calculated_markers
SET protocol_overrides = protocol_overrides || '{"fasting": {"orange_min": 0.0, "green_min": 0.0, "green_max": 8.0, "orange_max": 8.5}}'::jsonb
WHERE marker_slug = 'tyg_index'
  AND NOT (protocol_overrides ? 'fasting');

-- TG/HDL Ratio: improves during fasting
UPDATE calculated_markers
SET protocol_overrides = protocol_overrides || '{"fasting": {"orange_min": 0.0, "green_min": 0.0, "green_max": 1.0, "orange_max": 2.0}}'::jsonb
WHERE marker_slug = 'tg_hdl_ratio'
  AND NOT (protocol_overrides ? 'fasting');

-- Dr. Boz Ratio: drops significantly during fasting
UPDATE calculated_markers
SET protocol_overrides = protocol_overrides || '{"fasting": {"orange_min": 0.0, "green_min": 0.0, "green_max": 80.0, "orange_max": 200.0}}'::jsonb
WHERE marker_slug = 'dr_boz_ratio'
  AND NOT (protocol_overrides ? 'fasting');


-- ============================================================
-- 3. FASTING EXPLANATION CONTENT
-- ============================================================
-- content_type = 'fasting_explanation' for marker_content table
-- Note: marker_content has UNIQUE(marker_id, content_type, language)

-- Strongly affected markers
INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('glucose', 'fasting_explanation', 'Fasting Protocol Range',
'Glucose drops as glycogen depletes during fasting. Extended fasting can push blood glucose below normal eating ranges. A fasting glucose between 3.5 and 5.2 mmol/L is typical and healthy. If you see readings below 3.5 mmol/L during a prolonged fast, this is usually normal but worth monitoring.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ketones', 'fasting_explanation', 'Fasting Protocol Range',
'Ketone production ramps up significantly during fasting as your body switches from glucose to fat burning. Levels of 0.5 to 3.0 mmol/L are normal during a fast. Higher levels (up to 5.0 mmol/L) can occur during extended fasts and are generally safe in non-diabetic individuals.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('insulin', 'fasting_explanation', 'Fasting Protocol Range',
'Insulin drops substantially during fasting because there is no food-driven secretion. This is a sign of healthy metabolic flexibility. Fasting insulin below 5.0 mU/L indicates good insulin sensitivity, and levels as low as 1.5 mU/L are normal during extended fasts.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('uric_acid', 'fasting_explanation', 'Fasting Protocol Range',
'Uric acid rises during fasting because ketones compete with urate for kidney excretion. This is temporary and not harmful. The increase typically reverses when you resume eating. Levels up to 500 umol/L during fasting are expected and not a cause for concern.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('triglycerides', 'fasting_explanation', 'Fasting Protocol Range',
'Triglycerides drop during fasting as your body burns stored fat for energy instead of dietary fat. Lower triglycerides during a fast (0.3 to 1.2 mmol/L) reflect active fat metabolism and are a positive sign of metabolic health.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('homa_ir', 'fasting_explanation', 'Fasting Protocol Range',
'HOMA-IR drops significantly during fasting due to lower insulin and glucose levels. A fasting HOMA-IR below 1.0 indicates excellent insulin sensitivity. This is one of the clearest signals that fasting is improving your metabolic health.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

-- Moderately affected markers
INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('total_cholesterol', 'fasting_explanation', 'Fasting Protocol Range',
'Total cholesterol can rise during fasting due to increased fat mobilization and LDL particle remodeling. Your body is actively moving fat from storage into the bloodstream for fuel. An increase of 0.5 to 1.0 mmol/L above your standard range is expected and not harmful.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ldl_c', 'fasting_explanation', 'Fasting Protocol Range',
'LDL cholesterol often rises during fasting and low-carb states as the body uses more fat for fuel. This reflects increased LDL particle turnover, not necessarily increased cardiovascular risk. The change is typically transient and context-dependent.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('hdl_c', 'fasting_explanation', 'Fasting Protocol Range',
'HDL cholesterol may increase slightly during fasting as reverse cholesterol transport becomes more active. Higher HDL during a fast is generally a positive sign of your body efficiently managing lipid metabolism.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('iron', 'fasting_explanation', 'Fasting Protocol Range',
'Serum iron follows a natural daily rhythm and can be higher in fasted morning samples. The fasting range accounts for this. Iron levels measured while fasting tend to be slightly higher than post-meal readings because dietary iron absorption is not competing for transport.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ggt', 'fasting_explanation', 'Fasting Protocol Range',
'GGT (gamma-glutamyl transferase) may drop slightly with fasting as the liver metabolic load decreases. This enzyme is a marker of liver stress, so lower values during fasting suggest reduced hepatic workload.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('alt', 'fasting_explanation', 'Fasting Protocol Range',
'ALT (alanine aminotransferase) can decrease during fasting as hepatic inflammation reduces. A lower ALT during fasting indicates your liver is experiencing less metabolic stress. This is one of the liver health benefits of periodic fasting.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('creatinine', 'fasting_explanation', 'Fasting Protocol Range',
'Creatinine may rise slightly during fasting due to mild dehydration and changes in muscle protein metabolism. A modest increase of 5 to 10 umol/L is expected. Make sure to stay hydrated during fasting to minimize this effect.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('sodium', 'fasting_explanation', 'Fasting Protocol Range',
'Sodium can drop during extended fasting if electrolytes are not supplemented. Your kidneys increase sodium excretion during fasting. Consider adding salt to water or using electrolyte supplements during fasts longer than 24 hours.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('potassium', 'fasting_explanation', 'Fasting Protocol Range',
'Potassium can decrease during fasting as your kidneys excrete more electrolytes. Supplementing potassium is important during extended fasts. Symptoms of low potassium include muscle cramps, fatigue, and heart palpitations.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('magnesium', 'fasting_explanation', 'Fasting Protocol Range',
'Magnesium may decrease during fasting as renal excretion increases. Since magnesium is critical for hundreds of enzyme reactions, supplementing during extended fasts is recommended. Low magnesium can cause muscle cramps, sleep issues, and irregular heartbeat.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('homocysteine', 'fasting_explanation', 'Fasting Protocol Range',
'Homocysteine can rise modestly during fasting due to changes in methionine metabolism. The body recycles homocysteine less efficiently when B vitamin intake pauses during a fast. A small increase (1 to 2 umol/L) is expected and temporary.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

-- Calculated marker fasting explanations
INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('gki', 'fasting_explanation', 'Fasting Protocol Range',
'GKI (Glucose-Ketone Index) drops significantly during fasting as glucose falls and ketones rise. A GKI below 3.0 indicates you are in nutritional ketosis. During extended fasts, GKI can drop below 1.0, indicating deep therapeutic ketosis. This is one of the best single markers for tracking fasting depth.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('tyg_index', 'fasting_explanation', 'Fasting Protocol Range',
'The TyG Index drops during fasting as both glucose and triglycerides decrease. This reflects improved insulin sensitivity during the fasted state. A lower TyG Index during fasting is a positive metabolic signal.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('tg_hdl_ratio', 'fasting_explanation', 'Fasting Protocol Range',
'The TG/HDL ratio improves during fasting as triglycerides drop faster than HDL cholesterol. This ratio is one of the best lipid markers for insulin resistance, and an improvement during fasting shows your body is efficiently burning stored fat.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('dr_boz_ratio', 'fasting_explanation', 'Fasting Protocol Range',
'The Dr. Boz Ratio (glucose in mg/dL divided by ketones in mmol/L) drops significantly during fasting as glucose falls and ketones rise. A ratio below 80 indicates nutritional ketosis, and below 40 indicates therapeutic levels. This is a popular way to track fasting progress.', 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;
