-- ============================================================================
-- Migration 003: Refactor license_tiers for multi-app support
-- Sprint 028 Day 4 - Issue #327
--
-- The license_tiers table currently has 20+ SHI-specific feature columns
-- (max_markers, chat_monthly, body_composition, etc.). These feature limits
-- already exist in the tier_features table, so the license_tiers table can
-- be elevated to the platform level with only generic columns.
--
-- CONSERVATIVE APPROACH: We do NOT drop any columns from license_tiers.
-- We move the table as-is and add an app_key column. The SHI-specific
-- columns remain for backward compatibility. They can be deprecated once
-- all SHI code reads from tier_features instead.
--
-- See: docs/design/006-platform-schema-elevation.md (section 7, Phase 3)
-- ============================================================================

-- ============================================================================
-- Step 1: Move license_tiers to brickos schema
--
-- This is metadata-only, instantaneous. All indexes and FK references
-- (e.g., organizations.tier_id, user_licenses.tier_id) follow automatically.
-- ============================================================================

ALTER TABLE IF EXISTS public.license_tiers SET SCHEMA brickos;

-- ============================================================================
-- Step 2: Add app_key column
--
-- Identifies which app defined this tier. Existing tiers are SHI tiers.
-- Future apps (Sovereign Link, Sovereign Voice) will add their own tiers
-- with different app_key values.
--
-- NULL means "platform-wide tier" (shared across all apps).
-- 'sovereign-health' means "SHI-specific tier".
-- ============================================================================

ALTER TABLE brickos.license_tiers
    ADD COLUMN IF NOT EXISTS app_key VARCHAR(50);

-- Backfill: all existing tiers belong to SHI
UPDATE brickos.license_tiers
SET app_key = 'sovereign-health'
WHERE app_key IS NULL;

-- ============================================================================
-- Step 3: Add display_name column (if not present)
--
-- The design spec calls for a display_name separate from the internal name.
-- Existing tiers already have name + tagline, so display_name is additive.
-- ============================================================================

ALTER TABLE brickos.license_tiers
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Backfill display_name from existing name column
UPDATE brickos.license_tiers
SET display_name = name
WHERE display_name IS NULL;

-- ============================================================================
-- Step 4: Add sort_order column (if not present)
--
-- The spec uses sort_order. The existing table has display_order.
-- Add sort_order as an alias, defaulting from display_order.
-- ============================================================================

ALTER TABLE brickos.license_tiers
    ADD COLUMN IF NOT EXISTS sort_order INT;

-- Backfill from display_order
UPDATE brickos.license_tiers
SET sort_order = display_order
WHERE sort_order IS NULL AND display_order IS NOT NULL;

-- ============================================================================
-- Step 5: Add index for multi-app tier lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_license_tiers_app_key
    ON brickos.license_tiers(app_key);

CREATE INDEX IF NOT EXISTS idx_license_tiers_active_app
    ON brickos.license_tiers(app_key, is_active)
    WHERE is_active = true;

-- NOTE: The following SHI-specific columns are NOT dropped (conservative):
--   max_markers, max_history_days, max_calculated_markers, max_templates,
--   max_medications, chat_general_monthly, chat_trends_monthly,
--   chat_labs_monthly, chat_diet_monthly, chat_supplements_monthly,
--   chat_protocols_monthly, chat_lab_import_monthly, chat_med_import_monthly,
--   pdf_reports_monthly, csv_export, json_export, custom_thresholds,
--   lifestyle_presets, protocol_comparison, body_composition,
--   supplement_marker_impact, ai_dashboard_insights, cohort_comparison,
--   mfa_totp, api_access, self_hosted_hybrid, team_sharing, max_team_members,
--   support_level, highlight
--
-- These columns are DEPRECATED. SHI code should read from tier_features
-- instead. They will be removed in a future migration once the transition
-- is verified complete.
