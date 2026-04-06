-- ============================================================================
-- Migration 004: Add app_key columns to shared config tables
-- Sprint 028 Day 4 - Issue #329
--
-- These tables have generic structure but currently contain only SHI data.
-- Adding app_key enables multi-app usage. Existing rows default to
-- 'sovereign-health'. Each new app seeds its own data with its own app_key.
--
-- This is a purely additive change - no columns removed, no data lost.
--
-- See: docs/design/006-platform-schema-elevation.md (section 7, Phase 3)
-- ============================================================================

-- ============================================================================
-- Step 1: product_features - add app_key and move to brickos schema
-- ============================================================================

-- Move to brickos schema first
ALTER TABLE IF EXISTS public.product_features SET SCHEMA brickos;

-- Add app_key column
ALTER TABLE brickos.product_features
    ADD COLUMN IF NOT EXISTS app_key VARCHAR(50);

-- Backfill: all existing features are SHI features
UPDATE brickos.product_features
SET app_key = 'sovereign-health'
WHERE app_key IS NULL;

-- Index for per-app feature lookups
CREATE INDEX IF NOT EXISTS idx_product_features_app_key
    ON brickos.product_features(app_key);

-- ============================================================================
-- Step 2: tier_features - add app_key and move to brickos schema
-- ============================================================================

ALTER TABLE IF EXISTS public.tier_features SET SCHEMA brickos;

-- Add app_key column
ALTER TABLE brickos.tier_features
    ADD COLUMN IF NOT EXISTS app_key VARCHAR(50);

-- Backfill: all existing tier-feature assignments are SHI
UPDATE brickos.tier_features
SET app_key = 'sovereign-health'
WHERE app_key IS NULL;

-- Index for per-app tier-feature lookups
CREATE INDEX IF NOT EXISTS idx_tier_features_app_key
    ON brickos.tier_features(app_key);

-- ============================================================================
-- Step 3: app_settings - add app_key and move to brickos schema
--
-- app_settings is a key-value store. Adding app_key allows each app to
-- have its own settings namespace. Existing SHI settings are tagged.
--
-- NOTE: The PK is (key), so app_key is just a filter column, not part of
-- the PK. If two apps need the same key name, prefix convention is used:
-- e.g., "shi.dr_alex_app_enabled" vs "voice.scheduler_enabled".
-- A future migration may change PK to (app_key, key) if needed.
-- ============================================================================

ALTER TABLE IF EXISTS public.app_settings SET SCHEMA brickos;

ALTER TABLE brickos.app_settings
    ADD COLUMN IF NOT EXISTS app_key VARCHAR(50);

-- Backfill: all existing settings belong to SHI
UPDATE brickos.app_settings
SET app_key = 'sovereign-health'
WHERE app_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_app_settings_app_key
    ON brickos.app_settings(app_key);

-- ============================================================================
-- Step 4: search_index - add app_key and move to brickos schema
--
-- The search_index table has generic FTS structure. Adding app_key allows
-- each app to index its own entities. SHI entity types (marker, zone,
-- food, supplement, etc.) are tagged as 'sovereign-health'.
--
-- user_search_index stays in public schema - it contains per-user search
-- data that is inherently app-specific (measurements, medications, etc.).
-- ============================================================================

ALTER TABLE IF EXISTS public.search_index SET SCHEMA brickos;

ALTER TABLE brickos.search_index
    ADD COLUMN IF NOT EXISTS app_key VARCHAR(50);

-- Backfill: all existing search entries are SHI content
UPDATE brickos.search_index
SET app_key = 'sovereign-health'
WHERE app_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_search_index_app_key
    ON brickos.search_index(app_key);

-- Composite index for per-app, per-locale searches
CREATE INDEX IF NOT EXISTS idx_search_index_app_locale
    ON brickos.search_index(app_key, locale);
