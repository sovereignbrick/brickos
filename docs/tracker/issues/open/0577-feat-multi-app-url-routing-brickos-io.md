---
number: 577
title: "feat: multi-app URL routing on brickos.io tenant subdomains"
milestone: "Sprint 047 -- Multi-App URL Routing"
labels: [feat, architecture, frontend, nginx, p1, multi-app]
created: 2026-04-20
priority: P1
estimate: 3.5d
blocked_by: [568]
parent: design-027
---

User feedback 2026-04-20 (during Sprint 046 staging verification):

> "the /dashboard url needs to get changed. into e.g. sovereign-health as
> dashobard is not speaking for himselft and it is not clear which app will
> get opened. Not all brickos apps have their own domain like sovereignhealth.io
> so they need to be accessible via the brickos.io context e.g.
> https://test-clinic.demo.brickos.io/sovereign-health,
> https://test-clinic.demo.brickos.io/sovereign-link"

## Scope

See Design 027 for the full plan. Summary:

- Move SHI end-user routes from root to `/sovereign-health/*`
- Add 308 redirects from old root paths to new prefixed paths (90-day window then remove)
- Rewrite sovereignhealth.io nginx so the branded domain continues to work (`/(.+)` -> `/sovereign-health/$1` internal rewrite)
- Update plane gate END_USER_ONLY_PREFIXES, cross-plane profile menu link, login post-login landing
- Update Design 025 + 026 + RC checklist

Five phases, ~3.5 dev-days.

## Why deferred from Sprint 046

Sprint 046's charter was "merge /org into /platform + rename user-facing labels". Moving the entire SHI end-user route tree is a different scope: it's a substantial route refactor across 30+ files plus nginx/redirect/plane-gate updates. Shipping it as part of Sprint 046 would have doubled the RC surface area and delayed v0.43.0.

Sprint 046 ships the admin-home consolidation and the naming consistency. Sprint 047 ships the URL routing so v0.44.0 (or next) carries "clear per-app URLs" as a single coherent release.

## Acceptance

Per Design 027 §Acceptance.

## Open questions

1. Tenant root `/` behaviour: redirect to /platform, /sovereign-health, or a launcher grid?
2. `/settings` (brickos master) vs `/sovereign-health/settings` (SHI-specific) -- confirm the split survives review.
3. Session scoping stays per-plane (two cookies). No app-level session claim needed.
