-- Consolidate feature comparison table with pricing cards
-- Add missing features, fix categories, set coming_soon status, add Nostr auth

-- ═══ 1. Add missing features ═══

-- Measurements (in data group)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status)
VALUES ('measurements', 'Measurements', 'Messungen', 'Total measurements you can store', 'Gesamtanzahl speicherbarer Messungen', 'Total measurements you can store', 'Gesamtanzahl speicherbarer Messungen', 'data', 6, 'active')
ON CONFLICT (feature_key) DO UPDATE SET
  tooltip_en = EXCLUDED.tooltip_en,
  tooltip_de = EXCLUDED.tooltip_de,
  category = 'data',
  sort_order = 6;

-- Decentralized Authentication (Nostr nsec) - security group
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status)
VALUES ('decentralized_auth', 'Decentralized Authentication', 'Dezentrale Authentifizierung',
  'Nsec-based decentralized authentication', 'Nsec-basierte dezentrale Authentifizierung',
  'Authenticate using your Nostr secret key (nsec). Your key remains under your control and is never stored on our servers.',
  'Authentifiziere dich mit deinem Nostr Secret Key (nsec). Dein Schlüssel bleibt unter deiner Kontrolle und wird niemals auf unseren Servern gespeichert.',
  'security', 30, 'coming_soon')
ON CONFLICT (feature_key) DO NOTHING;

-- Personal Onboarding (enterprise/integrations group)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status)
VALUES ('personal_onboarding', 'Personal Onboarding', 'Persönliches Onboarding',
  '1:1 setup session with our team', '1:1 Einrichtung mit unserem Team',
  '1:1 setup session with our team', '1:1 Einrichtung mit unserem Team',
  'integrations', 60, 'coming_soon')
ON CONFLICT (feature_key) DO NOTHING;

-- Priority Support (integrations group)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status)
VALUES ('priority_support', 'Priority Support', 'Prioritäts-Support',
  'Fast-track support response', 'Bevorzugte Support-Antwort',
  'Fast-track support response', 'Bevorzugte Support-Antwort',
  'integrations', 61, 'coming_soon')
ON CONFLICT (feature_key) DO NOTHING;

-- Standard Support (integrations group)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status)
VALUES ('standard_support', 'Standard Support', 'Standard-Support',
  'Community and email support', 'Community- und E-Mail-Support',
  'Community and email support', 'Community- und E-Mail-Support',
  'integrations', 62, 'active')
ON CONFLICT (feature_key) DO NOTHING;

-- ═══ 2. Set coming_soon status on features that are not yet live ═══

UPDATE product_features SET status = 'coming_soon' WHERE feature_key = 'ai_dashboard_insights' AND status != 'coming_soon';
UPDATE product_features SET status = 'coming_soon' WHERE feature_key = 'cohort_comparison' AND status != 'coming_soon';
UPDATE product_features SET status = 'coming_soon' WHERE feature_key = 'api_access' AND status != 'coming_soon';
UPDATE product_features SET status = 'coming_soon' WHERE feature_key = 'self_hosted_hybrid' AND status != 'coming_soon';
UPDATE product_features SET status = 'coming_soon' WHERE feature_key = 'protocol_comparison' AND status != 'coming_soon';
UPDATE product_features SET status = 'coming_soon' WHERE feature_key = 'lab_import' AND status != 'coming_soon';
UPDATE product_features SET status = 'coming_soon' WHERE feature_key = 'influence_factor_import' AND status != 'coming_soon';
UPDATE product_features SET status = 'coming_soon' WHERE feature_key = 'pdf_reports' AND status != 'coming_soon';

-- ═══ 3. Fix categories to match the 5-group structure ═══

-- Data & Tracking group
UPDATE product_features SET category = 'data', sort_order = 1 WHERE feature_key = 'markers';
UPDATE product_features SET category = 'data', sort_order = 2 WHERE feature_key = 'history';
UPDATE product_features SET category = 'data', sort_order = 3 WHERE feature_key = 'calculated_markers';
UPDATE product_features SET category = 'data', sort_order = 4 WHERE feature_key = 'measurement_templates';
UPDATE product_features SET category = 'data', sort_order = 5 WHERE feature_key = 'influence_factors';
UPDATE product_features SET category = 'data', sort_order = 6 WHERE feature_key = 'measurements';
UPDATE product_features SET category = 'data', sort_order = 7 WHERE feature_key = 'body_composition';
UPDATE product_features SET category = 'data', sort_order = 8 WHERE feature_key = 'custom_thresholds';
UPDATE product_features SET category = 'data', sort_order = 9 WHERE feature_key = 'lifestyle_presets';

