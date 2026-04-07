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

## Investigation Needed

1. Check `ClickMeta` extraction in `sovereign-link/src/handlers/redirect.rs` -- is it reading `Referer` header?
2. Check if the staging reverse proxy (nginx/Cloudflare) forwards `CF-IPCountry` or `X-Forwarded-For`
3. Direct browser visits won't have a `Referer`, but `country_code` should still be populated

## Files

- `apps/technology/sovereign-link/src/handlers/redirect.rs` - click recording (line 174)
- `apps/technology/sovereign-link/src/models.rs` - `ClickMeta` struct
