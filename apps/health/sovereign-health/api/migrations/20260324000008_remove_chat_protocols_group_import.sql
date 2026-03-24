-- Sprint 013: Remove duplicate "Compare Protocols" chat agent, reorganize imports
--
-- 1. Remove chat_protocols from tier_features + product_features
--    (keep protocol_comparison as the "coming soon" feature)
-- 2. Rename Smart Import features with indent prefix for visual grouping

-- =========================================================================
-- 1. Remove chat_protocols (duplicate of protocol_comparison)
-- =========================================================================

-- Remove tier assignments first (FK constraint)
DELETE FROM tier_features
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'chat_protocols');

-- Remove the feature itself
DELETE FROM product_features WHERE feature_key = 'chat_protocols';

-- Also reset the chat_protocols_monthly limit in license_tiers (no longer used)
UPDATE license_tiers SET chat_protocols_monthly = 0;

-- =========================================================================
-- 2. Group Smart Import features
-- =========================================================================

-- Create a parent "Smart Import" feature (visual grouping header)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, category, sort_order, status, icon)
VALUES ('smart_import', 'Smart Import', 'Smart Import',
        'AI-powered data import from photos, PDFs, and spreadsheets',
        'KI-gestützter Datenimport aus Fotos, PDFs und Tabellen',
        'reporting', 25, 'active', 'upload')
ON CONFLICT (feature_key) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    description_en = EXCLUDED.description_en;

-- Smart Import: all tiers get it (the sub-features have individual limits)
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'smart_import'), true, 'Yes', 'Ja'
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('horizon'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Rename sub-features with indent marker for display
-- Lab Result Import → "⤷ Lab Result (PDF/Photo)"
UPDATE product_features SET
    name_en = '⤷ Lab Result (PDF/Photo)',
    name_de = '⤷ Laborergebnis (PDF/Foto)',
    sort_order = 26
WHERE feature_key = 'lab_import';

-- Influence Factor Import → "⤷ Medication/Supplement (Photo)"
UPDATE product_features SET
    name_en = '⤷ Medication/Supplement (Photo)',
    name_de = '⤷ Medikament/Nahrungsergänzung (Foto)',
    sort_order = 27
WHERE feature_key = 'influence_factor_import';

-- Add Measurement Table import feature (currently missing from website)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, category, sort_order, status, icon)
VALUES ('measurement_table_import', '⤷ Measurement Table (CSV/ODS)', '⤷ Messtabelle (CSV/ODS)',
        'Import measurement data from spreadsheets',
        'Messdaten aus Tabellen importieren',
        'reporting', 28, 'active', NULL)
ON CONFLICT (feature_key) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order;

-- Measurement Table Import: same limits as lab import per tier
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT tf.tier_key,
       (SELECT id FROM product_features WHERE feature_key = 'measurement_table_import'),
       tf.included, tf.limit_value, tf.limit_label_en, tf.limit_label_de
FROM tier_features tf
WHERE tf.feature_id = (SELECT id FROM product_features WHERE feature_key = 'lab_import')
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- =========================================================================
-- 3. Also remove duplicate nostr_login (keep decentralized_auth)
-- =========================================================================
DELETE FROM tier_features
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'nostr_login');

DELETE FROM product_features WHERE feature_key = 'nostr_login';

-- =========================================================================
-- 4. Remove duplicate tor_access (keep tor_support)
-- =========================================================================
DELETE FROM tier_features
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'tor_access');

DELETE FROM product_features WHERE feature_key = 'tor_access';
