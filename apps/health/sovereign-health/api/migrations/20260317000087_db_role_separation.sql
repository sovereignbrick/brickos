-- Migration 087: Database role separation
-- Creates restricted roles for defense-in-depth.
-- The app connects as sh_app (no DELETE, no DDL).
-- Migrations run as the owner role (sovereign_health).
--
-- Issue: https://github.com/sovereignbrick/brickos/issues/44

-- Create app role (if not exists) — SELECT, INSERT, UPDATE only
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sh_app') THEN
    CREATE ROLE sh_app LOGIN PASSWORD 'sh_app_dev_password';
  END IF;
END
$$;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO sh_app;

-- Grant SELECT, INSERT, UPDATE on all existing tables (no DELETE, no DDL)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO sh_app;

-- Grant USAGE on all sequences (needed for INSERT with serial/bigserial columns)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO sh_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES TO sh_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO sh_app;

-- Allow sh_app to SET session variables (needed for RLS)
-- set_config() is available to all roles by default, no extra grant needed.

-- Create readonly role (for analytics, reporting)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sh_readonly') THEN
    CREATE ROLE sh_readonly LOGIN PASSWORD 'sh_readonly_dev_password';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO sh_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sh_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO sh_readonly;
