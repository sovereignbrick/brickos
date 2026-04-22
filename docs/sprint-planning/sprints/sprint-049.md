# Sprint 049 -- Anonymous Demo Surface + Sprint 048 Carry-overs + RC Follow-ups

**Start:** 2026-04-23 (proposed)
**Goal:** Ship the anonymous demo surface on `eval.sovereignhealth.io`, finish the four deferred Sprint 048 features, land the Sprint 048 RC technical-debt follow-ups, and clean the stale Sprint 046/047 test expectations.
**Previous:** Sprint 048 (v0.45.0 -- White-Label Completion + Practitioner Workbench -- shipped 2026-04-22)
**Estimated duration:** 4-5 working days
**Design anchors:** Design 029 v0.3, ADR-052, ADR-053
**Previous sprint close:** `project_sprint048_completed.md` (pending final write-up)

## Sprint goal (one sentence)

Ship v0.46.0 with (a) a public anonymous demo on `eval.sovereignhealth.io` serving the 3 risk-profile users (plus post-deploy smoke-testing via the same surface), (b) the deferred Sprint 048 features (impersonate-as-org-admin, invite/consent reminder emails, custom-domain reverify cron), and (c) the RC-finding follow-ups (ADR-053 refactor, stale E2E spec triage, nginx pre-flight check).

## Non-goals

- No new backend apps (Voice v2, Link beyond current, etc.).
- No billing/Stripe changes.
- No practitioner workbench v2 features (cohort views, notes, etc. -- ADR-051 defers).
- No mobile native wrapper.
- Marketing site overhaul -- stays as-is; `eval.*` is the only demo-surface change.

---

## Phase A -- Demo surface on eval.sovereignhealth.io (~1 day)

Ship the feature per Design 029 §13 Phase 1. This unlocks the prod-smoke target used in Phase C.

| # | P | Title | Est | Notes |
|---|---|-------|-----|-------|
| 049-01 | P0 | DNS: `eval.sovereignhealth.io` A-record pointing at prod edge | 0.1d | Cloudflare panel; verify Universal SSL covers it |
| 049-02 | P0 | nginx: new `server { server_name eval.sovereignhealth.io; ... }` block in `nginx-sovereignhealth.conf` | 0.2d | Same body as `app.sovereignhealth.io`, no Basic auth, rate-limit `/demo/*` |
| 049-03 | P0 | `EVAL_HOST` + `isEvalHost` flag in `lib/config.ts` + `lib/auth-context.tsx` | 0.2d | Drops `isDemoOnly` dual-use semantics |
| 049-04 | P0 | `AuthGate` skips on `isEvalHost` | 0.1d | 1-line addition + test |
| 049-05 | P0 | `api.ts` strips `auth_token` when on eval host | 0.2d | Prevents cookie leakage from sibling `.sovereignhealth.io` hosts |
| 049-06 | P0 | `<EvalConversionBanner>` component | 0.3d | Cross-plane "Sign up ↗" button, dismissible session-storage, i18n EN+DE per Design 029 §7.3.1 |
| 049-07 | P0 | UI guard audit for demo mode | 0.3d | Design 029 §7.4 list: hide Add-measurement / Settings / Practitioner / Platform in `isDemo` |
| 049-08 | P0 | `swapPlaneHost` null-returns for `eval.sovereignhealth.io` | 0.1d | Unit test added |
| 049-09 | P0 | Playwright spec `anonymous-demo.spec.ts` (8 specs) | 0.3d | Target `eval.sovereignhealth.io`; deep link, profile switch, no writes, no cookies |

**Phase A exit:** unauth `https://eval.sovereignhealth.io/` renders the 3-profile picker. Clicking Optimized loads `/sovereign-health/dashboard` with Optimized data. Sign up link cross-planes to `app.sovereignhealth.io/signup?from=demo-optimized`.

---

## Phase B -- Demo surface hardening (~0.5 day)

Per Design 029 §13 Phase 2.

