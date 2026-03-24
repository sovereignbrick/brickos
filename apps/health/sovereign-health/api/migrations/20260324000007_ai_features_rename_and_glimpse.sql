-- Sprint 013: AI features — rename to match app, open Glimpse
--
-- 1. Rename product_features to match app UI names
-- 2. Open Glimpse to 1/month for diet, supplements, protocols
-- 3. Update license_tiers limits to match

-- =========================================================================
-- 1. Rename AI features to match app names
-- =========================================================================

-- "Dr. Alex - General Health" → "Ask Dr. Alex"
UPDATE product_features SET
    name_en = 'Ask Dr. Alex',
    name_de = 'Dr. Alex fragen',
    description_en = 'Your AI health assistant for general health questions',
    description_de = 'Dein KI-Gesundheitsassistent für allgemeine Gesundheitsfragen'
WHERE feature_key = 'chat_general';

-- "Trend Analysis Chat" → "Analyze My Trends"
UPDATE product_features SET
    name_en = 'Analyze My Trends',
    name_de = 'Meine Trends analysieren',
    description_en = 'AI-powered trend analysis across your biomarkers',
    description_de = 'KI-gestützte Trendanalyse deiner Biomarker'
WHERE feature_key = 'chat_trends';

-- "Lab Explanation Chat" → "Explain My Lab Results"
UPDATE product_features SET
    name_en = 'Explain My Lab Results',
    name_de = 'Laborergebnisse erklären',
    description_en = 'Dr. Alex explains your lab results in plain language',
    description_de = 'Dr. Alex erklärt deine Laborergebnisse verständlich'
WHERE feature_key = 'chat_labs';

-- "Personalized Nutrition Chat" → "Diet & Nutrition"
UPDATE product_features SET
    name_en = 'Diet & Nutrition',
    name_de = 'Ernährung & Diät',
    description_en = 'Personalized nutrition recommendations based on your markers',
    description_de = 'Personalisierte Ernährungsempfehlungen basierend auf deinen Markern'
WHERE feature_key = 'chat_diet';

-- "Supplement Review Chat" → "Supplement Review"
UPDATE product_features SET
    name_en = 'Supplement Review',
    name_de = 'Nahrungsergänzung prüfen',
    description_en = 'Evaluate if your supplements help your markers',
    description_de = 'Prüfe ob deine Nahrungsergänzungsmittel deinen Markern helfen'
WHERE feature_key = 'chat_supplements';

-- "Protocol Comparison Chat" → "Compare Protocols"
UPDATE product_features SET
    name_en = 'Compare Protocols',
    name_de = 'Protokolle vergleichen',
    description_en = 'Compare results across diet and fasting protocols',
    description_de = 'Vergleiche Ergebnisse verschiedener Ernährungs- und Fastenprotokolle'
WHERE feature_key = 'chat_protocols';

-- "Lab Result Import" → "Smart Import: Lab Result"
UPDATE product_features SET
    name_en = 'Smart Import: Lab Result',
    name_de = 'Smart Import: Laborergebnis',
    description_en = 'AI-powered import from lab result PDF or photo',
    description_de = 'KI-gestützter Import aus Laborergebnis-PDF oder Foto'
WHERE feature_key = 'lab_import';

-- "Influence Factor Import" → "Smart Import: Medication/Supplement"
UPDATE product_features SET
    name_en = 'Smart Import: Medication/Supplement',
    name_de = 'Smart Import: Medikament/Nahrungsergänzung',
    description_en = 'AI-powered import of medication and supplement lists from photos',
    description_de = 'KI-gestützter Import von Medikamenten- und Nahrungsergänzungslisten aus Fotos'
WHERE feature_key = 'influence_factor_import';

-- =========================================================================
-- 2. Open Glimpse: 1/month for diet, supplements, protocols
-- =========================================================================

-- Diet: Glimpse 0 → 1/month
UPDATE license_tiers SET chat_diet_monthly = 1 WHERE slug = 'glimpse';

UPDATE tier_features SET included = true, limit_value = 1, limit_label_en = '1/month', limit_label_de = '1/Monat'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_diet');

-- Supplements: Glimpse 0 → 1/month
UPDATE license_tiers SET chat_supplements_monthly = 1 WHERE slug = 'glimpse';

UPDATE tier_features SET included = true, limit_value = 1, limit_label_en = '1/month', limit_label_de = '1/Monat'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_supplements');

-- Protocols: Glimpse 0 → 1/month
UPDATE license_tiers SET chat_protocols_monthly = 1 WHERE slug = 'glimpse';

UPDATE tier_features SET included = true, limit_value = 1, limit_label_en = '1/month', limit_label_de = '1/Monat'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_protocols');
