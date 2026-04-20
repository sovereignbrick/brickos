---
number: 572
title: "chore: hard-remove /admin legacy tabs (Phase C)"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [chore, cleanup, p1, admin]
created: 2026-04-20
priority: P1
estimate: 0.5d
blocked_by: [571]
parent: design-026
phase: C
---

Phase C of Design 026. Per user decision 2026-04-20 (no users, no bookmarks), `/admin` is removed outright -- no redirect window, no BC shim. Any remaining admin-only content is absorbed into `/platform/*` first.

## Scope

### 1. Audit `/admin` tabs vs `/platform` equivalents

| `/admin` tab | `/platform` home | Action |
|---|---|---|
| dashboard | /platform (Overview) | Delete |
| users | /platform/users | Delete |
| settings | /platform/settings | Delete |
| payments | /platform/billing | Delete |
| promotions | /platform/promotions | Delete |
| affiliates | /platform/affiliates | Delete |
| links | /platform/links | Delete |
| revenue | /platform/revenue | Delete |
| content-app | /platform/content/app | Delete |
| content-web | /platform/content/web | Delete |
| content-strings | /platform/content/strings (stub) | Delete |
| newsletter | /platform/newsletter | Delete |
| ai-usage | /platform/ai/usage | Delete |
| audit-logs | /platform/audit | Delete |
| metrics | ? | Investigate; move if unique, delete otherwise |
| contact | /platform/contact | Delete |
| website | ? | Investigate; move if unique |

### 2. Remove the routes

- `rm -r src/app/admin/`
- Delete `src/components/admin/` if no imports remain outside of the /platform tree
- Remove `/admin` from the frontend nav / any hard-coded links
- Delete `admin.tabs.*` entries from locale JSON

### 3. Add a hard-remove redirect (no BC)

`next.config.ts` redirects:
```ts
{ source: '/admin/:path*', destination: '/platform', permanent: true }
```

A 308 permanent redirect is the correct response for a removed route. Browsers that cached the old path get bounced to /platform once.

### 4. Grep sweep

- `grep -rIn "/admin" src/ public/` -- ensure no internal links remain
- Check that error / 404 pages don't mention `/admin`

## Acceptance

- `curl https://test-clinic.demo.sovereignhealth.io/admin` returns 308 to `/platform`
- `ls src/app/admin` returns "no such file"
- No occurrences of `/admin` as a link or route in the frontend source (except tests that assert the redirect)
- All previously-admin functionality reachable from `/platform`
