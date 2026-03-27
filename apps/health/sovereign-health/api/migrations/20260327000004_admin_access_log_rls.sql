-- Fix #258: Admin users cannot see data_access_log due to RLS.
-- The existing policy only allows users to see their own access logs.
-- Admin needs to see ALL logs for audit purposes.

-- Drop the restrictive policy and replace with one that includes admin bypass
DROP POLICY IF EXISTS user_own_access_log ON data_access_log;

CREATE POLICY access_log_read ON data_access_log
    FOR SELECT USING (
        user_id = app_current_user_id()
        OR (SELECT role FROM users WHERE id = app_current_user_id()) = 'admin'
    );
