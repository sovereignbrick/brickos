-- Fix: tier_features chat limit_values were NULL (should have numeric limits).
-- These must match the legacy license_tiers columns for SSoT to work.
-- After this migration, the AI credit pool reads correct limits from tier_features.

-- Glimpse: 1 general, 1 trends, 1 labs, 0 diet, 0 supplements, 0 protocols = 3 total pool
UPDATE tier_features SET limit_value = 1 WHERE tier_key = 'glimpse' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_general');
UPDATE tier_features SET limit_value = 1 WHERE tier_key = 'glimpse' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_trends');
UPDATE tier_features SET limit_value = 1 WHERE tier_key = 'glimpse' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_labs');
UPDATE tier_features SET included = false, limit_value = 0 WHERE tier_key = 'glimpse' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_diet');

-- Ensure chat_supplements and chat_protocols exist for glimpse (may not have rows)
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'glimpse', id, false, 0, '0/month', '0/Monat' FROM product_features WHERE feature_key = 'chat_supplements'
ON CONFLICT (tier_key, feature_id) DO UPDATE SET included = false, limit_value = 0;

INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'glimpse', id, false, 0, '0/month', '0/Monat' FROM product_features WHERE feature_key = 'chat_protocols'
ON CONFLICT (tier_key, feature_id) DO UPDATE SET included = false, limit_value = 0;

-- Focus: 5 general, 3 trends, 3 labs, 3 diet, 3 supplements, 0 protocols = 17 total pool
UPDATE tier_features SET limit_value = 5 WHERE tier_key = 'focus' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_general');
UPDATE tier_features SET limit_value = 3 WHERE tier_key = 'focus' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_trends');
UPDATE tier_features SET limit_value = 3 WHERE tier_key = 'focus' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_labs');
UPDATE tier_features SET limit_value = 3 WHERE tier_key = 'focus' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_diet');

INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'focus', id, true, 3, '3/month', '3/Monat' FROM product_features WHERE feature_key = 'chat_supplements'
ON CONFLICT (tier_key, feature_id) DO UPDATE SET included = true, limit_value = 3;

INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'focus', id, false, 0, '0/month', '0/Monat' FROM product_features WHERE feature_key = 'chat_protocols'
ON CONFLICT (tier_key, feature_id) DO UPDATE SET included = false, limit_value = 0;

-- Insight: 30 general, 10 trends, 10 labs, 10 diet, 10 supplements, 5 protocols = 75 total pool
UPDATE tier_features SET limit_value = 30 WHERE tier_key = 'insight' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_general');
UPDATE tier_features SET limit_value = 10 WHERE tier_key = 'insight' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_trends');
UPDATE tier_features SET limit_value = 10 WHERE tier_key = 'insight' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_labs');
UPDATE tier_features SET limit_value = 10 WHERE tier_key = 'insight' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_diet');

INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'insight', id, true, 10, '10/month', '10/Monat' FROM product_features WHERE feature_key = 'chat_supplements'
ON CONFLICT (tier_key, feature_id) DO UPDATE SET included = true, limit_value = 10;

INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'insight', id, true, 5, '5/month', '5/Monat' FROM product_features WHERE feature_key = 'chat_protocols'
ON CONFLICT (tier_key, feature_id) DO UPDATE SET included = true, limit_value = 5;

-- Clarity & Horizon: NULL limit_value = unlimited (already correct if rows exist)
-- Ensure they have rows with included = true, limit_value = NULL
INSERT INTO tier_features (tier_key, feature_id, included, limit_value)
SELECT t.key, pf.id, true, NULL
FROM product_features pf, (VALUES ('clarity'), ('horizon')) AS t(key)
WHERE pf.feature_key IN ('chat_general', 'chat_trends', 'chat_labs', 'chat_diet', 'chat_supplements', 'chat_protocols')
ON CONFLICT (tier_key, feature_id) DO UPDATE SET included = true, limit_value = NULL;
