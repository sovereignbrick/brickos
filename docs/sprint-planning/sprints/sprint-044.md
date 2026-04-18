# Sprint 044 -- White-Label Go-Live

**Start:** 2026-04-19
**Goal:** Full branded white-label deployment for first customer
**Previous:** Sprint 043 (v0.42.0, SHI Production Push)
**Estimated duration:** 10 working days (2 weeks)

## Phase 0: Carry-over Stabilization (Day 1-2)

No white-label dependencies. Can all be parallelized.

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| #540 | P1 | deploy.sh: chunked scp transfer | 0.25d | -- |
| #541 | P1 | deploy.sh: fix image name mismatch | 0.1d | -- |
| #542 | P2 | E2E: shared login session (rate limiter) | 0.4d | -- |
| #543 | P2 | Platform audit logs endpoint 404 | 0.25d | -- |
| #539 | P2 | Migrate load_tier_features to brickos.tier_features | 0.5d | -- |
| #490 | P3 | Licensing dead code cleanup items 2-8 | 0.4d | #539 |

## Phase 1: Infrastructure Foundation (Day 2-3)

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| #544 | P0 | Wildcard DNS + nginx for *.brickos.io | 0.5d | #540, #541 |

## Phase 2: Backend Org Resolution (Day 3-5)

Critical path. Strict dependency chain.

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| #545 | P0 | Domain-to-org resolution middleware | 0.6d | #544 |
| #546 | P0 | Org ID in JWT (login flow) | 0.5d | #545 |
| #547 | P0 | Public branding endpoint (unauthenticated) | 0.4d | #545 |

## Phase 3: Frontend Org Context (Day 5-7)

Can start with mocked API while Phase 2 finalizes.

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| #548 | P0 | OrgContext React provider | 0.6d | #547 |
| #549 | P0 | Org branding on login page | 0.4d | #548 |
| #550 | P1 | Org branding in main UI (nav, header, buttons) | 0.6d | #548 |

## Phase 4: Email + Data Isolation (Day 6-8)

Parallel with Phase 3 frontend work.

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| #551 | P1 | Per-org email templates | 0.75d | #545 |
| #552 | P1 | Org-scoped data isolation (RLS) | 1d | #546 |

## Phase 5: Stretch Goals (Day 8-10, carry to 045 if needed)

| # | P | Title | Est | Depends |
|---|---|-------|-----|---------|
| #553 | P2 | Practitioner dashboard | 1d | #552 |
| #554 | P3 | Per-org AI model override | 0.5d | #545 |
| #526 | P2 | brickos.io frontend (remaining) | 0.5d | #544 |

## Parallelization

```
Week 1:
  Track A (infra):   #540 -> #541 -> #544
  Track B (backend): #539 -> #490
  Track C (fixes):   #542 | #543

  Track A (backend): #544 -> #545 -> #546 | #547
  Track B (frontend): #548 (start with mocks)
  Track C (email):   #551 (after #545)

Week 2:
  Track A (frontend): #548 -> #549 -> #550
  Track B (backend):  #552 (after #546)
  Track C (stretch):  #553 -> #554
```

## Total Effort

| Phase | Issues | Hours |
|-------|--------|-------|
| Phase 0: Carry-overs | 6 | 15h |
| Phase 1: DNS/Nginx | 1 | 4h |
| Phase 2: Backend resolution | 3 | 12h |
| Phase 3: Frontend context | 3 | 13h |
| Phase 4: Email + data | 2 | 14h |
| Phase 5: Stretch | 3 | 12h |
| **Committed (P0-P4)** | **15** | **58h** |
| **Stretch (P5)** | **3** | **12h** |

## Definition of Done -- White-Label Go-Live

1. Admin creates org with branding via `/platform/orgs`
2. Admin assigns `{slug}.brickos.io` subdomain
3. `{slug}.brickos.io/login` shows org's logo, colors, name
4. Users log in and get JWT scoped to that org
5. All UI reflects org branding (nav, buttons, colors)
6. Transactional emails carry org branding
7. Users in org A cannot see data from org B

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wildcard DNS breaks existing subdomains | High | Cloudflare specific records take priority; test with dummy subdomain first |
| RLS org_id backfill breaks individual users | Critical | `IS NULL` clause allows no-org users; comprehensive test before deploy |
| OrgSwitcher cookie conflicts with new OrgContext | Medium | Provider absorbs cookie state; OrgSwitcher writes through provider |
| deploy.sh changes break production mid-sprint | Critical | Test on staging first; keep legacy transfer as fallback flag |
