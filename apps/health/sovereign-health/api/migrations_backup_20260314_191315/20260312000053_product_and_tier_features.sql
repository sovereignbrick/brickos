-- Product features: single source of truth for all features across tiers
CREATE TABLE IF NOT EXISTS product_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(200) NOT NULL,
    name_de VARCHAR(200),
    description_en TEXT,
    description_de TEXT,
    tooltip_en VARCHAR(500),
    tooltip_de VARCHAR(500),
    category VARCHAR(50) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    icon VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_features_category ON product_features(category);
CREATE INDEX IF NOT EXISTS idx_product_features_status ON product_features(status);

-- Tier feature assignments
CREATE TABLE IF NOT EXISTS tier_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_key VARCHAR(20) NOT NULL,
    feature_id UUID NOT NULL REFERENCES product_features(id) ON DELETE CASCADE,
    included BOOLEAN NOT NULL DEFAULT false,
    limit_value INTEGER,
    limit_label_en VARCHAR(100),
    limit_label_de VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tier_key, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_tier_features_tier ON tier_features(tier_key);

-- ══════════════════════════════════════════════════════════════════════════════
-- Seed: product_features
-- ══════════════════════════════════════════════════════════════════════════════

-- Category: data
INSERT INTO product_features (feature_key, name_en, name_de, category, sort_order, status, description_en, description_de)
VALUES
  ('markers', 'Biomarkers', 'Biomarker', 'data', 10, 'active',
   'Track blood markers, vitals, and body measurements', 'Blutmarker, Vitalwerte und Koerpermessungen verfolgen'),
  ('history', 'Data History', 'Datenverlauf', 'data', 20, 'active',
   'Access your historical health data', 'Zugriff auf Ihre historischen Gesundheitsdaten'),
  ('calculated_markers', 'Calculated Markers', 'Berechnete Marker', 'data', 30, 'active',
   'Auto-computed health scores like GKI, BMI, HOMA-IR', 'Automatisch berechnete Werte wie GKI, BMI, HOMA-IR'),
  ('measurement_templates', 'Measurement Templates', 'Messvorlagen', 'data', 40, 'active',
   'Save reusable measurement routines', 'Wiederverwendbare Messroutinen speichern'),
  ('medications', 'Medication Tracking', 'Medikamentenverfolgung', 'data', 50, 'active',
   'Track supplements and medications', 'Nahrungsergaenzungsmittel und Medikamente verfolgen'),
  ('body_composition', 'Body Composition', 'Koerperzusammensetzung', 'data', 60, 'active',
   'Fat, muscle, water, and bone tracking', 'Fett-, Muskel-, Wasser- und Knochenverfolgung'),
  ('custom_thresholds', 'Custom Thresholds', 'Benutzerdefinierte Schwellenwerte', 'data', 70, 'active',
   'Set your own reference ranges per marker', 'Eigene Referenzbereiche pro Marker festlegen'),
  ('lifestyle_presets', 'Lifestyle Presets', 'Lebensstil-Vorlagen', 'data', 80, 'active',
   'Preset protocols for keto, fasting, carnivore', 'Voreingestellte Protokolle fuer Keto, Fasten, Fleisch'),
  ('protocol_comparison', 'Protocol Comparison', 'Protokollvergleich', 'data', 90, 'active',
   'Compare results across diet and fasting protocols', 'Ergebnisse ueber Ernaehrungs- und Fastenprotokolle vergleichen'),
  ('supplement_marker_impact', 'Supplement-Marker Impact', 'Supplement-Marker Auswirkung', 'data', 100, 'active',
   'See how supplements affect your markers', 'Sehen Sie, wie Nahrungsergaenzungsmittel Ihre Marker beeinflussen')
ON CONFLICT (feature_key) DO NOTHING;

-- Category: reporting
INSERT INTO product_features (feature_key, name_en, name_de, category, sort_order, status, description_en, description_de)
VALUES
  ('csv_export', 'CSV Export', 'CSV-Export', 'reporting', 10, 'active',
   'Download your data as CSV', 'Daten als CSV herunterladen'),
  ('json_export', 'JSON Export', 'JSON-Export', 'reporting', 20, 'active',
   'Download your data as JSON', 'Daten als JSON herunterladen'),
  ('pdf_reports', 'PDF Health Reports', 'PDF-Gesundheitsberichte', 'reporting', 30, 'active',
   'Generate styled PDF health reports', 'Gestaltete PDF-Gesundheitsberichte erstellen')
ON CONFLICT (feature_key) DO NOTHING;

