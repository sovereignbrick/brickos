-- ============================================================================
-- Migration 011: Roles 5->3 consolidation + canonical tier/feature seed
-- Sprint 040, design 022, issue #463
--
-- Two coupled changes that close out Phase A:
--
-- 1. ROLES: collapse the 5-role org_members.role enum to 3:
--    - owner             -> org_owner
--    - tech_admin        -> org_owner   (combined; office-manager-without-billing
--    - commercial_admin  -> org_owner    is an unusual case for our market)
--    - editor            -> practitioner
--    - consumer          -> member
--    Add CHECK constraint enforcing the 3 valid roles.
--
-- 2. CANONICAL SEED: populate brickos.feature_registry and brickos.tier_features
--    (the new tables from migration 009) with the namespaced SHI features
--    (`shi.*`) and the locked Glimpse=10-markers / calc-unlimited limits from
--    design 022 §2.2-§2.3. Coexists with the legacy SHI public.product_features
--    + public.tier_features in the SHI database -- those will be deprecated and
--    dropped only after #467 (SHI tier.rs facade refactor) ships.
--
-- IMPORTANT: SHI code (middleware/auth.rs, handlers/admin_orgs.rs) was already
-- updated in the same commit batch to use the 3 new role names. The schema
-- migration runs SECOND so the running binary doesn't see rows it can't
-- match. See sprint-040-lessons.md for the M8 "code first, schema second"
-- pattern.
--
-- See: docs/design/022-licensing-model.md §3.2, §2.2-§2.3, §13.5 M8
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Roles 5->3: rewrite existing org_members rows
-- ----------------------------------------------------------------------------

UPDATE brickos.org_members
SET role = CASE role
    WHEN 'owner'             THEN 'org_owner'
    WHEN 'tech_admin'        THEN 'org_owner'
    WHEN 'commercial_admin'  THEN 'org_owner'
    WHEN 'editor'            THEN 'practitioner'
    WHEN 'consumer'          THEN 'member'
    ELSE role
END
WHERE role IN ('owner', 'tech_admin', 'commercial_admin', 'editor', 'consumer');

-- Add CHECK constraint to lock the new enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_schema = 'brickos'
          AND table_name = 'org_members'
          AND constraint_name = 'org_members_role_check'
    ) THEN
        ALTER TABLE brickos.org_members
            ADD CONSTRAINT org_members_role_check
            CHECK (role IN ('org_owner', 'practitioner', 'member'));
    END IF;
END $$;

COMMENT ON COLUMN brickos.org_members.role IS
  'Org membership role. 3 values after Sprint 040 #463: org_owner | practitioner | member. Display labels are customizable per-org via organizations.branding.role_labels.';

-- ----------------------------------------------------------------------------
-- 2. Canonical seed: feature_registry
--
-- All SHI features under shi.* namespace, plus cross-app branding.* and support.*
-- ----------------------------------------------------------------------------

