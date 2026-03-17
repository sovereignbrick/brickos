-- Migration 084: Row-Level Security (RLS) on all user-data tables
-- GDPR defense-in-depth: even if application code has a bug,
-- the database will not return unauthorized data.
--
-- How it works:
--   1. App middleware sets: SET LOCAL app.current_user_id = '<uuid>'
--   2. RLS policies check: user_id = current_setting('app.current_user_id')
--   3. Queries without the session var return 0 rows (not an error)
--
-- The Encryptor passthrough pattern: if no session var is set,
-- current_setting returns '' which won't match any UUID, so 0 rows.
--
-- Issue: https://github.com/sovereignbrick/brickos/issues/43

-- Helper function: safely get current user ID (returns NULL if not set)
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ══════════════════════════════════════════════════════════════════════
-- Enable RLS on user-data tables
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE influence_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculated_marker_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════
-- Create policies: users can only access their own data
-- ══════════════════════════════════════════════════════════════════════

-- Tables with direct user_id column
CREATE POLICY user_own_data ON measurements
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON devices
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON doctor_chat_conversations
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON measurement_templates
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON user_medications
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON influence_factors
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON calculated_marker_values
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON user_mfa
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON user_preferences
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON user_profile
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON import_history
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON import_sessions
  FOR ALL USING (user_id = app_current_user_id());

CREATE POLICY user_own_data ON subscriptions
  FOR ALL USING (user_id = app_current_user_id());

-- Reference ranges: user's custom ranges OR system ranges (user_id IS NULL)
CREATE POLICY user_own_or_system ON reference_ranges
  FOR ALL USING (user_id = app_current_user_id() OR user_id IS NULL);

-- Data shares: owner or grantee can see the share
CREATE POLICY user_own_shares ON data_shares
  FOR ALL USING (
    owner_user_id = app_current_user_id()
    OR granted_to_user_id = app_current_user_id()
  );

-- ══════════════════════════════════════════════════════════════════════
-- IMPORTANT: RLS does NOT apply to the table owner role by default.
-- Since we use a single DB role (sovereign_health) that owns the tables,
-- we must FORCE RLS to apply even to the owner.
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE measurements FORCE ROW LEVEL SECURITY;
ALTER TABLE devices FORCE ROW LEVEL SECURITY;
ALTER TABLE doctor_chat_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE measurement_templates FORCE ROW LEVEL SECURITY;
ALTER TABLE user_medications FORCE ROW LEVEL SECURITY;
ALTER TABLE influence_factors FORCE ROW LEVEL SECURITY;
ALTER TABLE calculated_marker_values FORCE ROW LEVEL SECURITY;
ALTER TABLE reference_ranges FORCE ROW LEVEL SECURITY;
ALTER TABLE user_mfa FORCE ROW LEVEL SECURITY;
ALTER TABLE user_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE user_profile FORCE ROW LEVEL SECURITY;
ALTER TABLE import_history FORCE ROW LEVEL SECURITY;
ALTER TABLE import_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE data_shares FORCE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
