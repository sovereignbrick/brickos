# Sprint 030 - Sovereign Link Hardening + Platform GUI Foundation

**Started:** 2026-04-08
**Goal:** Ship Sovereign Link production-ready AND lay the foundation for BrickOS Platform Admin GUI.
**Milestones:** M7 (Link Management UX), M8 (Analytics + Voice), M9 (Distribution), M10 (Platform GUI Foundation)

---

## Dependency Analysis

```
TRACK A: Sovereign Link Hardening          TRACK B: Platform GUI Foundation
─────────────────────────────              ──────────────────────────────

Layer 0:                                   Layer 0:
  #0340 Link expiration                      #0345 Website animation fix
  #0338 Vanity code UX                       #0367 Design system
  #0339 Voice URL shortening                 #0351 Org roles (5 roles)
         |                                   #0360 Platform tier system
         v                                          |
Layer 1:                                            v
  #0342 Link edit UI                         Layer 1:
         |                                     #0346 Admin layout + sidebar
         v                                            |
Layer 2:                                              v
  #0341 Click analytics dashboard            Layer 2:
  #0343 Start9 verification                    #0347 Platform dashboard
  #0344 Docker Hub CI                          #0349 Service health monitor
                                               #0353 Elevate users tab
```

Two independent tracks that can run in parallel.

---

## Sprint Plan (10 Days)

### Day 1 (Tue) - Link Expiration + Design System
**Goal:** Expired links redirect to main domain. Establish admin design tokens.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 1 | #0340 Link expiration enforcement (hot path + admin badge) | 3 | A | - |
| 2 | #0367 Admin GUI design system (tokens, components, patterns) | 2 | B | - |
| 3 | #0345 Website animation cross-browser fix | 1 | B | - |

**Points:** 6

---

### Day 2 (Wed) - Vanity Code UX + Org Roles
**Goal:** Vanity codes have real-time check + edit. 5 org roles defined in schema.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 4 | #0338 Vanity code UX (availability check, edit, tier fix) | 3 | A | - |
| 5 | #0351 Org roles (owner, tech admin, commercial admin, editor, consumer) | 3 | B | - |

**Points:** 6

**Details for #0351:**
- Add `org_role` to `org_members` table: owner, tech_admin, commercial_admin, editor, consumer
- Backend middleware extractors: `TechAdmin`, `CommercialAdmin`, `OrgOwner`
- JWT claims: add `org_id` + `org_role` when user has org context
- Frontend: `useOrgRole()` hook
- Tests: role-based API access enforcement

---

### Day 3 (Thu) - Sovereign Voice URL Shortening
**Goal:** Voice auto-shortens URLs in NOSTR notes via Sovereign Link service account.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 6 | #0339 Voice service account + config | 1 | A | - |
| 7 | #0339 URL detection + shortening in publisher.ts | 2 | A | #6 |
| 8 | #0339 Graceful fallback if SL unreachable | 1 | A | #7 |

**Points:** 4

---

### Day 4 (Fri) - Link Edit UI + Platform Tier System
**Goal:** Users can edit/deactivate links. Platform-wide tier system replaces SHI-specific tiers.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 9 | #0342 Link edit modal (target URL, title, is_active, expires_at) | 2 | A | #0338, #0340 |
| 10 | #0360 Platform tier system (two-layer, 5 tiers, app name mapping) | 3 | B | - |

**Points:** 5

**Details for #0360:**
- Create `tier_features` table: tier_slug + app_key + feature_key + limit_value
- Create `app_tier_names` table: app_key + tier_slug + display_name + price
- Migrate existing SHI tiers: Glimpse->T1, Focus->T2, Insight->T3, Clarity->T4, Horizon->T5
- Seed Sovereign Link + Voice tier names
- Feature check API: `GET /api/v1/tier/check?feature=vanity_codes&app=sovereign-link`
- Tests: limit enforcement, migration rollback, upgrade/downgrade

---

### Day 5 (Mon) - Admin GUI Layout + Sidebar
**Goal:** The foundational admin shell is live with role-based navigation.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 11 | #0346 Admin layout.tsx with role-based sidebar | 3 | B | #0351, #0367 |

**Points:** 3

**Details:**
- `/admin/layout.tsx`: role check, AdminContext provider, sidebar
- Sidebar sections: Overview, Manage, Commerce, Links, Content, AI, Ops, Security, Settings
- Each nav item filtered by `{ role, org_id, org_role }`
- BrickOS cube logo, dark theme, collapsible to 64px icons
- Breadcrumb trail component
- Empty shell pages for all routes (content added in subsequent days)

---

### Day 6 (Tue) - Click Analytics Dashboard
**Goal:** Org admins and platform admins see click analytics with time-series charts.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 12 | #0341 Analytics API (time-series, geo, referrers) | 3 | A | - |
| 13 | #0341 Analytics frontend (Recharts charts) | 2 | A | #12 |

**Points:** 5

---

### Day 7 (Wed) - Platform Dashboard
**Goal:** The admin home page shows platform-wide or org-scoped metrics.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 14 | #0347 Dashboard API (extend /admin/dashboard with org scope) | 2 | B | #0346 |
| 15 | #0347 Dashboard frontend (stat cards, tier chart, activity feed) | 3 | B | #14 |

