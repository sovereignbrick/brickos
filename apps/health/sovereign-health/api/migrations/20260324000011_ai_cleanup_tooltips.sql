-- Sprint 013: Final cleanup — remove Check Influence Factors, reorder, fix tooltips
--
-- 1. Remove "Check Influence Factors" (merged into Nutrition & Lifestyle)
-- 2. Reorder: Smart Import before Dashboard Insights/Benchmark/Protocol Comparison
-- 3. Clean all tooltips: user-friendly only, no code references, no truncation

-- =========================================================================
-- 1. Remove Check Influence Factors
-- =========================================================================
DELETE FROM tier_features WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'supplement_marker_impact');
DELETE FROM product_features WHERE feature_key = 'supplement_marker_impact';

-- =========================================================================
-- 2. Reorder: AI features in presentation order
-- =========================================================================

-- Dr. Alex Chat (pool) — first
UPDATE product_features SET sort_order = 1 WHERE feature_key = 'dr_alex_chat';

-- Your Health
UPDATE product_features SET sort_order = 2 WHERE feature_key = 'chat_general';

-- Trends & Patterns
UPDATE product_features SET sort_order = 3 WHERE feature_key = 'chat_trends';

-- Lab Results
UPDATE product_features SET sort_order = 4 WHERE feature_key = 'chat_labs';

-- Nutrition & Lifestyle
UPDATE product_features SET sort_order = 5 WHERE feature_key = 'chat_diet';

-- Smart Import (parent)
UPDATE product_features SET sort_order = 6 WHERE feature_key = 'smart_import';

-- Smart Import: Lab Results
UPDATE product_features SET sort_order = 7 WHERE feature_key = 'lab_import';

-- Smart Import: Medication/Supplement
UPDATE product_features SET sort_order = 8 WHERE feature_key = 'influence_factor_import';

-- Smart Import: Measurement Table
UPDATE product_features SET sort_order = 9 WHERE feature_key = 'measurement_table_import';

-- AI Dashboard Insights (Soon) — after imports
UPDATE product_features SET sort_order = 10 WHERE feature_key = 'ai_dashboard_insights';

-- Benchmark (Soon)
UPDATE product_features SET sort_order = 11 WHERE feature_key = 'cohort_comparison';

-- Protocol Comparison (Soon)
UPDATE product_features SET sort_order = 12 WHERE feature_key = 'protocol_comparison';

-- =========================================================================
-- 3. Clean tooltips — user-friendly, no code references
-- =========================================================================

UPDATE product_features SET
    tooltip_en = 'Your personal AI health assistant. Ask about your health status, biomarker trends, lab results, nutrition, supplements, and lifestyle protocols. All answers are personalized based on your actual data.',
    tooltip_de = 'Dein persönlicher KI-Gesundheitsassistent. Frage nach deinem Gesundheitsstatus, Biomarker-Trends, Laborergebnissen, Ernährung, Nahrungsergänzung und Lebensstilprotokollen. Alle Antworten basieren auf deinen echten Daten.'
WHERE feature_key = 'dr_alex_chat';

UPDATE product_features SET
    tooltip_en = 'Get an overview of your current health status. Ask about red flags in your recent data, or what you should focus on improving next.',
    tooltip_de = 'Erhalte einen Überblick über deinen aktuellen Gesundheitsstatus. Frage nach Warnzeichen in deinen aktuellen Daten oder was du als Nächstes verbessern solltest.'
WHERE feature_key = 'chat_general';

UPDATE product_features SET
    tooltip_en = 'Analyze how your biomarkers change over time. Spot patterns, correlations between markers, and identify what is influencing your trends.',
    tooltip_de = 'Analysiere wie sich deine Biomarker über die Zeit verändern. Erkenne Muster, Korrelationen zwischen Markern und identifiziere was deine Trends beeinflusst.'
WHERE feature_key = 'chat_trends';

UPDATE product_features SET
    tooltip_en = 'Get plain-language explanations of your lab results. Understand which markers are out of range, what they mean, and how you can improve them.',
    tooltip_de = 'Erhalte verständliche Erklärungen deiner Laborergebnisse. Verstehe welche Marker außerhalb des Bereichs sind, was sie bedeuten und wie du sie verbessern kannst.'
