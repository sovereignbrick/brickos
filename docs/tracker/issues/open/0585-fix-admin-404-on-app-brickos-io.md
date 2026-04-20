---
number: 585
title: "fix(nginx): /admin returns 404 on app.brickos.io + demo.brickos.io (Sprint 046 redirect not hit)"
milestone: "Sprint 047 -- Multi-App URL Routing"
labels: [bug, nginx, p2]
created: 2026-04-20
priority: P2
estimate: 0.25d
---

v0.43.0 production deploy surfaced: `curl https://app.brickos.io/admin`
returns HTTP 404 (from backend), not the 308 redirect to `/platform`
that Sprint 046 #572 added to `next.config.ts`.

## Root cause

The Sprint 046 #556 Accept-header fix that routes browser navigation
(`Accept: text/html`) to the frontend was only applied to the wildcard
server blocks (`*.brickos.io`, `*.demo.brickos.io`,
`*.sovereignhealth.io`, `*.demo.sovereignhealth.io`). It was NOT
applied to the original `app.brickos.io` and `demo.brickos.io` blocks,
which still route any `/admin/...` regex match to the backend.

Backend has no root `/admin` route (only scoped sub-paths like
`/admin/users`), so the request returns 404.

## Impact

- Users with legacy `app.brickos.io/admin` bookmarks get 404 instead of
  being redirected to `/platform`
- No regression vs v0.42 (admin page was there; just no bookmarks to
  worry about since no external users)
- Low severity, not a ship-blocker

## Fix

Add the same Accept-header + RSC-header frontend-fallback in the
`app.brickos.io` production block (lines 5-69 of nginx-brickos-app.conf)
and the `demo.brickos.io` staging block (~123-193):

```nginx
location ~ ^/(api|auth|admin|...|r)(/|$) {
    if ($http_accept ~* "text/html") {
        rewrite ^ /__fe_navigate$uri last;
    }
    if ($http_rsc = "1") {
        rewrite ^ /__fe_navigate$uri last;
    }
    proxy_pass http://127.0.0.1:8080;
    ...
}

location /__fe_navigate {
    internal;
    rewrite ^/__fe_navigate(.*)$ $1 break;
    proxy_pass http://127.0.0.1:3000;
    ...
}
```

## Test

After fix:
- `curl -sS -H "Accept: text/html" https://app.brickos.io/admin` -> 308 /platform
- `curl -sS -H "Accept: application/json" https://app.brickos.io/api/v1/org/branding` -> 200 (unchanged)

## Acceptance

- `app.brickos.io/admin` + `demo.brickos.io/admin` redirect to /platform
- No regression on `app.brickos.io/api/*` XHRs (still 200/401 as appropriate)
