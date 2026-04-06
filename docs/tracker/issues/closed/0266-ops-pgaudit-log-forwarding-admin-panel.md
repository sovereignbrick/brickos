---
number: 266
title: "ops: pgAudit log forwarding to admin panel"
labels: [ops, security, admin, infrastructure]
milestone: privacy-and-security
---

## Description

pgAudit is installed and enabled (migration 088), but audit logs are only accessible via:
- `docker logs sh-staging-db` (container stdout)
- VPS log files at `/var/lib/docker/containers/`

The admin panel at `/admin` mentions: "A future update will add log forwarding to make these queryable here."

## Current State

- pgAudit extension loaded in PostgreSQL
- Logs DDL + DML on sensitive tables
- Logs written to PostgreSQL log output (stdout in Docker)
- NOT queryable from the admin panel
- NOT forwarded to any centralized log system

## Proposed Implementation

### Option A: PostgreSQL log table (simplest)
- Configure pgAudit to log to a `pgaudit_log` table via `pg_audit_log_to_table` extension
- Query from admin panel via standard SQL
- Pro: no external dependencies
- Con: grows the DB, needs retention policy

### Option B: Log forwarding to file + API
- Configure Docker log driver to write structured JSON logs
- Parse pgAudit entries from container logs
- Create API endpoint: `GET /admin/audit/pgaudit?from=&to=&table=&action=`
- Pro: no DB growth, queryable
- Con: requires log parsing, more complex

### Option C: csvlog + import
- Set `log_destination = 'csvlog'` in PostgreSQL
- Mount log volume from container
- Periodic import into queryable table
- Pro: structured format, easy to parse
- Con: requires cron job

## Recommendation

Option A for MVP (least effort, queryable immediately).

## Requirements

- [ ] Research pgAudit table logging capability
- [ ] Implement chosen approach
- [ ] Admin panel: add pgAudit log viewer tab
- [ ] Retention policy (e.g., 90 days)
- [ ] Filter by: table, action (SELECT/INSERT/UPDATE/DELETE), user, date range
