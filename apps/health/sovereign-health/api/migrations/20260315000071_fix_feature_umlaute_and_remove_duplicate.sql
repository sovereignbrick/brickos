-- Fix missing Umlaute in product_features name_de column
-- and remove duplicate "medications" feature (replaced by "influence_factors")

-- Fix Umlaute
UPDATE product_features SET name_de = 'Körperzusammensetzung' WHERE feature_key = 'body_composition' AND name_de = 'Koerperzusammensetzung';
UPDATE product_features SET name_de = 'Laborerklärung-Chat' WHERE feature_key = 'chat_labs' AND name_de = 'Laborerklaerung-Chat';
UPDATE product_features SET name_de = 'Personalisierte Ernährung-Chat' WHERE feature_key = 'chat_diet' AND name_de LIKE '%rnaehrung%';
UPDATE product_features SET name_de = 'Nahrungsergänzung-Chat' WHERE feature_key = 'chat_supplements' AND name_de = 'Nahrungsergaenzung-Chat';

-- Also fix any other potential Umlaut issues
UPDATE product_features SET name_de = 'KI-Dashboard-Einblicke' WHERE feature_key = 'ai_dashboard_insights' AND name_de LIKE '%Einblicke%';
UPDATE product_features SET name_de = 'Selbst-gehosteter Hybrid' WHERE feature_key = 'self_hosted_hybrid';
UPDATE product_features SET name_de = 'PDF-Gesundheitsberichte' WHERE feature_key = 'pdf_reports';

-- Remove duplicate "medications" feature (replaced by "influence_factors")
-- First remove tier_features references
DELETE FROM tier_features WHERE feature_id IN (
  SELECT id FROM product_features WHERE feature_key = 'medications'
);
-- Then remove the feature itself
DELETE FROM product_features WHERE feature_key = 'medications';

-- Also remove duplicate "med_import" if "influence_factor_import" exists
DELETE FROM tier_features WHERE feature_id IN (
  SELECT id FROM product_features WHERE feature_key = 'med_import'
) AND EXISTS (SELECT 1 FROM product_features WHERE feature_key = 'influence_factor_import');
DELETE FROM product_features WHERE feature_key = 'med_import'
  AND EXISTS (SELECT 1 FROM product_features WHERE feature_key = 'influence_factor_import');
