---
name: Sprint 043 -- SHI Production Push
description: Publish Sovereign Health Intelligence to production. Cut SHI handlers from the legacy product_features path onto the brickos-licensing crate (the elevated services for licensing/feature/tiers). Run the full Life Algorithm org onboarding test on staging post-cutover. Run the white-label customer onboarding flow end-to-end. Then ship to production.
status: active
sprint: 043
opened_at: 2026-04-11
parent: sovereign-health-production
predecessor: sprint-042-shi-production-readiness
constraint: Production push happens only at the end, after every Phase A-F is verified green on staging and the operator explicitly confirms.
---

# Sprint 043 -- SHI Production Push

Sprint 042 closed with the user-visible damage from Sprint 041 fully repaired and the brickos master / SHI extension settings architecture in place. The remaining work to ship SHI to production is **structural**, not bug-fix:

1. The SHI feature-gating handlers still query the legacy `product_features` + `tier_features` shape directly. Sprint 040 #467 introduced the `brickos-licensing` crate as the elevated service, but the SHI handler-side cutover never happened. Sprint 041 hotfix and Sprint 042's codified migration kept the legacy path alive as a workaround. **Sprint 043 finishes the cutover** so SHI consumes the elevated licensing/feature/tier services through the crate.
2. Once the elevated services are the canonical source, run the full Life Algorithm org onboarding test on staging (the same one Sprint 041 used to discover the bugs that became Sprint 042). It must run completely clean.
3. Run the white-label customer onboarding flow end-to-end. This is the brand-new sales path for any clinic that buys SHI as their own white-label product. Per-org branding, custom domains, custom feature sets, custom seat counts, custom pricing.
4. **Then ship to production.** First production push of SHI on the brickos-licensing crate path.

## Sprint Goal

**Publish SHI to production, on the elevated licensing/feature/tier services, with white-label customer onboarding verified end-to-end.**

## Production push gate

Same gate as Sprint 042 (carried forward), plus the new requirements:

| Gate | What it means |
|---|---|
| Phase A green | SHI handlers query `brickos-licensing::EmbeddedProvider`, NOT legacy `product_features`. The codified migration table can be dropped. |
| Phase B green | Dr. Alex reads model + provider + max_tokens from `system.ai.*` in `app_settings`, with org/user override hierarchy |
| Phase C green | brickos.io URL namespace consolidation lands per design 015 |
| Phase D green | Full Life Algorithm walkthrough on staging passes 100% (the same Sprint 041 walkthrough, post-cutover) |
| Phase E green | White-label customer onboarding tested end-to-end on staging with a real fictional customer |
| Phase F green | Production deploy pre-flight checks all pass |
| Phase G green | Production deploy successful, smoke tests pass against `app.sovereignhealth.io` |
| Phase H | Sprint close-out + retrospective + memory updates |

## Carry-over from Sprint 042

| # | Severity | Title | Why deferred |
|---|---|---|---|
| **#529** | P1 | Dr. Alex consume brickos system AI defaults | Architecture work; Sprint 042 was bug-fix focus. Phase B. |
| **#526** | P1 | brickos.io URL namespace consolidation | Needs design 015 first. Phase C. |
| #524 | P2 | DEMO_ADMIN Playwright fixture cold-boot | Test infra; small. Phase D tail. |
| #490 | P3 | Licensing dead code cleanup after #467 stabilization | Lands naturally as part of Phase A. |

## Phases

### Phase A -- SHI handler cutover to brickos-licensing (the elevated services)

The proper finish to Sprint 040 #467. Today the SHI feature-gating handlers in `features.rs`, `license.rs`, and `tier.rs` query the legacy `product_features` + `tier_features` (UUID-keyed) directly. The `brickos-licensing` crate exists, has tests, has the new slug-based `brickos.tier_features` table populated, but **nothing in SHI calls into it for feature gating**.

Goal: every feature-gating site in SHI consumes `brickos-licensing::EmbeddedProvider::has_feature(org_id, feature_slug)` (and friends), not raw SQL against `product_features`. After this, the codified migration `20260411180000` (which keeps the legacy tables alive in `public.*`) becomes safe to drop, and `brickos.tier_features` (the new shape) becomes the canonical source.

Steps:

