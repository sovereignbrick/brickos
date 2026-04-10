-- ----------------------------------------------------------------------------
-- Sprint 040 #486 -- register Sovereign CRM and Sovereign Link features
-- in brickos.feature_registry, plus the tier_features mappings.
--
-- design 022 §4.5 -- a brickos admin must be able to build cross-app license
-- bundles from day 1, even before the apps wire up runtime enforcement.
--
-- The actual `has_feature("crm.lead_capture")` enforcement in the CRM/Link
-- binaries is intentionally OUT OF SCOPE here -- those land in per-app
-- follow-up sprints. This migration just makes the features visible to
-- the multi-app feature picker (#479) and resolvable by brickos-licensing.
--
-- Initial bundling rule (locked decision): every CRM/Link feature is
-- available on the brickos.* "horizon" and "core" tiers. Lower tiers do
-- not include any CRM/Link features. Per-customer overrides happen via
-- the JWT features array on individual org licenses.
-- ----------------------------------------------------------------------------

-- 1. CRM features
INSERT INTO brickos.feature_registry (slug, app_slug, category, name_en, name_de, description_en, description_de, is_active) VALUES
  ('crm.lead_capture',         'sovereign-crm', 'data',
    'Lead capture',           'Lead-Erfassung',
    'Capture leads via web forms, manual entry, or API.',
    'Leads ueber Webformulare, manuelle Eingabe oder API erfassen.', true),
  ('crm.email_sequences',      'sovereign-crm', 'communication',
    'Email sequences',        'E-Mail-Sequenzen',
    'Multi-step email drip campaigns triggered by lead actions.',
    'Mehrstufige E-Mail-Kampagnen, ausgeloest durch Lead-Aktionen.', true),
  ('crm.audio_recording',      'sovereign-crm', 'data',
    'Audio call recording',   'Anrufaufzeichnung',
    'Record sales calls inline. Storage included up to tier cap.',
    'Verkaufsgespraeche inline aufzeichnen. Speicher im Tarif inklusive.', true),
  ('crm.audio_transcription',  'sovereign-crm', 'ai',
    'Audio transcription',    'Audio-Transkription',
    'Whisper-based transcription of recorded calls with diarization.',
    'Whisper-basierte Transkription aufgezeichneter Anrufe mit Sprechererkennung.', true),
  ('crm.advanced_search',      'sovereign-crm', 'data',
    'Advanced search',        'Erweiterte Suche',
    'Full-text + tag-based search across leads, notes, and call transcripts.',
    'Volltext- und tag-basierte Suche ueber Leads, Notizen und Anruftranskripte.', true),
  ('crm.api_access',           'sovereign-crm', 'integrations',
    'CRM REST API access',    'CRM REST-API-Zugang',
    'Programmatic access to CRM data.',
    'Programmatischer Zugriff auf CRM-Daten.', true),
  ('crm.csv_export',           'sovereign-crm', 'reporting',
    'CRM CSV export',         'CRM CSV-Export',
    'Download leads, contacts and pipeline data as CSV.',
    'Leads, Kontakte und Pipeline-Daten als CSV herunterladen.', true),
  ('crm.custom_pipelines',     'sovereign-crm', 'data',
    'Custom pipelines',       'Eigene Pipelines',
    'Define custom sales pipelines with arbitrary stages.',
    'Eigene Sales-Pipelines mit beliebigen Phasen definieren.', true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Link features
INSERT INTO brickos.feature_registry (slug, app_slug, category, name_en, name_de, description_en, description_de, is_active) VALUES
  ('link.api_access',          'sovereign-link', 'integrations',
    'Link REST API access',   'Link REST-API-Zugang',
    'Programmatic short-link creation and analytics.',
    'Programmatische Erstellung von Kurzlinks und Analyse.', true),
  ('link.custom_domains',      'sovereign-link', 'branding',
    'Custom short-link domains', 'Eigene Kurzlink-Domains',
    'Use your own domain (e.g. go.acme.com) for short links.',
    'Eigene Domain (z.B. go.acme.com) fuer Kurzlinks verwenden.', true),
  ('link.affiliate_tracking',  'sovereign-link', 'data',
    'Affiliate tracking',     'Affiliate-Tracking',
    'Per-link affiliate code attribution and conversion tracking.',
    'Affiliate-Code-Zuordnung pro Link und Konversionsverfolgung.', true),
  ('link.click_analytics',     'sovereign-link', 'reporting',
    'Click analytics',        'Klick-Analyse',
    'Per-link click counts, time series, geographic and referrer breakdown.',
    'Klickzahlen pro Link, Zeitreihen, geografische und Referrer-Aufschluesselung.', true),
  ('link.bulk_create',         'sovereign-link', 'data',
    'Bulk link creation',     'Massen-Linkerstellung',
    'Create thousands of short links via CSV upload or API.',
    'Tausende Kurzlinks per CSV-Upload oder API erstellen.', true)
ON CONFLICT (slug) DO NOTHING;

-- 3. Tier mappings -- horizon + core get every CRM/Link feature
-- (initial bundling rule per the issue body; per-customer overrides flow
-- through individual org_licenses.features at JWT issuance time)

-- horizon tier: every CRM feature
INSERT INTO brickos.tier_features (tier_slug, feature_slug, included, limit_value, limit_label_en, limit_label_de) VALUES
  ('horizon', 'crm.lead_capture',         true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.email_sequences',      true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.audio_recording',      true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.audio_transcription',  true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.advanced_search',      true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.api_access',           true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.csv_export',           true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.custom_pipelines',     true, NULL, 'yes', 'ja')
ON CONFLICT (tier_slug, feature_slug) DO NOTHING;

-- horizon tier: every Link feature
INSERT INTO brickos.tier_features (tier_slug, feature_slug, included, limit_value, limit_label_en, limit_label_de) VALUES
  ('horizon', 'link.api_access',          true, NULL, 'yes', 'ja'),
  ('horizon', 'link.custom_domains',      true, NULL, 'yes', 'ja'),
  ('horizon', 'link.affiliate_tracking',  true, NULL, 'yes', 'ja'),
  ('horizon', 'link.click_analytics',     true, NULL, 'yes', 'ja'),
  ('horizon', 'link.bulk_create',         true, NULL, 'yes', 'ja')
ON CONFLICT (tier_slug, feature_slug) DO NOTHING;

-- core tier: every CRM feature
INSERT INTO brickos.tier_features (tier_slug, feature_slug, included, limit_value, limit_label_en, limit_label_de) VALUES
  ('core', 'crm.lead_capture',         true, NULL, 'yes', 'ja'),
  ('core', 'crm.email_sequences',      true, NULL, 'yes', 'ja'),
  ('core', 'crm.audio_recording',      true, NULL, 'yes', 'ja'),
  ('core', 'crm.audio_transcription',  true, NULL, 'yes', 'ja'),
  ('core', 'crm.advanced_search',      true, NULL, 'yes', 'ja'),
  ('core', 'crm.api_access',           true, NULL, 'yes', 'ja'),
  ('core', 'crm.csv_export',           true, NULL, 'yes', 'ja'),
  ('core', 'crm.custom_pipelines',     true, NULL, 'yes', 'ja')
ON CONFLICT (tier_slug, feature_slug) DO NOTHING;

-- core tier: every Link feature
INSERT INTO brickos.tier_features (tier_slug, feature_slug, included, limit_value, limit_label_en, limit_label_de) VALUES
  ('core', 'link.api_access',          true, NULL, 'yes', 'ja'),
  ('core', 'link.custom_domains',      true, NULL, 'yes', 'ja'),
  ('core', 'link.affiliate_tracking',  true, NULL, 'yes', 'ja'),
  ('core', 'link.click_analytics',     true, NULL, 'yes', 'ja'),
  ('core', 'link.bulk_create',         true, NULL, 'yes', 'ja')
ON CONFLICT (tier_slug, feature_slug) DO NOTHING;
