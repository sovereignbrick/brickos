---
number: 508
title: "test: [manual] single user -- Jane adds measurement + exports data"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-e, manual]
created: 2026-04-11
priority: P2
sprint: 041
phase: E
estimate: 0.2d
blocked_by: [507]
---

As Jane (client of Life Algorithm), add a measurement and export her data. Validates the end-user happy path.

## Steps

1. Signed in as `jane.doe@life-algorithm.test`, org context = Life Algorithm
2. Navigate to `/measurements` or `/markers`
3. Add a measurement (any marker, any value)
4. Verify the measurement appears in the list
5. Navigate to `/settings` -> Data export
6. Click **Export JSON** (or CSV)
7. Verify the file downloads
8. Open the file and verify:
   - Jane's email + display name in the profile section
   - The measurement from step 3 is in the measurements array
   - No other users' data is present (RLS working)

## Expected result

- Measurement add flow works from the client context
- Export download works, contains Jane's data only
- Export is available even when Jane switches back to her Personal (Glimpse) context (Glimpse has `shi.json_export=false` per Sprint 040 seed, so this is a policy test: does the export endpoint check the CURRENT context's tier?)

## Who

User (manual).

## Verification

Green/bug. The tier-gating check for export is the interesting part -- if Jane can export from Personal context despite Glimpse not having export, that's a bug.
