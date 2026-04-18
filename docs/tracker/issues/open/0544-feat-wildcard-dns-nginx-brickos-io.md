---
number: 544
title: "feat: wildcard DNS + nginx server block for *.brickos.io"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, infrastructure, p0, white-label]
created: 2026-04-18
priority: P0
estimate: 0.5d
blocked_by: [540, 541]
---

Any `{slug}.brickos.io` subdomain must resolve to the VPS and be routed
by nginx. Currently only specific subdomains are configured.

## Implementation

1. Cloudflare DNS: add `*.brickos.io` A record -> 72.61.154.115
2. nginx: add catch-all server block with `server_name *.brickos.io`
   AFTER specific server blocks (named hosts take priority)
3. Wildcard block proxies to frontend + passes `X-Org-Domain: $host` header
4. Backend routes use same regex proxy as app.brickos.io
5. SSL: existing Cloudflare origin cert covers `*.brickos.io`

## Acceptance

- `curl -H "Host: testorg.brickos.io" https://app.brickos.io/` returns frontend
- Existing subdomains (app, demo, api, status) unchanged
- nginx -t passes
