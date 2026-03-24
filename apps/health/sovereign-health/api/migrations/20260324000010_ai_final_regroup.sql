-- Sprint 013: Final AI feature regrouping
--
-- 1. Add "Dr. Alex Chat" as pool feature at top of AI section
-- 2. Move Smart Import from "reporting" to "ai" category
-- 3. Rename imports to "Smart Import: Lab Results" etc.
-- 4. Protocol Comparison: remove Core (set to X)

-- =========================================================================
-- 1. Add "Dr. Alex Chat" pool feature
-- =========================================================================
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('dr_alex_chat', 'Dr. Alex Chat', 'Dr. Alex Chat',
        'Your AI health assistant. Ask about your health, trends, lab results, nutrition, and lifestyle.',
        'Dein KI-Gesundheitsassistent. Frage nach deiner Gesundheit, Trends, Laborergebnissen, Ernährung und Lebensstil.',
        'Dr. Alex is your personal AI health assistant. Features: health overview and red flags, trend analysis across biomarkers, plain-language lab result explanations, personalized nutrition and supplement advice, protocol comparison. All conversations use your real biomarker data for personalized answers. Code: all agent_types, future pool=ai_credits_monthly',
        'Dr. Alex ist dein persönlicher KI-Gesundheitsassistent. Funktionen: Gesundheitsüberblick und Warnzeichen, Trendanalyse deiner Biomarker, verständliche Laborergebnis-Erklärungen, personalisierte Ernährungs- und Nahrungsergänzungsberatung, Protokollvergleich. Alle Gespräche nutzen deine echten Biomarker-Daten.',
        'ai', 1, 'active', 'bot')
ON CONFLICT (feature_key) DO UPDATE SET
    name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de,
    description_en = EXCLUDED.description_en, description_de = EXCLUDED.description_de,
    tooltip_en = EXCLUDED.tooltip_en, tooltip_de = EXCLUDED.tooltip_de,
    sort_order = EXCLUDED.sort_order;

-- Dr. Alex Chat tier limits (future pool values)
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
VALUES
    ('glimpse', (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat'), true, 5, '5/month', '5/Monat'),
    ('focus', (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat'), true, 10, '10/month', '10/Monat'),
    ('insight', (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat'), true, 20, '20/month', '20/Monat'),
    ('clarity', (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat'), true, 50, '50/month', '50/Monat'),
    ('horizon', (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat'), true, NULL, 'Unlimited', 'Unbegrenzt'),
    ('core', (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat'), true, NULL, 'Unlimited', 'Unbegrenzt')
ON CONFLICT (tier_key, feature_id) DO UPDATE SET
    included = EXCLUDED.included, limit_value = EXCLUDED.limit_value,
    limit_label_en = EXCLUDED.limit_label_en, limit_label_de = EXCLUDED.limit_label_de;

-- =========================================================================
-- 2. Move Smart Import + sub-features from "reporting" to "ai"
-- =========================================================================
UPDATE product_features SET
    category = 'ai',
    sort_order = 30,
    tooltip_en = 'AI-powered data import. Upload lab reports, medication photos, or spreadsheets — AI extracts and matches markers automatically. Code: import_type=lab_import|med_import|measurement_import',
    tooltip_de = 'KI-gestützter Datenimport. Lade Laborberichte, Medikamentenfotos oder Tabellen hoch — KI extrahiert und ordnet Marker automatisch zu.'
WHERE feature_key = 'smart_import';

-- =========================================================================
-- 3. Rename imports to "Smart Import: ..." and move to ai category
-- =========================================================================
UPDATE product_features SET
    name_en = 'Smart Import: Lab Results',
    name_de = 'Smart Import: Laborergebnisse',
    category = 'ai',
    sort_order = 31,
    tooltip_en = 'Upload a lab report PDF or photo. AI extracts markers, values, and units. Review and confirm before saving. Supports German and English lab formats. Code: import_type=lab_import, quota=chat_lab_import_monthly'
WHERE feature_key = 'lab_import';

UPDATE product_features SET
    name_en = 'Smart Import: Medication/Supplement',
    name_de = 'Smart Import: Medikament/Nahrungsergänzung',
    category = 'ai',
    sort_order = 32,
    tooltip_en = 'Take a photo of your medication box or supplement label. AI extracts name, dosage, ingredients, and role (active/auxiliary). Code: import_type=med_import, quota=chat_med_import_monthly'
WHERE feature_key = 'influence_factor_import';

UPDATE product_features SET
    name_en = 'Smart Import: Measurement Table',
    name_de = 'Smart Import: Messtabelle',
    category = 'ai',
    sort_order = 33,
    tooltip_en = 'Upload a spreadsheet (CSV, XLSX, ODS) with measurement data. AI maps columns to markers, detects units, handles duplicates. Code: import_type=measurement_import'
WHERE feature_key = 'measurement_table_import';

-- =========================================================================
-- 4. Protocol Comparison: remove Core (set to X)
-- =========================================================================
UPDATE tier_features SET included = false, limit_label_en = NULL, limit_label_de = NULL
WHERE tier_key = 'core'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'protocol_comparison');
