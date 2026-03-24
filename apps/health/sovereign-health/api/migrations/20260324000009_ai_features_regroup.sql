-- Sprint 013: Regroup AI features to match Dr. Alex landing page
--
-- App categories: Your Health, Trends & Patterns, Lab Results, Nutrition & Lifestyle, Smart Import
-- Remove old granular chat features, replace with category-based features
-- Smart Import: all 3 sub-features visible separately, all tiers ✓

-- =========================================================================
-- 1. Rename + regroup existing AI chat features to match app categories
-- =========================================================================

-- "Ask Dr. Alex" → "Your Health"
-- Code: agent type 'general', quota: chat_general_monthly
UPDATE product_features SET
    name_en = 'Your Health',
    name_de = 'Deine Gesundheit',
    description_en = 'Ask Dr. Alex about your health status, red flags, and what to focus on improving next.',
    description_de = 'Frage Dr. Alex nach deinem Gesundheitsstatus, Warnzeichen und was du als Nächstes verbessern solltest.',
    tooltip_en = 'AI health assistant. Ask about your current health status, red flags in recent data, and personalized improvement priorities. Code: agent_type=general, quota=chat_general_monthly',
    tooltip_de = 'KI-Gesundheitsassistent. Frage nach deinem aktuellen Gesundheitsstatus, Warnzeichen in aktuellen Daten und personalisierten Verbesserungsprioritäten.',
    sort_order = 10
WHERE feature_key = 'chat_general';

-- "Analyze My Trends" → "Trends & Patterns"
-- Code: agent type 'trends', quota: chat_trends_monthly
UPDATE product_features SET
    name_en = 'Trends & Patterns',
    name_de = 'Trends & Muster',
    description_en = 'Analyze how your biomarkers change over time. Spot patterns, correlations, and inflection points.',
    description_de = 'Analysiere wie sich deine Biomarker über die Zeit verändern. Erkenne Muster, Korrelationen und Wendepunkte.',
    tooltip_en = 'AI trend analysis. Tracks glucose trends, lipid panel changes, weight patterns and their influencing factors. Code: agent_type=trends, quota=chat_trends_monthly',
    tooltip_de = 'KI-Trendanalyse. Verfolgt Glukose-Trends, Lipidpanel-Veränderungen, Gewichtsmuster und deren Einflussfaktoren.',
    sort_order = 11
WHERE feature_key = 'chat_trends';

-- "Explain My Lab Results" → "Lab Results"
-- Code: agent type 'labs', quota: chat_labs_monthly
UPDATE product_features SET
    name_en = 'Lab Results',
    name_de = 'Laborergebnisse',
    description_en = 'Get plain-language explanations of your lab results. Understand out-of-range values and how to improve them.',
    description_de = 'Erhalte verständliche Erklärungen deiner Laborergebnisse. Verstehe Werte außerhalb des Referenzbereichs und wie du sie verbessern kannst.',
    tooltip_en = 'AI lab interpreter. Explains lab results in simple terms, identifies out-of-range markers, and suggests improvement strategies. Code: agent_type=labs, quota=chat_labs_monthly',
    tooltip_de = 'KI-Laborinterpretation. Erklärt Laborergebnisse verständlich, identifiziert Marker außerhalb des Bereichs und schlägt Verbesserungsstrategien vor.',
    sort_order = 12
WHERE feature_key = 'chat_labs';

-- "Diet & Nutrition" → "Nutrition & Lifestyle"
-- Code: agent types 'diet' + 'supplements' + 'protocols', quota: chat_diet_monthly + chat_supplements_monthly
UPDATE product_features SET
    name_en = 'Nutrition & Lifestyle',
    name_de = 'Ernährung & Lebensstil',
    description_en = 'Personalized nutrition advice, supplement review, and protocol comparison — all based on your biomarker data.',
    description_de = 'Personalisierte Ernährungsberatung, Nahrungsergänzungsprüfung und Protokollvergleich — alles basierend auf deinen Biomarker-Daten.',
    tooltip_en = 'AI nutrition and lifestyle advisor. Includes food recommendations, supplement stack evaluation, and diet/fasting protocol comparison. Code: agent_type=diet|supplements|protocols, quota=chat_diet_monthly+chat_supplements_monthly',
    tooltip_de = 'KI-Ernährungs- und Lebensstilberater. Beinhaltet Essensempfehlungen, Nahrungsergänzungsbewertung und Diät-/Fastenprotokollvergleich.',
    sort_order = 13
WHERE feature_key = 'chat_diet';

-- Remove separate "Supplement Review" (merged into Nutrition & Lifestyle)
DELETE FROM tier_features WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_supplements');
DELETE FROM product_features WHERE feature_key = 'chat_supplements';

