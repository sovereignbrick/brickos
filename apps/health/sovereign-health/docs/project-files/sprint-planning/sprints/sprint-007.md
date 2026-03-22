# Sprint 007 - Production Polish

**Started:** 2026-03-22
**Completed:** 2026-03-22
**Goal:** Clean up production rough edges from v0.24.0 launch — remove demo artifacts, fix data issues, harden deploy pipeline, improve marker recognition.

## Planned

| # | Title | Points | Area |
|---|-------|--------|------|
| [#192](https://github.com/sovereignbrick/brickos/issues/192) | fix: remove demo banner — we are live | 2 | Frontend |
| [#197](https://github.com/sovereignbrick/brickos/issues/197) | fix: BPM not recognized by table importer | 2 | API |
| [#196](https://github.com/sovereignbrick/brickos/issues/196) | fix: marker-to-zone assignments — weight in wrong zone | 3 | API |
| [#193](https://github.com/sovereignbrick/brickos/issues/193) | fix: website/tier consistency — stale limits & coming_soon | 3 | Full-stack |
| [#194](https://github.com/sovereignbrick/brickos/issues/194) | fix: verify ntfy + Telegram notifications firing | 2 | Ops |
| [#189](https://github.com/sovereignbrick/brickos/issues/189) | fix: React hydration error #418 root cause | 3 | Frontend |
| [#183](https://github.com/sovereignbrick/brickos/issues/183) | fix: deploy script production pre-flight hardening | 5 | Ops |
| [#180](https://github.com/sovereignbrick/brickos/issues/180) | chore: admin settings audit (document gaps only) | 3 | API |
| | **Total** | **23** | |

## Completed

| # | Title | Points | Commits |
|---|-------|--------|---------|
| #192 | fix: remove demo banner | 2 | `9af55df` |
| #197 | fix: BPM marker alias + AI prompt | 2 | `9af55df` |
| #196 | fix: marker-to-zone assignments (7 blood markers immune->structural) | 3 | `9af55df` |
| #193 | fix: website/tier limit mismatches (12 fixes, EN + DE) | 3 | `9af55df` |
| #194 | fix: verify ntfy + Telegram (code verified, VPS confirmed) | 2 | `9af55df` |
| #189 | fix: React hydration #418 (remove inline theme script) | 3 | `9af55df`, `7d93ca8` |
| #183 | fix: deploy pre-flight (version check, migration warning, container age) | 5 | `9af55df`, `0b5c3b3` |
| #180 | chore: admin settings audit -- design doc 020 | 3 | `9af55df` |
| | **Planned Total** | **23** | |

## Carried Over

None -- all planned items completed.

## Unplanned Work

| Title | Points | Commits |
|-------|--------|---------|
| fix: property tests missing HealthResponse.checks field | 0.5 | `9af55df` |
| fix: test snapshots version 0.23.0 -> 0.24.0 -> 0.25.0 | 0.5 | `9af55df`, `47b803d` |
| fix: deploy.sh VERSION 0.23.0 -> 0.24.0 -> 0.25.0 | 0 | `9af55df`, `47b803d` |
| fix: restore suppressHydrationWarning on body element | 0.5 | `7d93ca8` |
| fix: deploy version check allows staging build numbers (-bN) | 1 | `0b5c3b3` |
| fix: add weight to structural zone (was only in energy_metabolic) | 1 | `221a291` |
| feat: calculated markers trigger from any input source | 5 | `8c6d651` |
| fix: Cloudflare cache purge for staging + production | 1 | `d179fa9` |
| fix: migration 56 checksum mismatch on staging + production DBs | 0 | manual DB fix |
| chore: close 3 pre-sprint issues (#184, #187, #191) | 0 | - |
| chore: create GitHub issues #197, #198, #199, #200 | 0 | - |
| release: v0.25.0 version bump + production deploy | 0 | `47b803d` |
| **Unplanned Total** | **~10** | |

## Velocity

| Metric | Value |
|--------|-------|
| Planned | 23 pts |
| Completed (planned) | 23 pts |
| Completed (unplanned) | ~10 pts |
| Carried over | 0 pts |
| Total delivered | ~33 pts |
| Commits | 11 |
| Staging deploys | 4 (b1, b2, b3 + frontend-only) |
| Production deploys | 1 (v0.25.0) |
| GitHub issues closed | 9 (3 pre-sprint + 6 sprint) |
| GitHub issues created | 4 (#197 BPM, #198 staging notifications, #199 LinkedIn preview, #200 migration checksums) |

## Notes / Decisions

- Sprint follows v0.24.0 production release (same day)
- 3 issues closed before sprint start (#184, #187, #191 -- already shipped in v0.24.0)
- #180 scoped to audit-only this sprint; full fix deferred (design doc 020)
- #194 verified: all 11 env vars populated on both staging and production
- Marker zone audit: moved mcv/mch/mchc/rdw/rbc/hemoglobin/hematocrit from immune to structural
- Weight added to structural zone (was only in energy_metabolic via zone_markers)
- Website tier limits had 12 mismatches vs DB enforcement (all understated user access)
- React hydration #418: removed inline theme script (cause), kept suppressHydrationWarning on body (separate mismatch source tracked in #185)
- Deploy script VERSION was stale (0.23.0); new pre-flight check prevents this in future
- Calculated markers now trigger from any input source (manual, import, separate submissions)
- Migration checksum mismatch (20260312000056) blocked all post-000004 migrations on staging; fixed manually on both DBs
- Cloudflare zone ID hardcoded in deploy script; purge now runs for both staging and production
- Released v0.25.0 to production (from v0.24.0)
- Open issues: 16 (#176-179, #180 remediation, #181-182, #185-186, #188, #190, #194 closed, #195, #198-200)
