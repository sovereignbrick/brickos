# Audit Logging -- Evidence Package

**Control:** Application audit log, data access log, pgAudit database audit, DB trigger audit, admin UI
**Regimes:** GDPR Art. 30 (records of processing), AI Act Art. 12 (record-keeping), NIS 2 Art. 21
**Last verified:** 2026-04-06
**Verification method:** Code audit

## Implementation

BrickOS implements four layers of audit logging:

1. **Application Audit Log** (`audit_log` table) -- Records application-level events (login, logout, account changes, admin actions). IP addresses are SHA-256 hashed with a salt before storage (GDPR pseudonymization). Fire-and-forget -- never blocks the request.
2. **Data Access Log** (`data_access_log` table) -- Records who accessed whose data and when. Tracks self-access (user viewing own data) and admin access. Used for GDPR Art. 15 (right to know who accessed your data).
3. **DB Trigger Audit Log** (`db_audit_log` table) -- Database-level triggers capture INSERT/UPDATE/DELETE operations with changed fields and row IDs. Captures changes that bypass the application layer.
4. **pgAudit** (`pgaudit_events` table) -- PostgreSQL extension-level audit capturing SQL statements, command types, and object access. Lowest-level audit for database forensics.

All four layers are browseable via the admin panel with filtering, sorting, and pagination. Configurable retention with auto-purge (default: 90 days audit, 365 days access log).

## Code References

| Component | File | Lines | Purpose |
|---|---|---|---|
| IP hashing | `apps/health/sovereign-health/api/src/services/audit.rs` | L10-15 | SHA-256 + salt pseudonymization |
| Audit log writer | `apps/health/sovereign-health/api/src/services/audit.rs` | L20-46 | INSERT into audit_log, fire-and-forget |
| Auto-purge (retention) | `apps/health/sovereign-health/api/src/services/audit.rs` | L50-92 | Configurable retention via app_settings |
| Data access log writer | `apps/health/sovereign-health/api/src/services/access_log.rs` | L12-30 | INSERT into data_access_log |
| Self-access logging | `apps/health/sovereign-health/api/src/services/access_log.rs` | L43-57 | Convenience method for user-accessing-own-data |
| Admin: access logs UI | `apps/health/sovereign-health/api/src/handlers/admin_audit.rs` | L31-108 | GET /admin/audit/access-logs with search, filter, pagination |
| Admin: event logs UI | `apps/health/sovereign-health/api/src/handlers/admin_audit.rs` | L111-188 | GET /admin/audit/events with search, filter, pagination |
| Admin: audit stats | `apps/health/sovereign-health/api/src/handlers/admin_audit.rs` | L191-239 | GET /admin/audit/stats -- counts, oldest entry, retention config |
| Admin: purge logs | `apps/health/sovereign-health/api/src/handlers/admin_audit.rs` | L242-285 | DELETE /admin/audit/purge with minimum 7-day floor |
| Admin: DB trigger audit | `apps/health/sovereign-health/api/src/handlers/admin_audit.rs` | L291-399 | GET /admin/audit/db-audit -- trigger-captured changes |
| Admin: pgAudit events | `apps/health/sovereign-health/api/src/handlers/admin_audit.rs` | L416-533 | GET /admin/audit/pgaudit -- SQL-level audit events |
| RLS migration | `apps/health/sovereign-health/api/migrations/20260317000084_row_level_security.sql` | -- | RLS policies that audit logging works alongside |
| Data access log migration | `apps/health/sovereign-health/api/migrations/20260317000085_data_access_log.sql` | -- | data_access_log table schema |
| pgAudit extension | `apps/health/sovereign-health/api/migrations/20260317000088_pgaudit_extension.sql` | -- | pgAudit extension setup |
| DB trigger audit migration | `apps/health/sovereign-health/api/migrations/20260404000003_db_audit_log_trigger.sql` | -- | db_audit_log table + trigger functions |
| pgAudit log table | `apps/health/sovereign-health/api/migrations/20260406000003_pgaudit_log_table.sql` | -- | pgaudit_events table for parsed pgAudit output |
| Compliance security migration | `apps/health/sovereign-health/api/migrations/20260324000015_support_compliance_security.sql` | -- | Additional security/compliance tables |

## Test References

| Test | File | Assertion |
|---|---|---|
| Admin audit endpoint tests | `apps/health/sovereign-health/api/tests/` | Admin-only access enforced, pagination works |

## ADR References

| ADR | Title | Relevance |
|---|---|---|
| ADR-003 | PostgreSQL, pgAudit, RLS | Decision to use pgAudit for database-level audit trail |
| ADR-016 | GDPR Privacy Architecture | Audit logging as GDPR Art. 30 compliance mechanism |

## Automated Verification

```bash
# Verify audit tables exist and have data (staging)
psql -c "SELECT 'audit_log' as tbl, COUNT(*) FROM audit_log
         UNION ALL SELECT 'data_access_log', COUNT(*) FROM data_access_log
         UNION ALL SELECT 'db_audit_log', COUNT(*) FROM db_audit_log
         UNION ALL SELECT 'pgaudit_events', COUNT(*) FROM pgaudit_events" sovereign_health

# Verify pgAudit extension is active
psql -c "SELECT * FROM pg_extension WHERE extname = 'pgaudit'" sovereign_health

# Verify auto-purge retention settings
psql -c "SELECT key, value FROM app_settings WHERE key IN ('audit_retention_days', 'access_log_retention_days')" sovereign_health
```

## Manual Verification Steps

1. Perform a login -- verify entry appears in `audit_log` with hashed IP (not plaintext)
2. View measurements as a user -- verify `data_access_log` entry created
3. Update a measurement via SQL -- verify `db_audit_log` captures the change with changed_fields
4. Access admin audit panel -- verify all four log types are browseable with filters
5. Run audit purge -- verify logs older than retention period are removed, purge itself is logged
