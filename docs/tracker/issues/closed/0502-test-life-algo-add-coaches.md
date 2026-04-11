---
number: 502
title: "test: [manual] Life Algorithm -- add 3 Coaches (practitioners)"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-d, manual]
created: 2026-04-11
priority: P1
sprint: 041
phase: D
estimate: 0.2d
blocked_by: [501]
---

Add 3 practitioners (displayed as "Coaches" due to the branding override from #497). Hit the cap, verify enforcement.

## Prerequisites

- #501 completed (owner added)
- Users `coach1@life-algorithm.test`, `coach2@life-algorithm.test`, `coach3@life-algorithm.test` exist in SHI

## Steps

1. Add `coach1@life-algorithm.test` as **Coach** -- verify success, seat bar `1/3`
2. Add `coach2@life-algorithm.test` as **Coach** -- verify success, seat bar `2/3`
3. Add `coach3@life-algorithm.test` as **Coach** -- verify success, seat bar `3/3` (amber at 100%)
4. Try to add a 4th coach (`coach4@life-algorithm.test` -- create if needed) -- **expect 422 SeatLimitExceeded**
5. Verify the error message includes: role=`practitioner`, current=`3`, max=`3`
6. The UI should show the error in a toast or inline, not a 500 page or blank screen

## Expected result

- Coaches 1-3 added, seat bar turns amber at 3/3
- Adding a 4th fails gracefully with the seat limit message
- The dropdown in the Members tab shows "Coach" (not "practitioner") due to role_labels override

## Who

User (manual).

## Verification

Report green/bug. The seat enforcement failure path was shipped in Sprint 040 #469 -- if the error is ugly or the UI doesn't handle it, file a P1 bug.
