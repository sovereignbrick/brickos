-- Sprint 013: Tier limits update based on product review
--
-- Changes to license_tiers (backend enforcement):
-- 1. Biomarkers: Glimpse 8→20, Focus stays 20
-- 2. Data History: Glimpse 30→90 days
-- 3. Calculated Markers: ALL tiers → unlimited (NULL)
-- 4. Measurement Templates: Glimpse 1→5, Focus 3→5, Insight 5→5
-- 5. Influence Factors: Glimpse 2→10, Focus 10→10, Insight 25→10 (simplify)
-- 6. Body Composition: Glimpse false→true
-- 7. Custom Thresholds (Reference Ranges): Glimpse false→true
-- 8. Lifestyle Presets: Glimpse false→true
--
-- Changes to tier_features (website display):
-- Matching updates for the feature comparison table

-- =========================================================================
-- 1. Biomarkers: Glimpse 8→20
-- =========================================================================
UPDATE license_tiers SET max_markers = 20 WHERE slug = 'glimpse';

UPDATE tier_features SET limit_value = 20, limit_label_en = '20 markers', limit_label_de = '20 Marker'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'markers');

-- =========================================================================
-- 2. Data History: Glimpse 30→90 days
-- =========================================================================
UPDATE license_tiers SET max_history_days = 90 WHERE slug = 'glimpse';

UPDATE tier_features SET limit_value = 90, limit_label_en = '90 days', limit_label_de = '90 Tage'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'history');

-- =========================================================================
-- 3. Calculated Markers: ALL tiers unlimited
-- =========================================================================
UPDATE license_tiers SET max_calculated_markers = NULL;

UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = 'All', limit_label_de = 'Alle'
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'calculated_markers');

-- =========================================================================
-- 4. Measurement Templates: Glimpse→5, Focus→5, Insight→5
-- =========================================================================
UPDATE license_tiers SET max_templates = 5 WHERE slug = 'glimpse';
UPDATE license_tiers SET max_templates = 5 WHERE slug = 'focus';
-- Insight already 5

UPDATE tier_features SET limit_value = 5, limit_label_en = '5 templates', limit_label_de = '5 Vorlagen'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'measurement_templates');

UPDATE tier_features SET limit_value = 5, limit_label_en = '5 templates', limit_label_de = '5 Vorlagen'
WHERE tier_key = 'focus'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'measurement_templates');

-- =========================================================================
-- 5. Influence Factors: Glimpse→10, Focus→10, Insight→10
-- =========================================================================
UPDATE license_tiers SET max_medications = 10 WHERE slug = 'glimpse';
UPDATE license_tiers SET max_medications = 10 WHERE slug = 'focus';
UPDATE license_tiers SET max_medications = 10 WHERE slug = 'insight';

UPDATE tier_features SET limit_value = 10, limit_label_en = '10 factors', limit_label_de = '10 Faktoren'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'influence_factors');

UPDATE tier_features SET limit_value = 10, limit_label_en = '10 factors', limit_label_de = '10 Faktoren'
WHERE tier_key = 'focus'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'influence_factors');

UPDATE tier_features SET limit_value = 10, limit_label_en = '10 factors', limit_label_de = '10 Faktoren'
WHERE tier_key = 'insight'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'influence_factors');

-- =========================================================================
-- 6. Body Composition: enable for Glimpse
-- =========================================================================
UPDATE license_tiers SET body_composition = true WHERE slug = 'glimpse';

UPDATE tier_features SET included = true, limit_label_en = 'Yes', limit_label_de = 'Ja'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'body_composition');

-- =========================================================================
-- 7. Reference Ranges (Custom Thresholds): enable for Glimpse
-- =========================================================================
UPDATE license_tiers SET custom_thresholds = true WHERE slug = 'glimpse';

UPDATE tier_features SET included = true, limit_label_en = 'Yes', limit_label_de = 'Ja'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'custom_thresholds');

-- =========================================================================
-- 8. Lifestyle Presets: enable for Glimpse
-- =========================================================================
UPDATE license_tiers SET lifestyle_presets = true WHERE slug = 'glimpse';

UPDATE tier_features SET included = true, limit_label_en = 'Yes', limit_label_de = 'Ja'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'lifestyle_presets');
