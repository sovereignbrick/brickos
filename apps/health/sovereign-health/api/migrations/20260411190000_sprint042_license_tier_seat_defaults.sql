-- ============================================================================
-- Sprint 042 #530: per-tier seat-count defaults on brickos.license_tiers.
--
-- Background:
-- Sprint 040 #467 introduced the 3-role brickos-licensing seat model
-- (max_owners / max_practitioners / max_members) on org_licenses, but
-- never extended brickos.license_tiers with the *defaults* per tier.
-- The result: when a platform admin issues a license via the License
-- tab, the form has no source-of-truth defaults to pre-fill from. The
-- operator accepts whatever the form shows (which has been 1/0/0 since
-- Sprint 041), and the very next thing they try to do (add a member)
-- fails with "Seat limit exceeded: role member (0/0)".
--
-- This migration adds the columns and seeds defaults for every tier
-- currently in brickos.license_tiers. The frontend License tab reads
-- these via /admin/licensing/tiers and pre-fills the issue-license form.
--
-- Per-tier defaults (per the draft in #530, calibrated to the marketing
-- positioning of each tier in brickos.license_tiers.tagline):
--
--    glimpse  -- "Start your health journey" (free)         -> 1/0/0  single user
--    focus    -- "Take control of your health" (€9.99)      -> 1/0/0  single user
--    insight  -- "Understand the full picture" (€24.99)     -> 1/0/1  couple
--    clarity  -- "Optimize every marker" (€49.99)           -> 1/0/5  small family / health team
--    horizon  -- "Complete health sovereignty" (€99.99)     -> 1/3/10 clinic team (matches the marketing copy)
--    core     -- "Your server, your rules" (self-host OSS)  -> -1/-1/-1 unlimited (-1 = no cap)
--
-- The tier name slugs are case-sensitive and match the existing rows.
--
-- Idempotency:
--   - ALTER TABLE ADD COLUMN IF NOT EXISTS guards make the column adds
--     safe to re-run.
--   - The UPDATE statements use WHERE slug = '...', which is a no-op
--     for any tier slug not present in the env (e.g. if a custom
--     downstream env added a tier we don't know about, we don't
--     touch it).
--   - The columns default to NULL so existing rows aren't broken if
--     this migration runs before the seed UPDATEs (e.g. via partial
--     re-application).
--
-- Related:
--   - #530 in docs/tracker/issues/open/
--   - Sprint 042 milestone Phase C
--   - feedback_no_hardcoded_values.md (the rule this enforces -- read
--     defaults from app_settings / license_tiers, never hardcode in
--     the form component)
-- ============================================================================

-- ── Schema ─────────────────────────────────────────────────────────────────
ALTER TABLE brickos.license_tiers
    ADD COLUMN IF NOT EXISTS default_max_owners INT,
    ADD COLUMN IF NOT EXISTS default_max_practitioners INT,
    ADD COLUMN IF NOT EXISTS default_max_members INT;

-- ── Seed: per-tier defaults ────────────────────────────────────────────────
-- Single-user consumer tiers
UPDATE brickos.license_tiers
   SET default_max_owners = 1,
       default_max_practitioners = 0,
       default_max_members = 0
 WHERE slug IN ('glimpse', 'focus');

-- Couple tier
UPDATE brickos.license_tiers
   SET default_max_owners = 1,
       default_max_practitioners = 0,
       default_max_members = 1
 WHERE slug = 'insight';

-- Small family / small health team
UPDATE brickos.license_tiers
   SET default_max_owners = 1,
       default_max_practitioners = 0,
       default_max_members = 5
 WHERE slug = 'clarity';

-- Clinic team -- matches the marketing copy "10-member team sharing"
UPDATE brickos.license_tiers
   SET default_max_owners = 1,
       default_max_practitioners = 3,
       default_max_members = 10
 WHERE slug = 'horizon';

-- Self-host / OSS -- unlimited (-1 sentinel = no cap, matches the
-- existing seat-enforcement check in admin_orgs.rs:921 "max >= 0")
UPDATE brickos.license_tiers
   SET default_max_owners = -1,
       default_max_practitioners = -1,
       default_max_members = -1
 WHERE slug = 'core';

-- ── Verify (RAISE NOTICE for the deploy log) ───────────────────────────────
DO $verify$
DECLARE
    untouched_count INT;
BEGIN
    SELECT COUNT(*) INTO untouched_count
    FROM brickos.license_tiers
    WHERE default_max_owners IS NULL;

    IF untouched_count > 0 THEN
        RAISE NOTICE 'Sprint 042 #530: % tier(s) have no seat defaults set (custom or unknown slug -- safe to leave NULL, frontend will fall back to 0)', untouched_count;
    ELSE
        RAISE NOTICE 'Sprint 042 #530: all license_tiers have seat defaults set';
    END IF;
END
$verify$;
