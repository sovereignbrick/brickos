---
number: 282
github_number: 497
github: 264
title: "ops: Cloudflare Tunnel for ntfy to hide VPS origin IP"
labels: [ops, security, infrastructure, priority-high]
milestone: privacy-and-security
---

## Description

Install `cloudflared` on the VPS and create a Cloudflare Tunnel for `ntfy.brickos.io`. This proxies ntfy traffic through Cloudflare's network without the SSE timeout issues that regular Cloudflare proxy mode causes.

## Why

- The ntfy A record currently exposes the VPS origin IP (72.61.154.115) to anyone via DNS lookup
- Regular Cloudflare proxy (orange cloud) was previously tried and broke ntfy -- free plan enforces ~100s HTTP timeouts which kills SSE long-lived connections
- Cloudflare Tunnels bypass this limitation: traffic flows through a persistent outbound connection from the VPS to Cloudflare, with no timeout restrictions on SSE/WebSocket

## How Cloudflare Tunnel Works

1. `cloudflared` runs on the VPS as a daemon
2. It establishes an outbound connection to Cloudflare's edge
3. Cloudflare routes `ntfy.brickos.io` traffic through the tunnel
4. No inbound ports needed, no A record pointing to VPS IP
5. SSE and WebSocket work without timeout issues

## Implementation Steps

- [ ] Install `cloudflared` on VPS
  ```bash
  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb
  ```
- [ ] Authenticate with Cloudflare
  ```bash
  cloudflared tunnel login
  ```
- [ ] Create a tunnel
  ```bash
  cloudflared tunnel create ntfy-tunnel
  ```
- [ ] Configure tunnel to route to local ntfy service
  ```yaml
  # /etc/cloudflared/config.yml
  tunnel: <TUNNEL_ID>
  credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

  ingress:
    - hostname: ntfy.brickos.io
      service: http://localhost:2586
    - service: http_status:404
  ```
- [ ] Create DNS route (replaces the A record)
  ```bash
  cloudflared tunnel route dns ntfy-tunnel ntfy.brickos.io
  ```
- [ ] Remove old A record for `ntfy.brickos.io` in Cloudflare dashboard
- [ ] Install as systemd service
  ```bash
  cloudflared service install
  systemctl enable cloudflared
  systemctl start cloudflared
  ```
- [ ] Verify ntfy push notifications work end-to-end
- [ ] Verify deploy.sh ntfy pre-flight checks still pass
- [ ] Update `.env.staging` and `.env.monitoring` if ntfy URL changes

## Verification

- [ ] `dig ntfy.brickos.io` no longer returns 72.61.154.115 (should return Cloudflare IP)
- [ ] ntfy push notifications work (test from deploy script)
- [ ] SSE connections stay alive for >100 seconds
- [ ] `cloudflared tunnel info` shows healthy connection

## References

- Issue #281: ntfy DNS record exposes VPS origin IP
- Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
