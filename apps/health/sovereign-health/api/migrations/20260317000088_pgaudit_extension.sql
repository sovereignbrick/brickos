-- Migration 088: Enable pgaudit extension for tamper-proof database audit logging
-- pgaudit logs all SQL operations at the PostgreSQL level.
-- Requires shared_preload_libraries = 'pgaudit' in postgresql.conf.
-- If pgaudit is not loaded, this migration silently succeeds (CREATE IF NOT EXISTS).
--
-- Issue: https://github.com/sovereignbrick/brickos/issues/67

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgaudit;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgaudit extension not available — skipping (install pgaudit on PostgreSQL for audit logging)';
END
$$;
