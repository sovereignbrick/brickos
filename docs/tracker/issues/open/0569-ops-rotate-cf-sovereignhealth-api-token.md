---
number: 569
title: "ops: rotate certbot-sovereignhealth-dns01 API token (pasted in chat)"
milestone: "Sprint 045 -- Domain Realignment"
labels: [ops, security, p1]
created: 2026-04-19
priority: P1
estimate: 0.25d
blocked_by: [568]
---

The Cloudflare API token for the `sovereignhealth.io` zone (issued
2026-04-19 by the user, named `certbot-sovereignhealth-dns01`, scoped
`DNS:Edit` on zone `sovereignhealth.io`) was pasted in a Claude chat
while bootstrapping Sprint 045 #560 wildcard certs. Same chat-exposure
risk as #555 (brickos.io token). Rotate after certs are installed and
renewal is proven.

The token is stored on the VPS at
`/root/.secrets/cloudflare-sovereignhealth.ini` (perms 600).

## Rotation procedure

1. Cloudflare dashboard -> My Profile -> API Tokens
2. Find `certbot-sovereignhealth-dns01` -> click **Roll** (invalidates old)
3. Copy the new token
4. SSH to VPS, edit `/root/.secrets/cloudflare-sovereignhealth.ini` (perms already 600)
5. Replace the `dns_cloudflare_api_token` line with the new value
6. Test: `certbot renew --dry-run --cert-name sovereignhealth.io-wildcard`
7. Test: `certbot renew --dry-run --cert-name demo.sovereignhealth.io`

## Acceptance

- Old token invalidated in Cloudflare
- New token in VPS secrets file
- Both `certbot renew --dry-run` commands pass
- No stale references to old token on VPS (grep `/root` `/etc` for `cfut_aQlPr`)

## Note

Rotate AFTER Sprint 045 prod ship (#568). Renewal cron runs twice daily;
rotating before production deploy could break cert renewal in the middle
of a deploy.