1. Audit every call to `validate_marker_value`, `tier::check_feature`, `tier::check_tier_limit`, and the 11 query sites identified in #527 (features.rs / license.rs / services/tier.rs)
2. Replace each with a call into `brickos_licensing::EmbeddedProvider`
3. The slug mapping: legacy `feature_key` (e.g. `csv_export`) -> namespaced slug (e.g. `shi.csv_export`). Confirm the seeded `brickos.tier_features` rows use the same slug naming.
4. Remove the legacy `product_features` table queries entirely
5. Drop the codified migration's tables (or leave them as historical archive -- decide during the work)
6. Re-run the Sprint 041 #520 bake monitor for the cutover deploy

**Acceptance:** Smart Import + Dr. Alex chat + every feature-gated route on SHI work end-to-end on staging WITHOUT the codified migration's `public.product_features` and `public.tier_features` tables existing. Verified by:

- Dropping `public.product_features` + `public.tier_features` on staging temporarily
- Running the Sprint 041 smoke + the full Playwright suite
- All green
- Then dropping them permanently OR keeping them as historical -- operator's call

Estimate: 1-2 days. The biggest single piece of Sprint 043.

### Phase B -- Dr. Alex consumes brickos system AI defaults (#529)

The proper close on #529. Two halves:

1. **Backend**: define `system.ai.*` keys in `app_settings`. Default provider, default model, max tokens, temperature, declared purpose per app, EU AI Act classification per app. Dr. Alex handler reads from these keys instead of the hardcoded constants. Override hierarchy: system → org → user.
2. **Frontend**: rebuild `/platform/ai/config` (currently hidden via #532). The page reads/writes `system.ai.*` keys. Test Connection button does a real Anthropic API ping with the current profile, returns latency + success/fail toast.

**Acceptance:** Change `system.ai.default_model` from the platform admin GUI, send a Dr. Alex chat message, observe the new model in the response. `/health` endpoint reads its AI declaration from the same source of truth, not hardcoded.

Estimate: 0.5-1 day.

### Phase C -- brickos.io URL namespace consolidation (#526)

The architecture lands. Per the four decision points in #526:

1. Pick: api subdomain (`api.brickos.io`) vs path mount (`app.brickos.io/api/`). Decision goes in design 015.
2. Pick: staging prefix (`demo.` vs `staging.`). Decision goes in design 015.
3. Pick: white-label consumer domain mechanism (DNS CNAME / Cloudflare worker / nginx reverse proxy). Decision goes in design 015.
4. Pick: JWT cookie scope across registered eTLD+1 boundaries. Decision goes in design 015.

Then:

- Author `docs/design/015-brickos-platform-namespace.md`
- Update nginx configs to match the chosen layout
- Update `deploy.sh` verification block (already has the SW check from Sprint 042; extend with the URL checks)
- Update frontend env vars (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`)
- Update Playwright specs to parameterize via `BASE_URL`
- Migration plan for existing sovereignhealth.io bookmarks

**Acceptance:** Both `app.brickos.io` and `app.sovereignhealth.io` resolve to the same SHI session for an existing user. Operators land at brickos.io for admin work; consumers land at sovereignhealth.io for the SHI app.

Estimate: 1 day.

### Phase D -- Full org onboarding walkthrough on staging (post-cutover)

Re-run the Sprint 041 Life Algorithm walkthrough on staging, this time against the post-Phase-A cutover stack:

1. Cold-boot staging
2. Run the deploy.sh staging
3. Sign in as `demo@sovereignhealth.io`
4. Walk every step of the Sprint 041 #496-#511 sequence:
   - Create the Life Algorithm org
   - Issue the license (Horizon tier, 1/3/10 seats from the new defaults)
   - Set branding (logo, colors, role labels)
   - Add a custom domain
   - Add 3 practitioners
   - Add 10 clients
   - Test the role-change audit
   - Test the bulk-add clients flow
   - Test the remove-member flow
   - Test the grace banner simulation
   - Trigger the renewal flow
5. Run all 21 Playwright sprint-041-life-algorithm tests
6. Run the Sprint 041 API smoke 7/7
7. Bake monitor for 4 hours: 0 panics, 0 LICENSING DIVERGENCE, 0 errors

**Acceptance:** Every step green. Zero errors in the bake monitor.

Estimate: 0.5-1 day (depending on how much breaks).

### Phase E -- White-label customer onboarding test

The actual sales path. Pick a fictional white-label customer (e.g. "Sovereign Wellness Co"), walk through:

1. Create the org via the platform admin
2. Configure custom branding: logo, primary/accent colors, custom role labels (e.g. "Coach" for practitioner, "Client" for member)
3. Add a custom domain mapping (`sovereign-wellness.brickos.io`)
4. Issue a license for a custom tier (or use Clarity)
5. Onboard the org owner via the invite flow
6. The org owner logs in -- verify they see the custom branding, the custom role labels, the custom domain in the URL bar
7. Add a few practitioners and clients with the custom role labels
8. Verify the SHI app works for the white-label customer just like for any other org

**Acceptance:** The white-label customer's experience is visually distinct (custom branding) and functionally complete (full SHI feature set within their entitlement). Document any gaps as Sprint 044 follow-ups.

Estimate: 0.5-1 day.

### Phase F -- Production push prep

Pre-flight for the production deploy:

- Update the RC test checklist (`docs/project-files/releases/v0.42.0/rc-test-checklist.md`)
- Update `lib.rs` VERSION to `0.42.0`
- Verify the production nginx configs include the #538 SW no-cache headers
- Verify Cloudflare DNS for any new entries (post Phase C URL namespace)
- Verify the production .env has all required secrets (LICENSE_SIGNING_KEY_PATH, ANTHROPIC_API_KEY, etc.)
- Run `cargo audit` -- 0 high-severity advisories
- Run `pnpm audit` -- 0 high-severity advisories
- Production DB backup snapshot

**Acceptance:** All pre-flight checks green. Operator confirms ready.

### Phase G -- Production push

`bash apps/health/sovereign-health/ops/deploy.sh production --confirm`

Post-deploy verification:
- Production smoke (`/tmp/sprint041_staging_smoke.py` adapted for prod URLs)
- Login with a real prod test user
- Create / view / use a real org
- Verify the SW no-cache header on the production sw.js
- Watch logs for 30 minutes for any unexpected errors

**Acceptance:** Production live, version bumped, smoke green.

### Phase H -- Sprint close-out

Standard close-out:
- Move closed issues to `closed/`
- Sprint 042 milestone closed (already done in this commit batch)
- Sprint 043 milestone closed
- Retrospective + review docs
- Memory update (`project_sprint043_completed.md`, `project_v0420_released.md`)

## Why Phase A first

Sprint 041 + 042 worked around the Sprint 040 #467 incomplete refactor with two patches: a manual psql hotfix (Sprint 041) and a codified migration that keeps the legacy tables in `public.*` (Sprint 042). Both work, but they're temporary scaffolding -- the SHI handlers still query the legacy shape, and the new `brickos.tier_features` (slug-based) is unused dead code at the SHI handler level.

If Sprint 043 tries to ship to production WITHOUT closing this gap, two things go wrong:
1. The "elevated services" promise (the brickos-licensing crate as the SSoT) is a lie -- in production, SHI bypasses the crate and queries raw SQL
2. Every future BrickOS app that wants to use the licensing crate has to wait for the SHI cutover to land, OR it has to also bypass the crate, OR it lives in a parallel-but-incomplete state forever

So Phase A is non-negotiable for "ship to production on the elevated services". The user explicitly called this out in the Sprint 043 goal.

## Out of scope (defer to Sprint 044+)

- Multi-region deployment (Frankfurt + Singapore) -- Sprint 044 infrastructure work
- Stripe integration for actual billing (currently the License tab issues licenses with "billing_model: subscription" but no real Stripe webhook flow)
- Automated white-label customer self-service signup (Sprint 043 tests the operator-driven flow only)
- The full registry-based settings extension pattern (Option B from #528) -- still deferred until a second BrickOS app contributes settings
- Brickos.io marketing site polish (already shipping; tweaks don't block prod)

## Related

- Predecessor: [sprint-042-shi-production-readiness.md](sprint-042-shi-production-readiness.md)
- Sprint 040 design: [022-licensing-model.md](../../design/022-licensing-model.md)
- ADR-046 (3-state shadow refactor) -- the pattern Phase A finishes
- Memory: `project_sprint042_completed.md`, `project_sprint043_ready.md`, `feedback_never_ship_half_schema_migration.md` (the lesson driving Phase A)
