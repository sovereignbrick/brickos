---
github_number: 333
title: "fix: click tracking records empty country_code and referrer_domain"
milestone: infrastructure
labels: [fix, P2]
---

## Problem

The `short_link_clicks` table on staging shows empty strings for `country_code` and `referrer_domain` on all recorded clicks:

```
referrer_domain | country_code | visitor_hash                             | code
                |              | fe9d678d850c9d3ff9dd466a90205fb8c5163... | shdemo2026
                |              | d42e379e2ca4b3a05fc033fb8a2c001b3272f... | sht01h6ofv
```

## Expected

- `referrer_domain`: extracted from `Referer` header (e.g., "google.com")
- `country_code`: resolved from IP via GeoIP lookup or `CF-IPCountry` header (Cloudflare)

## Investigation Result

Code is correct -- `extract_click_meta()` in `redirect.rs:128-157` properly reads:
- `Referer` header -> parsed for domain
- `CF-IPCountry` header -> Cloudflare geo header
- `peer_addr()` -> SHA256 hashed for visitor_hash

Empty values are expected because:
- Direct browser visits have no `Referer` header
- `CF-IPCountry` requires Cloudflare proxy (staging uses direct nginx, not CF)
- Production behind Cloudflare will populate country_code automatically

**Status:** Not a code bug. Close when Cloudflare is enabled for brickos.io redirects.

## Files

- `apps/technology/sovereign-link/src/handlers/redirect.rs` - extract_click_meta (line 128)
- `apps/technology/sovereign-link/src/models.rs` - ClickMeta struct (line 55)
