---
number: 555
title: "ops: rotate Cloudflare API token (cfut_x3k1Ws... leaked in chat)"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [ops, security, p1]
created: 2026-04-19
priority: P1
estimate: 0.25d
blocked_by: []
---

The Cloudflare API token `cfut_x3k1Ws...` (used by certbot DNS-01 for
`*.demo.brickos.io` and other wildcard renewals) was pasted in a Claude
session chat. Even though the chat is not public, best practice after any
token exposure is immediate rotation.

The token lives on the VPS at `/root/.secrets/cloudflare.ini` and is used
by certbot for DNS-01 challenges during Let's Encrypt renewals. Perms
are already `600` so the file itself is fine, just the token value needs
swapping.

## Rotation procedure

1. Cloudflare dashboard -> My Profile -> API Tokens
2. Find token named `certbot-brickos-dns01`
3. Click **Roll** -- this issues a new secret and invalidates the old one
4. Copy the new token (shown only once)
5. SSH to VPS, `nano /root/.secrets/cloudflare.ini`, replace the token line:
   ```
   dns_cloudflare_api_token = <NEW_TOKEN>
   ```
6. Save (perms already 600, no chmod needed)
7. Test renewal works end-to-end:
   ```bash
   certbot renew --dry-run --cert-name demo.brickos.io
   ```
8. Verify no other Cloudflare-related services are using the old token
   (grep for token usage on VPS):
   ```bash
   grep -rI "cfut_" /etc /root 2>/dev/null || true
   ```

## Acceptance

- Old token invalidated in Cloudflare dashboard
- New token pasted into `/root/.secrets/cloudflare.ini`
- `certbot renew --dry-run` passes for `demo.brickos.io`
- No stale references to old token on VPS
- Nothing else breaks (other services that use Cloudflare API still work)

## Notes

- Token scope is DNS:Edit on the brickos.io zone -- do not broaden scope on rotation
- Rotation should happen within 24h of exposure
- The chat also contained routine deploy output but no other credentials
