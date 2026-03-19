-- Fix FK constraints and ON DELETE policies (Sprint 003 P1-7)
-- Prevents orphaned records and unblocks user deletion cascade.

-- Fix influence_factors: allow user cascade delete
-- Current: FK to users(id) with NO ACTION (blocks user deletion)
ALTER TABLE influence_factors
  DROP CONSTRAINT IF EXISTS influence_factors_user_id_fkey;
ALTER TABLE influence_factors
  ADD CONSTRAINT influence_factors_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Fix measurements.lab_id: allow lab deletion without blocking
-- Current: FK to labs(id) with NO ACTION (blocks lab deletion)
ALTER TABLE measurements
  DROP CONSTRAINT IF EXISTS measurements_lab_id_fkey;
ALTER TABLE measurements
  ADD CONSTRAINT measurements_lab_id_fkey
  FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE SET NULL;

-- Fix remaining NO ACTION FKs that block user deletion
-- These tables should cascade when a user is deleted.

ALTER TABLE measurement_templates
  DROP CONSTRAINT IF EXISTS measurement_templates_user_id_fkey;
ALTER TABLE measurement_templates
  ADD CONSTRAINT measurement_templates_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_medications
  DROP CONSTRAINT IF EXISTS user_medications_user_id_fkey;
ALTER TABLE user_medications
  ADD CONSTRAINT user_medications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_licenses
  DROP CONSTRAINT IF EXISTS user_licenses_user_id_fkey;
ALTER TABLE user_licenses
  ADD CONSTRAINT user_licenses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE license_events
  DROP CONSTRAINT IF EXISTS license_events_user_id_fkey;
ALTER TABLE license_events
  ADD CONSTRAINT license_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE ai_usage_log
  DROP CONSTRAINT IF EXISTS ai_usage_log_user_id_fkey;
ALTER TABLE ai_usage_log
  ADD CONSTRAINT ai_usage_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE chat_agent_quota
  DROP CONSTRAINT IF EXISTS chat_agent_quota_user_id_fkey;
ALTER TABLE chat_agent_quota
  ADD CONSTRAINT chat_agent_quota_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE app_roles
  DROP CONSTRAINT IF EXISTS app_roles_user_id_fkey;
ALTER TABLE app_roles
  ADD CONSTRAINT app_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE org_members
  DROP CONSTRAINT IF EXISTS org_members_user_id_fkey;
ALTER TABLE org_members
  ADD CONSTRAINT org_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE btc_payments
  DROP CONSTRAINT IF EXISTS btc_payments_user_id_fkey;
ALTER TABLE btc_payments
  ADD CONSTRAINT btc_payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE promotion_redemptions
  DROP CONSTRAINT IF EXISTS promotion_redemptions_user_id_fkey;
ALTER TABLE promotion_redemptions
  ADD CONSTRAINT promotion_redemptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE data_shares
  DROP CONSTRAINT IF EXISTS data_shares_owner_user_id_fkey;
ALTER TABLE data_shares
  ADD CONSTRAINT data_shares_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE data_shares
  DROP CONSTRAINT IF EXISTS data_shares_granted_to_user_id_fkey;
ALTER TABLE data_shares
  ADD CONSTRAINT data_shares_granted_to_user_id_fkey
  FOREIGN KEY (granted_to_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Audit log: SET NULL on user delete (preserve audit trail, strip PII)
ALTER TABLE audit_log
  DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