-- Category: ai
INSERT INTO product_features (feature_key, name_en, name_de, category, sort_order, status, description_en, description_de)
VALUES
  ('ai_dashboard_insights', 'AI Dashboard Insights', 'KI-Dashboard-Einblicke', 'ai', 10, 'active',
   'Automated trend observations on your dashboard', 'Automatische Trendbeobachtungen auf Ihrem Dashboard'),
  ('chat_general', 'Dr. Alex - General Health', 'Dr. Alex - Allgemeine Gesundheit', 'ai', 20, 'active',
   'AI health assistant for general questions', 'KI-Gesundheitsassistent fuer allgemeine Fragen'),
  ('chat_trends', 'Trend Analysis Chat', 'Trendanalyse-Chat', 'ai', 30, 'active',
   'AI-powered trend analysis of your markers', 'KI-gestuetzte Trendanalyse Ihrer Marker'),
  ('chat_labs', 'Lab Explanation Chat', 'Laborerklaerung-Chat', 'ai', 40, 'active',
   'Get AI explanations for lab results', 'KI-Erklaerungen fuer Laborergebnisse erhalten'),
  ('chat_diet', 'Personalized Nutrition Chat', 'Personalisierte Ernaehrung-Chat', 'ai', 50, 'active',
   'AI-driven personalized diet recommendations', 'KI-gestuetzte personalisierte Ernaehrungsempfehlungen'),
  ('chat_supplements', 'Supplement Review Chat', 'Nahrungsergaenzung-Chat', 'ai', 60, 'active',
   'AI supplement review and recommendations', 'KI-Nahrungsergaenzungsmittel-Bewertung und Empfehlungen'),
  ('chat_protocols', 'Protocol Comparison Chat', 'Protokollvergleich-Chat', 'ai', 70, 'active',
   'Compare health protocols with AI guidance', 'Gesundheitsprotokolle mit KI-Unterstuetzung vergleichen'),
  ('lab_import', 'Lab Result Import', 'Laborergebnis-Import', 'ai', 80, 'active',
   'AI-assisted lab result parsing and import', 'KI-gestuetztes Parsen und Importieren von Laborergebnissen'),
  ('med_import', 'Medication Import', 'Medikamenten-Import', 'ai', 90, 'active',
   'AI-assisted medication list import', 'KI-gestuetzter Import von Medikamentenlisten'),
  ('cohort_comparison', 'Cohort Comparison', 'Kohortenvergleich', 'ai', 100, 'active',
   'Anonymous benchmarking against similar users', 'Anonymer Vergleich mit aehnlichen Nutzern')
ON CONFLICT (feature_key) DO NOTHING;

-- Category: security
INSERT INTO product_features (feature_key, name_en, name_de, category, sort_order, status, description_en, description_de)
VALUES
  ('mfa_totp', 'Two-Factor Authentication', 'Zwei-Faktor-Authentifizierung', 'security', 10, 'active',
   'TOTP-based two-factor authentication', 'TOTP-basierte Zwei-Faktor-Authentifizierung')
ON CONFLICT (feature_key) DO NOTHING;

-- Category: integrations
INSERT INTO product_features (feature_key, name_en, name_de, category, sort_order, status, description_en, description_de)
VALUES
  ('api_access', 'REST API Access', 'REST-API-Zugang', 'integrations', 10, 'active',
   'Programmatic access to your health data', 'Programmatischer Zugriff auf Ihre Gesundheitsdaten'),
  ('self_hosted_hybrid', 'Self-Hosted Hybrid', 'Selbst-gehosteter Hybrid', 'integrations', 20, 'active',
   'Run your own instance with SaaS sync', 'Eigene Instanz mit SaaS-Synchronisierung betreiben')
