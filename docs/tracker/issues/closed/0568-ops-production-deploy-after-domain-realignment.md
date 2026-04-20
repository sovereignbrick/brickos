---
number: 568
title: "ops: production deploy after domain realignment (v0.42.0 or later)"
milestone: "Sprint 045 -- Domain Realignment"
labels: [ops, deploy, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.5d
blocked_by: [560, 561, 562, 563, 564, 565, 566, 567]
parent: 559
phase: 7
---

Phase 7 of Design 025. After all previous phases land and RC passes on `*.demo.sovereignhealth.io`, ship to production.

## Version decision (confirmed 2026-04-19)

**v0.43.0** -- Sprint 045 ships as a new minor bump that captures the plane separation. v0.42.0 stays on staging as the Sprint 044 marker. Per memory `feedback_version_bump_production.md`, explicit version bump in `apps/health/sovereign-health/api/src/lib.rs` AND frontend `package.json` before building.

## Deploy order

1. Backend (if org_resolver changes require a backend build -- they do, #563)
2. Nginx config sync (sites-available + ensure sites-enabled symlinks per #558)
3. Frontend (if api.ts changes require a frontend build -- they do, #564)
4. Cloudflare DNS: make sure `*.sovereignhealth.io` A record is proxied on
5. Verify: platform admin at app.brickos.io, org admin at app.brickos.io/org, end user at `{slug}.sovereignhealth.io`

## Pre-flight checks

- All 0560-0567 marked complete
- RC passed on staging (#566) across admin, end-user, cross-plane, and platform sections
- Production LE wildcard certs issued for `*.sovereignhealth.io` + `*.demo.sovereignhealth.io` (#560)
- `*.brickos.io` plane restriction verified on staging with no regressions (#565)
- Migration checksums OK (part of deploy.sh preflight)
- Working tree clean per `feedback_stash_before_promote.md`

## Announce

- Update `status.brickos.io` incident log if any brief downtime
- Post v0.43.0 release notes covering:
  - Two-plane architecture (admin on brickos.io, end-user on sovereignhealth.io)
  - Per-tenant subdomains on both planes
  - Same-origin path-mount migration for `app.sovereignhealth.io`

## Acceptance

- `deploy.sh production --confirm` succeeds end-to-end
- Platform admin login + org creation works on app.brickos.io
- Org admin login + settings management works on app.brickos.io
- End-user login + app usage works on at least one production `{slug}.sovereignhealth.io`
- No regressions on existing `app.sovereignhealth.io` users
- Cloudflare + certbot renewals scheduled
