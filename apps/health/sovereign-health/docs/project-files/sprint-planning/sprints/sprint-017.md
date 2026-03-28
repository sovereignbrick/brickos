# Sprint 017 -- Security Remediation & Dependency Hardening

**Started:** 2026-03-28
**Duration:** 1 day (2026-03-28)
**Goal:** Remediate Dependabot vulnerabilities, fix ntfy DNS IP exposure, complete OpenVAS scan when feeds ready, and add vegan/Mediterranean reference ranges.

## Context

Sprint 016 shipped v0.29.1 with security tooling (GitHub security, OpenVAS setup). OpenVAS feeds are still syncing. Sprint 017 focuses on acting on security findings: Dependabot's 38 vulnerabilities, ntfy DNS exposure, and OpenVAS results when available.

## Sprint Backlog

### P0 -- Security Remediation

| # | Title | Points | Area |
|---|-------|--------|------|
| #280 | Dependabot vulnerabilities (5 high, 28 moderate, 5 low) | 8 | Dependencies |
| | Sub: cargo audit + cargo deny | 3 | Rust |
| | Sub: pnpm audit --fix | 3 | Node |
| | Sub: GitHub Actions version bumps | 2 | CI |
| #281 | ntfy DNS proxy fix (Cloudflare) | 2 | Infrastructure |
| #273 | OpenVAS scan + remediation (when feeds ready) | 8 | Security |
| | Sub: Run scan, download reports | 3 | Scan |
| | Sub: Port 8080 + SSH hardening | 2 | VPS |
| | Sub: Document findings | 3 | Docs |
| | **Security Subtotal** | **18** | |

### P1 -- Feature

| # | Title | Points | Area |
|---|-------|--------|------|
| #270 | Vegan + Mediterranean reference ranges | 5 | Backend |
| | Sub: Migration for standard_vegan (7 markers) | 2 | DB |
| | Sub: Migration for standard_mediterranean (3 markers) | 1 | DB |
| | Sub: Update resolve_protocol_context() | 2 | Rust |
| | **Feature Subtotal** | **5** | |

### P2 -- Deferred

| # | Title | Points | Area |
|---|-------|--------|------|
| -- | Port 8080 firewall (part of #273) | 1 | VPS |
| -- | SSH hardening (part of #273) | 1 | VPS |
| | **Deferred Subtotal** | **2** | |

## Velocity Budget

| Priority | Points |
|----------|--------|
| P0 -- Security | 18 pts |
| P1 -- Feature | 5 pts |
| P2 -- Deferred | 2 pts |
| **Total Planned** | **25 pts** |

## Dependency Graph

```
Parallel track A (immediate):
  #280 Dependabot vulns
    |-> cargo audit + cargo deny
    |-> pnpm audit --fix
    |-> GitHub Actions bumps
  #281 ntfy DNS fix (Cloudflare toggle)

Parallel track B (when feeds ready):
  #273 OpenVAS scan
    |-> Analyze findings
    |-> Port 8080 + SSH hardening
    |-> Document + reports

Sequential (after security):
  #270 Vegan + Mediterranean ranges
    |-> Migration
    |-> resolve_protocol_context()
```

## Execution Order

```
1. #280 Dependabot -- cargo audit, identify actionable Rust vulns      ~1 hr
2. #280 Dependabot -- pnpm audit, fix npm vulns                        ~1 hr
3. #280 Dependabot -- GitHub Actions version bumps                     ~30 min
4. #281 ntfy DNS -- Cloudflare proxy toggle + verify                   ~15 min
5. #273 OpenVAS -- check feed status, run scan if ready                ~30 min
6. #273 OpenVAS -- analyze + remediate (port 8080, SSH)                ~1 hr
7. #273 OpenVAS -- generate reports                                    ~30 min
8. #270 Vegan + Mediterranean ranges -- migration + code               ~1.5 hrs
9. Full test suite + staging deploy                                    ~1 hr
```

## Success Criteria

1. **Zero high-severity Dependabot alerts** remaining
2. **ntfy proxied through Cloudflare** -- origin IP no longer exposed
3. **OpenVAS scan completed** -- report generated (if feeds ready)
4. **Port 8080 closed externally** -- firewall rule applied
5. **SSH hardened** -- root login disabled
6. **Vegan + Mediterranean ranges** seeded and protocol context mapping works
7. **All tests pass** -- cargo test + pnpm build green

## Issues Deferred

| # | Title | Why |
|---|-------|-----|
| #268 | CLA, trademark, commercial page | Business decisions |
| #252 | Full EU compliance audit | Multi-sprint |
