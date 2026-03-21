<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD - BIOMARKERS - INSIGHT

 RC Testing Retrospective - v0.23.0
 Date: 2026-03-21

 https://sovereignhealth.io/
 AGPL-3.0 - https://github.com/sovereignbrick/brickos
============================================================================
-->

# RC Testing Retrospective - v0.23.0

**Date:** 2026-03-21
**Duration:** Full-day session (~6 hours)
**Sections tested:** 18/18 (all pass)
**Fixes applied:** 26 files, 571 insertions, 401 deletions
**Deploys to staging:** ~15 (frontend + backend)
**Production deploy:** 1 (successful)

---

## What Went Well

1. **Comprehensive testing** - All 18 checklist sections tested systematically with real user interaction. Found and fixed issues that automated tests would miss (layout, i18n, UX).
2. **Fix-and-verify loop** - Each issue was fixed, deployed to staging, and verified before moving on. No regression introduced.
3. **Multi-select dropdowns** - The new MultiSelect component turned out clean and reusable. Saved as a UI blueprint for future BrickOS projects.
4. **Smart Import works end-to-end** - ODS upload with multi-sheet files, LibreOffice conversion, AI extraction, and import all working after several fixes.
5. **i18n coverage** - Added 30+ translation keys, fixed missing DE translations for marker content, and ensured locale switching works without page refresh.

---

## What Went Wrong

1. **Backend deploy cache nightmare** - Docker build cache served stale binaries despite code changes. The `Projects` vs `projects` path mismatch meant the deploy script built from a different directory than where edits were made. Cost ~1 hour of debugging.
   - **Action:** Filed #153. Need to standardize paths and add pre-deploy verification.

2. **Version stuck at 0.22.0** - VERSION constant wasn't updated in multiple places (lib.rs, Cargo.toml, deploy.sh, snapshots). Deploy script reported success but API was running old code.
   - **Action:** Saved memory for staging build numbers (v0.23.0-b1, b2...) and mandatory version verification after deploy.

3. **Modified migration broke subsequent migrations** - Replacing em-dashes in an already-applied migration changed its checksum. SQLx silently refused to run new migrations.
   - **Action:** Saved memory: never modify applied migrations. Always create new corrective migrations.

4. **Demo mode on staging** - `isDemo=true` on demo.sovereignhealth.io caused all API calls to use demo endpoints (which query `is_demo=true`). Since all measurements are real (non-demo), everything returned empty.
   - **Action:** Added `useDemoApi = isDemo && !user` flag so authenticated users get real data.

5. **LibreOffice multi-sheet output** - Expected single CSV but got one per sheet (e.g. `import_UUID-Messprotokoll.csv`). Then UTF-8 encoding issue. Then summary table false positive.
   - **Action:** Fixed all three. The spreadsheet import path needs more robustness (consider calamine crate for native Rust parsing).

6. **Docker compose orphan DB** - Manual compose commands created a second DB container. Backend connected to empty DB and replayed all migrations.
   - **Action:** Saved memory: never use raw compose commands, always use deploy.sh.

---

## Key Lessons Learned (saved to memory)

| Lesson | Memory File |
|--------|------------|
| Backend deploy needs --no-cache + version verification | feedback_backend_deploy_nocache.md |
| Docker compose can create orphan DB containers | feedback_docker_compose_orphans.md |
| Never modify already-applied migrations | feedback_migration_modified_warning.md |
| Use staging build numbers for version visibility | feedback_staging_build_numbers.md |
| Never touch production during staging work | feedback_staging_only_no_production.md |

---

## Process Improvements for Next RC

1. **Pre-deploy checklist:** Run `cargo check`, `clippy`, `pnpm build` locally before any deploy
2. **Version bump script:** Auto-update VERSION in all locations (lib.rs, Cargo.toml, deploy.sh, snapshots)
3. **Post-deploy verification:** Mandatory curl to /health on VPS and compare version string
4. **Staging build counter:** Increment build number on each staging deploy for UI verification
5. **Image transfer verification:** Compare local and VPS image IDs after docker load
6. **Path standardization:** Resolve #153 before next sprint

---

## Metrics

- **Issues found during RC:** ~25 (UI, i18n, API, deployment)
- **Issues fixed in-session:** ~22
- **Issues deferred:** 3 (#153, #154, hydration error)
- **Time to first deploy:** ~15 min (version bump + initial deploy)
- **Longest single fix:** ~45 min (backend deploy cache debugging)
- **Production downtime:** 0 (clean deploy)
