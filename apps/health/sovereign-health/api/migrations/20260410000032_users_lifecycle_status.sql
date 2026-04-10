-- Sprint 040 #482 -- ensure users.lifecycle_status exists in the SHI
-- single-DB local-dev environment.
--
-- The dormant-flag cron in services/lifecycle_jobs.rs (#475) writes
-- 'active' / 'dormant' / 'pending_deletion' to this column. The column was
-- added on the brickos two-pool DB by an earlier brickos-db migration but
-- never on the SHI app DB. Adding it here as IF NOT EXISTS so the dormant
-- cohort review screen (#482) works locally.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'active';
        -- 'active' | 'dormant' | 'pending_deletion'

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pending_deletion_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_lifecycle_status
    ON users(lifecycle_status)
    WHERE is_deleted = false;
