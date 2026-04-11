---
number: 504
title: "test: [automated] Life Algorithm -- bulk add 10 test clients via SQL"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-d, automated]
created: 2026-04-11
priority: P2
sprint: 041
phase: D
estimate: 0.15d
blocked_by: [501]
---

Automated equivalent of adding 10 clients via SQL -- too tedious to add manually via the GUI. Used to populate enough test data for the Phase E paging/filter tests.

## Scope

Script at `ops/scripts/bulk-add-life-algo-clients.sh`:

- [ ] Inserts users `client1@life-algorithm.test` through `client10@life-algorithm.test` into the `users` table with a known argon2 password hash (reuse the one from `e2e/suite-licensing-journeys.spec.ts` template user pattern)
- [ ] Inserts the 10 users into `org_members` with role=`member` for the Life Algorithm org
- [ ] Verifies the count: `SELECT COUNT(*) FROM org_members WHERE role='member' AND org_id = (SELECT id FROM organizations WHERE slug='life-algorithm')` returns 11 (1 from #503 demote + 10 new)

## Who

Claude (automated).

## Verification

- Script exits 0
- Overview seat bar on Life Algorithm shows `11/50` clients (after user refreshes)
