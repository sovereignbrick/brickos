# Sprint 015 - Stability, Security & Production Hardening

**Started:** 2026-03-27
**Duration:** 2 days (2026-03-27 to 2026-03-28)
**Goal:** Harden the v0.29.0 production release. Fix known bugs from RC testing, improve security posture, update dependencies, and stabilize monitoring.

## Context

Sprint 014 shipped a major architectural change (SSoT + AI credit pool) and was deployed to production as v0.29.0. This sprint focuses on stability and security rather than new features:
- Fix bugs found during RC testing that weren't addressed
- Update Rust dependencies with known security advisories
- Improve monitoring (Gatus/ntfy timestamps)
- Security tooling (GitHub Advanced Security, dependency scanning)
- Admin panel fixes

## Sprint Backlog

### P0 - Production Bugs (stability)

| # | Title | Points | Area |
|---|-------|--------|------|
| #258 | fix: admin panel - data access log empty, mobile menu, user card, pgAudit | 5 | Backend + Frontend |
| #257 | fix: Gatus/ntfy alerts - full datetime stamp and detailed error info | 3 | Ops |
| #256 | fix: PWA offline behavior - define and implement expected behavior | 5 | Frontend |
| #264 | feat: demo runtime calculated markers (same pipeline as production) | 2 | Backend |
| | **Bugs Subtotal** | **15** | |

### P0 - Security Hardening

| # | Title | Points | Area |
|---|-------|--------|------|
| #260 | ops: GitHub security tools - Advanced Security, Semgrep, Snyk, Trivy | 5 | CI/CD |
| #271 | ops: OpenVAS network security scan (OSI Layer 3-4) | 3 | Infrastructure |
| #211 | chore(deps): Bump sentry from 0.35.0 to 0.47.0 | 2 | Backend |
| #212 | chore(deps): Bump sentry-actix from 0.35.0 to 0.47.0 | 1 | Backend |
| #213 | chore(deps): Bump jsonwebtoken from 9.3.1 to 10.3.0 | 2 | Backend |
| #214 | chore(deps): Bump rand from 0.9.2 to 0.10.0 | 1 | Backend |
| | **Security Subtotal** | **14** | |

### P1 - Infrastructure & Monitoring

| # | Title | Points | Area |
|---|-------|--------|------|
| #266 | ops: pgAudit log forwarding to admin panel | 3 | Backend + Ops |
| | **Infra Subtotal** | **3** | |

## Velocity Budget

| Priority | Points |
|----------|--------|
| P0 - Production Bugs | 15 pts |
| P0 - Security Hardening | 14 pts |
| P1 - Infrastructure | 3 pts |
| **Total Planned** | **32 pts** |

Note: reduced scope (32 pts vs 54 in Sprint 014) per retro feedback - budget 30% for unplanned work.

## Dependency Graph

```
Independent (can run in parallel):
  #258 (admin panel fixes)
  #257 (Gatus/ntfy timestamps)
  #256 (PWA offline)
  #264 (demo runtime markers) - partially done in Sprint 014
  #260 (GitHub security tools)
  #271 (OpenVAS scan)

Sequential:
  #211 + #212 (sentry bump) -> test
  #213 (jsonwebtoken bump) -> test auth flows
  #214 (rand bump) -> test

Depends on security tools:
  #266 (pgAudit forwarding) - after #260 baseline
```

## Execution Order

```
Day 1 (2026-03-27):
  1. Dependency bumps (#211, #212, #213, #214)           ~2 hrs
  2. #258 Admin panel fixes (access log, mobile, cards)  ~3 hrs
  3. #257 Gatus/ntfy detailed timestamps                 ~1 hr
  4. #260 GitHub security tools setup                    ~2 hrs

Day 2 (2026-03-28):
  1. #256 PWA offline behavior                           ~3 hrs
  2. #264 Demo runtime markers (finish)                  ~1 hr
  3. #271 OpenVAS scan (staging first)                   ~2 hrs
  4. #266 pgAudit log forwarding                         ~2 hrs
  5. RC check + staging deploy                           ~30 min
```

## Success Criteria

1. **Admin panel functional** - data access log shows entries, mobile menu works
2. **Gatus alerts have timestamps** - ISO 8601 with timezone in every notification
3. **PWA offline defined** - service worker caches app shell, shows offline banner
4. **Dependencies updated** - sentry, jsonwebtoken, rand at latest versions
5. **GitHub security enabled** - Dependabot + secret scanning + at least one SAST tool
6. **OpenVAS scan completed** - staging report generated, critical findings addressed
7. **138+ tests pass** - no regressions from dependency updates

## Issues Deferred

| # | Title | Why |
|---|-------|-----|
| #268 | CLA, trademark, commercial page | Business decisions needed |
| #270 | Vegan + Mediterranean ranges | Needs MD review |
| #252 | EU regulatory compliance audit | Multi-sprint design work |
