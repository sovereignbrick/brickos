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

## Version decision

v0.42.0 was originally the Sprint 044 release. Since the domain realignment is substantive, consider bumping to v0.43.0 so the release notes capture the plane separation. Per memory `feedback_version_bump_production.md`, explicit version bump in lib.rs before building.

Recommend **v0.43.0** for clarity; v0.42.0 is already tagged on staging.

## Deploy order

1. Backend (if org_resolver changes require a backend build -- they do, #563)
2. Nginx config sync (sites-available + ensure sites-enabled symlinks per #558)
3. Frontend (if api.ts changes require a frontend build -- they do, #564)
4. Cloudflare DNS: make sure `*.sovereignhealth.io` A record is proxied on
5. Verify: platform admin at app.brickos.io, org admin at app.brickos.io/org, end user at `{slug}.sovereignhealth.io`

## Pre-flight checks

- All 0560-0567 marked complete
- RC passed on staging (#566)
- Production LE wildcard certs issued (#560 carried through from staging)
- `*.brickos.io` decommission completed on staging and no regressions (#565)
- Migration checksums OK (part of deploy.sh preflight)
- Working tree clean per `feedback_stash_before_promote.md`

## Announce

- Update `status.brickos.io` incident log if any brief downtime
- Update existing customers with bookmarked `*.brickos.io` org subdomains (if any exist -- there shouldn't, since white-label was staging-only) to switch to `*.sovereignhealth.io`
- Post release notes with the domain rule for future reference

## Acceptance

- `deploy.sh production --confirm` succeeds end-to-end
- Platform admin login + org creation works on app.brickos.io
- Org admin login + settings management works on app.brickos.io
- End-user login + app usage works on at least one production `{slug}.sovereignhealth.io`
- No regressions on existing `app.sovereignhealth.io` users
- Cloudflare + certbot renewals scheduled