-- AI & Intelligence group
UPDATE product_features SET category = 'ai', sort_order = 10 WHERE feature_key = 'chat_general';
UPDATE product_features SET category = 'ai', sort_order = 11 WHERE feature_key = 'chat_trends';
UPDATE product_features SET category = 'ai', sort_order = 12 WHERE feature_key = 'chat_labs';
UPDATE product_features SET category = 'ai', sort_order = 13 WHERE feature_key = 'chat_diet';
UPDATE product_features SET category = 'ai', sort_order = 14 WHERE feature_key = 'chat_supplements';
UPDATE product_features SET category = 'ai', sort_order = 15 WHERE feature_key = 'chat_protocols';
UPDATE product_features SET category = 'ai', sort_order = 16 WHERE feature_key = 'supplement_marker_impact';
UPDATE product_features SET category = 'ai', sort_order = 17 WHERE feature_key = 'ai_dashboard_insights';
UPDATE product_features SET category = 'ai', sort_order = 18 WHERE feature_key = 'cohort_comparison';
UPDATE product_features SET category = 'ai', sort_order = 19 WHERE feature_key = 'protocol_comparison';

-- Reporting & Export group
UPDATE product_features SET category = 'reporting', sort_order = 20 WHERE feature_key = 'csv_export';
UPDATE product_features SET category = 'reporting', sort_order = 21 WHERE feature_key = 'json_export';
UPDATE product_features SET category = 'reporting', sort_order = 22 WHERE feature_key = 'pdf_reports';
UPDATE product_features SET category = 'reporting', sort_order = 23 WHERE feature_key = 'lab_import';
UPDATE product_features SET category = 'reporting', sort_order = 24 WHERE feature_key = 'influence_factor_import';

-- Integrations group
UPDATE product_features SET category = 'integrations', sort_order = 30 WHERE feature_key = 'api_access';
UPDATE product_features SET category = 'integrations', sort_order = 31 WHERE feature_key = 'self_hosted_hybrid';
UPDATE product_features SET category = 'integrations', sort_order = 32 WHERE feature_key = 'personal_onboarding';
UPDATE product_features SET category = 'integrations', sort_order = 33 WHERE feature_key = 'priority_support';
UPDATE product_features SET category = 'integrations', sort_order = 34 WHERE feature_key = 'standard_support';

-- Security group
UPDATE product_features SET category = 'security', sort_order = 40 WHERE feature_key = 'mfa_totp';
UPDATE product_features SET category = 'security', sort_order = 41 WHERE feature_key = 'decentralized_auth';

-- ═══ 4. Add tier_features for new features ═══

-- Measurements
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'glimpse', id, true, 100, '100', '100' FROM product_features WHERE feature_key = 'measurements'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'focus', id, true, 250, '250', '250' FROM product_features WHERE feature_key = 'measurements'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'insight', id, true, 500, '500', '500' FROM product_features WHERE feature_key = 'measurements'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'clarity', id, true, NULL, 'Unlimited', 'Unbegrenzt' FROM product_features WHERE feature_key = 'measurements'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'horizon', id, true, NULL, 'Unlimited', 'Unbegrenzt' FROM product_features WHERE feature_key = 'measurements'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'core', id, true, NULL, 'Unlimited', 'Unbegrenzt' FROM product_features WHERE feature_key = 'measurements'
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Decentralized Auth (coming_soon for all tiers)
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'glimpse', id, false, NULL, 'Soon', 'Bald' FROM product_features WHERE feature_key = 'decentralized_auth'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'focus', id, true, NULL, 'Soon', 'Bald' FROM product_features WHERE feature_key = 'decentralized_auth'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'insight', id, true, NULL, 'Soon', 'Bald' FROM product_features WHERE feature_key = 'decentralized_auth'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'clarity', id, true, NULL, 'Soon', 'Bald' FROM product_features WHERE feature_key = 'decentralized_auth'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'horizon', id, true, NULL, 'Soon', 'Bald' FROM product_features WHERE feature_key = 'decentralized_auth'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'core', id, true, NULL, 'Soon', 'Bald' FROM product_features WHERE feature_key = 'decentralized_auth'
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Personal Onboarding (horizon only)
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'glimpse', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'personal_onboarding'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'focus', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'personal_onboarding'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'insight', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'personal_onboarding'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'clarity', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'personal_onboarding'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'horizon', id, true, NULL, 'Soon', 'Bald' FROM product_features WHERE feature_key = 'personal_onboarding'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'core', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'personal_onboarding'
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Priority Support (horizon only)
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'glimpse', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'priority_support'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'focus', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'priority_support'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'insight', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'priority_support'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'clarity', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'priority_support'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'horizon', id, true, NULL, 'Soon', 'Bald' FROM product_features WHERE feature_key = 'priority_support'
ON CONFLICT (tier_key, feature_id) DO NOTHING;
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT 'core', id, false, NULL, NULL, NULL FROM product_features WHERE feature_key = 'priority_support'
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Standard Support (all tiers)
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT t.slug, f.id, true, NULL, 'Yes', 'Ja'
FROM product_features f, (SELECT unnest(ARRAY['core','glimpse','focus','insight','clarity','horizon']) AS slug) t
WHERE f.feature_key = 'standard_support'
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- ═══ 5. Add tooltips to features that are missing them ═══

