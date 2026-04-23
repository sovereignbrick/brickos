# Sprint 051 Retrospective -- Carry-over Burn-down + UX Polish

**Date:** 2026-04-23
**Release:** v0.49.0 (build `644b56d`)
**Duration:** ~1 calendar day (started morning, shipped v0.49.0 in the evening)
**Branch:** develop → main at v0.49.0
**Prior release:** v0.48.0 (Sprint 050, shipped 2026-04-22 evening)

## Planned scope vs delivered

From sprint-051.md, 5 phases + 1 stretch:

| Phase | Planned items | Delivered | Notes |
|---|---|---|---|
| A -- P1 visibility | 3 (#0582, #0526, #0590) | 3 + #0543 bonus | All verified live |
| B -- P2 GDPR + stability | 6 (#0592, #0586, #0588, #0589, #0539, #0543) | 6 | |
| C -- Sovereign Link | 1 (#0587) | 1 (skeleton; create gated to admin) | Scoped tighter than original 2d estimate |
| D -- Polish | 2 (#0591, #0593) | 2 | #0591 was a UX misread, not a code bug; #0593 shipped + tested on staging |
| E -- Release | 7 | 7 | |
| F -- Stretch (#0576 SSO eval) | 1 | 0 | Deferred as planned |
| RC round-2 hotfixes (unplanned) | -- | 5 fixes to #0594 | See below |

**13 tracker issues closed** (12 planned + 1 bonus #0543 stale close + 1 new #0594 filed-and-closed in the same sprint for the RC findings).

### What actually shipped

**P1 fixes (2):**
- #0582 `/platform/org` Overview "0 members" fixed with schema-aware org_members query
- #0526 platform namespace consolidation closed with Design 015 flipped to "shipped" + memory codified

**P2 fixes (7):**
- #0592 Privacy tab data-access-log unified with Sprint 048 endpoint (GDPR Art. 15 transparency restored)
- #0586 / #0588 / #0589 SW + build-ID chain: refresh banner auto-reloads silently once per session, no more nagging on fresh visits; `/app-build-id` SW route removed to kill console-noise
- #0539 tier_features runtime migration verified complete (Sprint 044 already shipped; admin CRUD still uses public tables, scoped as Sprint 052)
- #0543 audit-logs 404 closed stale (Sprint 047 nginx cleanup fixed it incidentally)
- #0587 Sovereign Link end-user skeleton: `/sovereign-link` landing + `/sovereign-link/analytics` placeholder; create form replaced with "contact admin" placeholder because backend /admin/links/campaign requires platform_admin role (org-scoped create endpoint deferred)
- #0594 (RC-surfaced P1) root `/` cross-plane redirect + login "View Demo" + navbar login on eval + zone calc markers + patient landing

**P3 fixes (3):**
- #0590 ORGANIZATION sidebar now hides when no specific org is in the URL (uses new `ctx.isOrg` admin-context field)
- #0591 practitioner fixture verified already complete (921 measurements for Anna on staging; user's "0 counts" was caseload LIST-view UX misread, not a fixture gap)
- #0593 `/demo/zones` summary now counts calculated markers via new `compute_zone_calc_counts` helper

## What went well

- **Closing 13 issues in one day was realistic because most of them were already half-done.** `#0543` audit-logs was fixed incidentally by Sprint 047 nginx work. `#0539` tier_features migration shipped in Sprint 044 but was never closed. `#0526` was half done across Sprints 043-047 and just needed the design doc flipped to "shipped". Knowing when to close-as-done vs close-as-obsolete vs actually-do-the-work was the key velocity unlock.
- **The 9-layer RC walkthrough template from Sprint 050 was directly reusable.** The user ran through it in ~45 min and surfaced the #0594 bugs quickly. No structural changes to the checklist, just URL updates for the new fixes.
- **#0594 RC round-1 to round-3 iteration was fast** because each fix was a self-contained commit, cargo/pnpm tests took <1min each, staging frontend-only redeploy is ~4min, and I could verify with curl before asking the user to retest. Full cycle was <15 min per round.
- **Deploy.sh promote subcommand.** Same win as Sprint 050: one command for merge, pre-flight catches uncommitted state, clean merge commit.
- **Cross-plane redirect pattern via middleware.** When async page.tsx `redirect()` didn't fire in production at request time (mystery -- investigate in Sprint 052), moving to middleware.ts fixed it immediately. Middleware returns a real HTTP 307 with a Location header before the React render pipeline touches the request.

## What didn't go well

- **Rushed the Sovereign Link skeleton (#0587) without verifying backend permissions.** I wrote a `/sovereign-link/new` create form that POSTed to `/admin/links/campaign`, which requires `AdminUser` (platform admin). Org owners got "Forbidden" on create. Had to ship a read-only placeholder with a "contact admin" message during RC round-2. Lesson: for any feature that writes, verify the backend permission check matches the intended caller BEFORE writing the UI.
- **Sprint 047 `redirect()` in server component RSC render didn't actually redirect.** Spent ~20 min curl-debugging why `src/app/page.tsx` returning 200 HTML instead of 307 on staging. Rebuilt the fix via middleware.ts, which worked. Root cause of the original `redirect()` failure unknown -- possible RSC render pipeline bug or Next.js 16 behavior change. File as Sprint 052 investigation.
- **Patient cross-plane login attempt caused a redirect loop.** My first fix post-auth cross-planed brickos.io → sovereignhealth.io, but JWT cookies don't share across registered eTLD+1 domains, so the end-user plane saw no cookie and bounced back to /login. Reverted to same-plane landing. The user's original expectation ("patients should land on sovereignhealth.io") requires a proper cross-plane SSO feature (mint a second cookie on the other domain at login time, or handoff token via URL), deferred to Sprint 052.
- **Staging demo seed was encrypted (v1:...) unlike production's plaintext.** The `compute_calculated_markers` formula was silently skipping encrypted values, so calc markers returned None on staging. Not visible in unit tests because test seeds are plaintext. My first fix via `replace_all` missed one of two call sites (a one-line comment difference broke the match). Shipped round-3 to patch the second site. Lesson: when using `replace_all`, always `grep` for remaining matches after the edit.
- **Double-login race on first patient auth.** Not a regression, just a pre-existing AuthGate + setToken timing issue. Ships with v0.49.0 as a known issue, deferred to Sprint 052.
- **User ran into Checklist-URLs drift twice.** The Sprint 050 RC checklist had wrong URLs the first time around, and the Sprint 051 RC checklist had one wrong URL in `/platform/apps`. Reading route names from `find src/app -name page.tsx | sort` before writing the checklist is already captured as a Sprint 050 feedback memory -- I need to actually follow it.

## Lessons learned

- **Auto-reload > nagging banner.** The "Newer version available -- Reload now" pattern from Sprint 047 was right concept, wrong UX. Users ignore banners; they don't ignore a page that silently reloads. The sessionStorage guard against reload loops makes this safe. Adopt this pattern for any future "stale client" detection.
- **Cross-plane architecture choices have cookie-scope consequences.** Sprint 045's two-plane decision (Design 025) is sound for admin/end-user separation, but every cross-plane navigation needs to account for cookies not surviving the hop. Auth, session, analytics, and preferences all need explicit handling. A proper cross-plane SSO design (Sprint 052 candidate) is the clean answer; until then, same-plane landing is the pragmatic fallback.
- **"Looks done" vs "actually tested" gap.** Sprint 047 #0586/#0588/#0589 were marked as P2 stability carry-overs, but the banner false-positive was never verified on a fresh session. Same pattern for Sprint 044 #0539 tier_features "migration" that shipped without anyone noticing it wasn't closed. Adding a "closed on tracker == verified live in prod" step for every issue would close this gap.
- **Test fixtures matter more than test code.** The entire calc-marker-on-staging bug (#0594 subitem) was fixture data difference (encrypted vs plaintext). Unit tests all passed. Integration tests all passed. The bug only surfaced during manual RC because staging's DB has different shape than localhost or prod. Budgeting time to make test fixtures match prod shape (or explicitly document the difference) would have caught this.

## Action items for Sprint 052

- **#XXXX (NEW)** Cross-plane SSO: when a user auths on brickos.io, mint a second auth_token cookie on sovereignhealth.io (and vice versa) via a one-time handoff token. Makes the patient-on-admin-plane login land on sovereignhealth.io/sovereign-health/dashboard without the URL staying on brickos.io. Also fixes the "had to login twice" race.
- **#XXXX (NEW)** Org-scoped /org-settings/links endpoint: replaces the `/admin/links/campaign` AdminUser gate. Requires `org_id` column in the Sovereign Link storage layer. Unblocks real Sovereign Link creation for org owners, which replaces the current "contact admin" placeholder.
- **#XXXX (NEW)** Investigate why `redirect()` in async Server Component (app/page.tsx) doesn't fire at request time -- render-pipeline bug or Next.js 16 behavior change. Middleware workaround shipped in v0.49.0.
- **#XXXX (NEW)** RC checklist URL audit as a CI job: before a release PR, `find src/app -name page.tsx` and cross-reference against any `docs/releases/.../*-rc-checklist.md` URL list. Catches stale URLs before user hits them.
- Cargo Edition bump 2021 -> 2024 (user-raised during Sprint 051 version-bump audit).
- `features.rs` admin CRUD migration from `public.product_features` to `brickos.tier_features` (continues #0539).

## By the numbers

- **Commits on develop since v0.48.0:** ~20 (Phase A-D fixes + v0.49.0 bump + release notes + RC round-1/2/3 hotfixes)
- **Commits on main:** 1 merge commit (644b56d)
- **New Playwright spec files:** 1 (`sprint-051-sovereign-link.spec.ts`, 3 tests)
- **New frontend routes:** 3 (`/sovereign-link`, `/sovereign-link/new`, `/sovereign-link/analytics`)
- **New i18n keys:** 33 (30 sovereignLink + 3 data-access-log card)
- **New design doc:** 0 (Design 015 flipped to "shipped")
- **New memory entries:** 0 (none added; reference_brickos_domains.md updated)
- **Backend handler refactors:** 2 (org_settings::analytics schema-aware, demo::compute_zone_calc_counts + encryption fix)
- **Tracker issues closed:** 13
- **Tracker issues opened in this sprint:** 1 (#0594, which was also closed same day)
- **Prod deploys:** 1 (v0.49.0), 12m 20s duration
- **Staging deploys:** 4 (v0.49.0 initial + 3 RC hotfix iterations)
- **Sprint days spent:** 1 calendar day
- **Scope delivered:** 100% of planned P1+P2+P3 + unplanned RC-surfaced fixes

## Sign-off

v0.49.0 live at https://app.brickos.io/ with `{"version":"0.49.0","build":"644b56d"}`. Platform smoke 18/18. Tag `v0.49.0` pushed. Sprint 052 backlog bootstrapped from the Action Items above.
