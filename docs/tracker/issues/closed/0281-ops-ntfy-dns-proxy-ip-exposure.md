---
number: 281
github: 263
title: "ops: ntfy DNS record exposes VPS origin IP (DNS only, not Proxied)"
labels: [ops, security, infrastructure, priority-high]
milestone: privacy-and-security
---

## Description

The `ntfy.brickos.io` subdomain is configured as a Cloudflare "DNS only" A record pointing directly to the VPS IP (`72.61.154.115`). This bypasses Cloudflare's proxy and exposes the origin server IP address to anyone who resolves the subdomain.

Meanwhile, the primary `brickos.io` domain is correctly set to "Proxied" (orange cloud), hiding the origin IP behind Cloudflare's network.

## Risk

- Origin IP disclosure allows attackers to bypass Cloudflare's DDoS protection, WAF, and rate limiting by targeting the VPS directly
- Combined with open ports (e.g., port 8080 Docker iptables bypass), this increases the attack surface significantly
- Any DNS lookup of `ntfy.brickos.io` reveals the server IP, undermining the protection on all other proxied subdomains

## Decision

**Cloudflare proxy mode is NOT viable** for ntfy. Previously enabled and had to be deactivated because Cloudflare's free plan enforces ~100s timeouts on HTTP connections, which kills ntfy's Server-Sent Events (SSE) long-lived connections. Push notifications stop working.

**Solution: Cloudflare Tunnel** (see #282)

## Requirements

- [x] ~~Switch ntfy to Proxied~~ -- not viable, breaks SSE
- [ ] Implement Cloudflare Tunnel for ntfy (see #282)
- [ ] Audit all other DNS records for "DNS only" entries that may also expose the origin IP

## Notes

- ntfy uses Server-Sent Events (SSE) and WebSocket for push notifications
- Cloudflare free plan has ~100s timeout on proxied connections, breaking SSE
- Related: port 8080 firewall issue (Docker iptables bypass) compounds this exposure
