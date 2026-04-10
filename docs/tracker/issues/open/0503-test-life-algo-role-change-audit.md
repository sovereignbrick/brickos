---
number: 503
title: "test: [manual] Life Algorithm -- demote Coach to Client + audit log check"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-d, manual]
created: 2026-04-11
priority: P2
sprint: 041
phase: D
estimate: 0.15d
blocked_by: [502]
---

Change a member's role and verify the audit log records the transition.

## Steps

1. Members tab -> find `coach3@life-algorithm.test`
2. In the row, change the role dropdown from "Coach" to "Client"
3. Verify the "Role updated" toast
4. Verify the seat bars: coaches `2/3`, clients `1/50`
5. In psql (or via `/platform/audit` if an audit page exists), query:
   ```sql
   SELECT action, payload FROM brickos.admin_audit_log
   WHERE action = 'org.member.role_change'
   ORDER BY created_at DESC LIMIT 1;
   ```
6. Verify payload contains `from_role: practitioner`, `to_role: member`, correct member_id

## Expected result

- Role change succeeds
- Audit log row written with the full from/to transition
- Seat bars update reactively

## Who

User (manual) -- the SQL step can be done by Claude if user reports the GUI step is green.

## Verification

Green/bug.
