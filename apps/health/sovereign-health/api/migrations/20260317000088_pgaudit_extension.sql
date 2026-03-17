-- Migration 088: Enable pgaudit extension for tamper-proof database audit logging
-- pgaudit logs all SQL operations at the PostgreSQL level.
-- Requires shared_preload_libraries = 'pgaudit' in postgresql.conf.
-- If pgaudit is not loaded, this migration silently succeeds (CREATE IF NOT EXISTS).
--
-- Issue: https://github.com/sovereignbrick/brickos/issues/67

CREATE EXTENSION IF NOT EXISTS pgaudit;
