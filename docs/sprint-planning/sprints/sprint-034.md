# Sprint 034 - Data Scoping Polish + Org App Enablement

**Started:** 2026-04-09
**Goal:** Complete remaining ADR 018 items (org app enablement, newsletter app_source), fix affiliate redirect loop, add editor workflow foundation.
**Version target:** v0.42.0
**Previous:** Sprint 033 (v0.41.0 -- platform data scoping Phases 1-4)

---

## Sprint Backlog

### Priority 1 -- ADR 018 Remaining Items

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 1 | #0393 Per-org app enablement (org_apps table, API, filter) | 5 | - |
| 2 | #0394 Newsletter app_source auto-detection + backfill | 3 | - |

### Priority 2 -- Bug Fixes

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 3 | #0378 Fix affiliate page redirect loop on expired session | 2 | - |
| 4 | #0333 Fix click tracking empty country_code and referrer_domain | 2 | - |

### Priority 3 -- Platform Enhancement

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 5 | #0337 AI-agnostic provider settings (org + platform level config) | 5 | #1 |
| 6 | #0366 Editor workflow for consumer data access with consent | 3 | #1 |

### Priority 4 -- Testing + Quality

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 7 | Fix pre-existing frontend test failures (date-format timezone, i18n threshold) | 2 | - |
| 8 | E2E suite expansion: org admin scoping tests (needs test org admin account) | 3 | #1 |

---

## Dependency Graph

```
Layer 0 (no deps):
  #0393 Org app enablement ──────────┐
  #0394 Newsletter app_source        │
  #0378 Affiliate redirect fix       │
  #0333 Click tracking fix           │
  #7 Fix pre-existing test failures  │
                                     │
Layer 1:                             │
  #0337 AI provider settings ────────┤ (needs org_apps for per-org config)
  #0366 Editor workflow ─────────────┤ (needs org_apps for role scoping)
  #8 E2E org admin tests ───────────┘ (needs org_apps + test account)
```

---

## Summary

| Priority | Description | Issues | Points |
|---|---|---|---|
| P1 | ADR 018 completion | #0393, #0394 | 8 |
| P2 | Bug fixes | #0378, #0333 | 4 |
| P3 | Platform enhancement | #0337, #0366 | 8 |
| P4 | Testing | #7, #8 | 5 |
| **Total** | | **8 items** | **25 pts** |

---

## Definition of Done

- [ ] org_apps table created, seeded, API endpoint working
- [ ] Org admin App filter shows only enabled apps
- [ ] Newsletter subscribers have app_source column with backfill
- [ ] Affiliate redirect loop fixed
- [ ] Click tracking records country_code and referrer_domain
- [ ] Pre-existing frontend test failures resolved
- [ ] E2E tests cover org admin scoping flow
- [ ] All changes have E2E tests
- [ ] Staging + production deployed