INSERT INTO brickos.feature_registry (slug, app_slug, category, name_en, name_de, description_en, description_de, is_active) VALUES
  -- ── shi.* data tracking ──────────────────────────────────────────────────
  ('shi.markers_active',          'sovereign-health', 'data',     'Active biomarkers',           'Aktive Biomarker',
    'Number of biomarkers a user can actively track. Glimpse: 10 active, others preserved read-only.',
    'Anzahl der Biomarker, die ein Nutzer aktiv verfolgen kann. Glimpse: 10 aktiv, weitere als Archiv lesbar.', true),
  ('shi.history_days',            'sovereign-health', 'data',     'History days',                'Verlaufstage',
    'How far back the user can see measurement history.',
    'Wie weit zurueck der Nutzer den Messverlauf einsehen kann.', true),
  ('shi.calculated_markers',      'sovereign-health', 'data',     'Calculated markers',          'Berechnete Marker',
    'Auto-derived markers (GKI, BMI, WHtR, ratios). Unlimited for all tiers.',
    'Automatisch abgeleitete Marker (GKI, BMI, WHtR, Verhaeltnisse). Unbegrenzt fuer alle Stufen.', true),
  ('shi.measurement_templates',   'sovereign-health', 'data',     'Measurement templates',       'Messvorlagen',
    'Saved measurement routines.',
    'Gespeicherte Messroutinen.', true),
  ('shi.medications',             'sovereign-health', 'data',     'Medication tracking',         'Medikamentenverfolgung',
    'Track supplements and medications.',
    'Nahrungsergaenzungsmittel und Medikamente verfolgen.', true),
  ('shi.measurement_count',       'sovereign-health', 'data',     'Stored measurements',         'Gespeicherte Messungen',
    'Total measurement storage cap.',
    'Gesamtspeicher-Limit fuer Messungen.', true),
  ('shi.body_composition',        'sovereign-health', 'data',     'Body composition',            'Koerperzusammensetzung',
    'Fat, muscle, water, and bone tracking.',
    'Fett-, Muskel-, Wasser- und Knochenverfolgung.', true),
  ('shi.custom_thresholds',       'sovereign-health', 'data',     'Reference ranges',            'Referenzbereiche',
    'Set your own reference ranges per marker.',
    'Eigene Referenzbereiche pro Marker festlegen.', true),
  ('shi.lifestyle_presets',       'sovereign-health', 'data',     'Lifestyle presets',           'Lebensstil-Vorlagen',
    'Preset protocols for keto, fasting, carnivore.',
    'Voreingestellte Protokolle fuer Keto, Fasten, Fleisch.', true),
  ('shi.protocol_comparison',     'sovereign-health', 'data',     'Protocol comparison',         'Protokollvergleich',
    'Compare results across diet and fasting protocols.',
    'Ergebnisse ueber Ernaehrungs- und Fastenprotokolle vergleichen.', true),
  ('shi.supplement_marker_impact','sovereign-health', 'data',     'Supplement-marker impact',    'Supplement-Marker Auswirkung',
    'See how supplements affect your markers.',
    'Sehen Sie, wie Nahrungsergaenzungsmittel Ihre Marker beeinflussen.', true),

  -- ── shi.* reporting / export ─────────────────────────────────────────────
  ('shi.csv_export',              'sovereign-health', 'reporting','CSV export',                  'CSV-Export',
    'Download your data as CSV.',
    'Daten als CSV herunterladen.', true),
  ('shi.json_export',             'sovereign-health', 'reporting','JSON export',                 'JSON-Export',
    'Download your data as JSON.',
    'Daten als JSON herunterladen.', true),
  ('shi.pdf_reports',             'sovereign-health', 'reporting','PDF health reports',          'PDF-Gesundheitsberichte',
    'Generate styled PDF health reports.',
    'Gestaltete PDF-Gesundheitsberichte erstellen.', true),

  -- ── shi.* AI ─────────────────────────────────────────────────────────────
  ('shi.ai_dashboard_insights',   'sovereign-health', 'ai',       'AI dashboard insights',       'KI-Dashboard-Einblicke',
    'Automated trend observations on your dashboard.',
    'Automatische Trendbeobachtungen auf Ihrem Dashboard.', true),
  ('shi.ai_chat_quota',           'sovereign-health', 'ai',       'AI chat (any agent)',         'KI-Chat (alle Agenten)',
    'Pooled monthly chat quota across all Dr. Alex agents.',
    'Gemeinsames monatliches Chat-Kontingent fuer alle Dr.-Alex-Agenten.', true),
  ('shi.smart_import',            'sovereign-health', 'ai',       'Smart lab import',            'Intelligenter Laborimport',
    'AI-assisted lab result parsing and import.',
    'KI-gestuetztes Parsen und Importieren von Laborergebnissen.', true),
  ('shi.cohort_comparison',       'sovereign-health', 'ai',       'Cohort comparison',           'Kohortenvergleich',
    'Anonymous benchmarking against similar users.',
    'Anonymer Vergleich mit aehnlichen Nutzern.', true),

  -- ── shi.* security ───────────────────────────────────────────────────────
  ('shi.mfa_totp',                'sovereign-health', 'security', 'Two-factor authentication',   'Zwei-Faktor-Authentifizierung',
    'TOTP-based two-factor authentication. Always available, never gated.',
    'TOTP-basierte Zwei-Faktor-Authentifizierung. Immer verfuegbar, nie eingeschraenkt.', true),

  -- ── shi.* integrations ───────────────────────────────────────────────────
  ('shi.api_access',              'sovereign-health', 'integrations', 'REST API access',          'REST-API-Zugang',
    'Programmatic access to your health data.',
    'Programmatischer Zugriff auf Ihre Gesundheitsdaten.', true),

  -- ── branding.* (cross-app, applies to org-level white-label) ─────────────
  ('branding.custom_logo',        '_platform', 'branding', 'Custom logo',         'Eigenes Logo',
    'Replace the BrickOS logo with your own.',
    'Ersetzen Sie das BrickOS-Logo durch Ihr eigenes.', true),
  ('branding.custom_colors',      '_platform', 'branding', 'Custom colors',       'Eigene Farben',
    'Customize primary and accent colors.',
    'Passen Sie Primaer- und Akzentfarben an.', true),
  ('branding.custom_domain',      '_platform', 'branding', 'Custom domain',       'Eigene Domain',
    'Use your own domain (e.g. health.acme.com).',
    'Verwenden Sie Ihre eigene Domain (z.B. health.acme.com).', true),
  ('branding.role_labels',        '_platform', 'branding', 'Custom role labels',  'Eigene Rollenbezeichnungen',
    'Override the default role display names per organization.',
    'Ueberschreiben Sie die Standard-Rollenbezeichnungen pro Organisation.', true),

  -- ── support.* (cross-app, support tier) ──────────────────────────────────
  ('support.community',           '_platform', 'support', 'Community support',    'Community-Support',
    'GitHub issues and community forum.',
    'GitHub-Issues und Community-Forum.', true),
  ('support.email',               '_platform', 'support', 'Email support',        'E-Mail-Support',
    'Email support during business hours.',
    'E-Mail-Support waehrend der Geschaeftszeiten.', true),
  ('support.priority',            '_platform', 'support', 'Priority support',     'Prioritaets-Support',
    '8h response SLA during business hours.',
    'Antwortzeit von 8 Stunden waehrend der Geschaeftszeiten.', true),
  ('support.sla_24x7',            '_platform', 'support', '24/7 support',         '24/7-Support',
    '1h response SLA, 24/7, with on-call rotation.',
    '1-Stunden-Antwortzeit, 24/7, mit Bereitschaftsdienst-Rotation.', true)

ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Canonical seed: tier_features
--
-- Canonical limits per design 022 §2.2 (locked decisions):
--   - Glimpse: 10 active markers, 30d history, 3/mo AI chat, 1 template
--   - Calculated markers: UNLIMITED for all tiers (derived from biomarkers)
--   - MFA TOTP: always available, never gated
--   - All higher tiers inherit + add features
--
-- The (tier_slug, feature_slug) PK + ON CONFLICT DO NOTHING makes the seed
-- idempotent. To change a limit, run a separate UPDATE migration.
-- ----------------------------------------------------------------------------

