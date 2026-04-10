---
number: 505
title: "test: [manual] Life Algorithm -- remove a member + seat bar decrement"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-d, manual]
created: 2026-04-11
priority: P2
sprint: 041
phase: D
estimate: 0.1d
blocked_by: [504]
---

Test the member removal flow including the confirm dialog.

## Steps

1. Members tab -> find `client5@life-algorithm.test`
2. Click **Remove** in that row
3. Verify the confirm dialog
4. Click OK
5. Verify the "Member removed" toast
6. Verify the row disappears from the table
7. Verify the seat bar clients count decrements by 1

## Expected result

- Member removed, seat bar decrements
- Audit log has an `org.member.remove` row
- If you try to remove yourself (the signed-in admin), the system should either block it or allow it with a warning -- test this edge case and report what happens

## Who

User (manual).

## Verification

Green/bug. The self-remove edge case is worth reporting regardless of outcome.
