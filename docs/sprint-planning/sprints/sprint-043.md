# Sprint 043 -- SHI Production Push

**Status:** READY TO START
**Opens:** week of 2026-04-14
**Predecessor:** [Sprint 042](sprint-042.md) -- closed 2026-04-11
**Milestone:** [sprint-043-shi-production-push.md](../../tracker/milestones/sprint-043-shi-production-push.md)

## Sprint Goal

> **Publish Sovereign Health Intelligence to production**, on the elevated licensing/feature/tier services, with white-label customer onboarding verified end-to-end.

The user's literal ask (2026-04-11): "ensure the elevated services for licensing, feature, tiers need to work. also the full test of an organisations, white labeling should be debugged and tested."

## What changed since Sprint 042

Sprint 042 closed 5/7 phases on 2026-04-11. The remaining work fits the production-push lens cleanly:

- The bug-fix work from Sprint 041 is fully done (#527, #528, #530, #531, #538 all closed)
- The architecture work (#526 URL namespace, #529 Dr. Alex AI) is deferred here
- The Sprint 040 #467 shadow refactor IS the cutover Phase A needs -- it's already wired, just needs flipping

## Phase plan (8 phases, ~2-3 days estimated)

### Phase A -- Flip the licensing shadow refactor canonical (~0.5d)

**Critical insight that came out of Sprint 042 close-out:** the SHI handler cutover is NOT a "rewrite 11 query sites" job. Sprint 040 #467 already set up the 3-state shadow refactor pattern:

- `LICENSING_SHADOW_MODE=1` -- runs both legacy and new paths, logs divergence
- `LICENSING_USE_NEW_PATH=1` -- new path is canonical, legacy is bypassed
- Both off (default) -- legacy path only

The new path lives at `services/tier.rs::check_feature_via_brickos_tier_features` and queries `brickos.tier_features (tier_slug, feature_slug)`. The slug mapping lives at `services/licensing_facade.rs::legacy_to_namespaced` (already tested). The 3-state refactor is documented in ADR-046.

**Phase A is therefore: turn on shadow mode, verify zero divergence, flip the canonical, delete the legacy match-arm.**

Steps:

1. **Pre-flight on dev**: set `LICENSING_SHADOW_MODE=1` in `apps/health/sovereign-health/api/.env.dev`, restart backend, run the full Playwright suite (`pnpm playwright test`), grep `sh-postgres` logs for `LICENSING DIVERGENCE`. Expected: zero divergences.
2. **Pre-flight on staging**: set `LICENSING_SHADOW_MODE=1` in `/opt/sovereign-health/.env.staging` on the VPS. Restart `sh-staging-backend`. Run the Sprint 041 #520 bake monitor for 1 hour. Grep logs for divergences.
3. **Flip the canonical on staging**: add `LICENSING_USE_NEW_PATH=1` to `/opt/sovereign-health/.env.staging`. Restart. Run the full smoke + Playwright suite.
4. **Bake on staging**: run the bake monitor for 4 hours. Zero panics, zero divergences.
5. **Delete the legacy code path**: remove the legacy match-arm in `services/tier.rs::check_feature` (lines 289-304). Remove `LICENSING_SHADOW_MODE` and `LICENSING_USE_NEW_PATH` env reads. Make the brickos.tier_features path the only path.
6. **Drop the codified migration's tables on staging**: `DROP TABLE public.product_features CASCADE; DROP TABLE public.tier_features CASCADE;`. Verify Smart Import + Dr. Alex chat + every feature-gated route still works.
7. **Drop on dev**: same. Verify all tests pass.
8. **Update the bootstrap migration `20260411000001`**: it can now be cleaned up to NOT do the rename-aside since the legacy path is gone. Optional cosmetic cleanup.
9. **Close #490** (licensing dead code cleanup) -- the legacy match-arm deletion completes it.

**Acceptance:**
- `LICENSING_USE_NEW_PATH=1` on staging
- `public.product_features` + `public.tier_features` dropped on staging and dev
- Smart Import + Dr. Alex chat + the full Sprint 041 Life Algorithm walkthrough work end-to-end
- Bake monitor: 4h clean
- Legacy match-arm code in tier.rs deleted
- All 141+ backend lib tests pass

**Files touched:**
- `apps/health/sovereign-health/api/src/services/tier.rs` (delete legacy match-arm)
- `apps/health/sovereign-health/api/src/services/licensing_facade.rs` (may delete the legacy_to_namespaced function once nothing calls it)
- `apps/health/sovereign-health/api/.env.dev`, `/opt/sovereign-health/.env.staging` (env flag toggles)
- (Possibly) `apps/health/sovereign-health/api/migrations/20260411000001_bootstrap_brickos_schema_for_dev.sql` (cosmetic cleanup)

**Memory reference:** `project_sprint043_phase_a_spec.md` -- the detailed step-by-step.

---

### Phase B -- Dr. Alex consumes brickos system AI defaults (#529, ~0.5-1d)

Two halves:

1. **Backend**:
   - Define `system.ai.*` keys in `brickos.app_settings`:
     - `system.ai.default_provider` (e.g. "anthropic")
     - `system.ai.default_model` (e.g. "claude-sonnet-4-6")
     - `system.ai.default_max_tokens` (e.g. 4096)
     - `system.ai.default_temperature` (e.g. 0.3)
     - `system.ai.declared_purpose.sovereign-health.dr-alex` -- EU AI Act declared purpose per app
     - `system.ai.data_scope.sovereign-health.dr-alex` -- declared data scope
     - `system.ai.classification.sovereign-health.dr-alex` -- "EU AI Act: Limited Risk (Art. 50)"
   - Migration to seed defaults
   - Refactor Dr. Alex handler in `services/doctor_chat.rs` to read from `system.ai.*` instead of hardcoded constants
   - Override hierarchy: system → org override → user override
   - `/health` endpoint reads its `ai_system` declaration from the same source (currently hardcoded at `lib.rs`)

2. **Frontend**:
   - Re-enable the `/platform/ai/config` nav entry (currently hidden via #532's `visible: () => false`)
   - Rebuild the page properly: read/write `system.ai.*` keys via a new admin endpoint
   - "Test Connection" button does a real Anthropic API ping with the current profile, returns latency + success/fail toast
   - Audit log entry on every save

**Acceptance:** Change `system.ai.default_model` from the platform admin GUI, send a Dr. Alex chat message, observe the new model in the response.

---

### Phase C -- brickos.io URL namespace consolidation (#526, ~1d)

**FIRST: write design 015.** A stub already exists at `docs/design/015-brickos-platform-namespace.md` with the 4 decision points outlined and recommended options. Sprint 043 Phase C starts with filling in the design and getting operator sign-off, BEFORE any nginx changes.

The 4 decision points to resolve:
1. API subdomain (`api.brickos.io/v1/...`) vs path mount (`app.brickos.io/api/...`)
2. Staging prefix (`demo.` vs `staging.`)
3. White-label consumer domain mechanism (DNS CNAME / Cloudflare worker / nginx reverse proxy)
4. JWT cookie scope across registered eTLD+1 boundaries

**Then implement:**
- Update nginx configs (`apps/health/sovereign-health/ops/nginx-sovereignhealth.conf`, `apps/platform/brickos-website/ops/nginx-brickos-app.conf`)
- Extend `deploy.sh` verification block (already has the SW check from Sprint 042; add the URL checks)
- Update frontend env vars
- Parameterize Playwright specs via `BASE_URL`
- Migration plan for existing sovereignhealth.io bookmarks (301 vs 302)

**Acceptance:** Both `app.brickos.io` and `app.sovereignhealth.io` resolve to the same SHI session for an existing user. Operators land at brickos.io for admin work; consumers land at sovereignhealth.io for the SHI app.

---

### Phase D -- Re-run Life Algorithm walkthrough on post-cutover stack (~0.5d)

The same Sprint 041 walkthrough that surfaced 13 bugs the first time. Now run it against the stack with Phase A's cutover landed and Phase B's AI config working.

Steps:
1. Cold-boot staging (or just redeploy)
2. Sign in as `demo@sovereignhealth.io`
3. Walk every step of #496-#511 (the original Life Algorithm sequence)
4. Run all 21 Playwright `sprint-041-life-algorithm.spec.ts` tests
5. Run the Sprint 041 API smoke (`/tmp/sprint041_staging_smoke.py`) -- 7/7 expected
6. Bake monitor for 4 hours: 0 panics, 0 LICENSING DIVERGENCE, 0 errors

**Acceptance:** Every step green. Zero errors in the bake monitor.

---

### Phase E -- White-label customer onboarding test (~0.5-1d)

The actual sales path. Pick a fictional white-label customer and walk through the full onboarding.

**Test fixture (memory: `project_sprint043_whitelabel_fixture.md`):**

| Field | Value |
|---|---|
| Customer name | Sovereign Wellness Co |
| Slug | sovereign-wellness |
| Org type | clinic |
| Tier | clarity (1/0/5 default) overridden to 1/5/25 |
| Custom domain | `sovereign-wellness.brickos.io` (post #526) or `sw.demo.sovereignhealth.io` (pre #526) |
| Brand primary color | `#2563eb` |
| Brand accent color | `#7c3aed` |
| Logo URL | placeholder, e.g. picsum.photos/200/80 |
| Role labels | practitioner -> "Wellness Coach", member -> "Member" |
| Owner email | `owner@sovereign-wellness.test` |
| Practitioners | 3 fake email addresses |
| Members | 5 fake email addresses |

Steps:
1. Create the org via `/platform/orgs` New Organization
2. Configure custom branding via the Branding tab
3. Add the custom domain via the Branding tab -> Domains section
4. Issue a Clarity license via the License tab, override seats to 1/5/25
5. Onboard the org owner via the invite flow
6. Sign out
7. Sign in as `owner@sovereign-wellness.test` -- verify they see the custom branding (logo, colors), the custom role labels, and the custom domain in the URL bar
8. Add 3 practitioners and 5 members with the custom labels
9. Sign out, sign back in as one of the practitioners, verify they can do measurements, see Dr. Alex chat, etc.
10. Test the renewal flow: artificially set `expires_at` to 5 days from now, log in as the owner, see the grace banner

**Acceptance:** The white-label customer's experience is visually distinct AND functionally complete within their entitlement. Document any gaps as Sprint 044 follow-ups.

---

### Phase F -- Production deploy prep (~0.25d)

- Update RC test checklist (`docs/project-files/releases/v0.42.0/rc-test-checklist.md`)
- Bump `lib.rs` VERSION to `0.42.0`
- Verify production nginx configs include the #538 SW no-cache headers (Sprint 042 only updated the configs in source control; production VPS still needs the scp + reload)
- Verify Cloudflare DNS for any new entries (post Phase C)
- Verify the production .env has all required secrets (`LICENSE_SIGNING_KEY_PATH`, `ANTHROPIC_API_KEY_WEBSITE`, etc.)
- `cargo audit` -- 0 high-severity advisories
- `pnpm audit` -- 0 high-severity advisories
- Production DB backup snapshot
- Operator confirms ready to deploy

---

### Phase G -- The production push (~0.25d)

```bash
bash apps/health/sovereign-health/ops/deploy.sh production --confirm
```

Post-deploy verification:
- Production smoke test (adapt `/tmp/sprint041_staging_smoke.py` for prod URLs)
- Login with a real prod test user
- Create / view / use a real org
- Verify the SW no-cache header on production sw.js
- Watch `sh-prod-backend` logs for 30 minutes for any unexpected errors

**Acceptance:** Production live at v0.42.0, smoke green.

---

### Phase H -- Sprint close-out (~0.25d)

Standard close-out:
- Move closed issues to `closed/`
- Sprint 043 milestone -> closed
- Retrospective + review docs
- Memory updates: `project_sprint043_completed.md`, `project_v0420_released.md`
- Update sprint-041 retrospective action items: which ones did Sprint 043 actually do?
- Mark #524 (Playwright DEMO_ADMIN fixture) as closed if Phase D's Playwright run cleaned it up
- Mark #490 (licensing dead code cleanup) as closed (Phase A landed the cleanup)
- Sprint 044 prep: any new bugs surfaced during Phases D + E

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Phase A shadow mode finds divergence | LOW | The shadow infrastructure has been in place since Sprint 040; if there were divergences, Sprint 041 + 042 would have hit them. But run shadow first to be safe. |
| Phase A bake monitor catches a slow-burn issue | MEDIUM | The bake monitor is the gating signal. If it catches anything, halt + investigate before flipping the canonical. |
| Phase B Dr. Alex AI provider call fails on staging | MEDIUM | Anthropic API key for staging may not be configured. Verify before Phase B starts. |
| Phase C #526 design 015 stalls on a decision | LOW | The stub doc has my recommendations for all 4 decision points; operator just needs to confirm |
| Phase E custom domain doesn't resolve | MEDIUM | Cloudflare DNS may not have a wildcard for `*.brickos.io`. Verify before Phase E. |
| Phase G production deploy hits a missing migration | LOW | All Sprint 041 + 042 migrations are dated correctly; production cold-boot will pick them up. |
| Phase G production rollback needed | MEDIUM | The deploy.sh has rollback steps documented. Production DB backup from Phase F is the restore point. |

## Action items from Sprint 042 retro (carry into Sprint 043)

1. When user references "current production", get a screenshot/URL FIRST
2. Trace data flow end-to-end before extending a validator
3. Close issues as soon as the fix is functionally complete
4. **Phase C: WRITE DESIGN 015 FIRST**, before any code
5. Add bake monitor to deploy.sh as a post-step (do this in Phase H or earlier)
6. "grep before drop" applies to ALL consumers, not just the obvious ones
7. brickos master template default ("Notifications + Billing inline in Account") is documented in source

## Pre-sprint baseline (for reference next session)

- Main branch: develop is ahead at commit `9bfdb0d` (Sprint 042 close-out)
- Production branch: still at v0.41.0 (no production deploys this sprint)
- Staging deploys: 6 in Sprint 042; current state has commit `c334b32` (settings inline restructure)
- Pre-sprint open issues: #490, #524, #526, #529 (the 4 carry-overs)
- Memory state: project_sprint042_completed.md + project_sprint043_ready.md both saved
- Demo VPS state: SHI api/web/website at v0.41.0; test22 org has re-issued license 1/3/10
- Codified migration `20260411180000` is in the migrations folder; the public.product_features + public.tier_features tables it manages are still alive on dev + staging (Phase A drops them)

## References

- Predecessor: [sprint-042.md](sprint-042.md) (if exists) and [sprint-042 review](../reviews/2026-04-11_sprint-042-review.md)
- Memory: `project_sprint043_ready.md`, `project_sprint043_phase_a_spec.md`, `project_sprint043_kickoff_checklist.md`, `project_sprint043_whitelabel_fixture.md`
- ADR-046 (3-state shadow refactor) -- the pattern Phase A finishes
- Design doc to write: `docs/design/015-brickos-platform-namespace.md` (stub already in place)
- Sprint 040 design 022 (licensing model) -- the original spec the shadow refactor implements
