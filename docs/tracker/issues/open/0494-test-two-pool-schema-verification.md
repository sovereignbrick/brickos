---
number: 494
title: "test: [automated] verify brickos schema has all expected Sprint 040 tables"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-b, automated]
created: 2026-04-11
priority: P1
sprint: 041
phase: B
estimate: 0.1d
blocked_by: [491]
---

After #491 (two-pool E2E env) ships, verify the brickos schema has every table Sprint 040 introduced.

## Scope

Run against the two-pool e2e platform DB:

- [ ] `brickos.feature_registry` exists, row count >= 41 (28 SHI + 13 cross-app from Sprint 040 #486)
- [ ] `brickos.tier_features` exists with (tier_slug, feature_slug) PK columns
- [ ] `brickos.license_tiers` exists with 6 rows (core, glimpse, focus, insight, clarity, horizon)
- [ ] `brickos.org_licenses` exists, empty
- [ ] `brickos.org_licenses_revoked` exists, empty
- [ ] `brickos.admin_audit_log` exists
- [ ] `brickos.organizations` exists with seed rows (per migration 010)
- [ ] `brickos.users` exists

## Who

Claude (automated). Script lives at `ops/scripts/verify-brickos-schema.sh` (create as part of this issue).

## Verification

- Every check above returns expected count / non-empty
- Script exits 0 on success, non-zero on any mismatch
