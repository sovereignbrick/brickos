# Weekly Project Summary - BrickOS / Sovereign Health

**Period:** 2026-03-18 -> 2026-03-21
**Current version:** v0.23.0
**Branch:** develop (production on main)
**Auditor:** Claude Code (automated)

---

## Executive Summary

A productive week spanning Sprint 005 completion and comprehensive v0.23.0 RC testing. The major deliverable was **Smart Import - Tabular Measurements** enabling ODS/XLSX/CSV upload with AI-powered marker extraction. RC testing identified ~25 issues across 18 sections, of which ~22 were fixed in-session. The release went to production on 2026-03-21 with zero downtime. Key infrastructure improvements include LibreOffice in Docker, multi-sheet spreadsheet support, and advanced measurement filters.

---

## Codebase Statistics

| Language | Files | Lines |
|---|---|---|
| Rust (.rs) | ~130 | 35,336 |
| TypeScript / TSX (.ts, .tsx) | ~175 | 27,998 |
| SQL (.sql) | ~165 | 13,452 |
| **Total (tracked)** | **~750** | **~115,000** |

---

## Releases

| Version | Date | Type | Key Changes |
|---------|------|------|-------------|
| v0.23.0-rc1 | 2026-03-21 | RC | Sprint 005 on staging |
| v0.23.0 | 2026-03-21 | Production | RC fixes + Sprint 005 |

---

## Sprint Summary

### Sprint 005 - Production Stability (completed 2026-03-20)
- Smart Import - Tabular Measurements (ODS/XLSX/CSV/image upload)
- why_it_matters + when_to_worry content for all 92 markers (EN + DE)
- Admin panel error handling improvements
- API contract + audit log parsing tests

### RC Testing Session (2026-03-21)
- Full 18-section manual testing on staging
- 26 files changed, 571 insertions, 401 deletions
- ~15 staging deploys during fix-and-verify loop
- Key fixes: translated marker names, measurement table layout, MultiSelect dropdowns, LibreOffice conversion, demo mode API routing

---

## Architecture Decisions (ADRs)

| # | Decision | Status |
|---|----------|--------|
| 017 | LibreOffice for spreadsheet-to-CSV conversion | Accepted |
| 018 | MultiSelect filter pattern for data tables | Accepted |
| 019 | marker_translations as source of truth for localized content | Accepted |

---

## Issues Filed

| # | Title | Priority |
|---|-------|----------|
| 153 | Projects vs projects path inconsistency | High (DX) |
| 154 | Dr. Alex responsiveness + navigation | Medium |

---

## Deployment Notes

- Production deploy successful with zero downtime
- Backend image now ~200MB larger due to libreoffice-calc
- Docker build cache issues identified and documented (see retro)
- Staging deploy process needs path standardization (#153)
- CF cache purge needed manually (tokens not in staging env)

---

## Lessons Learned

5 new feedback memories saved:
1. Backend deploy requires --no-cache and version verification
2. Docker compose can create orphan DB containers
3. Never modify already-applied migrations (SQLx checksum)
4. Use staging build numbers for version visibility
5. Never touch production during staging work

---

## Next Week Priorities

1. Fix #153 (Projects vs projects path) before any more deploys
2. Fix #154 (Dr. Alex navigation + responsiveness)
3. Extract MultiSelect to shared component
4. Replace remaining native date inputs with DateOnlyPicker
5. Implement conversation delete backend endpoint
6. Investigate React hydration error #418
7. Consider calamine crate to replace LibreOffice dependency
