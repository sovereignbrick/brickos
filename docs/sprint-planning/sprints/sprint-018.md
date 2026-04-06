# Sprint 018 -- Import Pipeline Reliability

**Started:** 2026-03-28
**Completed:** 2026-03-28
**Duration:** 1 day (2026-03-28)
**Status:** CLOSED -- deployed as v0.31.0
**Delivered:** 16 / 16 pts
**Goal:** Fix calculated marker computation during import (historical dates + dedup), add SHBG marker alias, extract lab metadata from PDFs, and build import history page.

## Context

v0.30.0 RC testing revealed that tabular/lab imports only compute calculated markers at `Utc::now()` instead of per-date, creating a single data point instead of full history. Users must manually trigger admin backfill after every import. Additionally, SHBG is not recognized by the marker matcher, lab name/address is not extracted, and there is no import history page for reviewing or rolling back past imports.

## Sprint Backlog

### P0 -- Import Calculated Markers Fix

| # | Title | Points | Area |
|---|-------|--------|------|
| #298 | Compute calculated markers per-date during import | 5 | Backend |
| | Sub: Iterate unique dates where calc inputs exist post-import | 2 | Rust |
| | Sub: Fetch values-at-date instead of latest-only | 2 | Rust |
| | Sub: Test with multi-date glucose+ketone import | 1 | Test |
| #298 | ON CONFLICT DO UPDATE in import calc marker INSERT | 1 | Backend |
| | **P0 Subtotal** | **6** | |

### P1 -- Import Quality

| # | Title | Points | Area |
|---|-------|--------|------|
| #295 | Add SHBG / "Sex Hormone Binding Globulin" marker alias | 2 | Backend / DB |
| | Sub: Add alias to marker_aliases or matcher config | 1 | Migration |
| | Sub: Verify import matches SHBG after alias | 1 | Test |
| #296 | Extract lab name and address from imported PDF | 3 | Backend |
| | Sub: Parse lab header patterns from PDF text | 2 | Rust |
| | Sub: Store lab metadata on import session | 1 | DB |
| | **P1 Subtotal** | **5** | |

### P2 -- Import UX

| # | Title | Points | Area |
|---|-------|--------|------|
| #297 | Import history page with rollback | 5 | Full-stack |
| | Sub: Backend endpoint: GET /import/sessions (list) | 2 | Rust |
| | Sub: Backend endpoint: POST /import/sessions/:id/rollback | 1 | Rust |
| | Sub: Frontend: /import/history page with session list + rollback button | 2 | React |
| | **P2 Subtotal** | **5** | |

## Velocity Budget

| Priority | Points |
|----------|--------|
| P0 -- Calc markers fix | 6 pts |
| P1 -- Import quality | 5 pts |
| P2 -- Import UX | 5 pts |
| **Total Planned** | **16 pts** |

## Dependency Graph

```
Sequential (P0 first):
  #298 ON CONFLICT fix (1 pt)
    |-> #298 Per-date calc markers (5 pts)
         |-> Test with real import data

Parallel (after P0):
  #295 SHBG alias (2 pts) -- independent
  #296 Lab name extraction (3 pts) -- independent
  #297 Import history page (5 pts) -- independent
```

## Execution Order

```
1. #298 ON CONFLICT -- add DO UPDATE to import.rs calc marker INSERT      ~20 min
2. #298 Per-date computation -- refactor import handlers                   ~2 hrs
3. #298 Test -- import multi-date glucose+ketone CSV, verify calc history  ~30 min
4. #295 SHBG alias -- add migration + verify matcher                      ~30 min
5. #296 Lab name extraction -- PDF parser enhancement                     ~1.5 hrs
6. #297 Import history -- backend endpoints + frontend page               ~2.5 hrs
7. Full test suite + staging deploy                                       ~1 hr
```

## Success Criteria

1. **Tabular import computes GKI/Dr. Boz/HOMA-IR at each imported date** -- not just Utc::now()
2. **No duplicate calculated marker values** -- ON CONFLICT DO UPDATE prevents them
3. **SHBG recognized** in lab PDF import
4. **Lab name and address extracted** from PDF and stored on session
5. **Import history page** accessible with list of sessions and rollback option
6. **All tests pass** -- cargo test + pnpm build green

## Risk Assessment

- **#298 per-date computation** is the highest-risk item -- needs careful handling of encrypted values at historical dates. The `enrich_with_latest_values` function fetches only the latest value per marker; we need a date-aware variant.
- **#297 import history** depends on existing import_sessions table structure -- verify schema before starting.
- **Budget:** 16 pts is well within single-day limit (25 pts). Room for unplanned work.
