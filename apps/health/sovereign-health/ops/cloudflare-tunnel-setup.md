# Cloudflare Tunnel Setup for ntfy.brickos.io

## Purpose

Route ntfy traffic through a Cloudflare Tunnel so `dig ntfy.brickos.io`
no longer reveals the VPS origin IP (72.61.154.115).

## Current State

- ntfy runs as a Docker container on the VPS, bound to `127.0.0.1:2586`
- nginx proxies `ntfy.brickos.io:443` to `127.0.0.1:2586`
- DNS is a Cloudflare DNS-only A record pointing to `72.61.154.115`
- cloudflared v2026.3.0 is installed on the VPS

## Prerequisites

- cloudflared is installed (done)
- Cloudflare authentication (requires interactive browser login)

## Step 1: Authenticate cloudflared (interactive -- must be done from VPS directly)

SSH into the VPS and run:

```bash
cloudflared tunnel login
```

This opens a URL you must visit in a browser to authorize the brickos.io zone.
After auth, a cert is saved to `~/.cloudflared/cert.pem`.

## Step 2: Create the tunnel

```bash
cloudflared tunnel create ntfy-tunnel
```

Note the tunnel ID printed (e.g., `a1b2c3d4-...`). A credentials JSON file
is created at `~/.cloudflared/<TUNNEL_ID>.json`.

## Step 3: Write the config

```bash
mkdir -p /etc/cloudflared

cat > /etc/cloudflared/config.yml << 'CFEOF'
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: ntfy.brickos.io
    service: http://127.0.0.1:2586
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      tcpKeepAlive: 86400s
  - service: http_status:404
CFEOF
```

Replace `<TUNNEL_ID>` with the actual tunnel ID from step 2.

A template is also available in this repo at:
`ops/cloudflared-ntfy-config.yml`

## Step 4: Route DNS through the tunnel

```bash
cloudflared tunnel route dns ntfy-tunnel ntfy.brickos.io
```

This replaces the A record with a CNAME pointing to `<TUNNEL_ID>.cfargotunnel.com`.
The old A record for `ntfy.brickos.io` must be deleted first in the Cloudflare
dashboard if cloudflared does not auto-replace it.

## Step 5: Install and start as systemd service

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
systemctl status cloudflared
```

## Step 6: Remove nginx ntfy block (after tunnel is verified working)

The nginx server block for `ntfy.brickos.io` in
`/etc/nginx/sites-enabled/` is no longer needed once the tunnel handles
all traffic. However, keep it until verification is complete.

After tunnel is confirmed:

1. Remove the `server { server_name ntfy.brickos.io; ... }` blocks from nginx
2. Remove the HTTP-to-HTTPS redirect block for ntfy.brickos.io
3. Reload nginx: `nginx -t && systemctl reload nginx`
4. The Let's Encrypt cert for ntfy.brickos.io can be removed later:
   `certbot delete --cert-name ntfy.brickos.io`
   (Check that status.sovereignhealth.io does not share this cert first --
   it currently does, so get a separate cert for status first.)

## Step 7: Verify

```bash
# DNS should NOT return 72.61.154.115
dig ntfy.brickos.io +short
# Should show a *.cfargotunnel.com CNAME

# ntfy should still work
curl -d "tunnel-test" https://ntfy.brickos.io/test-topic

# Check tunnel status
cloudflared tunnel info ntfy-tunnel
```

## Rollback

If the tunnel breaks ntfy:

1. Stop cloudflared: `systemctl stop cloudflared`
2. In Cloudflare dashboard, delete the CNAME for ntfy.brickos.io
3. Re-add the A record: `ntfy.brickos.io` -> `72.61.154.115` (DNS-only)
4. nginx is still in place and will resume serving immediately

## Notes

- The tunnel handles TLS termination at Cloudflare's edge, so the connection
  from Cloudflare to the VPS is over the tunnel (encrypted), not via nginx TLS.
- ntfy uses WebSocket/SSE for subscriptions -- the config includes long
  keepalive timeouts to support this.
- status.sovereignhealth.io shares the same Let's Encrypt cert as ntfy.brickos.io.
  Do not delete that cert until status has its own.
