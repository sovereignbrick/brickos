---
number: 224
title: "fix: Sovereign Link /r/{code} returns 404 on production despite route + data existing"
labels: [bug, sovereign-link]
milestone: infrastructure
---

## Description

`GET https://brickos.io/r/sh0xforr84` returns 404 on production, even though:
- nginx `/r/` route exists and proxies to port 8080
- `short_links` table contains the code: `sh0xforr84` → `https://app.sovereignhealth.io/?ref=0xforr84`
- Backend is v0.27.0 with `sovereign_link::configure_routes` registered
- Direct curl to `http://127.0.0.1:8080/r/sh0xforr84` on VPS also returns 404

## Investigation

The handler uses a fast-path for 10-char auto-generated codes (2-char prefix + 8-char hash). The code `sh0xforr84` is 10 chars, prefix `sh`, affiliate code `0xforr84`. The handler looks up the prefix in `app_prefixes` table and builds a redirect URL.

Possible causes:
1. `app_prefixes` table is empty or missing the `sh` prefix on production
2. The `short_links` migration ran but `app_prefixes` seed data wasn't applied
3. `LinkStore` data access returns `None` for the prefix lookup

## Steps to Reproduce

```bash
curl -I https://brickos.io/r/sh0xforr84
# Returns 404
```

## Resolution

**Not a bug.** The redirect handler only matches GET requests. Testing with `curl -sI` (HEAD method) returned 404, but `curl -X GET` returns 301 correctly. Browsers always use GET for link navigation — short links work in production.

Minor improvement: add HEAD support to redirect handler for monitoring tools.
