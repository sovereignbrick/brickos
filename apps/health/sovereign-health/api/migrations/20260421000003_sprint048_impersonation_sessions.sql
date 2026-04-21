-- Sprint 048 #048-13/14: impersonation_sessions table (Design 028 / ADR-051).
--
-- A practitioner starts an impersonation session, server returns the
-- session UUID as the X-Impersonation-Token. The middleware looks up
-- the session on every request, verifies:
--
--   - the session has not ended (ended_at IS NULL)
--   - last_seen_at within the 30-minute sliding window
--   - the practitioner is still the caller (JWT sub matches
--     practitioner_id)
--   - the patient's consent is still active
--
-- On hit, the middleware bumps last_seen_at and swaps the effective
-- user to patient_id for the rest of the request. On any miss, the
-- request proceeds as the practitioner's own session (impersonation
-- simply drops).

CREATE TABLE IF NOT EXISTS impersonation_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    end_reason      TEXT -- 'exit' | 'timeout' | 'consent_revoked' | 'admin'
);

CREATE INDEX IF NOT EXISTS impersonation_sessions_active_idx
    ON impersonation_sessions (practitioner_id)
    WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS impersonation_sessions_patient_active_idx
    ON impersonation_sessions (patient_id, org_id)
    WHERE ended_at IS NULL;

COMMENT ON TABLE impersonation_sessions IS
    'Design 028 / ADR-051: each row tracks one practitioner-to-patient read-only session. The row id is the X-Impersonation-Token. ended_at = NULL means the session is still active; the middleware additionally enforces a 30-min sliding window on last_seen_at.';
COMMENT ON COLUMN impersonation_sessions.end_reason IS
    'Why the session ended. "exit" = user clicked Exit, "timeout" = no activity for 30+ min, "consent_revoked" = patient revoked mid-session, "admin" = platform admin terminated.';
