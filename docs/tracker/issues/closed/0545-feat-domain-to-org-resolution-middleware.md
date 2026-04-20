---
number: 545
title: "feat: domain-to-org resolution middleware (Host header -> org_id)"
milestone: "Sprint 044 -- White-Label Go-Live"
labels: [feature, backend, p0, white-label]
created: 2026-04-18
priority: P0
estimate: 0.6d
blocked_by: [544]
---

Create actix-web middleware that reads the Host header, looks up the org
by subdomain slug or custom domain, and attaches OrgContext to the request.

## Implementation

- New: `src/middleware/org_resolver.rs`
- OrgContext { org_id: Option<Uuid>, org_slug: Option<String>, branding: Option<Value> }
- Resolution order: (1) {slug}.brickos.io -> organizations.slug, (2) custom domain -> domain_mappings, (3) known platform domains -> None
- In-memory cache with 5-minute TTL
- Attach to request extensions

## Acceptance

- `Host: testclinic.brickos.io` resolves to org context
- Platform domains (app.brickos.io, demo.brickos.io) -> no org context
- Unknown domains -> 404 "Organization not found"
- <1ms added latency (cache hit)
