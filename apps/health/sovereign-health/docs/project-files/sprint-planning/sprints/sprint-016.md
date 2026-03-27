# Sprint 016 -- Security Audit, Remediation & Production Bug Fixes

**Started:** 2026-03-28
**Duration:** 2 days (2026-03-28 to 2026-03-29)
**Goal:** Run the first OpenVAS security audit, remediate findings, fix production bugs from v0.29.1 testing, and harden the VPS infrastructure.

## Context

Sprint 015 shipped v0.29.1 with security tooling (GitHub security, OpenVAS setup, dependency updates). Sprint 016 uses those tools to actually audit the infrastructure, fix what they find, and verify production stability through thorough manual testing.

## Sprint Backlog

### P0 -- OpenVAS Security Audit

| # | Title | Points | Area |
|---|-------|--------|------|
| #273 | OpenVAS vulnerability scan + compliance audit + remediation | 8 | Security |
| | Sub: Run full vulnerability scan | 2 | Scan |
| | Sub: Run CIS compliance audit | 2 | Scan |
| | Sub: Remediate port 8080 exposure (UFW rule) | 1 | VPS |
| | Sub: Harden SSH (disable root login, key-only) | 1 | VPS |
| | Sub: Document findings + generate reports | 2 | Docs |
| | **Security Audit Subtotal** | **8** | |

### P0 -- Production Bug Fixes

| # | Title | Points | Area |
|---|-------|--------|------|
| #272 | Production bug hunt for v0.29.x | 8 | All |
| | Sub: Auth flows (register, login, MFA) | 1 | Auth |
| | Sub: Dashboard + demo profiles + calculated markers | 1 | Frontend |
| | Sub: Measurements (add, templates, history, trends) | 1 | Backend + Frontend |
| | Sub: Dr. Alex (chat, quota, scroll, import) | 1 | Backend + Frontend |
| | Sub: Settings (all tabs, consent, reference ranges) | 1 | Frontend |
| | Sub: Admin panel (access log, users, pgAudit) | 1 | Backend + Frontend |
| | Sub: Website + PWA (pricing, offline, install) | 1 | Frontend |
| | Sub: Fix any bugs found | 1 | All |
| | **Bug Fix Subtotal** | **8** | |

### P1 -- Log Analysis & Monitoring

| # | Title | Points | Area |
|---|-------|--------|------|
| -- | Review pgAudit logs for anomalies | 2 | Ops |
| -- | Review application error logs + Sentry | 2 | Ops |
| -- | Review Gatus alert history | 1 | Ops |
| | **Log Analysis Subtotal** | **5** | |

### P2 -- Deploy Fixes

| # | Title | Points | Area |
|---|-------|--------|------|
| -- | Fix deploy.sh version assertion for new staging behavior | 1 | Ops |
| -- | Sync Gatus config to VPS (timestamp templates) | 1 | Ops |
| | **Deploy Subtotal** | **2** | |

## Velocity Budget

| Priority | Points |
|----------|--------|
| P0 -- Security Audit | 8 pts |
| P0 -- Production Bugs | 8 pts |
| P1 -- Log Analysis | 5 pts |
| P2 -- Deploy Fixes | 2 pts |
| **Total Planned** | **23 pts** |

Reduced scope (23 pts) -- audit/remediation is inherently unpredictable.

## Dependency Graph

```
Day 1:
  #273 OpenVAS scan (once feeds synced)
    |-> Analyze findings
    |-> Remediate port 8080 + SSH
  #272 Production bug hunt (parallel)
    |-> Fix bugs found

Day 2:
  #273 Compliance audit
    |-> Document results
  Log analysis (pgAudit, Sentry, Gatus)
  Deploy fixes
  Final reporting
```

## Execution Order

```
Day 1 (2026-03-28):
  1. OpenVAS vulnerability scan (automated, ~30 min)        ~1 hr
  2. Production bug hunt (manual testing)                    ~3 hrs
  3. Analyze scan findings, prioritize                       ~1 hr
  4. Remediate: port 8080 UFW rule on VPS                   ~30 min
  5. Remediate: SSH hardening on VPS                         ~30 min
  6. Fix production bugs found                               ~2 hrs

Day 2 (2026-03-29):
  1. OpenVAS compliance audit (CIS Ubuntu)                   ~1 hr
  2. Re-scan to verify remediations                          ~30 min
  3. Log analysis (pgAudit, app logs, Sentry, Gatus)         ~2 hrs
  4. Fix deploy.sh version assertion                         ~30 min
  5. Sync Gatus config to VPS                                ~30 min
  6. Generate final reports (PDF + markdown)                  ~1 hr
  7. Staging deploy + RC check                               ~30 min
```

## Success Criteria

1. **OpenVAS scan completed** -- PDF report generated, all findings classified
2. **Zero Critical findings** -- any critical issues remediated same day
3. **Port 8080 closed** -- external access blocked via firewall
4. **SSH hardened** -- root login disabled, password auth disabled
5. **Production bug-free** -- all user flows tested, bugs fixed
6. **Compliance audit run** -- CIS benchmark results documented
7. **Log analysis clean** -- no anomalies in pgAudit, app logs, Sentry
8. **Reports archived** -- all scan results in docs/releases/v0.29.1/

## Issues Deferred

| # | Title | Why |
|---|-------|-----|
| #268 | CLA, trademark, commercial page | Business decisions |
| #270 | Vegan + Mediterranean ranges | Needs MD review |
| #252 | Full EU compliance audit | Multi-sprint, Design 033 Phase 2-3 |
