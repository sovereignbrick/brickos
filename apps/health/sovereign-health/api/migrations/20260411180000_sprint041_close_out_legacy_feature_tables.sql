-- ============================================================================
-- Sprint 041 close-out: codify the staging hotfix for #527.
--
-- Background:
-- The Sprint 041 bootstrap migration (20260411000001) reconciles the staging
-- schema by renaming legacy `brickos.product_features` and legacy
-- `brickos.tier_features` (the `tier_key, feature_id UUID` shape) aside as
-- `*_legacy_sprint040`. The intent was to free the names so the bootstrap
-- could create the new `brickos.tier_features (tier_slug, feature_slug)`
-- shape that `brickos-licensing::EmbeddedProvider` reads.
--
-- The trap: the SHI feature-gating handlers in features.rs / license.rs /
-- tier.rs still query the LEGACY shape (`product_features.feature_key`,
-- `tier_features.feature_id` joined to `product_features.id`). On staging,
-- after the bootstrap renamed the legacy tables aside, every feature-gated
-- endpoint 500'd with `relation "product_features" does not exist`. This
-- broke Smart Import, Dr. Alex chat, and any other code path that ran a
-- tier check.
--
-- A manual psql hotfix was applied on staging (2026-04-11 ~16:43 CEST) that
-- moved the renamed-aside tables back to the `public` schema under their
-- canonical names:
--
--     ALTER TABLE brickos.product_features_legacy_sprint040 SET SCHEMA public;
--     ALTER TABLE public.product_features_legacy_sprint040 RENAME TO product_features;
--     ALTER TABLE brickos.tier_features_legacy_sprint040 SET SCHEMA public;
--     ALTER TABLE public.tier_features_legacy_sprint040 RENAME TO tier_features;
--
-- This migration codifies that hotfix so:
--   1. Future cold-boots automatically end up in the right state (the
--      bootstrap renames aside, this migration moves back, net result is
--      that the legacy tables live in public.* where the SHI handlers
--      find them via search_path).
--   2. The staging hotfix becomes a one-line SQL file in version control
--      instead of a script in /tmp on someone's laptop.
--   3. Sprint 042 #527 Phase A is partially complete -- the schema half.
--      The remaining work is to update the bootstrap migration's
--      reconciliation block to do this directly (instead of rename-aside +
--      separate fix-up), but that is a Sprint 042 cleanup.
--
-- IMPORTANT: this migration does NOT touch `brickos.tier_features` (the
-- NEW `tier_slug, feature_slug` shape). That table is queried by
-- `brickos-licensing::EmbeddedProvider::tier_features()` and must remain.
-- The new crate is the long-term direction; it just isn't called from the
-- SHI feature-gating handlers yet (Sprint 040 #467 was a shadow refactor
-- that landed the new path but never flipped the old).
--
-- Idempotency:
--   - On dev: the bootstrap's rename-aside guards are skipped (dev never
--     had the legacy in brickos), so the *_legacy_sprint040 tables don't
--     exist, so this migration's IF EXISTS guards skip everything. No-op.
--   - On staging today: the manual hotfix already moved the tables, so
--     the *_legacy_sprint040 tables don't exist anymore. No-op (but the
--     migration row gets recorded so future re-runs are tracked).
--   - On future re-bootstrap of staging: bootstrap runs first and renames
--     legacy aside, then this migration runs and moves them back. End
--     state matches dev.
--   - Production: the SHI bootstrap migration is dev-only (per the
--     filename suffix `for_dev`); production has its own schema set.
--     This migration is still safe to run there because IF EXISTS guards.
--
-- Related:
--   - #527 in docs/tracker/issues/open/
--   - feedback_never_ship_half_schema_migration.md in memory
--   - feedback_dual_schema_fk_cleanup.md in memory
-- ============================================================================

DO $sprint041_legacy_features$
DECLARE
    public_pf_exists boolean;
    public_tf_exists boolean;
    legacy_pf_exists boolean;
    legacy_tf_exists boolean;
BEGIN
    -- Probe state
    SELECT to_regclass('brickos.product_features_legacy_sprint040') IS NOT NULL
      INTO legacy_pf_exists;
    SELECT to_regclass('brickos.tier_features_legacy_sprint040') IS NOT NULL
      INTO legacy_tf_exists;
    SELECT to_regclass('public.product_features') IS NOT NULL
      INTO public_pf_exists;
    SELECT to_regclass('public.tier_features') IS NOT NULL
      INTO public_tf_exists;

    RAISE NOTICE 'Sprint 041 close-out feature-table reconcile: legacy_pf=% legacy_tf=% public_pf=% public_tf=%',
        legacy_pf_exists, legacy_tf_exists, public_pf_exists, public_tf_exists;

    -- ── product_features ────────────────────────────────────────────────────
    IF legacy_pf_exists THEN
        IF public_pf_exists THEN
            -- Conflict: both exist. Drop the existing public copy first.
            -- This is the case where dev has an older legacy public.product_features
            -- AND a re-bootstrap renamed something in brickos to legacy. We trust
            -- the brickos legacy as canonical because it's what the staging
            -- migration just moved aside.
            RAISE NOTICE 'Sprint 041 close-out: dropping existing public.product_features before move';
            EXECUTE 'DROP TABLE public.product_features CASCADE';
        END IF;
        EXECUTE 'ALTER TABLE brickos.product_features_legacy_sprint040 SET SCHEMA public';
        EXECUTE 'ALTER TABLE public.product_features_legacy_sprint040 RENAME TO product_features';
        RAISE NOTICE 'Sprint 041 close-out: moved brickos.product_features_legacy_sprint040 -> public.product_features';
    END IF;

    -- ── tier_features ───────────────────────────────────────────────────────
    -- IMPORTANT: only touch the LEGACY brickos.tier_features_legacy_sprint040
    -- (which has tier_key + feature_id UUID columns). Do NOT touch the new
    -- brickos.tier_features (tier_slug + feature_slug) -- that table is
    -- queried by brickos-licensing::EmbeddedProvider and must remain.
    IF legacy_tf_exists THEN
        IF public_tf_exists THEN
            RAISE NOTICE 'Sprint 041 close-out: dropping existing public.tier_features before move';
            EXECUTE 'DROP TABLE public.tier_features CASCADE';
        END IF;
        EXECUTE 'ALTER TABLE brickos.tier_features_legacy_sprint040 SET SCHEMA public';
        EXECUTE 'ALTER TABLE public.tier_features_legacy_sprint040 RENAME TO tier_features';
        RAISE NOTICE 'Sprint 041 close-out: moved brickos.tier_features_legacy_sprint040 -> public.tier_features';
    END IF;
END
$sprint041_legacy_features$;
