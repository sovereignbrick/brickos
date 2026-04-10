---
number: 517
title: "test: [automated] verify Sprint 040 migrations applied on staging DB"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-g, automated]
created: 2026-04-11
priority: P0
sprint: 041
phase: G
estimate: 0.1d
blocked_by: [516]
---

Automated check against the staging DB that all Sprint 040 migrations are applied. This is the schema verification on the real infrastructure.

## Scope

Write `ops/scripts/verify-staging-migrations.sh` (needs staging DB read access via ssh + psql):

- [ ] Count rows in `_sqlx_migrations` -- should match count of `.sql` files in SHI api migrations dir
- [ ] Verify `20260410000030` through `20260410000032` are present and `success=true`
- [ ] Verify `organizations` table has `branding` column
- [ ] Verify `domain_mappings` table exists
- [ ] Verify `org_invoices` table exists
- [ ] Verify `users` table has `lifecycle_status` + `pending_deletion_at` columns
- [ ] For the staging brickos DB (two-pool): verify `brickos.feature_registry` has 41 rows
- [ ] Verify `brickos.tier_features` has rows for horizon tier across CRM + Link features (from migration 012)

## Who

Claude (automated, but needs ssh jump box creds from user).

## Verification

- Script exits 0
- Any missing migration = P0 bug, halts Phase G

Memory relevant: `feedback_migration_modified_warning.md`, `feedback_migration_checksum_sha384.md`.
