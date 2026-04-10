-- ============================================================================
-- SHI migration: user_markers (active vs preserved distinction)
-- Sprint 040, design 022 §2.2, issue #468 part 1
--
-- Per-user per-marker preferences with the active/preserved flag. This is
-- the foundation for the locked decision Q1: "Glimpse = 10 active markers,
-- user picks any 10. Preserved markers visible read-only, history fully
-- readable, cannot enter new measurements until activated."
--
-- Today the per-user-per-marker relationship is IMPLICIT via measurements
-- rows -- "the markers a user tracks" = "DISTINCT marker_id WHERE user_id".
-- This migration makes it EXPLICIT so we can attach the is_active flag and
-- give the user a picker for which 10 markers count as active.
--
-- M7 mitigation (design 022 §13.5): every existing (user_id, marker_id)
-- pair in measurements is backfilled with is_active = true. NO existing
-- user is silently demoted to "preserved" mode. The active/preserved
-- distinction only takes effect when:
--   1. A user explicitly downgrades to Glimpse (#467 #468 follow-up), AND
--   2. They have more than 10 markers tracked.
--
-- The helper functions in src/services/user_markers.rs read this table.
-- check_marker_access in tier.rs is NOT yet wired to this table -- that
-- happens in #468 part 2 alongside the UI picker.
--
-- See: docs/design/022-licensing-model.md §2.2, §13.5 M7
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_markers (
    user_id        UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    marker_id      UUID        NOT NULL REFERENCES markers(id),
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    activated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, marker_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_markers_user_active
    ON user_markers(user_id)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_markers_marker_id
    ON user_markers(marker_id);

-- ----------------------------------------------------------------------------
-- Backfill from existing measurements (M7 safety)
--
-- Every distinct (user_id, marker_id) pair in measurements becomes a
-- user_markers row with is_active = true. The activated_at is set to the
-- earliest measurement created_at for that pair (so the row reflects
-- "user started tracking this marker on date X").
--
-- ON CONFLICT DO NOTHING makes the migration idempotent.
-- ----------------------------------------------------------------------------

INSERT INTO user_markers (user_id, marker_id, is_active, activated_at)
SELECT user_id, marker_id, true, MIN(created_at)
FROM measurements
WHERE is_deleted = false
GROUP BY user_id, marker_id
ON CONFLICT (user_id, marker_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Comments for documentation
-- ----------------------------------------------------------------------------

COMMENT ON TABLE user_markers IS
  'Per-user per-marker preferences with the active/preserved flag. Sprint 040 #468: foundation for the user-pickable 10-active-markers system on Glimpse. Backfilled from measurements at migration time so no existing user is silently demoted.';

COMMENT ON COLUMN user_markers.is_active IS
  'true = user can enter new measurements + see in dashboard. false = preserved (read-only history, dimmed UI, cannot enter new measurements until activated). The Glimpse cap of 10 active markers is enforced at the application layer in services/user_markers.rs.';

COMMENT ON COLUMN user_markers.activated_at IS
  'Timestamp when this marker was first activated for the user. Set to MIN(measurements.created_at) at backfill time, NOW() for new follows.';

COMMENT ON COLUMN user_markers.deactivated_at IS
  'Timestamp when the user last deactivated this marker (moved to preserved). NULL if never deactivated. Updated on every is_active = true -> false transition by the application layer.';
