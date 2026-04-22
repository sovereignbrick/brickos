# Sprint 050 -- Stabilization: Full QA of app.sovereignhealth.io + Org/White-Label Validation

**Start:** 2026-04-23 (proposed)
**Goal:** Close Sprint 049 carry-overs (v0.47.0), then do a full end-to-end quality sweep of `app.sovereignhealth.io` to confirm it's ready for a paying customer; once green, validate org roles + white-label end-to-end; ship any discovered fixes as v0.48.0.
**Previous:** Sprint 049 (v0.46.0 -- Anonymous Demo Surface + Carry-overs + RC Follow-ups -- shipped 2026-04-22)
**Estimated duration:** 4-5 working days
**Previous sprint close:** `project_sprint049_completed.md`

## Sprint goal (one sentence)

Confirm that a real paying customer on `app.sovereignhealth.io` can sign up, use every advertised feature, pay, and leave without hitting defects -- then prove the same for org admins, practitioners, and org-member patients on `{slug}.sovereignhealth.io` + `{slug}.brickos.io`.

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

## Phase B -- Full customer QA of app.sovereignhealth.io (~1.5 days)

Systematic walk-through of every advertised feature from a real customer's POV. Each section gets a pass/fail + screenshot/log if fail. Output: `docs/releases/sovereign-health/v0.48.0-rc/2026-XX-XX_sprint-050-customer-qa.md` -- a checklist file that becomes our standing internal QA runbook.

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

## Phase C -- Org + white-label validation (~1 day)

Only starts after Phase B is GREEN (or Phase D fixes have landed). Tests the multi-tenant surface.

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

## Phase D -- Bug fixes from Phase B + C (~1 day, elastic)

Scope determined by actual Phase B + C FAILs. Budget 1 day; can compress to 0.5d if QA is mostly green, or expand if >15 bugs.

Prioritization:
- P0: blocks customer signup, billing, or data integrity -> fix immediately, delay v0.48.0 if needed
- P1: blocks a specific advertised feature or user role -> fix before v0.48.0
- P2: cosmetic or edge-case -> Sprint 051

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
Phase A -- carry-overs + v0.47.0:       1.0 day
Phase B -- customer QA of app.*:        1.5 days
Phase C -- org + white-label QA:        1.0 day
Phase D -- bug fixes (elastic):         1.0 day (est.)
Phase E -- v0.48.0 ship:                0.25 day
──────────────────────────────────────────────────
Total:                                  4.75 days
```

Same budget as Sprint 049. Phase D is the wildcard -- could compress if QA is cleaner than expected.

## Success criteria (sprint close gate)

- [ ] v0.47.0 live with impersonate-as-org-admin + domain reverify + button/fixture/reset items
- [ ] v0.48.0 live with every P0 bug from Phase B/C fixed
- [ ] Phase B: all 26 customer-UX items have a documented PASS or FIX in v0.48.0
- [ ] Phase C: all 36 org/practitioner/patient items have a documented PASS or FIX
- [ ] `docs/releases/sovereign-health/v0.48.0-rc/sprint-050-customer-qa.md` exists as our standing QA runbook for future sprints
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
