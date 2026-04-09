---
number: 457
title: "design: SHI white-label architecture -- multi-tenant branding for first customer"
milestone: "horizon-tier"
labels: [design, platform-elevation, business]
created: 2026-04-10
priority: P1
sprint: 039
---

Design document 021: Full specification for white-labeling Sovereign Health for clinics, coaches, and enterprise customers.

## Questions to Answer
1. Deployment: shared multi-tenant vs dedicated instance?
2. Branding: logo, colors, favicon, app name, email templates
3. Domains: custom domain per customer? DNS setup?
4. Data isolation: org-scoped vs separate DB?
5. Pricing: reseller model? per-seat? flat fee?
6. Feature toggle: disable Dr. Alex, affiliate, etc. per customer?
7. Onboarding: self-service vs manual? minimum effort?
8. Current state: what's already built in SHI + BrickOS?
9. Gap analysis: what must be built before first customer?
10. Timeline: estimate to first white-label deployment

## Deliverable
- docs/design/021-shi-white-label-architecture.md
- Gap analysis with implementation items
- Some items may be implemented within Sprint 039
