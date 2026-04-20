---
number: 562
title: "refactor(nginx): migrate app.sovereignhealth.io to same-origin path-mount"
milestone: "Sprint 045 -- Domain Realignment"
labels: [refactor, nginx, frontend, p1, white-label]
created: 2026-04-19
priority: P1
estimate: 0.5d
blocked_by: [561]
parent: 559
phase: 2
---

Today `app.sovereignhealth.io` proxies only `:3000` (frontend) and uses `api.sovereignhealth.io` cross-origin for backend. Decision 2026-04-19 (Design 025 #2): migrate to same-origin path-mount for consistency with `{slug}.sovereignhealth.io` and with `app.brickos.io`. CORS preflight goes away.

## Changes to `nginx-sovereignhealth.conf`

- Add path-mount regex block on `app.sovereignhealth.io` -> `127.0.0.1:8080` for the backend routes (same regex as `*.sovereignhealth.io`)
- Apply the #556 Accept-header fix on this block too (it has the same frontend-vs-backend path collision as the wildcards)
- `api.sovereignhealth.io` stays as a deprecated alias for BC; add noindex if not already

## Changes to frontend (`src/lib/api.ts`)

- Lines 60-62 currently hardcode `app.sovereignhealth.io` -> `https://api.sovereignhealth.io` and `demo.sovereignhealth.io` -> `https://api-demo.sovereignhealth.io`. Change these to `return ''` (same-origin) so the frontend hits the path-mount instead.
- Keep the cross-origin fallback branch for `.onion` and any other edge domains.

## Acceptance

- `app.sovereignhealth.io/api/v1/health` -> 200 JSON (new path-mount works)
- `api.sovereignhealth.io/health` -> 200 JSON (legacy alias still works)
- Frontend login on `app.sovereignhealth.io` works with no CORS preflight in DevTools Network tab
- `app.sovereignhealth.io/admin` and `/settings` render the frontend page (Accept-header fix works)
- Existing SHI users on app.sovereignhealth.io see no regressions
