---
number: 557
title: "fix(branding): login page shows SHI logo instead of uploaded org logo"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [bug, frontend, branding, rc-blocker, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.5d
blocked_by: []
---

On `https://test-clinic.demo.brickos.io/login`, the uploaded org logo is
not displayed -- the SHI default logo renders instead. The public branding
API (`/api/v1/org/branding`) was confirmed to return the correct
`logo_url` in the previous RC session, so the issue is frontend-side.

## Scope

Files to investigate:
- `src/contexts/OrgContext.tsx` (or wherever `OrgContextProvider` lives) -- does it fetch + expose `logo_url`?
- `src/app/login/page.tsx` -- does it read `logo_url` from the org context and render it?
- `useOrg()` hook / selector
- Any hardcoded default logo path in the login component that may mask the org logo

## Likely causes

- `logo_url` field name mismatch between backend JSON shape and frontend type
- Null/undefined check that falls through to the SHI default on empty string
- CSS z-index / display hiding the logo even when rendered
- Next.js image component rejecting the logo URL due to domain not in `next.config.ts` `images.remotePatterns`

## Repro

1. Open `https://test-clinic.demo.brickos.io/login` in a fresh browser tab
2. Open devtools -> Network -> filter "branding"
3. Confirm `/api/v1/org/branding` returns `{"data": {"branding": {"logo_url": "...", ...}}}`
4. Inspect the login page `<img>` element -- does it use the backend-provided URL or the SHI default?

## Acceptance

- Login page on org subdomain renders the uploaded org logo
- Login page on platform domain (`demo.brickos.io`) still renders SHI logo (default)
- No broken image (404) for custom logo URLs
- Logo displays at correct size / aspect ratio
