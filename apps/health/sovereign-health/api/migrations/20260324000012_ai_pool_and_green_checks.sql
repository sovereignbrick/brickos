-- Sprint 013: Dr. Alex pool limits + green checks for all sub-features
--
-- 1. Dr. Alex Chat: pool limits (Core ∞, Glimpse 10, Focus 25, Insight 50, Clarity 100, Horizon ∞)
-- 2. Your Health, Trends, Lab Results, Nutrition: all tiers ✓ (pool manages limits)
-- 3. Smart Import sub-features: all tiers ✓ (pool manages limits)

-- =========================================================================
-- 1. Dr. Alex Chat pool — update limits and description
-- =========================================================================
UPDATE product_features SET
    description_en = 'Your monthly pool of Dr. Alex AI consultations. Every chat, analysis, and import draws from this pool. Resets on the 1st of each month.',
    description_de = 'Dein monatliches Kontingent an Dr. Alex KI-Beratungen. Jeder Chat, jede Analyse und jeder Import nutzt dieses Kontingent. Wird am 1. jedes Monats zurückgesetzt.',
    tooltip_en = 'Each month you receive a pool of Dr. Alex consultations. Every interaction — health questions, trend analysis, lab explanations, nutrition advice, and smart imports — uses one consultation from your pool. Unused consultations do not carry over. Upgrade your plan for more monthly consultations.',
    tooltip_de = 'Jeden Monat erhältst du ein Kontingent an Dr. Alex Beratungen. Jede Interaktion — Gesundheitsfragen, Trendanalysen, Labor-Erklärungen, Ernährungsberatung und Smart Imports — verbraucht eine Beratung aus deinem Kontingent. Nicht genutzte Beratungen werden nicht übertragen. Upgrade deinen Plan für mehr monatliche Beratungen.'
WHERE feature_key = 'dr_alex_chat';

-- Update pool numbers
UPDATE tier_features SET limit_value = 10, limit_label_en = '10/month', limit_label_de = '10/Monat'
WHERE tier_key = 'glimpse' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat');

UPDATE tier_features SET limit_value = 25, limit_label_en = '25/month', limit_label_de = '25/Monat'
WHERE tier_key = 'focus' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat');

UPDATE tier_features SET limit_value = 50, limit_label_en = '50/month', limit_label_de = '50/Monat'
WHERE tier_key = 'insight' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat');

UPDATE tier_features SET limit_value = 100, limit_label_en = '100/month', limit_label_de = '100/Monat'
WHERE tier_key = 'clarity' AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat');

-- Horizon + Core: unlimited (already set, just ensure)
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = 'Unlimited', limit_label_de = 'Unbegrenzt'
WHERE tier_key IN ('horizon', 'core') AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'dr_alex_chat');

-- =========================================================================
-- 2. Your Health, Trends, Lab Results, Nutrition: all tiers ✓
--    Pool manages the actual limits, these are just feature toggles
-- =========================================================================

-- Your Health (chat_general): all tiers green check
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_general');

-- Trends & Patterns (chat_trends): all tiers green check
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_trends');

-- Lab Results (chat_labs): all tiers green check
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_labs');

-- Nutrition & Lifestyle (chat_diet): all tiers green check
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_diet');

-- =========================================================================
-- 3. Smart Import sub-features: all tiers ✓
-- =========================================================================

-- Smart Import: Lab Results — all tiers green check
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'lab_import');

-- Smart Import: Medication/Supplement — all tiers green check
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'influence_factor_import');

-- Smart Import: Measurement Table — all tiers green check
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'measurement_table_import');