UPDATE product_features SET tooltip_en = 'Track blood, body and lifestyle markers', tooltip_de = 'Blut-, Körper- und Lifestyle-Marker verfolgen' WHERE feature_key = 'markers' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'How far back you can see your data', tooltip_de = 'Wie weit zurück du deine Daten sehen kannst' WHERE feature_key = 'history' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Auto-calculated ratios like Dr. Boz, BMI, TG/HDL', tooltip_de = 'Automatisch errechnete Werte wie Dr. Boz, BMI, TG/HDL' WHERE feature_key = 'calculated_markers' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Save your routine measurement sets', tooltip_de = 'Speichere deine Mess-Routinen' WHERE feature_key = 'measurement_templates' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Track medications and supplements', tooltip_de = 'Medikamente und Nahrungsergänzungsmittel verfolgen' WHERE feature_key = 'influence_factors' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Track body fat, muscle mass, water', tooltip_de = 'Körperfett, Muskelmasse, Wasser verfolgen' WHERE feature_key = 'body_composition' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Monthly conversations with Dr. Alex', tooltip_de = 'Monatliche Gespräche mit Dr. Alex' WHERE feature_key = 'chat_general' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'AI-powered trend detection across your data', tooltip_de = 'KI-gestützte Trenderkennung in deinen Daten' WHERE feature_key = 'chat_trends' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Dr. Alex explains your lab results simply', tooltip_de = 'Dr. Alex erklärt deine Laborwerte verständlich' WHERE feature_key = 'chat_labs' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Personalized nutrition recommendations', tooltip_de = 'Personalisierte Ernährungsempfehlungen' WHERE feature_key = 'chat_diet' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Evaluate if your supplements help your markers', tooltip_de = 'Prüft ob deine Supplemente deinen Markern helfen' WHERE feature_key = 'chat_supplements' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Compare different diet/training phases', tooltip_de = 'Verschiedene Ernährungs-/Trainingsphasen vergleichen' WHERE feature_key = 'chat_protocols' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'AI-generated insights on your dashboard', tooltip_de = 'KI-generierte Erkenntnisse auf dem Dashboard' WHERE feature_key = 'ai_dashboard_insights' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Compare your data with anonymous cohorts', tooltip_de = 'Vergleiche deine Daten mit anonymen Kohorten' WHERE feature_key = 'cohort_comparison' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Download your data as CSV', tooltip_de = 'Lade deine Daten als CSV herunter' WHERE feature_key = 'csv_export' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Download your data as JSON', tooltip_de = 'Lade deine Daten als JSON herunter' WHERE feature_key = 'json_export' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Downloadable health summary reports', tooltip_de = 'Herunterladbare Gesundheitsberichte' WHERE feature_key = 'pdf_reports' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Import lab results from PDF or photo', tooltip_de = 'Laborergebnisse aus PDF oder Foto importieren' WHERE feature_key = 'lab_import' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Import medication and supplement lists', tooltip_de = 'Medikamenten- und Supplement-Listen importieren' WHERE feature_key = 'influence_factor_import' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Programmatic access to your data', tooltip_de = 'Programmatischer Zugriff auf deine Daten' WHERE feature_key = 'api_access' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Run Sovereign Health on your own server', tooltip_de = 'Sovereign Health auf eigenem Server betreiben' WHERE feature_key = 'self_hosted_hybrid' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Two-factor authentication for your account', tooltip_de = 'Zwei-Faktor-Authentifizierung für dein Konto' WHERE feature_key = 'mfa_totp' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Evaluate if your medications and supplements help your markers', tooltip_de = 'Prüft ob deine Medikamente und Supplemente deinen Markern helfen' WHERE feature_key = 'supplement_marker_impact' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Save and apply lifestyle-based preset ranges', tooltip_de = 'Lebensstil-basierte Referenzbereiche speichern und anwenden' WHERE feature_key = 'lifestyle_presets' AND (tooltip_en IS NULL OR tooltip_en = '');
UPDATE product_features SET tooltip_en = 'Compare different diet/training protocol effects', tooltip_de = 'Verschiedene Ernährungs-/Trainingsprotokoll-Effekte vergleichen' WHERE feature_key = 'protocol_comparison' AND (tooltip_en IS NULL OR tooltip_en = '');
