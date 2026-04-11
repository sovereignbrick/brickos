---
name: Sprint 042 -- SHI Production Readiness
description: Clear every doubt blocking the SHI production push. Land the schema cleanup that eliminates the staging-only hotfix dependency, the architectural design work for settings + AI provider config + URL namespace, and the remaining SHI consumer-facing bug fixes. Goal: Sprint 042 closes with the green light to deploy SHI to production.
status: active
sprint: 042
opened_at: 2026-04-11
parent: sovereign-health-production
predecessor: sprint-041-staging-quality
constraint: No production push until every P0/P1 in this sprint is closed and the staging bake is clean for 4 hours after the final fix.
---

# Sprint 042 -- SHI Production Readiness

Sprint 041 (Staging Quality Gate) shipped staging end-to-end and verified the licensing foundation works. Manual walkthrough surfaced 9 issues that block the production push. **Sprint 042's job is to close those 9 issues and clear the production gate.**

This is **not** an implementation-light sprint. Several of the carry-overs need design docs first (settings extension pattern, AI provider config, URL namespace). The work is sequenced so the architecture lands before the code changes.

## Sprint Goal

Close every Sprint 041 carry-over and ship SHI to production.

## The production push gate

Production deploy happens only when ALL of these are true at sprint close:

1. Every issue in this milestone closed (or explicitly punted with a tracked rationale)
2. Zero P0/P1 bugs open against SHI or the platform admin GUI
3. Staging baked clean for at least 4 hours after the final fix
4. `cargo clippy --workspace --all-targets -- -D warnings` clean
5. `cargo test --workspace` clean
6. `pnpm build` clean for SHI frontend + website + brickos website + CRM frontend
7. Operator (Helmut) explicitly confirms "ship it"

## Carry-over from Sprint 041

| # | Severity | Title | Notes |
|---|---|---|---|
| **#527** | **P0** | feature-gating handlers query missing legacy `product_features` (Smart Import + Dr. Alex chat 500s on staging) | Staging hotfix in place. Proper fix per the revised plan in #527: option C, schema cleanup migration, zero Rust changes. |
| **#530** | P1 bug | License issuance defaults to 1/0/0 seats blocking first member-add | Two-part fix: schema (add `default_max_*` columns to `license_tiers`) + UI (form pre-fill from tier). |
| **#531** | P1 bug | Glucose `4.7` typed as mmol/L silently converted then rejected | Multi-file frontend + backend; needs the unit-preference-from-settings architecture in #528. |
| **#538** | P1 ops | Service worker caches old JS for 4h, blocks deploy rollouts | Two-line fix: nginx no-cache on `/sw.js` + serwist `skipWaiting + clientsClaim`. Plus deploy.sh verification step. |
| **#528** | P1 arch | `/settings` page should be brickos master + per-app tab extensions | Needs design 016 first. The extension point pattern enables #531. |
| **#529** | P1 arch | Dr. Alex consume brickos system AI defaults | Needs `system.ai.*` keys in `app_settings` + handler refactor. Depends on having a real AI config page (currently hidden via #532 fix). |
| **#526** | P1 arch | Consolidate apps under brickos.io platform namespace | Needs design 015 first. Decision points: api subdomain vs path mount, staging prefix, white-label consumer domain mechanism, JWT cookie scope. |
| **#524** | P2 test | DEMO_ADMIN Playwright fixture cold-boot | Test infra cleanup; small. |
| **#490** | P3 chore | Licensing dead code cleanup after #467 stabilization | Long-standing carry from Sprint 040. After #527 lands, this can be done together. |

## Phases

### Phase A -- The P0: schema cleanup migration (#527)

The staging hotfix is fragile. A re-bootstrap of staging would re-trigger the bug. Land the proper fix per option C in #527:

1. Update the bootstrap migration's reconciliation block: `SET SCHEMA public` instead of `RENAME TO *_legacy_sprint040` for `product_features` and `tier_features`
2. Remove the new-shape `CREATE TABLE brickos.tier_features` from the bootstrap migration
3. Drop the dead `brickos.tier_features` (new shape) on dev + staging
4. Drop the renamed-aside legacy tables
5. Re-run the migration on staging via the `_sqlx_migrations` row deletion pattern
6. Verify dev tests still pass
7. Re-deploy and re-smoke

**Acceptance:** Smart Import + Dr. Alex chat work end-to-end on staging without any direct DB hotfix. Zero `product_features` errors in `sh-staging-backend` logs for 1 hour.

### Phase B -- Operational gap (#538)

Two-line fix to unblock every future deploy:

1. nginx serves `/sw.js` with `Cache-Control: no-cache, no-store, must-revalidate`
2. serwist config sets `skipWaiting: true` + `clientsClaim: true`
3. Deploy.sh verification step asserts the no-cache header on every redeploy
4. Cloudflare cache purge for `/sw.js` after the change lands

