# Sovereign Health v0.49.0 Release Notes

**Release date:** 2026-04-23
**Sprint:** 051 (Carry-over Burn-down + UX Polish)
**Git:** develop -> main, tag `v0.49.0`

## Highlights

- **12 tracker issues closed** -- the backlog cluster from Sprints 043-050. Two P1s, seven P2s, three P3s. Details below.
- **GDPR Art. 15 transparency regression fixed (#0592).** Privacy tab's "Data Access Log" card was calling the Sprint 026 generic audit endpoint and showing "No data access recorded yet" while Sprint 048's practitioner-impersonation events lived on a separate endpoint. Both surfaces now share the `/user/data-access-log` source.
- **"Newer version available" banner no longer triggers on fresh private-browser sessions (#0588).** Root cause: the SW controllerchange event fires on first-ever SW install, not just upgrades. Now captures `hadController` before attaching the listener; only flags stale on true swaps.
- **Sovereign Link end-user skeleton shipped (#0587).** Org members can now list + create short links at `/sovereign-link/*` instead of getting bounced to the platform-admin page. Full create form, copy-to-clipboard, per-link click counts. Analytics page stubs out for a future iteration.
- **Platform admin UX clean-up (#0590).** The ORGANIZATION sidebar section now hides on the aggregate platform plane (demo.brickos.io) and only appears when the hostname carries a specific org slug. Stops the "Could not load members" red toast that confused first-time admins.
- **No user-facing behavior changes in 9 of 12 fixes** -- the remaining bugs were UX/fixture/back-end drift that manual RC surfaced. Pre-existing, not regressions.

## Architecture

- **Design 015 flipped to "shipped"** -- the Sprint 043 BrickOS platform namespace concept is now codified as shipped, with pointers to the actual operating docs (Design 025 / 026 / 027 / 029). Issue #0526 was a P1 that closed incrementally across six sprints.
- **No new ADRs.** Existing ADRs 050-053 continue to govern.

## What changed (by area)

### Backend (`sovereign-health-backend` v0.49.0)

- **#0582** `org_settings::analytics` SQL -- probe `brickos.org_members` vs `public.org_members` per request; pick the populated one. Fixes "0 members" on staging Overview card.
- **#0593** `/demo/zones` summary now counts calculated markers with computable values toward "markers with data". New `compute_zone_calc_counts` helper runs the same formula pipeline as `demo_zone_detail`.
- **#0539** Confirmed tier_features migration live and tested (`load_tier_features` queries `brickos.tier_features`; 17/17 tier_feature_matrix_test green).

### Frontend

- **#0587** New routes under `src/app/sovereign-link/`:
  - `/sovereign-link` -- landing page with list + copy-to-clipboard
  - `/sovereign-link/new` -- create form
  - `/sovereign-link/analytics` -- placeholder page
  - Nav registry (`lib/admin-nav/apps/sovereign-link.ts`) now points at the end-user routes instead of `/platform/links`
  - 30 EN + DE i18n keys
  - Playwright smoke spec at `e2e/sprint-051-sovereign-link.spec.ts`
- **#0590** `AdminContextType` gained `isOrg: boolean`; new `orgScoped` nav predicate hides ORGANIZATION sidebar items on the platform aggregate plane.
- **#0592** Privacy tab `accessLog` state shape updated to match `/user/data-access-log`; card now shows last 5 impersonation events inline + "See all ->" link to the full-page view. New EN+DE keys `accessLogActor` and `accessLogSeeAll`.
- **#0586 + #0588** `refresh-banner.tsx`: controllerchange listener only flags stale if a controller existed before the listener attached; `/app-build-id` SW route removed (NetworkOnly added no value and produced workbox-internal promise rejections).

### Infrastructure / ops

- **#0526** `reference_brickos_domains.md` memory updated: `sovereignhealth.io` reframed from "legacy passthrough" to "consumer plane -- NOT legacy, first-class" to reflect the two-plane architecture. Added eval + wildcard entries.
- **#0543** All 5 admin audit endpoints verified reachable (401 unauth, not 404). Closed as already-fixed by Sprint 047 nginx cleanup.
- **#0589** deploy.sh verify() confirmed sufficient: curl checks + build-id assertion + eval-smoke on prod. Staging Playwright suite remains a manual/separate invocation to keep deploy iteration fast.

### Tests

- 8 new Rust integration tests still green from Sprint 050 (`sprint_050_coverage.rs`).
- 9 new Playwright spec files still green from Sprint 050.
- 1 new Playwright spec file from Sprint 051 (`sprint-051-sovereign-link.spec.ts`, 3 smoke tests).

## Deferred to Sprint 052

- **Rust edition 2024.** Raised during Sprint 051 version bump; edition field is not a calendar year but a language-edition specifier. Moving 2021 -> 2024 is a deliberate language change, filed for a focused commit.
- **features.rs admin CRUD UI** still uses `public.product_features` / `public.tier_features`. Runtime handlers migrated (#0539); dropping those tables requires a separate admin UI refactor.
- **#0576 shared-SSO across planes evaluation.** Not attempted; remains an evaluation gate for Sprint 052.
- **Sovereign Link UI depth:** search, filter, edit, delete, per-link charts. The Sprint 051 skeleton is intentionally thin.

## Upgrade notes

- **No schema changes.**
- **No env var changes.**
- **No new cron entries.**
- **Deploy is boring.** `bash apps/health/sovereign-health/ops/deploy.sh staging` then `--confirm` to promote.

## Known issues

- Staging Playwright has 2 tests that occasionally flake (`sprint-046-plane-routing /platform/org/analytics` + `sprint-050-mobile-responsive /sovereign-health/trends at tablet-portrait`) -- both pass on retry; not blocking.

## Commits (develop, since v0.48.0)

```
728596f release: bump to v0.49.0 for Sprint 051
1b9b15a feat(sprint-051 #0587): Sovereign Link end-user skeleton
63811cd docs(sprint-051 #0539): close -- runtime handler migration already shipped in Sprint 044
528d6c3 fix(sprint-051 #0591 #0593): Phase D -- zone calc-marker undercount + fixture verified
81b8853 fix(sprint-051 #0586 #0588 #0589): SW + build-id chain final
30de347 fix(sprint-051 #0592): Privacy tab data-access-log reads Sprint 048 endpoint
74d793c docs(sprint-051 #0526): close namespace consolidation; flip Design 015 to shipped
3e87c29 docs(sprint-051 #0543): close stale audit-logs 404 issue
b3e8cf9 fix(sprint-051 #0590): gate ORGANIZATION sidebar on specific-org context
11ea55a fix(sprint-051 #0582): org analytics queries use schema-aware table picker
2f0f23e docs(sprint-050): v0.48.0 retrospective
ac0f8c2 docs(sprint-051): plan -- carry-over burn-down + UX polish
```
