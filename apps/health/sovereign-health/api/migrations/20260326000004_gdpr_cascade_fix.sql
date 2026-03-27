-- GDPR Art. 17: Fix missing ON DELETE CASCADE/SET NULL constraints.
-- Issue #242. Ensures user deletion cascades to all dependent data.
--
-- Tables fixed: data_access_log, content_audit_log, email_campaigns,
-- app_settings, user_licenses (admin_override_by), promotions,
-- org_members (invited_by), app_roles (granted_by), users (parent_referrer_id).

-- 1. data_access_log — add FKs with SET NULL (preserve audit trail, anonymize)
DO $$ BEGIN
    ALTER TABLE data_access_log
        ADD CONSTRAINT fk_dal_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE data_access_log
        ADD CONSTRAINT fk_dal_accessed_by FOREIGN KEY (accessed_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Make user_id nullable for anonymization after deletion
ALTER TABLE data_access_log ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE data_access_log ALTER COLUMN accessed_by DROP NOT NULL;

-- 2. content_audit_log — SET NULL on admin deletion
DO $$ BEGIN
    ALTER TABLE content_audit_log
        DROP CONSTRAINT IF EXISTS content_audit_log_admin_user_id_fkey;
    ALTER TABLE content_audit_log
        ADD CONSTRAINT content_audit_log_admin_user_id_fkey
        FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 3. email_campaigns — SET NULL on sender deletion
DO $$ BEGIN
    ALTER TABLE email_campaigns
        DROP CONSTRAINT IF EXISTS email_campaigns_sent_by_fkey;
    ALTER TABLE email_campaigns
        ADD CONSTRAINT email_campaigns_sent_by_fkey
        FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 4. app_settings — SET NULL on admin deletion
DO $$ BEGIN
    ALTER TABLE app_settings
        DROP CONSTRAINT IF EXISTS app_settings_updated_by_fkey;
    ALTER TABLE app_settings
        ADD CONSTRAINT app_settings_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 5. user_licenses.admin_override_by — SET NULL
DO $$ BEGIN
    ALTER TABLE user_licenses
        DROP CONSTRAINT IF EXISTS user_licenses_admin_override_by_fkey;
    ALTER TABLE user_licenses
        ADD CONSTRAINT user_licenses_admin_override_by_fkey
        FOREIGN KEY (admin_override_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 6. promotions.created_by — SET NULL
DO $$ BEGIN
    ALTER TABLE promotions
        DROP CONSTRAINT IF EXISTS promotions_created_by_fkey;
    ALTER TABLE promotions
        ADD CONSTRAINT promotions_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 7. org_members.invited_by — SET NULL
DO $$ BEGIN
    ALTER TABLE org_members
        DROP CONSTRAINT IF EXISTS org_members_invited_by_fkey;
    ALTER TABLE org_members
        ADD CONSTRAINT org_members_invited_by_fkey
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 8. app_roles.granted_by — SET NULL
DO $$ BEGIN
    ALTER TABLE app_roles
        DROP CONSTRAINT IF EXISTS app_roles_granted_by_fkey;
    ALTER TABLE app_roles
        ADD CONSTRAINT app_roles_granted_by_fkey
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 9. users.parent_referrer_id — SET NULL (break referrer chain gracefully)
DO $$ BEGIN
    ALTER TABLE users
        DROP CONSTRAINT IF EXISTS users_parent_referrer_id_fkey;
    ALTER TABLE users
        ADD CONSTRAINT users_parent_referrer_id_fkey
        FOREIGN KEY (parent_referrer_id) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
