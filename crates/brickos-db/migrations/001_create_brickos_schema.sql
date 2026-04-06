-- ============================================================================
-- Migration 001: Create brickos schema and move platform tables
-- Sprint 028 Day 4 - Issue #326
--
-- This migration elevates platform-level tables from the public schema into
-- a dedicated "brickos" schema. The move is metadata-only (ALTER TABLE SET
-- SCHEMA), which is instantaneous and requires no data copy.
--
-- After the move, search_path is updated so existing SHI queries continue
-- resolving unqualified table names. Zero downtime, zero code changes.
--
-- See: docs/design/006-platform-schema-elevation.md (sections 5, 7)
-- ============================================================================

-- Step 1: Create the brickos schema for platform-level tables
CREATE SCHEMA IF NOT EXISTS brickos;

-- ============================================================================
-- Step 2: Move identity tables (4 tables)
-- ============================================================================

ALTER TABLE IF EXISTS public.users SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.refresh_tokens SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.email_verifications SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.user_mfa SET SCHEMA brickos;

-- ============================================================================
-- Step 3: Move organization tables (5 tables)
-- ============================================================================

ALTER TABLE IF EXISTS public.organizations SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.org_members SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.app_roles SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.data_shares SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.audit_log SET SCHEMA brickos;

-- ============================================================================
-- Step 4: Move billing and licensing tables (17 tables)
-- ============================================================================

ALTER TABLE IF EXISTS public.subscriptions SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.payment_events SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.btc_payments SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.refunds SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.invoices SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.invoice_line_items SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.payment_methods_cache SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.customer_tax_ids SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.payment_gateway_status SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.promotions SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.promotion_redemptions SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.user_licenses SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.license_events SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.affiliate_clicks SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.affiliate_conversions SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.affiliate_payouts SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.affiliate_commission_rates SET SCHEMA brickos;

-- ============================================================================
-- Step 5: Move communication tables (5 tables)
-- ============================================================================

ALTER TABLE IF EXISTS public.email_campaigns SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.email_sends SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.push_subscriptions SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.newsletter_subscribers SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.contact_submissions SET SCHEMA brickos;

-- ============================================================================
-- Step 6: Move audit tables (4 tables)
-- ============================================================================

ALTER TABLE IF EXISTS public.data_access_log SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.db_audit_log SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.pgaudit_events SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.content_audit_log SET SCHEMA brickos;

-- ============================================================================
-- Step 7: Move infrastructure tables (3 tables)
-- ============================================================================

ALTER TABLE IF EXISTS public.app_prefixes SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.short_links SET SCHEMA brickos;
ALTER TABLE IF EXISTS public.short_link_clicks SET SCHEMA brickos;

-- ============================================================================
-- Step 8: Update search_path
--
-- This is the key to zero-downtime migration. SHI queries like
-- "SELECT * FROM users WHERE id = $1" resolve via search_path to
-- brickos.users without any code changes.
-- ============================================================================

ALTER DATABASE CURRENT SET search_path = public, brickos;

-- NOTE on safety:
-- Each ALTER TABLE IF EXISTS ensures this migration is safe to run even if
-- some tables do not exist yet (e.g., on a fresh install where billing tables
-- have not been created, or on an OSS/self-hosted instance with fewer tables).
--
-- All indexes, constraints, and foreign keys follow the table automatically
-- when using ALTER TABLE SET SCHEMA. No manual index migration needed.
--
-- NOTE on encryption:
-- PII columns (email, display_name, nostr_pubkey) in brickos.users should be
-- encrypted at rest. Implementation planned via the brickos-crypto crate in a
-- future migration. See design doc section 10 for details.