**Acceptance:** Deploy a no-op version bump, verify a returning user with an existing tab sees the new version after one navigation, no manual SW unregistration.

### Phase C -- License seat defaults (#530)

The fastest user-visible fix after Phase A+B:

1. Schema: add `default_max_owners`, `default_max_practitioners`, `default_max_members` to `brickos.license_tiers`
2. Seed the per-tier defaults (draft table in #530: glimpse 1/0/0, focus 1/0/0, insight 1/0/1, clarity 1/0/5, horizon 1/3/10, core unlimited)
3. License tab form pre-fills from the selected tier
4. Soft validation: warn if the operator is about to save with 0 in any seat field

**Acceptance:** Create a fresh org via the GUI, issue a default `clarity` license, immediately add a member without re-editing the seat counts. e2e regression spec covers the flow.

### Phase D -- Settings extension pattern (#528, design + impl)

1. Design doc: `docs/design/016-brickos-settings-extension-pattern.md`
2. Define the brickos master tabs (Account / Security / Privacy / Billing / Notifications) and the per-app contribution interface
3. Re-add the SHI-specific tabs (Devices, Lifestyle, Thresholds, AI assistant, Influence factors, Health profile) as SHI extensions
4. Settings page composes the union: `[brickos master tabs] + [tabs from each entitled app]`
5. e2e spec covers both the all-tabs and master-only cases

**Acceptance:** A user with the SHI entitlement sees all 11 tabs. A platform admin user with no app entitlements sees only the 5 master tabs.

### Phase E -- AI provider config (#529)

Depends on Phase D's `system.ai.*` settings keys (or vice versa -- pick one to land first).

1. `system.ai.*` keys in `app_settings` (default_provider, default_model, default_max_tokens, etc.)
2. Build the `/platform/ai/config` page properly (it was hidden in Sprint 041 via #532 because it was a mockup -- this re-enables it)
3. Dr. Alex handler refactored to read from `system.ai.*` with org/user override hierarchy
4. `/health` endpoint reads the AI declaration from the same source

**Acceptance:** Change the model from the platform admin GUI, call Dr. Alex, observe the new model in the response. Audit log entry on every change to `system.ai.*`.

### Phase F -- Glucose unit confusion (#531)

Depends on Phase D's settings extension (the user's unit preference lives there).

1. Form unit selector defaults from `user_preferences.glucose_unit` -> country fallback -> canonical
2. Pre-flight client-side validation: warn before submit if the value is implausible for the displayed unit
3. Backend `validate_marker_value` extended to take `(value, unit)` and produce errors in the user's input units
4. Symmetric unit-confusion detection: low value in mg/dL -> "did you mean mmol/L?"

**Acceptance:** Type `4.7` for glucose with the form on mg/dL, see an inline warning before submit with a one-click "Switch to mmol/L". Submit anyway -> error message references `4.7 mg/dL`, not `0.26 mmol/L`.

### Phase G -- URL namespace consolidation (#526)

Architecture, design-first.

1. Design doc: `docs/design/015-brickos-platform-namespace.md` covering the four decision points in #526
2. Decide: api subdomain vs path mount, staging prefix, white-label consumer domain mechanism, JWT cookie scope
3. nginx configs updated to match
4. deploy.sh verification block updated
5. Frontend env vars + dev CORS allow-list updated
6. Playwright specs parameterized via `BASE_URL`
7. Sovereignhealth.io migration plan for existing bookmarks

**Acceptance:** Both `app.brickos.io` and `app.sovereignhealth.io` resolve to the same SHI session for an existing user. Operators land at brickos.io for admin work; consumers land at sovereignhealth.io for the SHI app.

### Phase H -- Cleanup and production push

1. Close #524 (Playwright DEMO_ADMIN fixture)
2. Close #490 (licensing dead code cleanup -- now safe after Phase A)
3. Final staging bake: 4 hours clean
4. **Production push** of `sovereignbrick/shi-api:0.42.0` and `sovereignbrick/shi-web:0.42.0`
5. Production smoke
6. Sprint 042 close-out

## Why this sprint matters

Sprint 040 built the licensing foundation. Sprint 041 verified it works on staging. Sprint 042 is where SHI actually goes to production for the first paying customer. Every other future sprint compounds against this -- if Sprint 042 ships with an open P0 (#527), every Sprint 043+ deliverable inherits a "this works on dev but not staging" foot-gun. That's why option C (the schema cleanup) is the *first* phase, not the last.

## References

- Predecessor: [sprint-041-staging-quality.md](sprint-041-staging-quality.md)
- Carry-over rationale: see each issue file under `docs/tracker/issues/open/`
- ADR-048 (PR-based sprint flow) -- governs the close-out
- Memory: `feedback_sprint_close_checklist.md`, `feedback_pr_based_sprint_flow.md`, `feedback_dual_schema_fk_cleanup.md`
