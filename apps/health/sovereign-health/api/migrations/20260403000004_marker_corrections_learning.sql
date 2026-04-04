-- Sprint 020 / #323: User correction learning — global feedback loop
-- Tracks user corrections during import review and promotes commonly agreed aliases.

-- Log every user correction (changed AI match → different slug)
CREATE TABLE IF NOT EXISTS marker_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    original_match TEXT,
    corrected_slug TEXT NOT NULL,
    import_session_id UUID REFERENCES import_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marker_corrections_name ON marker_corrections(lower(original_name));
CREATE INDEX IF NOT EXISTS idx_marker_corrections_user ON marker_corrections(user_id, created_at DESC);

-- Aggregated learned aliases — promoted when 5+ distinct users agree
CREATE TABLE IF NOT EXISTS learned_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alias_text TEXT NOT NULL,
    target_slug TEXT NOT NULL,
    correction_count INT NOT NULL DEFAULT 1,
    distinct_users INT NOT NULL DEFAULT 1,
    promoted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alias_text)
);