| # | P | Title | Est | Notes |
|---|---|-------|-----|-------|
| 049-10 | P0 | Actix governor rate-limit on `/demo/*` at 60/min/IP | 0.2d | Scrape abuse mitigation |
| 049-11 | P0 | Migration: lock `optimized|average|atrisk@sovereignhealth.io` password_hash to `$LOCKED` | 0.1d | Prevents credential-stuffing against demo accounts |
| 049-12 | P0 | Backend integration test: `/demo/*` has no POST/PUT/DELETE handlers | 0.1d | Enforces read-only invariant |
| 049-13 | P1 | `<meta name="robots" content="noindex">` on `/sovereign-health/*` when `isEvalHost` | 0.1d | Prevents SEO pollution; landing `/` stays indexable |

**Phase B exit:** curl `POST https://eval.sovereignhealth.io/demo/anything` returns 404 or 405. Governor blocks 61st request/min. Demo users can't be logged into.

---

## Phase C -- Prod smoke via eval (~0.5 day)

Per Design 029 §13 Phase 3 + §19. Turns `eval.*` into post-deploy prod verification.

| # | P | Title | Est | Notes |
|---|---|-------|-----|-------|
| 049-14 | P0 | Playwright suite `eval-smoke.spec.ts` (9 specs) | 0.3d | Dashboard for each of 3 profiles, marker detail, trends, zone detail, Doctor Chat blocked state, sign-up CTA present, no cookie set |
| 049-15 | P0 | `deploy.sh` `eval_smoke()` step after `verify()` | 0.1d | Runs against `eval.sovereignhealth.io`; non-blocking alert via ntfy on failure |
| 049-16 | P1 | Nightly cron `eval-smoke-cron.sh` at 03:00 UTC | 0.1d | Catches drift between deploys (cert expiry, DNS, third-party APIs) |

**Phase C exit:** next prod deploy triggers `eval_smoke`; any red causes an ntfy notification. Nightly cron posts "all green" / "N red" to the ops channel.

---

## Phase D -- Signup source attribute (~0.25 day)

Per Design 029 §13 Phase 4. Privacy-aligned single-attribute capture.

| # | P | Title | Est | Notes |
|---|---|-------|-----|-------|
| 049-17 | P0 | Migration: `ALTER TABLE users ADD COLUMN signup_source text` | 0.1d | Null for existing rows |
| 049-18 | P0 | Signup handler reads `?from=demo-{profile}` and stores it | 0.1d | No session log, no events, just the column |
| 049-19 | P2 | `/platform/users` detail drawer shows "Signup source" field | 0.05d | Founder can see per-profile conversion visually |

**Phase D exit:** a signup completed via `/signup?from=demo-optimized` results in `users.signup_source = 'demo-optimized'`. No other tracking.

---

## Phase E -- Sprint 048 carry-overs (~1.5 days)

The features explicitly deferred at Sprint 048 close.

| # | P | Title | Est | Notes |
|---|---|-------|-----|-------|
| 049-20 | P1 | **#048-53** Impersonate-as-org-admin (two-step: platform admin → become org_owner → pick patient) | 0.8d | Two audit rows per hop; two banners (yellow for "acting as org_owner" + amber for "viewing as patient"). Exit returns to platform admin. |
| 049-21 | P1 | **#048-22** Invite reminder email (N=3 days after created, one resend) | 0.3d | Scheduled job reads `org_invites WHERE reminder_sent_at IS NULL AND created_at < NOW() - INTERVAL '3 days'`; sends reminder; marks `reminder_sent_at`. |
| 049-22 | P1 | **#048-34** Bulk consent reminder email | 0.3d | Org admin button "Email all pending patients" on `/platform/org/members`; iterates org_members without consent rows, sends prompt email. Rate-limited. |
| 049-23 | P1 | **#048-35** Custom domain reverify cron (CNAME/A health check every 6h) | 0.3d | Already wired in UI; add systemd timer that calls the existing reverify handler for every `org_domains` row, emails org_owner on status flip. |

**Phase E exit:** impersonate-as-org-admin produces a visibly different banner stack + audit trail. Invite created 3+ days ago receives exactly one reminder. Bulk reminder button sends N emails (N = members without consent). Custom domain reverify runs on schedule.

---

## Phase F -- RC follow-ups + test hygiene (~0.75 day)

