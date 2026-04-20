---
number: 575
title: "docs: update Design 014/015/021 to point at Design 026 + merge Sprint 045+046 RC checklist"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [docs, p1, rc]
created: 2026-04-20
priority: P1
estimate: 0.5d
blocked_by: [570, 571, 572, 573]
parent: design-026
phase: E
---

Phase E of Design 026. Docs that predate the unified admin home should point at Design 026 as the canonical admin-nav spec. Sprint 045 RC checklist (#566) was paused; Sprint 046 ship combines 045 + 046 into one production release.

## Scope

### 1. Design docs

- `docs/design/014-brickos-platform-gui.md` -- amend: "/platform is the unified admin home per Design 026"
- `docs/design/015-brickos-unified-app-routing.md` -- already amended for two planes (Design 025); add "admin home = /platform, Design 026 covers the sidebar IA"
- `docs/design/021-shi-white-label-architecture.md` -- §10b (admin setup interface): link to Design 026 for the sidebar layout
- `docs/adr/049-white-label-org-resolution.md` -- cross-link

### 2. Memory

- `reference_brickos_domains.md` -- add "Admin home is `/platform` on both admin-plane subdomains (`app.brickos.io` + `{slug}.brickos.io`). End-user app at `/dashboard` on end-user plane."

### 3. Combined RC checklist

Re-open `docs/releases/sovereign-health/v0.42.0/2026-04-19_manual-testing-checklist_sprint-044-rc1.md` and:
- Rename to `2026-04-XX_manual-testing-checklist_sprint-045-046-rc1.md` (or edit header only per user preference)
- Version label -> v0.43.0
- Restructure into four major sections (A-D already planned in #566):
  - **A. Admin plane** (`*.demo.brickos.io`): /platform, /platform/org/*, /platform/apps/*, profile menu
  - **B. End-user plane** (`*.demo.sovereignhealth.io`): /dashboard, /measurements, etc. + profile menu "Admin" link
  - **C. Cross-plane**: PlaneGate redirects, cookie scoping
  - **D. Platform (no-org) fallback**: `demo.brickos.io/platform`, `app.sovereignhealth.io`
- Add PWA / mobile section: install, offline, narrow viewport
- Add "no SHI strings" grep check
- Add "/admin -> 308 /platform" redirect check

### 4. Release notes draft

Create `docs/releases/sovereign-health/v0.43.0/RELEASE_NOTES.md`:
- Two-plane architecture (Design 025)
- Unified admin home (Design 026)
- Per-tenant org subdomains on both planes
- App naming consistency (Sovereign Health, Sovereign Link, Sovereign Voice)
- Plane-aware cookie + plane-gate redirects
- Deprecation: `/admin` removed (no BC window; no user impact since no customers on v0.42)

## Acceptance

- Design 014, 015, 021, ADR-049 all cross-link Design 026
- `reference_brickos_domains.md` updated
- RC checklist restructured + items re-tested on staging
- v0.43.0 RELEASE_NOTES.md drafted
