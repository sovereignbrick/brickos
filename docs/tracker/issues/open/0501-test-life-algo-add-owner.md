---
number: 501
title: "test: [manual] Life Algorithm -- add org_owner"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-d, manual]
created: 2026-04-11
priority: P1
sprint: 041
phase: D
estimate: 0.1d
blocked_by: [499]
---

Add the first org_owner to Life Algorithm via the Members tab.

## Prerequisites

- Life Algorithm has an active Horizon license with max_owners=1 (#499)
- User `admin@life-algorithm.test` exists in SHI (signup via app or direct SQL insert). If not: create via the self-register flow at `/signup` first.

## Steps

1. `/platform/orgs/{life-algorithm-id}` -> **Members** tab
2. Click **Add member**
3. Email: `admin@life-algorithm.test`
4. Role dropdown: verify it shows "org_owner" option (or "Owner" if a role_labels override were set on that key)
5. Select `org_owner`
6. Click **Add**
7. Verify success toast

## Expected result

- Member appears in the table with role "org_owner"
- Joined date = now
- Overview tab seat bar updates: owners `1/1` (green)
- If you try to add a second owner, the system returns 422 SeatLimitExceeded

## Who

User (manual).

## Verification

Report green/bug. Attempt to add a SECOND owner and verify the seat limit error surfaces in the UI (not a blank page or generic 500).
