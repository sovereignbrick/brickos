-- Sprint 013: Tier feature audit — align product_features + tier_features with approved matrix
--
-- Changes:
-- 1. 2FA (mfa_totp): enable for Glimpse (was excluded)
-- 2. Lab Import: 3/month for ALL tiers, status → active (was coming_soon)
-- 3. Influence Factor Import: 3/month for ALL tiers, status → active (was coming_soon)
-- 4. Add new features: PWA, Nostr Login, Tor Access, Vanity Links, Org Structure, White-labeling, Dedicated Support
-- 5. Update license_tiers table limits to match

-- =========================================================================
-- 1. MFA/2FA: enable for Glimpse
-- =========================================================================
UPDATE tier_features SET included = true, limit_label_en = 'Yes', limit_label_de = 'Ja'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'mfa_totp');

-- =========================================================================
-- 2. Lab Import: 3/month for all, status active
-- =========================================================================
UPDATE product_features SET status = 'active' WHERE feature_key = 'lab_import';

-- Glimpse: 0 → 3/month
UPDATE tier_features SET included = true, limit_value = 3, limit_label_en = '3/month', limit_label_de = '3/Monat'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'lab_import');

-- Focus: 0 → 3/month
UPDATE tier_features SET included = true, limit_value = 3, limit_label_en = '3/month', limit_label_de = '3/Monat'
WHERE tier_key = 'focus'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'lab_import');

-- Insight stays 3/month (already correct)

-- =========================================================================
-- 3. Influence Factor Import: 3/month for all, status active
-- =========================================================================
UPDATE product_features SET status = 'active' WHERE feature_key = 'influence_factor_import';

-- Glimpse: 0 → 3/month
UPDATE tier_features SET included = true, limit_value = 3, limit_label_en = '3/month', limit_label_de = '3/Monat'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'influence_factor_import');

-- Focus: 0 → 3/month
UPDATE tier_features SET included = true, limit_value = 3, limit_label_en = '3/month', limit_label_de = '3/Monat'
WHERE tier_key = 'focus'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'influence_factor_import');

-- Insight: 1 → 3/month
UPDATE tier_features SET limit_value = 3, limit_label_en = '3/month', limit_label_de = '3/Monat'
WHERE tier_key = 'insight'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'influence_factor_import');

-- =========================================================================
-- 4. Add new product features
-- =========================================================================

-- PWA (active, all tiers)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('pwa', 'Progressive Web App', 'Progressive Web App',
        'Install on your phone or desktop. Works offline.', 'Auf Handy oder Desktop installieren. Funktioniert offline.',
        'Install the app on your home screen for quick access. Service worker caches data for offline use.', 'Installiere die App auf deinem Startbildschirm. Service Worker speichert Daten für Offline-Nutzung.',
        'integrations', 50, 'active', 'smartphone')
ON CONFLICT (feature_key) DO NOTHING;

-- Nostr Login (coming soon, all tiers)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, category, sort_order, status, icon)
VALUES ('nostr_login', 'Nostr Login (nsec)', 'Nostr-Anmeldung (nsec)',
        'Sign in with your Nostr identity. No email or password required.', 'Melde dich mit deiner Nostr-Identität an. Keine E-Mail oder Passwort erforderlich.',
        'security', 30, 'coming_soon', 'key')
ON CONFLICT (feature_key) DO NOTHING;

-- Tor Access (active, Clarity+)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, category, sort_order, status, icon)
VALUES ('tor_access', 'Tor Browser Access', 'Tor-Browser-Zugang',
        'Access your data anonymously via the Tor network.', 'Greife anonym über das Tor-Netzwerk auf deine Gesundheitsdaten zu.',
        'security', 20, 'active', 'shield')
ON CONFLICT (feature_key) DO NOTHING;

-- Vanity Short Links (active, Clarity+)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, category, sort_order, status, icon)
VALUES ('vanity_links', 'Custom Short Links', 'Eigene Kurzlinks',
        'Choose a memorable vanity code for your referral link.', 'Wähle einen einprägsamen Code für deinen Empfehlungslink.',
        'integrations', 60, 'active', 'link')
ON CONFLICT (feature_key) DO NOTHING;

