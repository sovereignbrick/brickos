---
number: 567
title: "docs: update Design 015, Design 021, ADR-049 for domain realignment"
milestone: "Sprint 045 -- Domain Realignment"
labels: [docs, p2, white-label]
created: 2026-04-19
priority: P2
estimate: 0.25d
blocked_by: []
parent: 559
phase: 6
---

Phase 6b of Design 025. Existing design docs are ambiguous about which parent domain hosts the SHI end-user app. Update them to match the rule decided 2026-04-19.

## Files

### `docs/design/015-*` (Unified App Routing)

- Update the domain matrix to explicitly split planes:
  - brickos.io = admin plane (platform admin + org admin)
  - sovereignhealth.io = SHI end-user app (including `*.sovereignhealth.io` for white-label)
- Remove or deprecate the "app.brickos.io/health/" path-routing for SHI (if it was ever canonical; confirm by grep)

### `docs/design/021-*` (SHI White-Label Architecture)

- §10b: restate that BrickOS admin UI lives on brickos.io (unchanged), but SHI end-user app on org subdomains lives on sovereignhealth.io
- §15.4: rewrite white-label subdomain examples from `acme.brickos.io` to `acme.sovereignhealth.io`; keep custom domain section unchanged

### `docs/design/ADR-049` (White-Label Org Resolution Architecture)

- Domain resolution priority list: `{slug}.sovereignhealth.io` and `{slug}.demo.sovereignhealth.io` are the canonical org subdomains; remove `{slug}.brickos.io` / `{slug}.demo.brickos.io` from the priority list
- Update the "known platform domains" list to include the specific sovereignhealth.io subdomains (`app`, `api`, `demo`, `api-demo`, `www-demo`, `dev`) so the wildcard doesn't swallow them

### Cross-reference Design 025

Each of the three docs should gain a "Superseded by Design 025 for white-label domain choice" note at the top.

## Acceptance

- `grep -ri "{slug}.brickos.io\|acme.brickos.io" docs/design/ docs/tracker/` returns zero hits outside of #559 and #565 (the decommission tracking)
- `grep -ri "sovereignhealth.io" docs/design/` shows the new domain rule in 015, 021, ADR-049
- Design 015, 021, ADR-049 each link to Design 025
- Sprint 044 artifacts (`project_sprint044_day1_completed.md` history entry) left untouched -- it's historical
