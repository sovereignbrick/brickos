# Sprint 029 - Stabilize, Ship Standalone, White-Label Ready

**Started:** 2026-04-07
**Goal:** Ship Sovereign Link standalone to Docker Hub + Start9, and prepare the platform for first white-label organization partner.
**Milestones:** M4 (Platform Stabilization), M5 (Sovereign Link Standalone Ship), M6 (White-Label Ready)

---

## Dependency Analysis

```
Layer 0: Platform Fixes (no dependencies, unblocks everything)
  #339 Backfill personal orgs
  #340 Fix ALTER DATABASE CURRENT
  #344 Post-deploy smoke hook
  #337 npm dependency bump
         |
         v
Layer 1: Shared Infrastructure (unblocks both standalone and white-label)
  NEW  Extract brickos-auth shared crate
  NEW  Platform crate unit tests
  #342 Sovereign Voice unit tests
         |
         +-----------+------------------+
         |                              |
         v                              v
Layer 2a: Standalone Ship          Layer 2b: White-Label Foundation
  #341 NIP-89 WebSocket relay       NEW  White-label org branding
  NEW  Start9 .s9pk build           NEW  Custom domain mapping
  NEW  Start9 Tor auto-discovery    NEW  Org admin panel (web UI)
  NEW  Custom domains (standalone)  NEW  Org onboarding wizard
  NEW  Sovereign Link E2E tests
  NEW  Docker Hub publish
  NEW  GitHub Release + binary
         |                              |
         v                              v
Layer 3: Integration                Layer 3: First Partner
  NEW  Cross-app integration tests   NEW  Partner pilot setup
  #343 Encrypted profile migration   NEW  Partner documentation
  NEW  BCM/DR strategy document
```

## Sprint Plan (10 Days)

### Day 1 (Mon) - Platform Fixes
**Goal:** Clean up all known issues from Sprint 028. Unblocks everything.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 1 | #339 Backfill personal orgs for legacy users | 2 | M4 | - |
| 2 | #340 Fix ALTER DATABASE CURRENT in migration 001 | 1 | M4 | - |
| 3 | #344 Add post-deploy smoke test hook in deploy.sh | 2 | M4 | - |
| 4 | #337 npm dependency bump (SHI frontend) | 1 | M4 | - |

**Points:** 6

---

### Day 2 (Tue) - Shared Auth Crate
**Goal:** Extract brickos-auth as a shared Rust crate. This is the foundation for both standalone and platform auth.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 5 | Extract brickos-auth handlers to shared crate | 5 | M4 | Day 1 |
| 6 | Platform crate unit tests (brickos-auth, brickos-crypto, brickos-db) | 3 | M4 | #5 |

**Points:** 8

**Details for #5:**
- Move auth handlers (register, login, JWT, MFA, NIP-98, API key) from SHI api/src/handlers/auth.rs to crates/brickos-auth/
- Sovereign Link standalone already has its own auth (src/auth/). Align interfaces.
- Both SHI and Sovereign Link import from the shared crate
- No behavior change, just code reorganization

---

### Day 3 (Wed) - Testing Infrastructure
**Goal:** Close all P1 testing gaps. Every app has tests.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 7 | #342 Sovereign Voice unit tests (publisher, scheduler, config) | 3 | M4 | - |
| 8 | Sovereign Link E2E tests (curl-based standalone smoke) | 2 | M5 | - |
| 9 | Cross-app integration tests (Voice -> Link API) | 3 | M4 | #6 |

**Points:** 8

---

### Day 4 (Thu) - NIP-89 + Start9 Foundation
**Goal:** WebSocket relay publishing and Start9 package build.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 10 | #341 Add tokio-tungstenite for NIP-89 relay publishing | 3 | M5 | - |
| 11 | Start9 .s9pk build pipeline (start9-sdk tooling) | 3 | M5 | - |
| 12 | Start9 Tor auto-discovery of sibling .onion services | 3 | M5 | #11 |

**Points:** 9

---

### Day 5 (Fri) - Standalone Polish + Ship
**Goal:** Custom domains, Docker Hub, GitHub Release. Sovereign Link standalone is publicly available.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 13 | Custom domains in standalone mode (ln.mydomain.com) | 3 | M5 | - |
| 14 | Docker Hub publish (brickos/sovereign-link:0.2.0) | 2 | M5 | Day 4 |
| 15 | GitHub Release with static musl binary + changelog | 2 | M5 | Day 4 |
| 16 | Start9 marketplace submission | 2 | M5 | #11, #12 |

**Points:** 9

---

### Day 6 (Mon) - White-Label: Org Branding
**Goal:** Organizations can set their own logo, colors, and custom domain.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 17 | White-label branding per org (logo_url, primary_color, footer_text) | 3 | M6 | Day 1 |
| 18 | Custom domain mapping per org (nginx + SSL) | 5 | M6 | #17 |

**Points:** 8

