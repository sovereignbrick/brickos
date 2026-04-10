---
number: 500
title: "test: [automated] Life Algorithm -- license API round-trip parity"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-c, automated]
created: 2026-04-11
priority: P0
sprint: 041
phase: C
estimate: 0.25d
blocked_by: [499]
---

Automated mirror of #499. After the user has manually generated the Life Algorithm license via the GUI, Claude verifies the stored row + issues a second license via the API and compares the two.

## Scope

Write an automated test script at `ops/scripts/test-license-api-parity.sh` that:

- [ ] Reads the active Life Algorithm license via `GET /admin/organizations/{id}/license/history` (uses the admin JWT)
- [ ] Verifies row shape: tier=`horizon`, max_owners=1, max_practitioners=3, max_members=50, features array length = 14
- [ ] Re-issues a second license via `POST /admin/organizations/{id}/license` with the same parameters
- [ ] Verifies the previous license is auto-revoked (`revoked_at IS NOT NULL` in org_licenses_revoked)
- [ ] Verifies the new license has a different `jti`
- [ ] Calls `POST /admin/organizations/{id}/license/revoke` and verifies state
- [ ] Verifies brickos.admin_audit_log has 3 rows: issue, issue, revoke (all with actor = admin user id)

## Who

Claude (automated).

## Verification

- Script exits 0
- Audit log row count matches expected
- All revocations appear in `GET /admin/licensing/revocations`
