-- ============================================================================
-- Migration 005: Split user_profile into platform and app-specific tables
-- Sprint 028 Day 4 - Issue #328
--
-- Current state of user_profile:
--   - gender, age                     -> generic (platform)
--   - height_cm                       -> health-specific (SHI)
--   - country_code                    -> generic (platform)
--   - default_waist_cm, default_weight_kg -> health-specific (SHI)
--   - customer_type, company_name, vat_id, billing_address_* -> billing
--
-- This migration creates:
--   1. brickos.user_profile     - generic profile fields (gender, age, country)
--   2. brickos.billing_profile  - billing/tax fields (vat, address, company)
--
-- The existing public.user_profile table is NOT dropped or modified.
-- Health-specific columns (height_cm, default_waist_cm, default_weight_kg)
-- stay in the existing table. SHI continues reading from public.user_profile
-- via search_path.
--
-- CONSERVATIVE: No columns dropped. Data is copied, not moved. The old
-- table remains as the source of truth until SHI code is updated to read
-- from the split tables.
--
-- See: docs/design/006-platform-schema-elevation.md (section 7, Phase 3)
-- ============================================================================

-- ============================================================================
-- Step 1: Create brickos.user_profile
--
-- Generic profile fields that apply to any BrickOS app.
-- Note: brickos.users already has default_org_id (added in organizations
-- migration), so we do not duplicate it here.
--
-- NOTE on encryption: gender, age, and country_code are considered PII.
-- Encrypt at rest via brickos-crypto crate in a future migration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS brickos.user_profile (
    user_id UUID PRIMARY KEY REFERENCES brickos.users(id) ON DELETE CASCADE,
    gender TEXT,                         -- male, female, other
    age INT,                            -- years (used for reference ranges, BMR context)
    country_code VARCHAR(2),            -- ISO 3166-1 alpha-2
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 2: Copy generic profile data from the existing user_profile table
--
-- This uses a DO block to handle the case where public.user_profile may
-- have already been moved to brickos schema (by migration 001). We check
-- both locations.
-- ============================================================================

DO $$
BEGIN
    -- Try inserting from the existing user_profile (resolved via search_path)
    INSERT INTO brickos.user_profile (user_id, gender, age, country_code, created_at, updated_at)
    SELECT user_id, gender, age, country_code, created_at, updated_at
    FROM user_profile
    ON CONFLICT (user_id) DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        -- Table does not exist yet (fresh install), nothing to copy
        NULL;
    WHEN undefined_column THEN
        -- country_code column may not exist on older schemas
        BEGIN
            INSERT INTO brickos.user_profile (user_id, gender, age, created_at, updated_at)
            SELECT user_id, gender, age, created_at, updated_at
            FROM user_profile
            ON CONFLICT (user_id) DO NOTHING;
        EXCEPTION
            WHEN undefined_table THEN
                NULL;
        END;
END $$;

-- ============================================================================
-- Step 3: Create brickos.billing_profile
--
-- Billing and tax fields, split from user_profile. These are platform-level
-- because billing is shared across all BrickOS apps.
--
-- NOTE on encryption: All billing fields are PII and must be encrypted at
-- rest via brickos-crypto crate in a future migration. Fields like vat_id,
-- company_name, and address lines contain sensitive business information.
-- ============================================================================

CREATE TABLE IF NOT EXISTS brickos.billing_profile (
    user_id UUID PRIMARY KEY REFERENCES brickos.users(id) ON DELETE CASCADE,
    customer_type VARCHAR(20) NOT NULL DEFAULT 'private',  -- private, business
    company_name VARCHAR(255),
    vat_id VARCHAR(50),
    vat_id_verified BOOLEAN DEFAULT false,
    vat_id_verified_at TIMESTAMPTZ,
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_address_city VARCHAR(100),
    billing_address_postal_code VARCHAR(20),
    billing_address_state VARCHAR(100),
    billing_address_country VARCHAR(2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 4: Copy billing data from existing user_profile
-- ============================================================================

DO $$
BEGIN
    INSERT INTO brickos.billing_profile (
        user_id, customer_type, company_name, vat_id,
        vat_id_verified, vat_id_verified_at,
        billing_address_line1, billing_address_line2,
        billing_address_city, billing_address_postal_code,
        billing_address_state, billing_address_country,
        created_at, updated_at
    )
    SELECT
        user_id,
        COALESCE(customer_type, 'private'),
        company_name,
        vat_id,
        COALESCE(vat_id_verified, false),
        vat_id_verified_at,
        billing_address_line1,
        billing_address_line2,
        billing_address_city,
        billing_address_postal_code,
        billing_address_state,
        billing_address_country,
        created_at,
        updated_at
    FROM user_profile
    WHERE customer_type IS NOT NULL
       OR company_name IS NOT NULL
       OR vat_id IS NOT NULL
       OR billing_address_line1 IS NOT NULL
    ON CONFLICT (user_id) DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN
        -- Table does not exist yet (fresh install), nothing to copy
        NULL;
    WHEN undefined_column THEN
        -- Billing columns may not exist on older schemas
        NULL;
END $$;

-- ============================================================================
-- Step 5: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_billing_profile_country
    ON brickos.billing_profile(billing_address_country);

CREATE INDEX IF NOT EXISTS idx_billing_profile_vat
    ON brickos.billing_profile(vat_id)
    WHERE vat_id IS NOT NULL;

-- ============================================================================
-- IMPORTANT: What stays in the existing user_profile table
--
-- The following health-specific columns remain in the old user_profile table
-- (which SHI continues to use via search_path):
--
--   - height_cm          (used for BMI, WHtR calculations)
--   - default_waist_cm   (encrypted TEXT, health body composition)
--   - default_weight_kg  (encrypted TEXT, health body composition)
--
-- These are purely health domain fields. In a future migration, the old
-- user_profile table can be renamed to shi.health_profile or moved to
-- a SHI-specific schema once SHI code is updated.
--
-- The generic columns (gender, age, country_code) now exist in BOTH
-- brickos.user_profile AND the old user_profile table. SHI continues
-- reading from the old table. New apps read from brickos.user_profile.
-- A future migration will remove the duplicates from the old table once
-- SHI code is updated to use brickos.user_profile.
-- ============================================================================