-- Org Structure (coming soon, Horizon only)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, category, sort_order, status, icon)
VALUES ('org_structure', 'Organization Structure', 'Organisationsstruktur',
        'Create teams, assign roles, manage multi-user organizations.', 'Erstelle Teams, weise Rollen zu, verwalte Organisationen mit mehreren Nutzern.',
        'data', 90, 'coming_soon', 'building')
ON CONFLICT (feature_key) DO NOTHING;

-- White-labeling (coming soon, Horizon only)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, category, sort_order, status, icon)
VALUES ('white_label', 'White-Labeling', 'White-Labeling',
        'Custom branding for your organization. Your logo, your colors.', 'Eigenes Branding für deine Organisation. Dein Logo, deine Farben.',
        'integrations', 70, 'coming_soon', 'palette')
ON CONFLICT (feature_key) DO NOTHING;

-- Dedicated Support (active, Horizon only)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, category, sort_order, status, icon)
VALUES ('dedicated_support', 'Dedicated Support', 'Persönlicher Support',
        'Priority email support with guaranteed response times.', 'Prioritäts-E-Mail-Support mit garantierten Antwortzeiten.',
        'integrations', 80, 'active', 'headset')
ON CONFLICT (feature_key) DO NOTHING;

-- =========================================================================
-- 5. Assign new features to tiers
-- =========================================================================

-- PWA: all tiers
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'pwa'), true, 'Yes', 'Ja'
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('horizon'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Nostr Login: all tiers (coming soon)
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'nostr_login'), true, 'Soon', 'Bald'
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('horizon'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Tor Access: Clarity, Horizon, Core
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'tor_access'), true, 'Yes', 'Ja'
FROM (VALUES ('clarity'), ('horizon'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Tor Access: excluded for Glimpse, Focus, Insight
INSERT INTO tier_features (tier_key, feature_id, included)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'tor_access'), false
FROM (VALUES ('glimpse'), ('focus'), ('insight')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Vanity Links: Clarity, Horizon
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'vanity_links'), true, 'Yes', 'Ja'
FROM (VALUES ('clarity'), ('horizon')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Vanity Links: excluded for others
INSERT INTO tier_features (tier_key, feature_id, included)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'vanity_links'), false
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Org Structure: Horizon only
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
VALUES ('horizon', (SELECT id FROM product_features WHERE feature_key = 'org_structure'), true, 'Yes', 'Ja')
ON CONFLICT (tier_key, feature_id) DO NOTHING;

INSERT INTO tier_features (tier_key, feature_id, included)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'org_structure'), false
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- White-label: Horizon only
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
VALUES ('horizon', (SELECT id FROM product_features WHERE feature_key = 'white_label'), true, 'Yes', 'Ja')
ON CONFLICT (tier_key, feature_id) DO NOTHING;

INSERT INTO tier_features (tier_key, feature_id, included)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'white_label'), false
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Dedicated Support: Horizon only
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
VALUES ('horizon', (SELECT id FROM product_features WHERE feature_key = 'dedicated_support'), true, 'Yes', 'Ja')
ON CONFLICT (tier_key, feature_id) DO NOTHING;

INSERT INTO tier_features (tier_key, feature_id, included)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'dedicated_support'), false
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- API Access: update existing — Horizon + Core only
UPDATE tier_features SET included = true, limit_label_en = 'Yes', limit_label_de = 'Ja'
WHERE tier_key IN ('horizon', 'core')
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'api_access');

UPDATE tier_features SET included = false
WHERE tier_key IN ('glimpse', 'focus', 'insight', 'clarity')
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'api_access');

-- =========================================================================
-- 6. Update license_tiers table limits (for backend enforcement)
-- =========================================================================

-- Glimpse: open up lab + med import
UPDATE license_tiers SET chat_lab_import_monthly = 3, chat_med_import_monthly = 3 WHERE slug = 'glimpse';

-- Focus: open up lab + med import
UPDATE license_tiers SET chat_lab_import_monthly = 3, chat_med_import_monthly = 3 WHERE slug = 'focus';

-- Insight: bump med import 1→3
UPDATE license_tiers SET chat_med_import_monthly = 3 WHERE slug = 'insight';

-- Core: ensure unlimited
UPDATE license_tiers SET chat_lab_import_monthly = NULL, chat_med_import_monthly = NULL WHERE slug = 'core';