WHERE feature_key = 'chat_labs';

UPDATE product_features SET
    tooltip_en = 'Personalized nutrition advice, supplement review, and lifestyle protocol comparison. Ask what foods help your markers, whether your supplements are working, or how different diets affect your results.',
    tooltip_de = 'Personalisierte Ernährungsberatung, Nahrungsergänzungsprüfung und Lebensstilprotokoll-Vergleich. Frage welche Lebensmittel deinen Markern helfen, ob deine Nahrungsergänzung wirkt oder wie verschiedene Diäten deine Ergebnisse beeinflussen.'
WHERE feature_key = 'chat_diet';

UPDATE product_features SET
    tooltip_en = 'Upload lab reports, medication photos, or spreadsheets. AI extracts markers, values, and units automatically. Review and confirm before saving.',
    tooltip_de = 'Lade Laborberichte, Medikamentenfotos oder Tabellen hoch. KI extrahiert Marker, Werte und Einheiten automatisch. Prüfen und bestätigen vor dem Speichern.'
WHERE feature_key = 'smart_import';

UPDATE product_features SET
    tooltip_en = 'Upload a lab report as PDF or photo. AI recognizes markers, values, and units from German and English lab formats. Review the extracted data and confirm before saving to your profile.',
    tooltip_de = 'Lade einen Laborbericht als PDF oder Foto hoch. KI erkennt Marker, Werte und Einheiten aus deutschen und englischen Laborformaten. Prüfe die extrahierten Daten und bestätige vor dem Speichern.'
WHERE feature_key = 'lab_import';

UPDATE product_features SET
    tooltip_en = 'Take a photo of your medication box or supplement label. AI extracts the name, dosage, ingredients, and whether it is an active ingredient or auxiliary substance.',
    tooltip_de = 'Fotografiere deine Medikamentenpackung oder dein Nahrungsergänzungs-Etikett. KI extrahiert Name, Dosierung, Inhaltsstoffe und ob es ein Wirkstoff oder Hilfsstoff ist.'
WHERE feature_key = 'influence_factor_import';

UPDATE product_features SET
    tooltip_en = 'Upload a spreadsheet with your measurement data. Supports CSV, Excel, and ODS formats. AI maps your columns to the correct biomarkers and handles duplicate detection.',
    tooltip_de = 'Lade eine Tabelle mit deinen Messdaten hoch. Unterstützt CSV-, Excel- und ODS-Formate. KI ordnet deine Spalten den richtigen Biomarkern zu und erkennt Duplikate.'
WHERE feature_key = 'measurement_table_import';

UPDATE product_features SET
    tooltip_en = 'Automated AI-generated health insights displayed directly on your dashboard. Get notified about significant trends, unusual values, and suggested actions without opening Dr. Alex.',
    tooltip_de = 'Automatisch KI-generierte Gesundheitserkenntnisse direkt auf deinem Dashboard. Erhalte Benachrichtigungen über bedeutende Trends, ungewöhnliche Werte und vorgeschlagene Maßnahmen ohne Dr. Alex zu öffnen.'
WHERE feature_key = 'ai_dashboard_insights';

UPDATE product_features SET
    tooltip_en = 'Compare your biomarker values anonymously against similar users matched by age, gender, and health protocol. See where you stand relative to your peer group.',
    tooltip_de = 'Vergleiche deine Biomarker-Werte anonym mit ähnlichen Nutzern, abgestimmt nach Alter, Geschlecht und Gesundheitsprotokoll. Sieh wo du im Vergleich zu deiner Vergleichsgruppe stehst.'
WHERE feature_key = 'cohort_comparison';

UPDATE product_features SET
    tooltip_en = 'Visual side-by-side comparison of your biomarker results across different diet and fasting protocols. See which protocol gives you the best results over time.',
    tooltip_de = 'Visueller Seite-an-Seite-Vergleich deiner Biomarker-Ergebnisse über verschiedene Diät- und Fastenprotokolle. Sieh welches Protokoll dir über die Zeit die besten Ergebnisse bringt.'
WHERE feature_key = 'protocol_comparison';
