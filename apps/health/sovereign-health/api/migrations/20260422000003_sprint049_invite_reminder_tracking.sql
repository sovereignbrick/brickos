-- Sprint 049 #049-21 (Sprint 048 carry-over #048-22): track when an
-- invite reminder was sent so the cron doesn't spam.
--
-- Policy: one reminder email per invite, sent ~3 days after creation
-- if the invite is still pending (not accepted, not cancelled, not
-- expired). The cron sets `reminder_sent_at` once; subsequent cron
-- runs skip invites where it's non-null.

ALTER TABLE org_invites
    ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN org_invites.reminder_sent_at IS
    'Non-null when the one-time day-3 reminder email has been dispatched. Set by invite_reminder_cron (see services/lifecycle_jobs.rs).';

-- Hot path: cron selects unaccepted + unreminded invites older than 3d.
CREATE INDEX IF NOT EXISTS org_invites_needs_reminder_idx
    ON org_invites (created_at)
    WHERE accepted_at IS NULL
      AND cancelled_at IS NULL
      AND reminder_sent_at IS NULL;
