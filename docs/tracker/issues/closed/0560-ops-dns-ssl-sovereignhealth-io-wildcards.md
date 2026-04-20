---
number: 560
title: "ops: DNS + LE wildcard certs for *.sovereignhealth.io and *.demo.sovereignhealth.io"
milestone: "Sprint 045 -- Domain Realignment"
labels: [ops, dns, ssl, p0, white-label]
created: 2026-04-19
priority: P0
estimate: 0.5d
blocked_by: []
parent: 559
phase: 1
---

Phase 1 of Design 025. Wildcard DNS + TLS so `{slug}.sovereignhealth.io` works end-to-end before the nginx blocks light up.

## DNS (Cloudflare, sovereignhealth.io zone)

- Add A record `*.sovereignhealth.io` -> VPS IP, proxy on (orange cloud)
- Add A record `*.demo.sovereignhealth.io` -> VPS IP, proxy OFF (grey cloud / DNS-only) -- CF free Universal SSL doesn't cover deeper wildcards per memory `feedback_cloudflare_universal_ssl_wildcard_depth.md`
- Keep existing specific records (`app`, `api`, `demo`, `api-demo`, `www-demo`, `dev`) -- they take priority over wildcard

## Cloudflare API token (for certbot DNS-01)

Current token (`certbot-brickos-dns01`, tracked in #555 for rotation) is scoped to brickos.io only. Two options:
- Extend the same token with `DNS:Edit` on sovereignhealth.io zone, OR
- Create a separate token `certbot-sovereignhealth-dns01` scoped to sovereignhealth.io only

Recommend **separate token** -- blast radius stays small if one leaks. Add to `/root/.secrets/cloudflare-sovereignhealth.ini` with perms 600.

## LE wildcard certs (DNS-01 via certbot-dns-cloudflare)

- `*.sovereignhealth.io` -- single-label wildcard
- `*.demo.sovereignhealth.io` -- deeper wildcard, same pattern as existing `*.demo.brickos.io`
- Cert paths: `/etc/letsencrypt/live/sovereignhealth.io/` and `/etc/letsencrypt/live/demo.sovereignhealth.io/`
- Renewal hook: `nginx -s reload` (existing hook should cover both)

## Acceptance

- `dig +short test.sovereignhealth.io` -> VPS IP (orange cloud, proxied)
- `dig +short test.demo.sovereignhealth.io` -> VPS IP (grey cloud, direct)
- `certbot certificates` shows both wildcard certs with 90-day expiry
- `certbot renew --dry-run` passes for both
- Existing certs (sovereignhealth.io, app, api, demo, api-demo) still present and valid
