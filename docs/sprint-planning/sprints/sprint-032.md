# Sprint 032 - Organization Management + AI Provider + Phase 2 GUI

**Started:** 2026-04-09
**Goal:** Org CRUD with licensing, AI provider profiles with failover, member management. Complete Platform GUI Phase 2.
**Milestones:** M14 (Org Management), M15 (AI Failover), M16 (Member + Branding)

---

## Sprint Backlog

### Priority 1 -- Org Management Foundation

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 1 | #0350 Org management CRUD (create, edit, list, parameters) | 5 | - |
| 2 | #0363 On-prem JWT licensing (generate, validate, revoke) | 3 | #1 |
| 3 | #0352 Member management (invite, roles, remove) | 4 | #1 |

### Priority 2 -- AI Provider

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 4 | #0359 AI provider profiles (default, failover, self-hosted) | 5 | - |
| 5 | #0359 Failover state machine (3 failures/5min, auto-recover) | 3 | #4 |

### Priority 3 -- Branding + Polish

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 6 | #0379 Fix login logo (investigate middleware cookie flow) | 2 | - |
| 7 | #0361 Org branding (logo upload, colors, JSON theme presets) | 3 | #1 |
| 8 | #0365 Compliance dashboard (GDPR, NIS2, CRA, AI Act status) | 2 | - |

### Priority 4 -- Phase 2 Routing (design doc 015)

| # | Issue | Pts | Blocked By |
|---|---|---|---|
| 9 | NEW: Cookie domain .brickos.io for cross-app auth | 2 | - |
| 10 | NEW: App switcher nav bar (shared header across apps) | 3 | #9 |
| 11 | NEW: /sovereignhealth/ path rewrite with session persistence | 2 | #9 |

---

## Dependency Graph

```
Layer 0 (no deps):
  #0350 Org management ──────────┐
  #0359 AI profiles              │
  #0379 Login logo fix           │
  #0365 Compliance dashboard     │
  NEW: Cookie domain             │
                                 │
Layer 1:                         │
  #0363 JWT licensing ───────────┤ (needs #0350)
  #0352 Member management ───────┤ (needs #0350)
  #0359 Failover state machine ──┤ (needs #0359 profiles)
  #0361 Org branding ────────────┘ (needs #0350)
                                 │
Layer 2:                         │
  NEW: App switcher nav ─────────┤ (needs cookie domain)
  NEW: /sovereignhealth/ session ┘ (needs cookie domain)
```

## Summary

| Milestone | Description | Issues | Points |
|---|---|---|---|
| M14 | Org Management | #0350, #0363, #0352 | 12 |
| M15 | AI Failover | #0359 (profiles + state machine) | 8 |
| M16 | Branding + Routing | #0379, #0361, #0365, 3x NEW | 14 |
| **Total** | | **11 items** | **34 pts** |

## Definition of Done

- [ ] BrickOS admin can create new organizations with parameters
- [ ] JWT license keys generated for on-prem orgs
- [ ] Org admin can invite/manage members with roles
- [ ] AI provider profiles configurable (default + failover)
- [ ] Auto-failover on 3 failures in 5min, auto-recover every 5min
- [ ] Compliance dashboard shows framework status
- [ ] Login logo correct on brickos.io domains
- [ ] All changes have E2E tests
- [ ] Staging + production deployed