**Details for #17:**
- Add branding JSONB column to organizations table (or create org_branding table)
- API: GET/PUT /api/v1/orgs/{org_id}/branding
- Sovereign Link web UI renders org branding when accessed via org namespace or custom domain
- BrickOS platform org has default branding

**Details for #18:**
- domain_mappings table: org_id -> custom_domain
- nginx server block template per custom domain
- Let's Encrypt SSL automation (certbot or acme.sh)
- Redirect handler resolves X-Org-Domain header to org_id

---

### Day 7 (Tue) - White-Label: Org Admin Panel
**Goal:** Org admins can manage their links, members, and view analytics through a web UI.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 19 | Org admin panel: dashboard (link count, click stats, member count) | 3 | M6 | Day 6 |
| 20 | Org admin panel: link management (list, create, edit, deactivate) | 3 | M6 | #19 |
| 21 | Org admin panel: member management (invite, roles, remove) | 3 | M6 | #19 |

**Points:** 9

**Details:**
- Server-rendered HTML (askama templates, same as standalone UI)
- Routes: /org/{slug}/dashboard, /org/{slug}/links, /org/{slug}/members
- Auth: brickos-auth JWT with org_id context
- Reuse BrickOS design tokens (dark theme)

---

### Day 8 (Wed) - White-Label: Onboarding + Reporting
**Goal:** New org creation wizard and cross-org reporting for platform admin.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 22 | Org onboarding wizard (create org, set branding, create first link) | 3 | M6 | Day 7 |
| 23 | Platform admin: cross-org reporting dashboard | 3 | M6 | Day 7 |
| 24 | Org affiliate setup flow (generate codes, view commission rates) | 3 | M6 | #21 |

**Points:** 9

---

### Day 9 (Thu) - Integration + Data Fixes
**Goal:** Encrypted data migration, BCM/DR strategy, remaining platform work.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 25 | #343 Encrypted user_profile app-level migration | 3 | M4 | #5 |
| 26 | BCM/DR strategy document | 2 | M4 | - |
| 27 | Per-app CI workflows (GitHub Actions for SL, Voice) | 3 | M4 | Day 3 |

**Points:** 8

---

### Day 10 (Fri) - RC Testing + Production Deploy
**Goal:** Full RC test suite, staging verification, production deploy for both milestones.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 28 | RC testing: platform smoke + DB + E2E + cross-app | - | All | Day 9 |
| 29 | Deploy to staging: platform DB + SHI backend | - | All | #28 |
| 30 | Manual testing on staging | - | All | #29 |
| 31 | Production deploy (follow deployment workflow) | - | All | #30 |
| 32 | Sprint artifacts: retro, release notes, version bump, ADRs | - | All | #31 |

**Points:** 0 (process, not code)

---

## Summary

| Milestone | Description | Days | Issues | Points |
|---|---|---|---|---|
| **M4** | Platform Stabilization | 1-3, 9 | 10 | 25 |
| **M5** | Sovereign Link Standalone Ship | 4-5 | 7 | 18 |
| **M6** | White-Label Ready | 6-8 | 8 | 29 |
| **RC** | Testing + Deploy | 10 | 5 | 0 |
| **Total** | | **10 days** | **30 issues** | **72 pts** |

## Critical Path

```
Day 1: Platform fixes (#339, #340, #344)
  -> Day 2: brickos-auth extraction (#5)
    -> Day 3: Cross-app tests (#9)
      -> Day 9: Encrypted migration (#343)

Day 4: NIP-89 + Start9 (#341, #11)
  -> Day 5: Ship standalone (#14, #15, #16)

Day 6: Org branding (#17)
  -> Day 7: Org admin panel (#19, #20, #21)
    -> Day 8: Onboarding + reporting (#22, #23, #24)
      -> Day 10: RC + deploy
```

Two parallel tracks after Day 3: Standalone (Days 4-5) and White-Label (Days 6-8) can run independently.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| brickos-auth extraction touches SHI backend heavily | Could break SHI auth | Keep SHI auth working via re-exports from shared crate. Run full SHI test suite after extraction. |
| Start9 SDK may have breaking changes | Start9 package won't build | Check start9-sdk version compatibility first. Have Docker-only fallback. |
| Custom domain SSL automation | Let's Encrypt rate limits, DNS propagation delays | Test with one domain first. Manual cert as fallback. |
| Org admin panel is significant UI work | May not fit in one day | Scope to read-only dashboard first. Edit functionality in follow-up sprint. |

## Definition of Done

- [ ] All existing tests pass (35 SL + SHI suite + platform smoke)
- [ ] New tests written for all new code
- [ ] Sovereign Link available on Docker Hub
- [ ] Sovereign Link available on Start9 marketplace (or submission pending)
- [ ] One white-label org can be created, branded, and manage their own links
- [ ] Platform smoke test passes on both staging and production
- [ ] All sprint artifacts complete (retro, release notes, ADRs, version bumps)
- [ ] Pushed to both GitHub and GitLab
