# Sprint 050 -- Tests-First Stabilization: Automated QA Then Manual Confirmation

**Start:** 2026-04-22 (starting this session) -- 2026-04-28 (est. close)
**Goal:** Close Sprint 049 carry-overs (v0.47.0), then build out comprehensive automated test coverage at every layer (unit / integration / E2E / smoke / visual) before any human manual QA runs. When the test suite is green, user-driven manual testing is a final sanity check for visual/copy/subjective quality, not the primary bug-discovery mechanism. Ship discovered fixes as v0.48.0.
**Previous:** Sprint 049 (v0.46.0 -- Anonymous Demo Surface + Carry-overs + RC Follow-ups -- shipped 2026-04-22)
**Estimated duration:** 5-7 working days
**Previous sprint close:** `project_sprint049_completed.md`

## Sprint goal (one sentence)

Build out the automated test pyramid (unit + integration + E2E + smoke) to cover every customer-facing flow and every role on every plane, so that the user's manual QA becomes a final sign-off on copy/tone/visual instead of a bug hunt; ship v0.47.0 then v0.48.0 with everything green.

## The shift from original plan (documented for clarity)

**v0.1 (earlier today):** Phase B was a 26-item manual checklist, Phase C was 36 manual items. User time was the primary bug-discovery mechanism. Bugs surfaced during manual QA went to Phase D fixes.

**v0.2 (this rewrite):** Same 62 checkpoints, but now each one is a test at the right layer of the pyramid BEFORE a human touches it:
- Unit (vitest / cargo test) -- logic / flag derivation / handler validation
- Integration (cargo test --test integration) -- full request/response with real DB
- E2E (Playwright) -- the customer/org/practitioner/patient journeys
- Smoke (platform-smoke.sh + eval-smoke.spec.ts + new manual-ui-smoke.sh) -- deploy-time gates

Manual QA runs LAST, against an already-green suite. It catches:
- Visual regressions the tests don't assert (pixel-level, responsive breakpoints)
- Copy/tone issues (does the welcome email feel welcoming?)
- Subjective flow quality ("this is clunky but works")

NOT: "does the sign-up button work" -- that's an E2E test.

## Non-goals

