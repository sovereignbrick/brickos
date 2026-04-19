---
number: 556
title: "fix(nginx): path-mount collision on *.brickos.io wildcard (/admin, /settings, etc.)"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [bug, nginx, rc-blocker, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.5d
blocked_by: []
---

The `*.brickos.io` and `*.demo.brickos.io` wildcard nginx server blocks
proxy every request matching the backend regex (`/admin|/settings|/zones|...`)
to the backend on port 8080/8081. But the frontend ALSO has pages at those
same paths (`src/app/admin/`, `src/app/settings/`, `src/app/zones/`, etc.),
so browser navigation to e.g. `https://test-clinic.demo.brickos.io/admin`
hits the backend and returns JSON instead of rendering the page.

This is the same trap recorded in `feedback_nginx_path_mount_conflicts.md`
that previously broke `/admin` on sovereignhealth.io (commit 296a483 fixed
it there by removing path-mount entirely, since those domains use the legacy
`api.sovereignhealth.io` subdomain).

**Why it didn't bite production `app.brickos.io` before:** SHI is mounted at
`/sovereignhealth/` on the platform domain, so frontend routes are
`/sovereignhealth/admin`, `/sovereignhealth/settings`, which don't match the
regex. On the wildcard org subdomains, SHI is served at root, so the
collision surfaces.

## Reported symptoms (RC1 2026-04-19)

- `https://test-clinic.demo.brickos.io/admin` -- shows no content (backend returns empty / unauthorized JSON)
- `https://test-clinic.demo.brickos.io/settings` -- shows JSON `{"error": "unauthorized"}`
- Login and `/` root work fine (neither hits the regex)

## Conflicting paths (frontend page + backend scope both at root)

| Path | Frontend page | Backend scope |
|---|---|---|
| /admin | `src/app/admin/page.tsx` | `web::scope("/admin")` (Sprint 044 added #546+) |
| /settings | `src/app/settings/page.tsx` | `web::scope("/settings")` |
| /zones | `src/app/zones/[slug]/page.tsx` | `web::scope("/zones")` |
| /markers | `src/app/markers/[markerId]/page.tsx` | `web::scope("/markers")` |
| /measurements | `src/app/measurements/**` | `web::scope("/measurements")` |
| /trends | `src/app/trends/page.tsx` | `web::scope("/trends")` |
| /doctor-chat | `src/app/doctor-chat/**` | route handlers under root |
| /donate | `src/app/donate/page.tsx` | `web::scope("/donate")` |
| /billing | `src/app/billing/**` | billing handlers |
| /practitioner | `src/app/practitioner/page.tsx` | `web::scope("/practitioner")` (Sprint 044 #553) |

## Fix approach (RC unblock)

Add an `Accept: text/html` check to the regex-matched backend location
blocks in BOTH wildcard servers. If the request is a browser navigation
(Accept includes text/html), internally redirect to the frontend; otherwise
proxy to the backend as today.

```nginx
location ~ ^/(api|auth|admin|...|settings|...)(/|$) {
    if ($http_accept ~* "text/html") {
        rewrite ^ /__fe_navigate$uri last;
    }
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header ... (existing headers);
}

location /__fe_navigate {
    internal;
    rewrite ^/__fe_navigate(.*)$ $1 break;
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Org-Domain $host;
    ...
}
```

Rationale: browser navigation sends `Accept: text/html,application/xhtml+xml,...`;
fetch() calls send `Accept: application/json, */*` (our api.ts sends json
explicitly). Accept-header branching is a well-known nginx pattern and
doesn't require a frontend or backend code change.

Apply to:
- `*.brickos.io` server block (lines 245-290)
- `*.demo.brickos.io` server block (lines 299-349)

Leave `app.brickos.io` and `demo.brickos.io` untouched -- SHI is at
`/sovereignhealth/` there and doesn't hit the regex.

## Longer-term fix (out of scope for RC1)

Refactor the SHI backend to mount all non-`/api`, non-`/auth` handlers
under `/api/v1/` so the regex can shrink to `^/(api|auth|admin|health)(/|$)`
with no frontend collisions. Tracked separately.

## Acceptance

- `curl -H "Accept: application/json" https://test-clinic.demo.brickos.io/settings` -> backend JSON (existing behaviour)
- Browser navigation to `https://test-clinic.demo.brickos.io/settings` -> frontend settings page (Next.js renders)
- Browser navigation to `https://test-clinic.demo.brickos.io/admin` -> frontend admin page
- Frontend XHR calls (from settings page) to `/settings/profile` still reach backend
- Login still works
- No regression on `app.brickos.io` / `demo.brickos.io`