The Sprint 048 RC findings that got point-fixed in prod but need proper refactors.

| # | P | Title | Est | Notes |
|---|---|-------|-----|-------|
| 049-24 | P1 | **ADR-053 refactor**: export `API_BASE` / `resolveApiBase()` from `lib/api.ts`, delete duplicates in `AuditLogsTab` + `ContactTab`, add ESLint rule or grep-based CI check forbidding `NEXT_PUBLIC_API_URL` outside `lib/api.ts` + `lib/config.ts` | 0.3d | Deletes the inlined IIFEs shipped in v0.45.0 |
| 049-25 | P1 | **Task #48**: triage the 5 stale sprint-046/sprint-047 E2E specs | 0.3d | `/platform/org/members is 404` → fix expectation; authed/unauth project mismatch on `/settings` tests; bundle regex for cross-plane href; `/sovereignhealth` status code drift |
| 049-26 | P1 | Deploy-script pre-flight: grep new backend route prefixes against nginx allow-list regex | 0.2d | Fails `bash ops/deploy.sh staging` if any backend `/route` isn't in `nginx-sovereignhealth.conf` / `nginx-brickos-app.conf`. Prevents Sprint 048's `user|signup` gap recurrence. |
| 049-27 | P2 | Triage 3 excluded vitest specs (date-format TZ, dark-theme grep, i18n-completeness) -- fix or delete | 0.2d | Stop the exclusion list growing |
| 049-28 | P2 | `ops/fixtures/000_demo_profile_users.sql` so fixture 003 runs end-to-end on fresh localhost DBs | 0.1d | Right now 003 no-ops on localhost because the 3 demo users aren't seeded |
| 049-29 | P2 | `ops/localhost-stack.sh reset-clinic` subcommand -- truncate test-clinic + reapply | 0.1d | Carried from Sprint 047 and 048 action items |

**Phase F exit:** only `lib/api.ts` + `lib/config.ts` reference `NEXT_PUBLIC_API_URL` in the codebase. `pnpm exec playwright test sprint-046-*` passes fully (no known-flaky expected failures). `bash ops/deploy.sh staging` fails early with a clear message if any backend route isn't nginx-proxied.

---

## Phase G -- Observability (~0.25 day)

Ties the "monitor prod for 24-48h after Sprint 048 deploy" item into concrete instrumentation.

| # | P | Title | Est | Notes |
|---|---|-------|-----|-------|
| 049-30 | P1 | Grafana panel: impersonation UPDATE p50/p95 latency | 0.15d | Per ADR-052 follow-up. If p50 > 5 ms sustained, escalate to the 5-second in-memory cache. |
| 049-31 | P2 | Grafana panel: `audit_log` row count / day + size alert at 90-day retention threshold | 0.1d | Sprint 048 impersonation generates 1 row per read; prod volume TBD. |

**Phase G exit:** Grafana has two new panels; oncall has clear runbooks for both.

---

## Total estimate

```
Phase A (demo surface feature):   1.0 day
Phase B (hardening):               0.5 day
Phase C (prod smoke):              0.5 day
Phase D (signup_source):           0.25 day
Phase E (Sprint 048 carry-overs):  1.5 days
Phase F (RC follow-ups):           0.75 day
Phase G (observability):           0.25 day
─────────────────────────────────────────────
Total:                             4.75 days
```

Comfortably fits a 5-day sprint with ~5% slack. P2 items in Phase F + G drop first if scope pressure.

## Acceptance criteria (sprint close gate)

- [ ] `eval.sovereignhealth.io` reachable publicly, 3-profile picker renders
- [ ] Sign-up from eval lands on `app.sovereignhealth.io/signup` with `?from=demo-{profile}` query, and the new user's `signup_source` column is set
- [ ] No auth cookie set during any demo browsing session (Playwright assertion)
- [ ] `deploy.sh verify()` runs eval-smoke post-deploy; nightly cron exists
- [ ] Impersonate-as-org-admin end-to-end flow works: platform admin → org_owner → patient → exit → back to platform
- [ ] Invite reminder email fires 3 days after invite creation (integration test)
- [ ] Bulk consent reminder button sends N emails where N = pending patients count
- [ ] Custom domain reverify cron runs on schedule; status flip triggers org_owner email
- [ ] Only `lib/api.ts` + `lib/config.ts` reference `NEXT_PUBLIC_API_URL` (CI check green)
- [ ] `sprint-046-*` E2E specs all pass (no stale expectations)
- [ ] `ops/deploy.sh staging` fails early if new backend route isn't in nginx regex
- [ ] Grafana has impersonation latency + audit log growth panels

