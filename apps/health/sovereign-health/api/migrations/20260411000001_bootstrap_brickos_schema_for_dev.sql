-- ============================================================================
-- Sprint 041 #491 -- Bootstrap brickos.* schema in the SHI DB so cold-boot
-- works end-to-end without manual SQL surgery.
--
-- BACKGROUND
-- ----------
-- The brickos schema is logically owned by the brickos-platform-api binary
-- (crates/brickos-db/migrations/), but in dev and production today the SHI
-- binary's startup migration path references brickos.* tables in two places:
--
--   * 20260407000002_reassign_demo_profile_measurements.sql -> brickos.users
--   * 20260408000002_sovereign_voice_service_account.sql    -> brickos.service_accounts
--   * 20260408000006_org_apps.sql                           -> brickos.organizations
--
-- The brickos-db crate's migration 001 only ALTER-TABLE-SET-SCHEMA-moves
-- existing public.* tables into the brickos schema -- it does not CREATE
-- them. On a freshly-wiped DB there are no public.* tables to move, so 001
-- is a no-op and brickos.* never exists. Result: SHI's 20260407000002 hits
-- "relation brickos.users does not exist" and (per Sprint 041 #522) the
-- entire migration runner used to silently swallow that failure.
--
-- This migration explicitly CREATEs the minimum brickos.* tables and seeds
-- them with the canonical Sprint 040 licensing data. Every statement is
-- idempotent (CREATE TABLE IF NOT EXISTS / INSERT ... ON CONFLICT DO
-- NOTHING) so it is safe to run on:
--   1. A freshly-wiped dev DB              -> creates everything
--   2. A long-running dev DB with manual
--      brickos schema applied              -> no-op
--   3. A production SHI DB where brickos
--      lives in a separate physical pool   -> creates empty tables that
--                                             nobody reads (handlers query
--                                             via platform_pool, not pool)
--
-- The SHI <-> brickos chain stays loose-coupled: nothing here pretends to
-- be the source of truth for brickos. The real source of truth remains
-- crates/brickos-db/migrations/. When the true two-pool E2E env from the
-- original #491 Option A lands, this migration will be promoted to a
-- proper brickos-db migration and removed from the SHI side.
--
-- See: docs/tracker/issues/open/0491-ops-two-pool-e2e-env-for-licensing-journeys.md
-- See: docs/tracker/issues/open/0522-bug-migration-runner-silent-skip.md
-- See: docs/sprint-planning/sprints/sprint-041-lessons.md (Phase A)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS brickos;

-- ----------------------------------------------------------------------------
-- 1. brickos.users
--
-- Loose schema: NOT NULL constraints carry DEFAULT '' / 'user' so the
-- embedded_runtime tests can insert minimal rows like:
--   INSERT INTO brickos.users (id, email) VALUES (...)
-- This matches the existing test fixture in
--   crates/brickos-licensing/tests/embedded_runtime.rs::insert_user_with_tier
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email            TEXT NOT NULL UNIQUE,
    password_hash    TEXT NOT NULL DEFAULT '',
    display_name     TEXT,
    role             TEXT NOT NULL DEFAULT 'user',
    is_deleted       BOOLEAN NOT NULL DEFAULT false,
    deleted_at       TIMESTAMPTZ,
    default_org_id   UUID,
    last_active_at   TIMESTAMPTZ,
    lifecycle_status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brickos_users_email
    ON brickos.users(email);

-- ----------------------------------------------------------------------------
-- 2. brickos.organizations
--
-- The branding JSONB column is required by SHI migration 20260410000030.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.organizations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    slug          TEXT UNIQUE NOT NULL,
    org_type      TEXT NOT NULL DEFAULT 'personal',
    billing_email TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    is_deleted    BOOLEAN NOT NULL DEFAULT false,
    branding      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brickos_organizations_slug
    ON brickos.organizations(slug);

-- ----------------------------------------------------------------------------
-- 3. brickos.org_members
--
-- Sprint 040 #463 collapsed the role enum to 3 values: org_owner,
-- practitioner, member. CHECK constraint enforced inline because this
-- migration is the source of the table.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.org_members (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id    UUID NOT NULL REFERENCES brickos.organizations(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES brickos.users(id) ON DELETE CASCADE,
    role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('org_owner', 'practitioner', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_brickos_org_members_user
    ON brickos.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_brickos_org_members_org
    ON brickos.org_members(org_id);

-- ----------------------------------------------------------------------------
-- 4. brickos.service_accounts
--
-- Required by SHI migration 20260408000002 which inserts the
-- sovereign-voice service account row.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.service_accounts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL UNIQUE,
    display_name     VARCHAR(200),
    org_id           UUID NOT NULL REFERENCES brickos.organizations(id),
    api_key_hash     VARCHAR(64) NOT NULL,
    scopes           TEXT[] NOT NULL,
    rate_limit_daily INT NOT NULL DEFAULT 100,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    last_used_at     TIMESTAMPTZ,
    created_by       UUID REFERENCES brickos.users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rotated_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_brickos_service_accounts_org
    ON brickos.service_accounts(org_id);

-- ----------------------------------------------------------------------------
-- 5. brickos.license_tiers
--
-- Embedded provider's load_user_license JOINs license_tiers ON
-- license_tiers.id = user_licenses.tier_id. The slug -> id lookup happens
-- at runtime, so no deterministic UUIDs are needed.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.license_tiers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         VARCHAR(20) UNIQUE NOT NULL,
    name         VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    app_key      VARCHAR(50),
    sort_order   INT,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brickos_license_tiers_active
    ON brickos.license_tiers(app_key, is_active) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 6. brickos.user_licenses
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.user_licenses (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                    UUID NOT NULL REFERENCES brickos.users(id) ON DELETE CASCADE,
    tier_id                    UUID NOT NULL REFERENCES brickos.license_tiers(id),
    status                     VARCHAR(30) NOT NULL DEFAULT 'active',
    started_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    grace_period_ends          TIMESTAMPTZ,
    previous_tier_slug         VARCHAR(20),
    admin_override             BOOLEAN NOT NULL DEFAULT false,
    admin_override_tier_slug   VARCHAR(50),
    admin_override_expires_at  TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_brickos_user_licenses_admin_override
    ON brickos.user_licenses(user_id)
    WHERE admin_override = true AND admin_override_tier_slug IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7. brickos.feature_registry
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.feature_registry (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(100) UNIQUE NOT NULL,
    app_slug        VARCHAR(50) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    name_en         VARCHAR(200) NOT NULL,
    name_de         VARCHAR(200) NOT NULL,
    description_en  TEXT,
    description_de  TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brickos_feature_registry_app
    ON brickos.feature_registry(app_slug);
CREATE INDEX IF NOT EXISTS idx_brickos_feature_registry_active
    ON brickos.feature_registry(app_slug, is_active) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 8. brickos.tier_features
--
-- CRITICAL: PK is (tier_slug, feature_slug) -- the Sprint 040 #460
-- schema. Do NOT use the legacy (tier_id, feature_id) shape.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.tier_features (
    tier_slug       VARCHAR(50) NOT NULL,
    feature_slug    VARCHAR(100) NOT NULL REFERENCES brickos.feature_registry(slug) ON DELETE CASCADE,
    included        BOOLEAN NOT NULL DEFAULT true,
    limit_value     BIGINT,
    limit_label_en  VARCHAR(100),
    limit_label_de  VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tier_slug, feature_slug)
);

CREATE INDEX IF NOT EXISTS idx_brickos_tier_features_tier
    ON brickos.tier_features(tier_slug);

-- ----------------------------------------------------------------------------
-- 9. brickos.org_licenses
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.org_licenses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            UUID NOT NULL REFERENCES brickos.organizations(id) ON DELETE CASCADE,
    tier_slug         VARCHAR(50) NOT NULL,
    features          JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_owners        INT NOT NULL DEFAULT 1,
    max_practitioners INT NOT NULL DEFAULT 0,
    max_members       INT NOT NULL DEFAULT 0,
    issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMPTZ NOT NULL,
    revoked_at        TIMESTAMPTZ,
    jwt_token         TEXT NOT NULL,
    jti               UUID NOT NULL UNIQUE,
    issued_by         UUID REFERENCES brickos.users(id),
    notes             TEXT,
    stripe_invoice_id TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brickos_org_licenses_org
    ON brickos.org_licenses(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brickos_org_licenses_org_active
    ON brickos.org_licenses(org_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_brickos_org_licenses_expires
    ON brickos.org_licenses(expires_at) WHERE revoked_at IS NULL;

-- ----------------------------------------------------------------------------
-- 10. brickos.org_licenses_revoked
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.org_licenses_revoked (
    jti          UUID PRIMARY KEY,
    org_id       UUID NOT NULL,
    revoked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_by   UUID REFERENCES brickos.users(id),
    reason       TEXT,
    original_exp TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_brickos_org_licenses_revoked_prune
    ON brickos.org_licenses_revoked(original_exp);

-- ----------------------------------------------------------------------------
-- 11a. brickos.org_apps
--
-- Created defensively by SHI migration 20260408000006 only if
-- brickos.organizations exists at that point. On cold boot it does not,
-- so 20260408000006 no-ops and we recreate the table here. Idempotent
-- via CREATE TABLE IF NOT EXISTS.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.org_apps (
    org_id     UUID NOT NULL REFERENCES brickos.organizations(id) ON DELETE CASCADE,
    app_key    VARCHAR(50) NOT NULL,
    enabled    BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (org_id, app_key)
);

-- ----------------------------------------------------------------------------
-- 11b. brickos.admin_audit_log
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brickos.admin_audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES brickos.users(id),
    action        VARCHAR(100) NOT NULL,
    target_type   VARCHAR(50) NOT NULL,
    target_id     UUID NOT NULL,
    payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brickos_admin_audit_log_target
    ON brickos.admin_audit_log(target_type, target_id, created_at DESC);

-- ============================================================================
-- SEED DATA
--
-- All seeds use ON CONFLICT DO NOTHING so they are idempotent. The data
-- below is a verbatim copy of the canonical Sprint 040 seed from
-- crates/brickos-db/migrations/011_roles_consolidation_canonical_seed.sql
-- and crates/brickos-db/migrations/012_register_crm_link_features.sql --
-- when the true two-pool env lands, this section is deleted and the
-- brickos-db migrations become the single source of truth again.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- System organizations (well-known UUIDs from migrations 002 + 010)
-- ----------------------------------------------------------------------------

INSERT INTO brickos.organizations (id, name, slug, org_type, is_active) VALUES
  ('00000000-0000-0000-0000-000000000000', 'BrickOS',         'brickos',    'platform', true),
  ('00000000-0000-0000-0000-000000000001', 'Individual User', 'individual', 'system',   true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- License tiers (6 rows)
-- ----------------------------------------------------------------------------

INSERT INTO brickos.license_tiers (slug, name, display_name, app_key, sort_order, is_active) VALUES
  ('core',    'Core',    'Core',    'sovereign-health', 0, true),
  ('glimpse', 'Glimpse', 'Glimpse', 'sovereign-health', 1, true),
  ('focus',   'Focus',   'Focus',   'sovereign-health', 2, true),
  ('insight', 'Insight', 'Insight', 'sovereign-health', 3, true),
  ('clarity', 'Clarity', 'Clarity', 'sovereign-health', 4, true),
  ('horizon', 'Horizon', 'Horizon', 'sovereign-health', 5, true)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Demo profile users
--
-- Required by SHI migration 20260407000002 which copies measurements from
-- the demo user (id = 00000000-0000-0000-0000-000000000001) into per-profile
-- accounts looked up by these emails.
-- ----------------------------------------------------------------------------

INSERT INTO brickos.users (email, password_hash, display_name, role) VALUES
  ('optimized@sovereignhealth.io', 'dev_no_login', 'Optimized Profile', 'user'),
  ('average@sovereignhealth.io',   'dev_no_login', 'Average Profile',   'user'),
  ('atrisk@sovereignhealth.io',    'dev_no_login', 'At Risk Profile',   'user')
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Service accounts row from defended migration 20260408000002
-- ----------------------------------------------------------------------------

INSERT INTO brickos.service_accounts (
    id, name, display_name, org_id, api_key_hash, scopes,
    rate_limit_daily, is_active, created_by
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'sovereign-voice',
    'Sovereign Voice NOSTR Scheduler',
    '00000000-0000-0000-0000-000000000000',
    'pending_setup',
    '{"links:create", "links:read"}',
    1000,
    true,
    NULL
)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- org_apps rows from defended migration 20260408000006
-- ----------------------------------------------------------------------------

INSERT INTO brickos.org_apps (org_id, app_key, enabled)
SELECT id, 'sovereign-health', true FROM brickos.organizations
ON CONFLICT (org_id, app_key) DO NOTHING;

INSERT INTO brickos.org_apps (org_id, app_key, enabled)
VALUES ('00000000-0000-0000-0000-000000000000', 'sovereign-link', true)
ON CONFLICT (org_id, app_key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Dev admin user in public.users
--
-- Required for the Playwright sprint-040-smoke suite, which mints a JWT
-- with sub = 00000000-0000-0000-0000-000000000002 and expects the user
-- to exist so the auth middleware lookup returns a row.
--
-- Production safety: this insert is gated on the absence of the
-- production admin row (admin@schindlwick.com) which the protected_users
-- migration designates. On any DB where the production admin exists,
-- this INSERT is skipped, so production cannot accidentally inherit a
-- dev backdoor account from this migration.
--
-- Password is `SovereignDev1` (argon2id, same parameters m=19456, t=2,
-- p=1 as the demo user from migration 20260308000012). The hash is
-- committed -- the only way it becomes a real risk is if the migration
-- ever runs against a production DB, which the WHERE NOT EXISTS guard
-- prevents.
--
-- email_verified must be true so the auth handler does not block login
-- with EMAIL_NOT_VERIFIED on the dev account.
--
-- The migration runner is gated by ADR-048 to never auto-deploy without
-- a review pass; this defence-in-depth keeps the row out of prod even
-- if the gate is bypassed.
-- ----------------------------------------------------------------------------

INSERT INTO users (id, email, password_hash, display_name, role, email_verified, email_verified_at)
SELECT
    '00000000-0000-0000-0000-000000000002'::uuid,
    'dev@sovereignhealth.io',
    '$argon2id$v=19$m=19456,t=2,p=1$Q1gRZjFT2Dy7/7DMww3+6Q$1W6q0Hx0rDgH2XcKcYAH5Zm4DJXXKt0WlovpHgxSH4Q',
    'Dev Admin',
    'admin',
    true,
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@schindlwick.com'
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Feature registry: 28 rows from canonical Sprint 040 seed (migration 011)
-- ----------------------------------------------------------------------------

INSERT INTO brickos.feature_registry (slug, app_slug, category, name_en, name_de, description_en, description_de, is_active) VALUES
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
  ('shi.csv_export',              'sovereign-health', 'reporting','CSV export',                  'CSV-Export',
    'Download your data as CSV.',
    'Daten als CSV herunterladen.', true),
  ('shi.json_export',             'sovereign-health', 'reporting','JSON export',                 'JSON-Export',
    'Download your data as JSON.',
    'Daten als JSON herunterladen.', true),
  ('shi.pdf_reports',             'sovereign-health', 'reporting','PDF health reports',          'PDF-Gesundheitsberichte',
    'Generate styled PDF health reports.',
    'Gestaltete PDF-Gesundheitsberichte erstellen.', true),
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
  ('shi.mfa_totp',                'sovereign-health', 'security', 'Two-factor authentication',   'Zwei-Faktor-Authentifizierung',
    'TOTP-based two-factor authentication. Always available, never gated.',
    'TOTP-basierte Zwei-Faktor-Authentifizierung. Immer verfuegbar, nie eingeschraenkt.', true),
  ('shi.api_access',              'sovereign-health', 'integrations', 'REST API access',          'REST-API-Zugang',
    'Programmatic access to your health data.',
    'Programmatischer Zugriff auf Ihre Gesundheitsdaten.', true),
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
-- Feature registry: 13 rows from migration 012 (CRM + Link cross-app)
-- ----------------------------------------------------------------------------

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
    'Eigene Sales-Pipelines mit beliebigen Phasen definieren.', true),
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

-- ----------------------------------------------------------------------------
-- Tier features matrix: 130 rows from canonical Sprint 040 seed (migration 011)
--
-- Locked decisions per design 022 §2.2:
--   * Glimpse: 10 active markers, 30d history, 3/mo AI chat
--   * Calculated markers: UNLIMITED for all tiers
--   * MFA TOTP: always available, never gated
-- ----------------------------------------------------------------------------

INSERT INTO brickos.tier_features (tier_slug, feature_slug, included, limit_value, limit_label_en, limit_label_de) VALUES
  -- Glimpse (free)
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
  -- Focus
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
  -- Insight
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
  -- Clarity
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
  -- Horizon
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
  -- Core (self-hosted)
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

-- ----------------------------------------------------------------------------
-- Tier features matrix: 26 rows from migration 012 (CRM + Link on horizon + core)
-- ----------------------------------------------------------------------------

INSERT INTO brickos.tier_features (tier_slug, feature_slug, included, limit_value, limit_label_en, limit_label_de) VALUES
  ('horizon', 'crm.lead_capture',         true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.email_sequences',      true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.audio_recording',      true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.audio_transcription',  true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.advanced_search',      true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.api_access',           true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.csv_export',           true, NULL, 'yes', 'ja'),
  ('horizon', 'crm.custom_pipelines',     true, NULL, 'yes', 'ja'),
  ('horizon', 'link.api_access',          true, NULL, 'yes', 'ja'),
  ('horizon', 'link.custom_domains',      true, NULL, 'yes', 'ja'),
  ('horizon', 'link.affiliate_tracking',  true, NULL, 'yes', 'ja'),
  ('horizon', 'link.click_analytics',     true, NULL, 'yes', 'ja'),
  ('horizon', 'link.bulk_create',         true, NULL, 'yes', 'ja'),
  ('core',    'crm.lead_capture',         true, NULL, 'yes', 'ja'),
  ('core',    'crm.email_sequences',      true, NULL, 'yes', 'ja'),
  ('core',    'crm.audio_recording',      true, NULL, 'yes', 'ja'),
  ('core',    'crm.audio_transcription',  true, NULL, 'yes', 'ja'),
  ('core',    'crm.advanced_search',      true, NULL, 'yes', 'ja'),
  ('core',    'crm.api_access',           true, NULL, 'yes', 'ja'),
  ('core',    'crm.csv_export',           true, NULL, 'yes', 'ja'),
  ('core',    'crm.custom_pipelines',     true, NULL, 'yes', 'ja'),
  ('core',    'link.api_access',          true, NULL, 'yes', 'ja'),
  ('core',    'link.custom_domains',      true, NULL, 'yes', 'ja'),
  ('core',    'link.affiliate_tracking',  true, NULL, 'yes', 'ja'),
  ('core',    'link.click_analytics',     true, NULL, 'yes', 'ja'),
  ('core',    'link.bulk_create',         true, NULL, 'yes', 'ja')
ON CONFLICT (tier_slug, feature_slug) DO NOTHING;
