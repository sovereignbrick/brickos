-- Sprint 004 / P5-2: Drop genuinely unused tables.
--
-- health_check: 0 rows, vestigial from initial scaffold. No handler references it.
-- content_audit_log: 5 rows, overlaps with audit_log. No handler references it.
--
-- NOTE: ui_strings / ui_string_translations are NOT dropped — they are actively
-- served by GET /api/v1/content/ui-strings and the admin content endpoint.

DROP TABLE IF EXISTS content_audit_log;
DROP TABLE IF EXISTS health_check;