-- "Check Influence Factors" stays as-is but update tooltip
UPDATE product_features SET
    tooltip_en = 'Shows how your medications and supplements correlate with your marker changes. Code: feature=supplement_marker_impact',
    tooltip_de = 'Zeigt wie deine Medikamente und Nahrungsergänzungsmittel mit deinen Markerveränderungen korrelieren.',
    sort_order = 14
WHERE feature_key = 'supplement_marker_impact';

-- =========================================================================
-- 2. Smart Import: all 3 sub-features ✓ for all tiers
-- =========================================================================

-- Update parent Smart Import sort order
UPDATE product_features SET sort_order = 20 WHERE feature_key = 'smart_import';

-- Lab Result Import: ✓ for all tiers (3/month for Glimpse/Focus/Insight, unlimited Clarity+)
-- Already set in migration 005, just ensure sort order
UPDATE product_features SET
    name_en = 'Lab Result Import',
    name_de = 'Laborergebnis-Import',
    description_en = 'Import lab results from PDF or photo using AI extraction',
    description_de = 'Laborergebnisse per KI aus PDF oder Foto importieren',
    tooltip_en = 'Upload a lab report PDF or photo. AI extracts markers, values, and units automatically. Review and confirm before saving. Code: import_type=lab_import, quota=chat_lab_import_monthly',
    tooltip_de = 'Lade ein Laborergebnis-PDF oder Foto hoch. KI extrahiert Marker, Werte und Einheiten automatisch. Prüfen und bestätigen vor dem Speichern.',
    sort_order = 21
WHERE feature_key = 'lab_import';

-- Medication/Supplement Import
UPDATE product_features SET
    name_en = 'Medication/Supplement Import',
    name_de = 'Medikamenten-/Nahrungsergänzungs-Import',
    description_en = 'Import medication and supplement lists from photos using AI extraction',
    description_de = 'Medikamenten- und Nahrungsergänzungslisten per KI aus Fotos importieren',
    tooltip_en = 'Take a photo of your medication box or supplement label. AI extracts name, dosage, and ingredients. Code: import_type=med_import, quota=chat_med_import_monthly',
    tooltip_de = 'Fotografiere deine Medikamentenpackung oder Nahrungsergänzungs-Etikett. KI extrahiert Name, Dosierung und Inhaltsstoffe.',
    sort_order = 22
WHERE feature_key = 'influence_factor_import';

-- Measurement Table Import
UPDATE product_features SET
    name_en = 'Measurement Table Import',
    name_de = 'Messtabellen-Import',
    description_en = 'Import measurements from CSV, ODS, or Excel spreadsheets',
    description_de = 'Messungen aus CSV-, ODS- oder Excel-Tabellen importieren',
    tooltip_en = 'Upload a spreadsheet with measurement data. AI maps columns to markers. Supports CSV, XLSX, XLS, ODS. Code: import_type=measurement_import',
    tooltip_de = 'Lade eine Tabelle mit Messdaten hoch. KI ordnet Spalten den Markern zu. Unterstützt CSV, XLSX, XLS, ODS.',
    sort_order = 23
WHERE feature_key = 'measurement_table_import';

-- =========================================================================
-- 3. AI Dashboard Insights — update tooltip with code reference
-- =========================================================================
UPDATE product_features SET
    tooltip_en = 'Automated AI-generated trend observations and health alerts on your dashboard. Code: feature=ai_dashboard_insights',
    tooltip_de = 'Automatisch KI-generierte Trendbeobachtungen und Gesundheitswarnungen auf deinem Dashboard.',
    sort_order = 15
WHERE feature_key = 'ai_dashboard_insights';

-- Benchmark
UPDATE product_features SET
    tooltip_en = 'Compare your biomarker values anonymously against similar users by age, gender, and protocol. Code: feature=cohort_comparison',
    tooltip_de = 'Vergleiche deine Biomarker-Werte anonym mit ähnlichen Nutzern nach Alter, Geschlecht und Protokoll.',
    sort_order = 16
WHERE feature_key = 'cohort_comparison';

-- Protocol Comparison (the "Soon" feature, not the removed chat agent)
UPDATE product_features SET
    tooltip_en = 'Visual comparison of your markers across different diet and fasting protocols. See which protocol gives you the best results. Code: feature=protocol_comparison',
    tooltip_de = 'Visueller Vergleich deiner Marker über verschiedene Diät- und Fastenprotokolle. Sieh welches Protokoll dir die besten Ergebnisse bringt.',
    sort_order = 17
WHERE feature_key = 'protocol_comparison';