INSERT INTO brickos.tier_features (tier_slug, feature_slug, included, limit_value, limit_label_en, limit_label_de) VALUES
  -- ── Glimpse (free) ───────────────────────────────────────────────────────
  ('glimpse', 'shi.markers_active',           true,  10,    '10 active', '10 aktiv'),
  ('glimpse', 'shi.history_days',             true,  30,    '30 days', '30 Tage'),
  ('glimpse', 'shi.calculated_markers',       true,  NULL,  'unlimited', 'unbegrenzt'),
  ('glimpse', 'shi.measurement_templates',    true,  1,     '1 template', '1 Vorlage'),
  ('glimpse', 'shi.medications',              true,  5,     '5 medications', '5 Medikamente'),
  ('glimpse', 'shi.measurement_count',        true,  100,   '100 measurements', '100 Messungen'),
  ('glimpse', 'shi.body_composition',         false, NULL,  NULL, NULL),
  ('glimpse', 'shi.custom_thresholds',        false, NULL,  NULL, NULL),
  ('glimpse', 'shi.lifestyle_presets',        false, NULL,  NULL, NULL),
  ('glimpse', 'shi.protocol_comparison',      false, NULL,  NULL, NULL),
  ('glimpse', 'shi.supplement_marker_impact', false, NULL,  NULL, NULL),
  ('glimpse', 'shi.csv_export',               false, NULL,  NULL, NULL),
  ('glimpse', 'shi.json_export',              false, NULL,  NULL, NULL),
  ('glimpse', 'shi.pdf_reports',              false, NULL,  NULL, NULL),
  ('glimpse', 'shi.ai_dashboard_insights',    false, NULL,  NULL, NULL),
  ('glimpse', 'shi.ai_chat_quota',            true,  3,     '3/month', '3/Monat'),
  ('glimpse', 'shi.smart_import',             false, NULL,  NULL, NULL),
  ('glimpse', 'shi.cohort_comparison',        false, NULL,  NULL, NULL),
  ('glimpse', 'shi.mfa_totp',                 true,  NULL,  'yes', 'ja'),
  ('glimpse', 'shi.api_access',               false, NULL,  NULL, NULL),
  ('glimpse', 'support.community',            true,  NULL,  'yes', 'ja'),

  -- ── Focus ────────────────────────────────────────────────────────────────
  ('focus', 'shi.markers_active',             true,  75,    '75 active', '75 aktiv'),
  ('focus', 'shi.history_days',               true,  NULL,  'unlimited', 'unbegrenzt'),
  ('focus', 'shi.calculated_markers',         true,  NULL,  'unlimited', 'unbegrenzt'),
  ('focus', 'shi.measurement_templates',      true,  3,     '3 templates', '3 Vorlagen'),
  ('focus', 'shi.medications',                true,  10,    '10 medications', '10 Medikamente'),
  ('focus', 'shi.measurement_count',          true,  NULL,  'unlimited', 'unbegrenzt'),
  ('focus', 'shi.body_composition',           true,  NULL,  'yes', 'ja'),
  ('focus', 'shi.custom_thresholds',          true,  NULL,  'yes', 'ja'),
  ('focus', 'shi.lifestyle_presets',          true,  NULL,  'yes', 'ja'),
  ('focus', 'shi.protocol_comparison',        true,  NULL,  'yes', 'ja'),
  ('focus', 'shi.supplement_marker_impact',   false, NULL,  NULL, NULL),
  ('focus', 'shi.csv_export',                 true,  NULL,  'yes', 'ja'),
  ('focus', 'shi.json_export',                true,  NULL,  'yes', 'ja'),
  ('focus', 'shi.pdf_reports',                false, NULL,  NULL, NULL),
  ('focus', 'shi.ai_dashboard_insights',      false, NULL,  NULL, NULL),
  ('focus', 'shi.ai_chat_quota',              true,  5,     '5/month', '5/Monat'),
  ('focus', 'shi.smart_import',               false, NULL,  NULL, NULL),
  ('focus', 'shi.cohort_comparison',          false, NULL,  NULL, NULL),
  ('focus', 'shi.mfa_totp',                   true,  NULL,  'yes', 'ja'),
  ('focus', 'shi.api_access',                 false, NULL,  NULL, NULL),
  ('focus', 'support.email',                  true,  NULL,  'yes', 'ja'),

  -- ── Insight ──────────────────────────────────────────────────────────────
  ('insight', 'shi.markers_active',           true,  200,   '200 active', '200 aktiv'),
  ('insight', 'shi.history_days',             true,  NULL,  'unlimited', 'unbegrenzt'),
  ('insight', 'shi.calculated_markers',       true,  NULL,  'unlimited', 'unbegrenzt'),
  ('insight', 'shi.measurement_templates',    true,  5,     '5 templates', '5 Vorlagen'),
  ('insight', 'shi.medications',              true,  NULL,  'unlimited', 'unbegrenzt'),
  ('insight', 'shi.measurement_count',        true,  NULL,  'unlimited', 'unbegrenzt'),
  ('insight', 'shi.body_composition',         true,  NULL,  'yes', 'ja'),
  ('insight', 'shi.custom_thresholds',        true,  NULL,  'yes', 'ja'),
  ('insight', 'shi.lifestyle_presets',        true,  NULL,  'yes', 'ja'),
  ('insight', 'shi.protocol_comparison',      true,  NULL,  'yes', 'ja'),
  ('insight', 'shi.supplement_marker_impact', true,  NULL,  'yes', 'ja'),
  ('insight', 'shi.csv_export',               true,  NULL,  'yes', 'ja'),
  ('insight', 'shi.json_export',              true,  NULL,  'yes', 'ja'),
  ('insight', 'shi.pdf_reports',              true,  1,     '1/month', '1/Monat'),
  ('insight', 'shi.ai_dashboard_insights',    true,  NULL,  'yes', 'ja'),
  ('insight', 'shi.ai_chat_quota',            true,  15,    '15/month', '15/Monat'),
  ('insight', 'shi.smart_import',             true,  3,     '3/month', '3/Monat'),
  ('insight', 'shi.cohort_comparison',        false, NULL,  NULL, NULL),
  ('insight', 'shi.mfa_totp',                 true,  NULL,  'yes', 'ja'),
  ('insight', 'shi.api_access',               false, NULL,  NULL, NULL),
  ('insight', 'support.email',                true,  NULL,  'yes', 'ja'),

  -- ── Clarity ──────────────────────────────────────────────────────────────
  ('clarity', 'shi.markers_active',           true,  NULL,  'unlimited', 'unbegrenzt'),
  ('clarity', 'shi.history_days',             true,  NULL,  'unlimited', 'unbegrenzt'),
  ('clarity', 'shi.calculated_markers',       true,  NULL,  'unlimited', 'unbegrenzt'),
  ('clarity', 'shi.measurement_templates',    true,  NULL,  'unlimited', 'unbegrenzt'),
  ('clarity', 'shi.medications',              true,  NULL,  'unlimited', 'unbegrenzt'),
  ('clarity', 'shi.measurement_count',        true,  NULL,  'unlimited', 'unbegrenzt'),
  ('clarity', 'shi.body_composition',         true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.custom_thresholds',        true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.lifestyle_presets',        true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.protocol_comparison',      true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.supplement_marker_impact', true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.csv_export',               true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.json_export',              true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.pdf_reports',              true,  2,     '2/month', '2/Monat'),
  ('clarity', 'shi.ai_dashboard_insights',    true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.ai_chat_quota',            true,  NULL,  'unlimited', 'unbegrenzt'),
  ('clarity', 'shi.smart_import',             true,  NULL,  'unlimited', 'unbegrenzt'),
  ('clarity', 'shi.cohort_comparison',        true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.mfa_totp',                 true,  NULL,  'yes', 'ja'),
  ('clarity', 'shi.api_access',               true,  NULL,  'yes', 'ja'),
  ('clarity', 'support.priority',             true,  NULL,  'yes', 'ja'),

  -- ── Horizon (org / white-label) ──────────────────────────────────────────
  ('horizon', 'shi.markers_active',           true,  NULL,  'unlimited', 'unbegrenzt'),
  ('horizon', 'shi.history_days',             true,  NULL,  'unlimited', 'unbegrenzt'),
  ('horizon', 'shi.calculated_markers',       true,  NULL,  'unlimited', 'unbegrenzt'),
  ('horizon', 'shi.measurement_templates',    true,  NULL,  'unlimited', 'unbegrenzt'),
  ('horizon', 'shi.medications',              true,  NULL,  'unlimited', 'unbegrenzt'),
  ('horizon', 'shi.measurement_count',        true,  NULL,  'unlimited', 'unbegrenzt'),
  ('horizon', 'shi.body_composition',         true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.custom_thresholds',        true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.lifestyle_presets',        true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.protocol_comparison',      true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.supplement_marker_impact', true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.csv_export',               true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.json_export',              true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.pdf_reports',              true,  NULL,  'unlimited', 'unbegrenzt'),
  ('horizon', 'shi.ai_dashboard_insights',    true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.ai_chat_quota',            true,  NULL,  'unlimited', 'unbegrenzt'),
  ('horizon', 'shi.smart_import',             true,  NULL,  'unlimited', 'unbegrenzt'),
  ('horizon', 'shi.cohort_comparison',        true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.mfa_totp',                 true,  NULL,  'yes', 'ja'),
  ('horizon', 'shi.api_access',               true,  NULL,  'yes', 'ja'),
  ('horizon', 'branding.custom_logo',         true,  NULL,  'yes', 'ja'),
  ('horizon', 'branding.custom_colors',       true,  NULL,  'yes', 'ja'),
  ('horizon', 'branding.custom_domain',       true,  NULL,  'yes', 'ja'),
  ('horizon', 'branding.role_labels',         true,  NULL,  'yes', 'ja'),
  ('horizon', 'support.priority',             true,  NULL,  'yes', 'ja'),

  -- ── Core (self-hosted, AGPL) ─────────────────────────────────────────────
  ('core', 'shi.markers_active',              true,  NULL,  'unlimited', 'unbegrenzt'),
  ('core', 'shi.history_days',                true,  NULL,  'unlimited', 'unbegrenzt'),
  ('core', 'shi.calculated_markers',          true,  NULL,  'unlimited', 'unbegrenzt'),
  ('core', 'shi.measurement_templates',       true,  NULL,  'unlimited', 'unbegrenzt'),
  ('core', 'shi.medications',                 true,  NULL,  'unlimited', 'unbegrenzt'),
  ('core', 'shi.measurement_count',           true,  NULL,  'unlimited', 'unbegrenzt'),
  ('core', 'shi.body_composition',            true,  NULL,  'yes', 'ja'),
  ('core', 'shi.custom_thresholds',           true,  NULL,  'yes', 'ja'),
  ('core', 'shi.lifestyle_presets',           true,  NULL,  'yes', 'ja'),
  ('core', 'shi.protocol_comparison',         true,  NULL,  'yes', 'ja'),
  ('core', 'shi.supplement_marker_impact',    true,  NULL,  'yes', 'ja'),
  ('core', 'shi.csv_export',                  true,  NULL,  'yes', 'ja'),
  ('core', 'shi.json_export',                 true,  NULL,  'yes', 'ja'),
  ('core', 'shi.pdf_reports',                 true,  NULL,  'unlimited', 'unbegrenzt'),
  ('core', 'shi.ai_dashboard_insights',       false, NULL,  NULL, NULL),
  ('core', 'shi.ai_chat_quota',               true,  NULL,  'unlimited', 'unbegrenzt'),
  ('core', 'shi.smart_import',                true,  NULL,  'unlimited', 'unbegrenzt'),
  ('core', 'shi.cohort_comparison',           false, NULL,  NULL, NULL),
  ('core', 'shi.mfa_totp',                    true,  NULL,  'yes', 'ja'),
  ('core', 'shi.api_access',                  true,  NULL,  'yes', 'ja'),
  ('core', 'support.community',               true,  NULL,  'yes', 'ja')

ON CONFLICT (tier_slug, feature_slug) DO NOTHING;
