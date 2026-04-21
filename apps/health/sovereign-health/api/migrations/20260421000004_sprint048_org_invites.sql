-- Sprint 048 #048-30: org_invites table for invite-by-email.
--
-- An org admin creates a row with {email, role, token}. The token is
-- included in a link emailed to the invitee. When the invitee hits
-- /signup?invite=TOKEN, the frontend loads the invite (org name, role)
-- and prefills the email. POST /auth/signup with invite_token creates
-- the user, auto-joins the org as the specified role, and flips
-- accepted_at.
--
-- An invite is ACTIVE when accepted_at IS NULL AND cancelled_at IS NULL
-- AND expires_at > NOW(). Only one active invite per (org, email) at
-- a time (partial unique index).

CREATE TABLE IF NOT EXISTS org_invites (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member',
    token         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    accepted_at   TIMESTAMPTZ,
    accepted_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at  TIMESTAMPTZ,
    CONSTRAINT org_invites_role_check CHECK (
        role IN ('org_owner', 'practitioner', 'member', 'org_member')
    )
);

-- One active invite per (org, email).
CREATE UNIQUE INDEX IF NOT EXISTS org_invites_active_uq
    ON org_invites (org_id, lower(email))
    WHERE accepted_at IS NULL AND cancelled_at IS NULL;

-- Hot path: GET invite by token (signup flow).
CREATE INDEX IF NOT EXISTS org_invites_token_idx
    ON org_invites (token)
    WHERE accepted_at IS NULL AND cancelled_at IS NULL;

-- Hot path: list pending invites for an org (admin panel).
CREATE INDEX IF NOT EXISTS org_invites_pending_idx
    ON org_invites (org_id)
    WHERE accepted_at IS NULL AND cancelled_at IS NULL;

COMMENT ON TABLE org_invites IS
    'Design 028 / Sprint 048 #048-30: pending invitations for new users to join an org. Token is the secret carried in the /signup?invite=TOKEN link.';
