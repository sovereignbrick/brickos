# 0591 -- bug: practitioner caseload fixture missing Anna assignment on staging

**Type:** bug (fixture data gap, not application code)
**Priority:** P3
**Found:** Sprint 050 RC manual test, 2026-04-22, layer 4.2
**Sprint target:** 051
**Reporter:** helmut (manual RC test layer 4.2)

## Observed

On `https://test-clinic.demo.brickos.io/sovereign-health/practitioner` logged in as `test-clinic-practitioner@clinic.com`, the caseload page renders with the right UI shell but every patient's aggregate counters (measurements, recent activity, etc.) show `0`.

Anna Meier is visible in the table (so the practitioner IS assigned to her), but the zero-counts across the board look broken.

## Root cause (hypothesized)

`ops/fixtures/002_test_users.sql` creates the practitioner and the patient but does not insert any measurements or recent activity for Anna. On staging the fixture was applied cleanly, so the page is showing truthful but empty data.

## Expected / fix

Extend `ops/fixtures/003_test_patient_data.sql` (or create it if missing) to seed Anna with:
- ~20 measurements across the last 90 days (Iron, HbA1c, Glucose, Vitamin D)
- 2-3 recent doctor-chat sessions
- A `caseload_assignment` row explicitly linking `test-clinic-practitioner@` -> `anna.meier@` with `assigned_at = now() - interval '30 days'`

Re-apply on staging + document the fixture dependency in `ops/fixtures/README.md`.

## Notes

- Not a v0.48.0 regression. The fixture data has been incomplete since Sprint 044 when the practitioner workbench shipped. Sprint 050 RC is the first end-to-end manual walk that exercised this path.
- The practitioner caseload backend handler is returning the correct data (Anna present, counts = 0 because there's nothing to count). No code fix needed.
