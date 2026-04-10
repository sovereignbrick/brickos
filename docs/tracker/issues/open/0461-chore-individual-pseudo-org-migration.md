---
number: 461
github_number: 402
title: "chore: migrate personal orgs to Individual pseudo-org + add lifecycle/admin_override columns"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-a, migration, breaking-change]
created: 2026-04-10
priority: P0
sprint: 040
phase: A
design: 022
estimate: 0.75d
---

Cleans up the `organizations` table from N+1 personal-org-per-user pollution. Creates a single Individual pseudo-org and migrates all users.

## Scope

- [ ] Insert `'individual'` system org with fixed UUID `00000000-0000-0000-0000-000000000001`, `org_type='system'`, `slug='individual'`
- [ ] Migration: `DELETE FROM org_members WHERE org_id IN (SELECT id FROM organizations WHERE org_type='personal')`
- [ ] Migration: `DELETE FROM organizations WHERE org_type='personal'`
- [ ] Add `users.lifecycle_status` column (default `'active'`, values: active, dormant, scheduled_deletion)
- [ ] Add `user_licenses.admin_override_tier_slug` column (nullable)
- [ ] Add `user_licenses.admin_override_expires_at` column (nullable)
- [ ] Update handlers that join on `org_id` to fall back to `'individual'` UUID when zero rows
- [ ] Backup taken before staging migration

## Verification

- [ ] `SELECT COUNT(*) FROM organizations WHERE org_type='personal'` returns 0
- [ ] `SELECT * FROM organizations WHERE id='00000000-0000-0000-0000-000000000001'` returns the system org
- [ ] All existing SHI tests still pass after migration
- [ ] No handler crashes on a user with no `org_members` row

## Counter-measures

- M11 rollback: `pg_dump` taken before migration; restoreable in 15 min

## References

- design 022 §1.5, §2.4, §13.4 F13
