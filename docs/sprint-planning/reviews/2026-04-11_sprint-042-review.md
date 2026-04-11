# Sprint 042 Review -- SHI Production Readiness

**Date:** 2026-04-11
**Sprint:** 042
**Duration:** Same-day continuation of Sprint 041 close-out (~5h focused work after the Sprint 041 close-out commit)
**Focus:** Repair the user-visible damage Sprint 041 surfaced; lay the structural groundwork for the Sprint 043 production push

This review is the **external-facing** summary of what Sprint 042 delivered. For the internal "what worked / what didn't / what to change" analysis, see the retrospective at `../retrospectives/2026-04-11_sprint-042-retro.md`.

---

## Sprint Goal

> Clear every doubt blocking the SHI production push. Land the schema cleanup that eliminates the staging-only hotfix dependency, the architectural design work for settings + AI provider config + URL namespace, and the remaining SHI consumer-facing bug fixes.

**Outcome: 5 of 7 implementation phases shipped end-to-end on staging.** Phase A (#527 codified), Phase B (#538 SW cache + deploy.sh verification), Phase C (#530 license seat defaults), Phase D (#528 settings restructure -- shipped twice with a production-layout correction in the second iteration), Phase F (#531 glucose unit confusion). Phases E (#529 Dr. Alex AI), G (#526 URL namespace), and H (production push) deferred to **Sprint 043 -- SHI Production Push**.

---

## What Was Delivered

### Phase A -- #527 schema cleanup migration codified (commit `308c80c`)

The Sprint 041 staging hotfix that moved `brickos.product_features_legacy_sprint040` and `brickos.tier_features_legacy_sprint040` back to `public.*` is now a real migration file (`20260411180000_sprint041_close_out_legacy_feature_tables.sql`) that runs automatically on every boot. Idempotent on dev (no-op), no-op on current staging (the manual hotfix already moved the tables), correct on future re-bootstraps.

**Critical correction documented in #527's revised plan:** the codified migration does NOT touch `brickos.tier_features` (the new `tier_slug, feature_slug` shape). That table is queried by `brickos-licensing::EmbeddedProvider::tier_features()` at `crates/brickos-licensing/src/embedded.rs:81` and must remain. The original "drop the new shape as dead code" plan was wrong -- it would have broken the brickos-licensing crate. The new shape is the long-term direction; the SHI handler-side cutover is Sprint 043 Phase A.

Plus a hotfix runbook at `docs/runbooks/hotfixes/2026-04-11_sprint041_legacy_feature_tables.md` for the manual recovery procedure.

### Phase B -- #538 service worker cache + deploy.sh verification (commit `919047e`)

Three changes that close the operational gap silently breaking every deploy:

1. **nginx** (4 server blocks): `app.sovereignhealth.io`, `demo.sovereignhealth.io`, `app.brickos.io`, `demo.brickos.io` all serve `/sw.js` with `Cache-Control: no-cache, no-store, must-revalidate`. `proxy_hide_header Cache-Control` drops the upstream Next.js `public, max-age=14400` first. Each block re-includes `security-headers.conf` because nginx location-level `add_header` shadows the server-level snippet.
2. **serwist** (no change needed): `apps/health/sovereign-health/frontend/src/sw.ts` already has `skipWaiting: true` + `clientsClaim: true` from Sprint 040. Verified.
3. **deploy.sh verification step**: after the existing app/api/web checks, curl `/sw.js` and assert `Cache-Control` matches `no-cache|no-store`. Fail the deploy if not. Catches re-introduction of the bug in nginx config drift.

Verified end-to-end on staging:

```
200  SW JS    https://demo.sovereignhealth.io/sw.js  (Cache-Control: no-cache OK)
```

### Phase C -- #530 license seat defaults (commit `d20bc40`)

Three layers of fix:

1. **Schema** (`migrations/20260411190000_sprint042_license_tier_seat_defaults.sql`): added `default_max_owners`, `default_max_practitioners`, `default_max_members` columns to `brickos.license_tiers`. Seeded per-tier values calibrated to the marketing positioning of each tier:

| tier | owners | practitioners | members |
|---|---|---|---|
| glimpse / focus | 1 | 0 | 0 (single user) |
| insight | 1 | 0 | 1 (couple) |
| clarity | 1 | 0 | 5 (small family / health team) |
| horizon | 1 | 3 | 10 (clinic team, matches marketing copy) |
| core | -1 | -1 | -1 (unlimited, OSS self-host) |

2. **Backend** (`admin_licensing.rs::list_tiers`): GET `/admin/licensing/tiers` now returns the three `default_max_*` fields so the frontend can pre-fill on tier selection.

3. **Frontend** (`license-tab.tsx` + `api.ts`): TierRow interface extended, TIER_FALLBACK seeded with sensible defaults, useEffect watches tier + tiers state and pre-fills max_owners / max_practitioners / max_members from the selected tier's defaults. Soft validation banner if any seat field is 0 (amber heads-up: "the org will not be able to add any user with that role until this license is updated").

### Phase D -- #528 settings restructure (commits `3660020` + `4b52aed` + `c334b32`)

Shipped in three iterations:

1. **First iteration** (`3660020`): brickos master tabs (Account/Security/Privacy/Billing/Notifications) + SHI extension tabs (Health profile/Devices/Thresholds/Medications). Notifications carved out of Account into its own component. Billing promoted to its own top-level tab.
2. **Second iteration** (`4b52aed`): tab order corrected to match production -- SHI tabs first, then brickos master tabs. Default landing tab back to Health Profile.
3. **Third iteration** (`c334b32`): per the user's correction, Notifications + Billing are NOT standalone tabs -- they are inline sections inside the Account tab, matching the pre-Sprint-040 production layout exactly. ALL_TABS dropped from 9 to 7. Account render block wraps AccountTab + NotificationsTab + LicenseTab in a `space-y-8` div with an `<hr>` separator.

The brickos master template default (documented in source comments + the `MASTER_TABS` constant): **"fold Notifications + Billing into Account"**. Apps that want their own dedicated tabs can override the embed.

Final tab order matches production exactly:

```
Health Profile | Devices/Labs | Reference Ranges | Influence Factors | Account | Security | Privacy
```

### Phase F -- #531 glucose unit confusion (commits `3660020` + `4b52aed`)

The Sprint 041 user-visible bug: typing `5` for glucose with the form on mg/dL silently converted to `0.2775` mmol/L which the backend rejected with a meaningless number. Now:

**Backend** (`services/measurement.rs`):
- `MeasurementValue` model gained `display_value: Option<f64>` and `unit: Option<String>` fields. Backward compatible.
- `validate_marker_value` extended to take `Option<&str>` for unit. When unit is provided AND the marker has a unit-specific range, validates in the user's unit. Range tables for glucose, ketones, cholesterol family, HbA1c -- both unit directions.
- New `unit_confusion_hint()` function: when validation fails, computes a "did you mean X?" hint for the alternative unit and appends it to the error message.
- 5 new unit-aware test cases (141/141 backend lib tests pass).

**Frontend** (`measurements/new/page.tsx`):
- Submit handler now sends `value: canonical, display_value: rawInput, unit: displayUnit`. The validator uses `display_value + unit` for the unit-aware range check; storage still uses `value` (canonical) for backward compat.
- New `plausibilityHint()` function: pre-flight check before submit. Suspicious values trigger a `confirm()` dialog with the hint and a "Save anyway?" button.

The original bug repro now produces:

```
glucose value 5 mg/dL is outside the mg/dL range 18-540
  -- did you mean 5 mmol/L? (normal: 3.9-7.8 mmol/L)
```

The error references the user's actual number and unit -- not the converted-to-canonical value the user never typed.

---

## Sprint Scorecard

| Metric | Value |
|---|---|
| Planned phases | 7 (A-G) + close-out (H) |
| Completed phases | 5 (A, B, C, D, F) |
| Carry-over to Sprint 043 | 4 issues (#490, #524, #526, #529) -- Phases E, G, H of Sprint 042 |
| In-sprint commits | ~12 |
| Files touched | ~25 |
| New test cases (backend) | 5 (Sprint 042 #531 unit-aware) |
| Releases / RCs | 0 (no production push -- Sprint 043's job) |
| Deploys to staging | 6 |
| Deploys to production | **0** (per the milestone gate, deferred to Sprint 043) |
| Issues filed during sprint | 0 (this was a fix-only sprint, no new bugs surfaced) |
| Issues closed during sprint | 5 (#527, #528, #530, #531, #538) |

---

## Verification

- [x] `cargo test --lib -p sovereign-health-backend` -- 141/141 pass (was 136 + 5 new Sprint 042 #531 tests)
- [x] `cargo clippy -p sovereign-health-backend -- -D warnings` -- clean
- [x] `pnpm --filter sovereign-health-frontend build` -- clean
- [x] Sprint 041 API smoke test (`/tmp/sprint041_staging_smoke.py`) -- 7/7 green post final redeploy
- [x] License seat defaults verified on staging via API: all 6 tiers seeded
- [x] `/sw.js` Cache-Control: no-cache verified on `https://demo.sovereignhealth.io` and `https://demo.brickos.io`
- [x] Glucose 5 mg/dL repro verified: returns the user-friendly error
- [x] Glucose 5 mmol/L (correct value): returns 201
- [x] Settings page tab order matches production exactly

---

## Carry-over to Sprint 043 (the production push sprint)

| # | Severity | Title | New phase |
|---|---|---|---|
| **#529** | P1 | Dr. Alex consume brickos system AI defaults | Sprint 043 Phase B |
| **#526** | P1 | brickos.io URL namespace consolidation | Sprint 043 Phase C |
| #524 | P2 | DEMO_ADMIN Playwright fixture cold-boot | Sprint 043 Phase D tail |
| #490 | P3 | Licensing dead code cleanup after #467 stabilization | Sprint 043 Phase A (lands as part of cutover) |

Plus a NEW phase the user explicitly called out for Sprint 043:

**Sprint 043 Phase A: SHI handler cutover to brickos-licensing.** Today the SHI feature-gating handlers in `features.rs` / `license.rs` / `services/tier.rs` query the legacy `product_features` directly. Sprint 040 #467 introduced the `brickos-licensing` crate as the elevated service, but the SHI handler-side cutover never happened. Sprint 041's hotfix and Sprint 042's codified migration kept the legacy path alive as scaffolding. **Sprint 043 finishes the cutover so SHI consumes the elevated licensing/feature/tier services through the crate** -- which is the operator's literal goal: "ensure the elevated services for licensing, feature, tiers need to work".

After Phase A lands, the codified migration's `public.product_features` and `public.tier_features` tables become safe to drop, and `brickos.tier_features` (the new shape) becomes the canonical source of truth.

## Production push decision

**Production push deferred to Sprint 043 by design.** Sprint 042's job was the final stabilization, not the deploy. The Sprint 043 milestone doc has the gate criteria + the white-label customer onboarding test the user asked for.

## Related

- Predecessor: [Sprint 041 review](2026-04-11_sprint-041-review.md)
- Successor: [Sprint 043 milestone](../../tracker/milestones/sprint-043-shi-production-push.md)
- Retrospective: [2026-04-11_sprint-042-retro.md](../retrospectives/2026-04-11_sprint-042-retro.md)
- Memory: `project_sprint042_completed.md`, `project_sprint043_ready.md`