ON CONFLICT (feature_key) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- Seed: tier_features
-- We use a DO block so we can reference feature IDs by key
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  fid UUID;
BEGIN

  -- ── markers ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'markers';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'All', 'Alle'),
      ('glimpse', fid, true,  15,   '15 markers', '15 Marker'),
      ('focus',   fid, true,  NULL, 'All 75+', 'Alle 75+'),
      ('insight', fid, true,  NULL, 'All 75+', 'Alle 75+'),
      ('clarity', fid, true,  NULL, 'All 75+', 'Alle 75+'),
      ('horizon', fid, true,  NULL, 'All 75+', 'Alle 75+')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── history ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'history';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, true,  90,   '90 days', '90 Tage'),
      ('focus',   fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('insight', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── calculated_markers ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'calculated_markers';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'All', 'Alle'),
      ('glimpse', fid, true,  3,    '3 markers', '3 Marker'),
      ('focus',   fid, true,  NULL, 'All 22+', 'Alle 22+'),
      ('insight', fid, true,  NULL, 'All 22+', 'Alle 22+'),
      ('clarity', fid, true,  NULL, 'All 22+', 'Alle 22+'),
      ('horizon', fid, true,  NULL, 'All 22+', 'Alle 22+')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── measurement_templates ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'measurement_templates';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, true,  1,    '1 template', '1 Vorlage'),
      ('focus',   fid, true,  3,    '3 templates', '3 Vorlagen'),
      ('insight', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── medications ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'medications';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, true,  5,    '5 medications', '5 Medikamente'),
      ('focus',   fid, true,  10,   '10 medications', '10 Medikamente'),
      ('insight', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── body_composition ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'body_composition';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes', 'Ja'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, true,  NULL, 'Yes', 'Ja'),
      ('insight', fid, true,  NULL, 'Yes', 'Ja'),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── custom_thresholds ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'custom_thresholds';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes', 'Ja'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, true,  NULL, 'Yes', 'Ja'),
      ('insight', fid, true,  NULL, 'Yes', 'Ja'),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── lifestyle_presets ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'lifestyle_presets';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes', 'Ja'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, true,  NULL, 'Yes', 'Ja'),
      ('insight', fid, true,  NULL, 'Yes', 'Ja'),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── protocol_comparison ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'protocol_comparison';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes', 'Ja'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, true,  NULL, 'Yes', 'Ja'),
      ('insight', fid, true,  NULL, 'Yes', 'Ja'),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── supplement_marker_impact ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'supplement_marker_impact';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes', 'Ja'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, true,  NULL, 'Yes', 'Ja'),
      ('insight', fid, true,  NULL, 'Yes', 'Ja'),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── csv_export ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'csv_export';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes', 'Ja'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, true,  NULL, 'Yes', 'Ja'),
      ('insight', fid, true,  NULL, 'Yes', 'Ja'),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── json_export ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'json_export';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes', 'Ja'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, true,  NULL, 'Yes', 'Ja'),
      ('insight', fid, true,  NULL, 'Yes', 'Ja'),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── pdf_reports ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'pdf_reports';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, false, NULL, NULL, NULL),
      ('insight', fid, true,  1,    '1/month', '1/Monat'),
      ('clarity', fid, true,  2,    '2/month', '2/Monat'),
      ('horizon', fid, true,  NULL, 'Unlimited (weekly)', 'Unbegrenzt (woechentlich)')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── mfa_totp ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'mfa_totp';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes', 'Ja'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, true,  NULL, 'Yes', 'Ja'),
      ('insight', fid, true,  NULL, 'Yes', 'Ja'),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── ai_dashboard_insights ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'ai_dashboard_insights';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, false, NULL, NULL, NULL),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, false, NULL, NULL, NULL),
      ('insight', fid, true,  NULL, 'Yes', 'Ja'),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── chat_general ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'chat_general';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, true,  3,    '3/month', '3/Monat'),
      ('focus',   fid, true,  10,   '10/month', '10/Monat'),
      ('insight', fid, true,  30,   '30/month', '30/Monat'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── chat_trends ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'chat_trends';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, true,  1,    '1/month', '1/Monat'),
      ('focus',   fid, true,  3,    '3/month', '3/Monat'),
      ('insight', fid, true,  10,   '10/month', '10/Monat'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── chat_labs ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'chat_labs';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, true,  1,    '1/month', '1/Monat'),
      ('focus',   fid, true,  3,    '3/month', '3/Monat'),
      ('insight', fid, true,  10,   '10/month', '10/Monat'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── chat_diet ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'chat_diet';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, false, 0,    NULL, NULL),
      ('focus',   fid, true,  3,    '3/month', '3/Monat'),
      ('insight', fid, true,  10,   '10/month', '10/Monat'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── chat_supplements ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'chat_supplements';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, false, 0,    NULL, NULL),
      ('focus',   fid, true,  3,    '3/month', '3/Monat'),
      ('insight', fid, true,  10,   '10/month', '10/Monat'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── chat_protocols ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'chat_protocols';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, false, 0,    NULL, NULL),
      ('focus',   fid, false, 0,    NULL, NULL),
      ('insight', fid, true,  5,    '5/month', '5/Monat'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── lab_import ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'lab_import';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, false, 0,    NULL, NULL),
      ('focus',   fid, false, 0,    NULL, NULL),
      ('insight', fid, true,  3,    '3/month', '3/Monat'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── med_import ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'med_import';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, false, 0,    NULL, NULL),
      ('focus',   fid, false, 0,    NULL, NULL),
      ('insight', fid, true,  1,    '1/month', '1/Monat'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── cohort_comparison ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'cohort_comparison';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, false, NULL, NULL, NULL),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, false, NULL, NULL, NULL),
      ('insight', fid, false, NULL, NULL, NULL),
      ('clarity', fid, true,  NULL, 'Yes', 'Ja'),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── api_access ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'api_access';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes', 'Ja'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, false, NULL, NULL, NULL),
      ('insight', fid, false, NULL, NULL, NULL),
      ('clarity', fid, false, NULL, NULL, NULL),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── self_hosted_hybrid ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'self_hosted_hybrid';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Yes (full)', 'Ja (vollstaendig)'),
      ('glimpse', fid, false, NULL, NULL, NULL),
      ('focus',   fid, false, NULL, NULL, NULL),
      ('insight', fid, false, NULL, NULL, NULL),
      ('clarity', fid, false, NULL, NULL, NULL),
      ('horizon', fid, true,  NULL, 'Yes', 'Ja')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

END $$;