## Release planning

- **Tag:** `sovereign-health/v0.46.0`
- **Release notes:** `docs/releases/sovereign-health/v0.46.0/RELEASE_NOTES.md`
- **Retro:** `docs/releases/sovereign-health/v0.46.0/RETRO.md`
- **RC checklist:** `docs/releases/sovereign-health/v0.46.0-rc/2026-XX-XX_sprint-049-rc-checklist.md` -- apply lessons learned from v0.45.0 RC (URL + user in every step)

## Risks

```
┌────────────────────────────────────┬──────────────────────────────┐
│ Risk                                │ Mitigation                   │
├────────────────────────────────────┼──────────────────────────────┤
│ DNS / SSL for eval.* takes longer  │ DNS propagates in minutes;   │
│ than 2h                             │ SSL via Cloudflare wildcard  │
│                                    │ auto-covers. If no, fall back│
│                                    │ to manual cert in Phase A.   │
├────────────────────────────────────┼──────────────────────────────┤
│ Impersonate-as-org-admin UX is     │ Timebox to 0.8d; if UX can't │
│ fiddly (double-banner stacking)    │ be resolved, ship backend    │
│                                    │ only and hide behind flag.   │
├────────────────────────────────────┼──────────────────────────────┤
│ ADR-053 refactor breaks something  │ Keep inlined IIFE as backup, │
│ in prod                             │ land ESLint rule first,      │
│                                    │ delete duplicates last.       │
├────────────────────────────────────┼──────────────────────────────┤
│ Cron reverify triggers false       │ Grace period: only alert on  │
│ domain-health alarms               │ 3 consecutive failures.       │
└────────────────────────────────────┴──────────────────────────────┘
```

## Dependencies

- **DNS access** (Cloudflare): for `eval.sovereignhealth.io`.
- **Product sign-off on Design 029 §20.4** (content migration review gate) before any post-release demo-content tweaks.
- **Medical advisor sign-off** on profile semantics (once-per-sprint when demo data changes, not blocking).

## Out of scope (Sprint 050 candidates)

- **Phase 5 infra hardening** (Cloudflare bot-fight rule) per Design 029
- **Demo-content-refresh cron** per Design 029 §20.6 (timestamp rollover on measurements)
- **Design 030** (pending topic) -- post-Sprint-048 product direction review
- **Eval-smoke visual regression** (Percy / Chromatic) -- future, not in 049 scope
- **Monitor impersonation live-scaling behavior** once real orgs join

## Kickoff checklist (day 1)

1. Read `project_sprint048_completed.md` + v0.45.0 RELEASE_NOTES + v0.45.0 RETRO
2. Read Design 029 v0.3 (primary spec for Phases A-D)
3. Verify prod is stable (check ntfy + eval.sovereignhealth.io DNS; if not configured, start Phase A item 049-01 immediately)
4. Branch off `main`, not `develop` (Sprint 048 is now on main)
5. Start Phase A in order (DNS → nginx → code), so Phase C can depend on a reachable eval host
6. Phase E items are independent -- parallelizable with Phase A if helpful

## References

- Design 029 v0.3 -- `docs/design/029-eval-subdomain-anonymous-demo.md`
- ADR-052 -- `docs/adr/052-effective-user-swap-via-authenticated-user.md`
- ADR-053 -- `docs/adr/053-shared-api-base-url-helper.md`
- v0.45.0 RETRO -- `docs/releases/sovereign-health/v0.45.0/RETRO.md`
- Sprint 048 RC checklist -- `docs/releases/sovereign-health/v0.45.0-rc/2026-04-21_sprint-048-rc-checklist.md`