**Points:** 5

**Details:**
- BrickOS admin: all orgs, services, signups, MRR, tier distribution, service health matrix
- Org admin: own members, enabled apps, links, clicks, recent member activity
- Reuse existing `/admin/dashboard` endpoint, extend with org_id filter
- Service health: call each app `/health` endpoint server-side, cache 60s
- Recharts for tier distribution + mini sparklines

---

### Day 8 (Thu) - Service Health Monitor
**Goal:** Real-time service monitoring with uptime timeline and alert rules.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 16 | #0349 Health aggregator backend (poll services, cache, store history) | 3 | B | - |
| 17 | #0349 Service monitor frontend (uptime bars, container details, alerts) | 2 | B | #16, #0346 |

**Points:** 5

**Details:**
- Backend: server-side poller, checks `/health` every 60s, stores 30-day ring buffer
- Container stats via SSH (CPU, memory, uptime) -- cache 5min
- Alert rules CRUD (all via ntfy + telegram)
- Frontend: uptime timeline bars, container table, alert rule management

---

### Day 9 (Fri) - Elevate Users Tab
**Goal:** Users management moved to platform admin with org filter.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 18 | #0353 Elevate users tab to /admin/users (add org filter) | 2 | B | #0346 |

**Points:** 2

**Details:**
- Move existing `users-tab.tsx` component to new `/admin/users/page.tsx`
- Add org dropdown filter (BrickOS admin sees all orgs)
- Existing API endpoints unchanged: `GET /admin/users`, `PUT /admin/users/{id}/role`, etc.
- Add `?org_id=` query param to API for org-scoped results

---

### Day 10 (Mon) - RC Testing + Distribution + Deploy
**Goal:** Full test suite, staging verification, production deploy.

| # | Issue | Pts | Track | Blocked By |
|---|---|---|---|---|
| 19 | #0343 Start9 .s9pk end-to-end verification | 1 | A | - |
| 20 | #0344 Docker Hub CI automation | 1 | A | - |
| 21 | RC testing: all suites + manual staging verification | - | Both | Day 9 |
| 22 | Deploy to staging + production | - | Both | #21 |
| 23 | Sprint artifacts: retro, release notes, version bump | - | Both | #22 |

**Points:** 2 (process, not code)

---

## Summary

| Milestone | Description | Days | Issues | Points |
|---|---|---|---|---|
| **M7** | Link Management UX | 1, 2, 4 | 4 | 8 |
| **M8** | Analytics + Voice Integration | 3, 6 | 4 | 9 |
| **M9** | Distribution | 10 | 2 | 2 |
| **M10** | Platform GUI Foundation | 1-2, 4-5, 7-9 | 9 | 25 |
| **RC** | Testing + Deploy | 10 | 3 | 0 |
| **Total** | | **10 days** | **22 items** | **44 pts** |

## Critical Path

```
Track A (Link):
  Day 1: #0340 expiration
    -> Day 2: #0338 vanity UX
      -> Day 4: #0342 link edit UI
  Day 3: #0339 Voice shortening (independent)
  Day 6: #0341 click analytics (independent)

Track B (Platform GUI):
  Day 1: #0367 design system
  Day 2: #0351 org roles
  Day 4: #0360 tier system
    -> Day 5: #0346 admin layout (needs roles + design)
      -> Day 7: #0347 dashboard
      -> Day 8: #0349 service monitor
      -> Day 9: #0353 elevate users
```

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| 44 pts in 10 days is ambitious | May not complete all items | Track A (Link) is priority. Track B Phase 1 items are foundational scaffolding. |
| Tier migration touches billing | Could break Stripe subscriptions | Run migration on staging first. Keep old tier_slug as fallback. |
| Service health poller needs SSH access | Security concern | Poller runs server-side only. No external API. SSH key scoped to docker stats. |
| Admin layout is a large component | Could block Days 7-9 | Design system (#0367) done first. Layout is mostly nav + context, not content. |

## Definition of Done

- [ ] Expired links redirect to main domain
- [ ] Vanity codes have real-time availability + edit
- [ ] Voice auto-shortens URLs in NOSTR notes
- [ ] Links can be edited/deactivated from affiliate page
- [ ] Click analytics with time-series charts
- [ ] Admin GUI shell with role-based sidebar is live
- [ ] Platform dashboard shows metrics (both admin views)
- [ ] Service health monitor with uptime timeline
- [ ] Users tab elevated to platform admin
- [ ] Platform tier system (5 tiers, two-layer)
- [ ] All new code has tests + error handling + monitoring
- [ ] Staging + production deployed
- [ ] Sprint artifacts complete

## Quality Requirements

Every issue in this sprint MUST include:
1. **Error handling**: Graceful degradation, user-facing error messages, no unhandled panics
2. **Monitoring**: Log state changes, alert on failures (ntfy + telegram)
3. **Automated tests**: Unit tests for logic, integration tests for API, snapshot tests for UI
4. **i18n**: All user-facing strings through i18n (EN + DE)
