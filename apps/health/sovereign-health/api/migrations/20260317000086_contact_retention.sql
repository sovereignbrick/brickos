-- Migration 086: Add processed_at to contact_submissions for retention tracking
-- Contact submissions are purged 90 days after creation.
-- GDPR Art. 5(1)(e) — Storage limitation
--
-- Issue: https://github.com/sovereignbrick/brickos/issues/42

ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
