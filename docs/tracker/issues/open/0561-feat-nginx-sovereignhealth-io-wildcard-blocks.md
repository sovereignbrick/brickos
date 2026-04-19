---
number: 561
title: "feat(nginx): *.sovereignhealth.io + *.demo.sovereignhealth.io wildcard blocks"
milestone: "Sprint 045 -- Domain Realignment"
labels: [feat, nginx, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.5d
blocked_by: [560]
parent: 559
phase: 2
---

Phase 2 of Design 025. Add the server blocks that serve the SHI end-user app on org subdomains under sovereignhealth.io. Same-origin path-mount (backend + frontend on same host) with the #556 Accept-header fix baked in from the start.

## Scope

Add two server blocks to `apps/health/sovereign-health/ops/nginx-sovereignhealth.conf`:

### `*.sovereignhealth.io` (production)

- Listen 443 with LE wildcard cert (`/etc/letsencrypt/live/sovereignhealth.io/`)
- Path-mount regex for backend routes -> `127.0.0.1:8080` with `X-Org-Domain $host` header
- #556 Accept-header fix: browser navigation to /admin, /settings, etc. -> internal `/__fe_navigate` -> frontend `:3000`
- `/sw.js` no-cache
- Catch-all `/` -> frontend `:3000`
- NO basic auth on production

### `*.demo.sovereignhealth.io` (staging)

- Listen 443 with LE wildcard cert (`/etc/letsencrypt/live/demo.sovereignhealth.io/`)
- Same path-mount + Accept-header fix, but backend `:8081` and frontend `:3001`
- `auth_basic off` -- per-tenant logins must work without staging credentials (same as `*.demo.brickos.io` today)
- `X-Robots-Tag noindex, nofollow`

## Ensure sites-enabled is a symlink

Before reload, verify `/etc/nginx/sites-enabled/sovereignhealth.conf` is a symlink to sites-available (not a stale copy). #558 lesson: deploy.sh silently failed when sites-enabled was a plain file.

## Acceptance

- `curl -H "Accept: text/html" https://test-clinic.sovereignhealth.io/login` -> frontend HTML (after an org `test-clinic` exists)
- `curl -H "Accept: */*" https://test-clinic.sovereignhealth.io/api/v1/org/branding` -> backend JSON with org branding
- Same pattern works on `test-clinic.demo.sovereignhealth.io` against staging ports
- `app.sovereignhealth.io` + `api.sovereignhealth.io` still work unchanged (this issue does NOT touch them; see #562)
- `nginx -t` passes with no errors on the VPS
