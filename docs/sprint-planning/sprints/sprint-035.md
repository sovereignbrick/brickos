# Sprint 035 - SHI Two-Pool Refactor + Production Deployment

**Started:** 2026-04-09
**Goal:** Complete SHI database split (two-pool architecture), verify on staging, deploy all elevation changes to production.
**Version target:** v0.42.0
**Previous:** Sprint 034 (org app enablement, affiliate fix, newsletter app_source, Sovereign Link decoupling)

---

## Sprint Backlog

### Priority 1 -- SHI Two-Pool Architecture (Layer by Layer)

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 1 | #393 PlatformPool newtype + dual-pool main.rs | 3 | - |
| 2 | #394 Auth middleware uses PlatformPool | 5 | #1 |
| 3 | #395 Billing handlers use PlatformPool | 5 | #1 |
| 4 | #396 Affiliate + licensing handlers use PlatformPool | 3 | #1 |
| 5 | #397 Settings, newsletter, admin handlers use PlatformPool | 5 | #1 |

### Priority 2 -- Remaining Elevation Items

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 6 | #385 SHI affiliate via service account API (decouple from SLI) | 3 | #2, #4 |
| 7 | #383 Rename Docker images to shi-api / shi-web | 2 | #5 |

### Priority 3 -- Testing + Production

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 8 | #398 Two-pool regression test suite | 5 | #5 |
| 9 | #399 Production database creation + migration | 3 | #8 |
| 10 | #400 Production deployment (SHI + SLI) | 3 | #9 |

---

## Dependency Graph

```
Layer 0 (no deps):
  #393 PlatformPool newtype + main.rs init ──────────┐
                                                     │
Layer 1 (needs PlatformPool registered):             │
  #394 Auth middleware ──────────────────────────────┤
  #395 Billing handlers ────────────────────────────┤
  #396 Affiliate + licensing ───────────────────────┤
  #397 Settings + admin + newsletter ───────────────┤
                                                     │
Layer 2 (needs all handlers converted):              │
  #385 Affiliate via service account ───────────────┤
  #383 Docker image rename ─────────────────────────┤
  #398 Regression test suite ───────────────────────┤
                                                     │
Layer 3 (needs staging verified):                    │
  #399 Production DB creation ──────────────────────┤
  #400 Production deployment ───────────────────────┘
```

---

## Approach

Each handler group (Layer 1) is deployed to staging and regression tested before the next group starts. This prevents cascading failures.

**Pattern for each handler file:**
1. Add `platform_pool: web::Data<PlatformPool>` parameter to handler function
2. Replace `pool.get_ref()` with `platform_pool.0` for platform table queries
3. Keep `pool.get_ref()` for health table queries (measurements, zones, markers, etc.)
4. Compile, clippy, test

**Key rule:** If a handler queries BOTH platform and health tables, it needs BOTH pools. The handler assembles results in Rust (no cross-database JOINs).

---

## Summary

| Priority | Description | Issues | Points |
|---|---|---|---|
| P1 | SHI two-pool refactor | #393-#397 | 21 |
| P2 | Remaining elevation | #385, #383 | 5 |
| P3 | Testing + production | #398-#400 | 11 |
| **Total** | | **10 items** | **37 pts** |

---

## Definition of Done

- [ ] SHI connects to both shi_staging and brickos_staging databases
- [ ] All 30+ handler files updated to use correct pool
- [ ] Auth flow works (login, register, MFA, token refresh)
- [ ] Billing flow works (subscribe, payment, invoice)
- [ ] Affiliate flow works (page load, click, conversion)
- [ ] Full E2E test suite passes on staging
- [ ] Docker images renamed to shi-api / shi-web
- [ ] Production databases created with verified data
- [ ] Production deployed and monitored 24h
- [ ] Old sovereign_health database marked read-only backup