- No new customer-facing features (exception: the two Sprint 049 carry-overs #049-20 + #049-23 which are deferred-features, not new scope).
- No marketing/copy changes beyond what QA discovers as broken.
- No performance/load testing (defer to Sprint 051+ unless Phase B surfaces a specific latency concern).
- No mobile-native app work (PWA-based mobile experience is in scope; native wrapper is not).
- No internationalization beyond EN + DE (current scope).

---

## Phase A -- Sprint 049 carry-overs + v0.47.0 cut (~1 day)

Finish everything deferred from Sprint 049 so the tree is clean before QA starts. Anything half-shipped pollutes QA signal.

| # | P | Title | Est | Notes |
|---|---|-------|-----|-------|
| 050-01 | P0 | Ship v0.47.0 with the 4 pending-on-develop items (049-22B button, 049-27 vitest, 049-28 fixture, 049-29 reset-clinic) | 0.2d | Deploy, verify eval-smoke green, platform smoke green. These are already committed; just needs a deploy cycle. |
| 050-02 | P1 | **#049-20** Impersonate-as-org-admin (two-step platform admin -> org_owner -> patient + double banner) | 0.8d | UX design first: draft wireframe of the two-banner stack (yellow "acting as org_owner" above amber "viewing as patient"). Two audit rows per hop. Exit flow returns to platform-admin context. |
| 050-03 | P1 | **#049-23 Part 1** DNS-probe implementation | 0.5d | trust-dns-resolver crate + TLS cert probe. Live behind `verify_org_domain(org_domain_id)` handler. |
| 050-04 | P1 | **#049-23 Part 2** Domain reverify cron wrapper | 0.2d | Systemd timer every 6h; on status flip, email org_owner. Wires to the Part 1 handler. |
| 050-05 | P2 | date-format.test.ts proper fix (vi.setSystemTime retrofit) | 0.2d | Eliminates the last vitest exclusion; fully green test suite. |

**Phase A exit:** `bash ops/localhost-stack.sh test` returns 0 with NO exclusions. v0.47.0 live in prod with impersonate-as-org-admin + domain reverify + button + fixture.

---

## Phase B -- Automated test pyramid expansion (~2.5 days)

Build out tests at every layer BEFORE human QA. Goal: each Phase C manual checkpoint becomes an automated test first; manual time is freed for subjective judgment.

### B0. Test inventory baseline (30 min)

Run every existing suite against the current tree + document what's covered vs. missing. Output: `docs/releases/sovereign-health/v0.48.0-rc/test-coverage-baseline.md` listing green/red per suite.

### B1. Backend unit + integration tests (~0.5d)

Add coverage for:

| # | What | Layer | Notes |
|---|---|---|---|
| 050-20 | signup_source validation (049-18) | unit + integration | Valid values persist; invalid silently drop |
| 050-21 | bulk_consent_reminder handler | integration | 403 for non-admin; 200 + count for admin |
| 050-22 | /demo/* rate limit (60/min/IP) | integration | 61st req within 1 min -> 429 |
| 050-23 | invite_reminder_cron dry-run path | unit | Skips invites <3d old, skips already-reminded |
| 050-24 | Demo user password lock | integration | optimized@ login returns 401 with structured JSON |
| 050-25 | AuthenticatedUser effective-user swap | unit | Correct user_id under X-Impersonation-Token |
| 050-26 | ImpersonationScopeGate write block | integration | POST /measurements under impersonation -> 403 |
| 050-27 | Consent revoke kills session | integration | UPDATE patient_consents revokes live session |
| 050-28 | Org branding cross-schema JOIN | integration | brickos.organizations joins public.measurements |
| 050-29 | Signup invite token flow (both branches) | integration | verify-email + direct-create paths |

### B2. Frontend unit tests (vitest, ~0.5d)

| # | What | Notes |
|---|---|---|
| 050-30 | auth-context isDemo/isEvalHost/isDemoOnly matrix | 4 state combos x 3 hosts |
| 050-31 | AuthGate redirect decision | unauth + demo + evalhost + org-subdomain paths |
| 050-32 | EvalConversionBanner dismissal | sessionStorage key set + re-check |
| 050-33 | swapPlaneHost edge cases | app./{slug}./demo./eval./unknown/onion |
| 050-34 | Settings /settings redirect decision | by plane + by auth state |
| 050-35 | Navbar visibility per role | org_owner/practitioner/member/platform_admin |
| 050-36 | useDemoProfile default + switch | URL ?profile= param persistence |
| 050-37 | classifyApiError covers impersonation_* codes | no session_expired misroute |
| 050-38 | i18n-completeness (already covered -- extend) | add `demoSurface.*` + `orgMembers.bulkReminder*` |

### B3. NEW E2E Playwright suites (~1.0d)

Each suite targets a customer role + journey. Run against eval for prod smoke + against test-clinic staging for UI-depth coverage.

| Spec file | Scope | Specs |
|---|---|---|
| `sprint-050-acquisition-funnel.spec.ts` | marketing -> eval -> signup -> verify -> first dashboard | 8 |
| `sprint-050-measurement-lifecycle.spec.ts` | record / view / edit / delete / import CSV | 10 |
| `sprint-050-billing.spec.ts` | Stripe test-mode upgrade + downgrade + webhook | 6 |
| `sprint-050-settings-lifecycle.spec.ts` | MFA / password reset / data export / account delete | 8 |
| `sprint-050-mobile-responsive.spec.ts` | 3 viewports x 8 key pages | 24 (table-driven) |
| `sprint-050-pwa-offline.spec.ts` | SW install / offline fallback / reconnect | 5 |
| `sprint-050-org-admin-full.spec.ts` | branding / invite / member mgmt / custom domain | 12 |
| `sprint-050-practitioner-impersonation.spec.ts` | full caseload -> impersonate -> exit + 050-02 flow | 10 (extends 048 spec) |
| `sprint-050-patient-journey.spec.ts` | welcome banner / consent onboarding / data access log | 7 |

**Total new E2E coverage: ~90 specs** across 9 files.

### B4. Existing spec hardening (~0.3d)

| # | What | Notes |
|---|---|---|
| 050-40 | sprint-047-url-routing with mobile Accept-header | catch responsive RSC prefetch bugs |
| 050-41 | health.spec welcome-email contract assertion | test MailgunMock + locale dispatch |
| 050-42 | sprint-048-impersonation consent-onboarding integration | blocking modal triggered on first login |
| 050-43 | eval-smoke.spec.ts tier-visibility + branding smoke | noindex metatag regression + landing indexable |

### B5. Visual regression baseline (~0.2d, optional)

Add Percy-style screenshot comparison for 10 key pages:
- Dashboard (empty + populated)
- Marker detail
- Trends
- Settings (each tab)
- Platform admin overview
- Org admin members

Blocked on budget decision: Percy is paid; alternative is Playwright's built-in `toHaveScreenshot()` stored in-repo. Latter is free, slightly less robust to font anti-aliasing. Recommend Playwright screenshots for Sprint 050, revisit Percy in Sprint 052.

### B6. Deploy-gate smoke expansion (~0.2d)

| # | What | Notes |
|---|---|---|
| 050-50 | platform-smoke: include /demo/zones probe | catches eval backend regressions |
| 050-51 | platform-smoke: include /signup 200 probe | registration endpoint up |
| 050-52 | eval-smoke: add Cloudflare rate-limit simulation | verify 429 response is branded |

**Phase B exit:** Every Phase C checkpoint has a failing or passing automated test at the appropriate layer. No item is "run by hand" in the acceptance criteria. `bash ops/localhost-stack.sh test` + `E2E_BASE_URL=<staging> pnpm playwright test` + `E2E_BASE_URL=https://eval.sovereignhealth.io pnpm playwright test eval-smoke` all exit 0.

### Total Phase B: ~2.5 days

Time distribution: 0.5d backend + 0.5d frontend unit + 1.0d E2E + 0.3d hardening + 0.2d smoke expansion. Visual regression is a stretch item.

### B1. Acquisition funnel

| # | Check | Pass criteria |
|---|---|---|
| 050-10 | Marketing `sovereignhealth.io` -> CTA -> `eval.sovereignhealth.io` -> [Sign up] -> `app.sovereignhealth.io/signup?from=demo-optimized` | URL flow clean; `users.signup_source` recorded |
| 050-11 | `/signup` with email + password | Welcome email arrives (Mailgun) in <60s |
| 050-12 | Verify email link from inbox | Redirects to `/login?verified=true`; first login succeeds |
| 050-13 | First dashboard after login | Empty-state "Record your first" prompt visible; no console errors |
| 050-14 | Sign up via invite link (org_owner invites from a test org) | Invite email arrives; signup prefills + locks email; auto-joins org |

### B2. Core app functionality

| # | Check | Pass criteria |
|---|---|---|
| 050-20 | Record a measurement (single marker, manual entry) | Appears on dashboard + markers list; timestamp correct |
| 050-21 | Record multiple markers in one session | All persist; zone rollups update |
| 050-22 | Import measurements via CSV / spreadsheet | Preview works; commit inserts rows; import history log shows |
| 050-23 | View marker detail page (e.g. iron) | Value + threshold + history chart + unit conversion |
| 050-24 | View trends page | Chart renders for 1 marker; multi-marker comparison works |
| 050-25 | View zones overview | 8 zones render; status aggregation (green/orange/red) correct |
| 050-26 | Doctor Chat: ask one real question | AI responds; tier quota decrements visibly |
| 050-27 | Doctor Chat quota exhausted state | Friendly upgrade prompt on hit |
| 050-28 | Calculated markers (GKI, BMI, WHtR, etc.) | Auto-compute when inputs present |

### B3. Settings + account lifecycle

| # | Check | Pass criteria |
|---|---|---|
| 050-30 | Update profile (name, locale, country, threshold preferences) | Saved + persists across sessions |
| 050-31 | Add / pair a device | Device shows in list; device measurements route correctly |
| 050-32 | Adjust personal thresholds | Reflected in marker color + zone status |
| 050-33 | Enable + challenge MFA (TOTP) | Setup QR works; login requires TOTP on next session |
| 050-34 | Password reset flow | Email received; reset completes; old pw invalid |
| 050-35 | Export my data (GDPR Art. 15) | Download includes measurements + settings; audit log entry |
| 050-36 | Delete account (soft delete + hard delete after grace) | User flagged deleted; data purges per retention policy |

### B4. Billing / tier

| # | Check | Pass criteria |
|---|---|---|
| 050-40 | Tier comparison page | All 3 tiers visible with feature matrix |
| 050-41 | Upgrade Glimpse -> Clarity via Stripe | Checkout works; webhook flips tier; user sees new features |
| 050-42 | Upgrade via Lightning (if enabled) | Invoice generates; payment recognized; tier flip |
| 050-43 | Upgrade via BTC on-chain | Invoice + status tracking |
| 050-44 | Payment failure grace period emails | Day-7 + day-13 reminders send; grace banner shows; downgrade on day-14 |
| 050-45 | Cancel subscription | End-of-period downgrade; keeps access until period end |

### B5. Mobile + PWA

| # | Check | Pass criteria |
|---|---|---|
| 050-50 | Responsive layout 320px-1920px | No horizontal scroll; all CTAs reachable |
| 050-51 | PWA install prompt | Chrome + Safari both show install option |
| 050-52 | Offline page (SW fallback) | Serves when network drops; reconnects gracefully |
| 050-53 | Push notifications opt-in | Subscription works; test notification arrives |

### B6. Notifications

| # | Check | Pass criteria |
|---|---|---|
| 050-60 | Welcome email after signup | Arrives; copy is correct for user locale (EN/DE) |
| 050-61 | Measurement reminder (if scheduled) | Sends at configured time |
| 050-62 | Threshold alert email (value out of range) | Sends once per event; doesn't spam |

**Phase B exit:** All items in B1-B6 marked PASS or FAIL. Every FAIL becomes a P1 bug in Phase D. Expect 5-12 real bugs (based on Sprint 048 RC precedent of 9 in a smaller scope).

---

## Phase C -- Full-suite run + user manual sanity check (~1 day)

Phase B built the tests. Phase C runs them end-to-end and triages what's red.

### C1. Automated suite execution (~0.4d)

Run, in order, against the three environments:

```
# Localhost (fastest, fail-fastest)
bash ops/localhost-stack.sh reset && bash ops/localhost-stack.sh test

# Staging
E2E_BASE_URL=https://test-clinic.demo.brickos.io pnpm playwright test

# Prod eval (read-only, safe)
E2E_BASE_URL=https://eval.sovereignhealth.io pnpm playwright test eval-smoke
```

Output: per-environment test report. Every red test is a bug candidate -> Phase D.

### C2. User-driven manual sanity check (~0.3d user time + 0.3d prep)

At this point the automated suite has caught every functional bug it's going to catch. Remaining manual QA scope is **narrow and subjective**:

| # | Check | What manual QA adds over automation |
|---|---|---|
| 050-60 | Visual: every page at 3 breakpoints | Typography, spacing, mobile reflow -- things pixel asserts miss |
| 050-61 | Copy: every email + toast | Tone, grammar, cultural fit (DE especially) |
| 050-62 | Flow: feel the signup-to-first-measurement path | "Is this 3 clicks or 7?" -- UX friction not measurable |
| 050-63 | Subjective: first impression of eval.sovereignhealth.io from an ad's POV | Would a cold visitor get it? |
| 050-64 | Accessibility spot-check | Keyboard nav + screen reader on dashboard + signup |
| 050-65 | Error state realism | Disconnect WiFi mid-action; does UI degrade gracefully? |

Output: 6 subjective findings (at most). Each becomes either a design ticket (deferred) or a one-line copy/style fix (in this sprint).

### C3. Pre-manual deliverable (~0.3d)

Prepare for user's manual session so their time isn't spent hunting logs:

1. `docs/releases/sovereign-health/v0.48.0-rc/sprint-050-user-sanity.md` -- **6-row checklist** (above) with clear URL + credentials per row. No prose. 15-min walk-through target.
2. Fresh staging deploy with v0.47.0 + automated-test-fix bundle applied.
3. Pre-computed screenshots of every Phase C1 automated result for reference.
4. DevTools console clean on the main customer journeys (confirmed by automation).

**Phase C exit:** Automated suite green across 3 environments. User manual sanity check logged. All subjective findings triaged (fix now / defer / won't-fix).

### C1. Platform admin flows (on `demo.brickos.io` for staging)

| # | Check | Pass criteria |
|---|---|---|
| 050-70 | Create new org | Org appears in /platform/orgs; slug + branding defaults set |
| 050-71 | Issue license (Clarity tier) | License row created; org shows tier; features propagate |
| 050-72 | Invoice generation | PDF + Stripe invoice ID recorded |
| 050-73 | Audit log cross-org viewer | Shows rows from multiple orgs; impersonation pills colour-coded |
| 050-74 | Delete org (soft + hard) | Cascades members + licenses + invoices; audit kept |

### C2. Org admin flows (on `{slug}.brickos.io` as org_owner)

| # | Check | Pass criteria |
|---|---|---|
| 050-80 | Add branding (logo + colors) | Reflected on `{slug}.sovereignhealth.io` end-user UI |
| 050-81 | Per-locale email templates (welcome, verify, reset) | Saved; org members receive branded emails |
| 050-82 | Invite a new member | Email arrives with `/signup?invite=TOKEN`; completes signup |
| 050-83 | Remove a member (cascade to consents + impersonation) | Member gone; consents revoked; sessions ended |
| 050-84 | Bulk consent reminder (#049-22B button) | Toast "Sent X of Y"; patients receive reminder emails |
| 050-85 | Custom domain add + verify | Status transitions pending -> active; SSL works |

### C3. Practitioner flows (on `{slug}.sovereignhealth.io` as practitioner)

| # | Check | Pass criteria |
|---|---|---|
| 050-90 | Caseload shows consenting patients only | Non-consenting patients hidden; consent badges accurate |
| 050-91 | Click patient -> profile preview (measurement count + 10 markers) | Loads < 1s; no 500s |
| 050-92 | Start impersonation | Amber banner visible; URL remains practitioner's but data is patient's |
| 050-93 | Read-only during impersonation (attempt write) | 403 + friendly toast; no data mutation |
| 050-94 | Doctor Chat hard-excluded during impersonation | Friendly "Not available" page with Back to caseload |
| 050-95 | Exit impersonation | Returns to caseload; own-user state restored |
| 050-96 | Revoke consent mid-session (from another tab as patient) | Impersonation ends; practitioner can't re-enter |
| 050-97 | **NEW** Impersonate-as-org-admin (050-02) | Platform admin -> become org_owner -> impersonate patient; double banner stack; exit returns to platform admin |

### C4. Patient (org_member) flows (on `{slug}.sovereignhealth.io`)

| # | Check | Pass criteria |
|---|---|---|
| 050-100 | Welcome banner after first login | One-shot; dismissal persists |
| 050-101 | Consent onboarding prompt | Blocks on first login; dismissal per (user, org); doesn't re-nag revoked users |
| 050-102 | Settings -> Organization access -> grant | Practitioner caseload visibility updates |
| 050-103 | Settings -> Organization access -> revoke (with modal) | Access revoked; impersonation sessions killed |
| 050-104 | Data access log | Every practitioner action on patient shows here (timestamp, action, actor, org) |
| 050-105 | Org-specific branding propagation | Header logo + colors match org |

**Phase C exit:** All items in C1-C4 marked PASS or FAIL. FAILs queue to Phase D.

---

## Phase D -- Bug fixes from Phase C red results (~0.75 day, elastic)

Scope = every test that turned red in Phase C1 + every subjective finding in Phase C2 classified as "fix now."

**Expected red count:** 10-20 tests red. Some are test bugs (expectations wrong), some are product bugs. Triage applies:

- **Test bug** (assertion is wrong about current behaviour): update the test. Quick.
- **Product P0** (breaks signup / billing / data integrity): fix + add regression test. Delays v0.48.0 if not fixable in 0.5d.
- **Product P1** (breaks advertised feature): fix + add regression test. Ship in v0.48.0.
- **Product P2** (cosmetic / edge): file for Sprint 051, leave test marked `.skip` with a tracking-issue comment.

Budget the Phase D burn-down explicitly:
- 0-5 reds: 0.3d
- 6-15 reds: 0.75d (target)
- 16-25 reds: 1.0d (timebox; defer P2s to Sprint 051)
- 26+ reds: triage gate; if many are real product bugs, Sprint 050 slips a day and we extend.

Every fix commit has the form `fix(sprint-050): #050-xx <description>` for traceability.

---

## Phase E -- Ship v0.48.0 stabilization release (~0.25 day)

```
┌───────────────────────────────────────────────────────────┐
│ 1. Release notes focus on "Sprint 050 stabilization"      │
│    + list every Phase B/C bug fixed with commit hash.     │
│ 2. RETRO captures: which Phase B/C items surfaced bugs,   │
│    which feature areas are weakest.                        │
│ 3. Promote develop -> main; tag v0.48.0; prod deploy.     │
│ 4. Eval-smoke + platform-smoke MUST be green pre- and     │
│    post-deploy.                                            │
│ 5. Manual post-deploy walk-through of the 3 highest-risk  │
│    items identified in Phase D. 15 min max.                │
└───────────────────────────────────────────────────────────┘
```

**Phase E exit:** v0.48.0 live in production. Memory + release notes written.

---

## Total estimate

```
Phase A -- carry-overs + v0.47.0:        1.0 day
Phase B -- automated test expansion:     2.5 days
Phase C -- run + user manual sanity:     1.0 day (0.3d user + 0.7d me)
Phase D -- bug fixes (elastic):          0.75 day (target)
Phase E -- v0.48.0 ship:                 0.25 day
──────────────────────────────────────────────────
Total:                                   5.5 days
```

Larger than original v0.1 plan (+0.75d) because automation-first is more upfront work but dramatically compresses Phase C user time and Phase D fix-cycle length. Tests-as-code also means future sprints start from green.

## Success criteria (sprint close gate)

- [ ] v0.47.0 live with impersonate-as-org-admin + domain reverify + the 4 Sprint 049 committed-on-develop items
- [ ] v0.48.0 live with every Phase D P0+P1 fix
- [ ] **Unit/integration coverage:** every Phase B1 + B2 test shipped + green (17 tests)
- [ ] **E2E coverage:** 9 new spec files shipped (~90 specs), all green on localhost + staging + eval where applicable
- [ ] **Smoke coverage:** platform-smoke + eval-smoke + new deploy-gate probes all green
- [ ] **Visual regression:** in-repo Playwright screenshots stored for 10 key pages; any diff triggers deploy-time alert
- [ ] **Test baseline document:** `docs/releases/sovereign-health/v0.48.0-rc/test-coverage-baseline.md` lists every test file with expected pass count and runtime
- [ ] **User manual sanity:** 6-row checklist completed with all findings triaged (fix / defer / won't-fix)
- [ ] No known P0 / P1 bugs remaining
- [ ] eval-smoke + platform-smoke green in prod post-deploy

## Risks

```
┌────────────────────────────────────┬──────────────────────────────┐
│ Risk                                │ Mitigation                   │
├────────────────────────────────────┼──────────────────────────────┤
│ Phase B uncovers 20+ bugs (scope   │ Timebox Phase D; P2s defer to│
│ explosion)                          │ Sprint 051; ship only P0+P1. │
├────────────────────────────────────┼──────────────────────────────┤
│ 050-02 impersonate-as-org-admin    │ Ship behind feature flag if  │
│ UX has a late-surfaced issue        │ UX is unclear; enable post-  │
│                                    │ sprint after founder review.  │
├────────────────────────────────────┼──────────────────────────────┤
│ DNS probe (050-03) triggers false  │ Grace period: require 3      │
│ alarms on transient DNS flap        │ consecutive failures before  │
│                                    │ emailing org_owner.           │
├────────────────────────────────────┼──────────────────────────────┤
│ Stripe/Lightning/BTC billing has   │ P0 fix if checkout broken; if│
│ real customer-impacting bug         │ display-only, P1. Test both  │
│                                    │ Stripe test-mode and live.    │
└────────────────────────────────────┴──────────────────────────────┘
```

## Out of scope (Sprint 051+ candidates)

- Performance testing (Lighthouse / k6 load / critical-path p99 latency).
- Mobile native wrapper (iOS / Android).
- Additional locales beyond EN + DE.
- New features; this is a stabilization sprint.
- Redesigning the marketing site.
- Deeper clinical-workflow features (notes, anamnesis, cohort views -- ADR-051 deferred these).

## Kickoff checklist (day 1)

1. Read this plan + `project_sprint049_completed.md` + v0.46.0 RETRO.
2. Start Phase A: ship v0.47.0 with the 4 pending-on-develop items.
3. While v0.47.0 deploys, draft wireframes for 050-02 (impersonate-as-org-admin double banner) and share with product for sign-off.
4. Once v0.47.0 live: kick off DNS probe implementation (050-03) in parallel with Phase B QA.
5. Open `docs/releases/sovereign-health/v0.48.0-rc/2026-XX-XX_sprint-050-customer-qa.md` and start filling in B1 checks immediately -- don't wait until Phase A is done to start QA on the live v0.46.0 app.

## References

- Design 028 v3 (practitioner workbench) -- for 050-02 impersonate-as-org-admin
- ADR-052 (effective-user swap) -- observability panel context for Phase D
- `project_sprint049_completed.md` -- full v0.46.0 status incl. carry-overs
- Sprint 048 RC checklist at `docs/releases/sovereign-health/v0.45.0-rc/2026-04-21_sprint-048-rc-checklist.md` -- template for the v0.48.0-rc QA checklist
