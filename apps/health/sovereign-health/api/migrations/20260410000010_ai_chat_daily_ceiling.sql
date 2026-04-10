-- ============================================================================
-- SHI migration: AI chat hard daily ceiling counter (Sprint 040, issue #472)
--
-- Per-user per-day counter for AI chat calls. Defense-in-depth safety net
-- that runs in parallel with the existing tier::check_ai_credits gate.
-- Even if the tier gate fails open due to a refactor bug or config issue,
-- this ceiling stops a runaway from burning through Anthropic budget.
--
-- Ceiling values per design 022 §13.5 M5:
--   Glimpse: 20/day  (vs tier limit ~3/month -- only triggers on runaway)
--   Focus:   50/day  (vs ~5/month)
--   Insight: 100/day (vs ~15/month)
--   Clarity: 500/day (vs unlimited)
--   Horizon: 1000/day
--
-- The ceilings live in code (services/ai_chat_ceiling.rs); this table is
-- just the per-user-per-day counter. The PRIMARY KEY (user_id, day_utc)
-- enforces one row per user per day with an INSERT ... ON CONFLICT upsert.
--
-- See: docs/design/022-licensing-model.md §13.5 M5
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_chat_daily_count (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_utc    DATE NOT NULL,
    count      INT  NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, day_utc)
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_daily_count_day
    ON ai_chat_daily_count(day_utc);

COMMENT ON TABLE ai_chat_daily_count IS
  'Per-user per-day AI chat call counter for the hard daily ceiling. Defense-in-depth safety net independent of the tier::check_ai_credits gate. See Sprint 040 #472 and design 022 §13.5 M5.';
