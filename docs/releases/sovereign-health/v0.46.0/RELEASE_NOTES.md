# Sovereign Health v0.46.0 Release Notes

**Release date:** 2026-04-22
**Sprint:** 049 (Anonymous Demo Surface + Sprint 048 Carry-overs + RC Follow-ups)
**Git:** develop → main, tag `v0.46.0`

## Highlights

- **Anonymous demo surface live at `eval.sovereignhealth.io`.** Marketing / ad traffic hitting the new subdomain sees the 3-profile picker (Optimized / Average / At Risk) and can browse the read-only SHI app with live production seed data. Sign-up / Log-in links cross-plane to `app.sovereignhealth.io`. Per Design 029 v0.3.
- **Production smoke via eval.** The same eval surface doubles as a post-deploy smoke target (9-spec Playwright suite runs automatically in `deploy.sh verify()` plus a nightly cron). Real prod backend, real prod DB, real prod nginx -- zero customer-data risk because eval is read-only.
- **Sprint 048 carry-overs (partial): invite reminder cron, bulk consent reminder.** One-time reminder email sent 3 days after an invite is created if still unaccepted. Org admins can trigger a bulk reminder to every pending patient in their org with one API call.
- **ADR-053 refactor.** The hand-rolled API-base-URL helpers in `AuditLogsTab` + `ContactTab` (which caused the Sprint 048 RC 404s) are gone; everything goes through the shared `API_BASE` / `resolveApiBase()` export from `lib/api.ts`.
- **Observability:** Grafana dashboard JSONs for impersonation UPDATE latency (ADR-052 follow-up) and audit log growth.

## Architecture

- **Design 029 v0.3** -- Anonymous Demo Surface on `eval.sovereignhealth.io`
- **ADR-053** -- Shared API base URL helper (refactor now complete)
- **ADR-052** -- Effective-user swap (observability panel added for the UPDATE hot path)

## What changed (by area)

### Frontend

- New component `<EvalConversionBanner>` renders on `isDemo`; sticky bottom, cross-plane Sign up / Log in links, dismissible per-session.
- `lib/config.ts` exports `evalHost` (`eval.sovereignhealth.io`). `lib/auth-context.tsx` splits `isEvalHost` from `isDemoOnly`; `isDemo` now covers both.
- `components/auth-gate.tsx` skips redirect on `isEvalHost`.
- `lib/api.ts`:
  - New `resolveApiBase()` + `API_BASE` public exports (ADR-053).
  - `getToken()` short-circuits to `undefined` on eval host so sibling `.sovereignhealth.io` cookies can't bleed into eval requests.
- `components/impersonation-banner.tsx`: no-ops on eval host.
- `app/sovereign-health/layout.tsx` (new): server-side `generateMetadata` sets `robots: noindex, nofollow` when `headers().host === eval.sovereignhealth.io`. Landing (/) stays indexable.
- Signup page reads `?from=demo-{profile}` and forwards to the backend.
- i18n EN + DE for `demoSurface.*` namespace.
- Sprint 046/047 stale specs fixed: `/platform/org/members`, `/settings unauth`, layout chunk regex, `/sovereignhealth` status codes.

### Backend (`sovereign-health-backend` v0.46.0)

- **4 new migrations:**
  - `20260422000001_sprint049_lock_demo_user_passwords.sql`: sets password_hash to an unverifiable argon2 sentinel for the 3 seed users. They remain readable via `/demo/*`; login attempts return 401.
  - `20260422000002_sprint049_add_signup_source.sql`: `users.signup_source text NULL`.
  - `20260422000003_sprint049_invite_reminder_tracking.sql`: `org_invites.reminder_sent_at` + partial index.
- **Rate limit:** actix governor scoped to `/demo/*` at 60 req/min/IP. Tunable via `DEMO_GOVERNOR_*` env vars.
- **Signup handler:** validates `signup_source` against closed allowlist (`demo-optimized | demo-average | demo-at_risk`) before persisting.
- **Lifecycle jobs:** `invite_reminder_cron` (daily; sends one reminder per stale invite).
- **Endpoint:** `POST /org-settings/consent-reminders` -- org admin bulk reminder for pending patients.
- **Integration test `test_demo_namespace_has_no_write_handlers`:** asserts no POST/PUT/DELETE/PATCH under `/demo/*`. Prevents a future sprint from accidentally exposing a write handler on the anonymous surface.

### Infrastructure / ops

- **New DNS:** `eval.sovereignhealth.io` A-record (Cloudflare).
- **New nginx server block** in `nginx-sovereignhealth.conf`: 443 + 80-redirect for eval host, proxies `/demo/*` / `/auth/*` / `/api/*` to backend same-origin.
- **`deploy.sh eval_smoke()`** runs after platform smoke on production deploys; non-blocking; ntfy alert on failure.
- **`ops/eval-smoke-cron.sh`** wraps the same Playwright suite for a 03:00 UTC nightly run.
- **`deploy.sh` pre-flight nginx regex check** warns if any top-level backend route prefix isn't in the nginx allow-list (prevents the Sprint 048 `user|signup` recurrence).

### Observability

- `docs/ops/grafana/sprint-049-impersonation-latency.json` -- p50/p95 UPDATE latency + session counts.
- `docs/ops/grafana/sprint-049-audit-log-growth.json` -- rows/hour, table size, impersonation-action breakdown.

## Deferred to Sprint 050

- **#049-20 impersonate-as-org-admin** (two-step platform-admin → org_owner → patient flow with double banner). Needs UI iteration; deferred to keep v0.46.0 scope manageable.
- **#049-23 custom domain reverify cron.** Needs DNS-probe implementation (not yet built); stub would be a no-op. Paired with Sprint 050 work on `domain_mappings` verification.
- **#049-27 / 28 / 29** (vitest flake triage, demo-profile seed fixture, localhost reset-clinic). P2 test-hygiene items.
- **Frontend button for bulk consent reminder** (endpoint is live; admin UI polish is next).

## Upgrade notes

- **Schema:** 3 new migrations, all additive, no backfill.
- **DNS:** add `eval.sovereignhealth.io` A-record to Cloudflare pointing at prod edge.
- **Env vars:** optional `DEMO_GOVERNOR_SECONDS_PER_REQUEST`, `DEMO_GOVERNOR_BURST_SIZE`. Defaults (1s/60 burst) are fine for most workloads.
- **Nightly cron:** add `0 3 * * * bash /opt/sovereign-health/ops/eval-smoke-cron.sh` to the VPS crontab (or install the systemd timer).
- **Grafana:** import the two dashboard JSONs from `docs/ops/grafana/`.
- **Marketing redirect:** any external demo links pointing at `app.sovereignhealth.io/sovereign-health/dashboard` should update to `https://eval.sovereignhealth.io/`.

## Known issues

- **Platform smoke login check on prod** (sanity check, not user-visible): now uses "auth endpoint rejects invalid creds with structured 401" as the success signal instead of "demo user login succeeds with valid token" -- because Sprint 049 #049-11 locked the demo user passwords. Semantic equivalence for uptime but cosmetic difference in the smoke log.
- **Cookie carry-over** from `app.sovereignhealth.io` sessions to `eval.sovereignhealth.io` is technically possible (same `.sovereignhealth.io` parent) but `api.ts` explicitly drops the token on eval, so all API calls from eval stay unauth. Safe.

## Commits (develop, since v0.45.0)

```
<filled in at release-cut time>
```
