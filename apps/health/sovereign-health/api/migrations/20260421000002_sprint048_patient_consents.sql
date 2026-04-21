-- Sprint 048 #048-10: patient_consents table (Design 028 / ADR-051).
--
-- Records a patient's opt-in to share their health records with an org.
-- The practitioner impersonation middleware joins on this table to
-- filter the caseload and authorise read access. Revocation is a soft
-- delete (sets revoked_at) so we preserve the history of access.
--
-- One row per (patient_user_id, org_id). Re-granting after revoke is
-- an UPSERT that sets revoked_at = NULL and bumps granted_at.

CREATE TABLE IF NOT EXISTS patient_consents (
    patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ,
    PRIMARY KEY (patient_user_id, org_id)
);

-- The practitioner caseload query filters by this index: "active consents
-- for a specific org". The WHERE clause limits the index to live rows.
CREATE INDEX IF NOT EXISTS patient_consents_org_active_idx
    ON patient_consents (org_id)
    WHERE revoked_at IS NULL;

-- The patient's own `/settings/organization-access` page lists every
-- org they've interacted with, so the inverse index on patient_user_id
-- is cheaper for full (active + revoked) scans.
CREATE INDEX IF NOT EXISTS patient_consents_patient_idx
    ON patient_consents (patient_user_id);

COMMENT ON TABLE patient_consents IS
    'Design 028 / ADR-051: per-patient opt-in to share health records with an org. A row with revoked_at = NULL means consent is ACTIVE.';
COMMENT ON COLUMN patient_consents.granted_at IS
    'Most recent grant timestamp. Re-granting after revoke overwrites this and clears revoked_at.';
COMMENT ON COLUMN patient_consents.revoked_at IS
    'NULL = active. Non-NULL = revoked at this time. Does not cascade to audit rows; the access history is preserved.';
