# Sprint 030 - Sovereign Link Production Hardening

**Started:** 2026-04-08
**Goal:** Ship Sovereign Link as a fully production-ready URL shortener with analytics, link management UX, Voice integration, and expiration enforcement.
**Milestones:** M7 (Link Management UX), M8 (Analytics + Integration), M9 (Distribution)

---

## Dependency Analysis

```
Layer 0: No dependencies (unblocks everything)
  #0340 Link expiration enforcement
  #0338 Vanity code UX
  #0339 Sovereign Voice URL shortening
         |
         +-----------+------------------+
         |                              |
         v                              v
Layer 1: Link Management            Layer 1: Voice Integration
  #0342 Link edit UI                  (Voice auto-shortens URLs)
    (needs #0338 + #0340)               |
         |                              |
         v                              v
Layer 2: Analytics                   Layer 2: Distribution
  #0341 Click analytics dashboard     #0343 Start9 .s9pk verification
    (benefits from all above)          #0344 Docker Hub CI automation
```

## Sprint Plan (5 Days)

### Day 1 (Tue) - Link Expiration Enforcement
**Goal:** Expired links redirect to org main domain. No dead links in production.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 1 | #0340 Link expiration - hot path check in redirect.rs | 2 | M7 | - |
| 2 | #0340 Link expiration - admin UI expired badge + date picker | 1 | M7 | #1 |

**Points:** 3

**Details:**
- `redirect.rs`: After link lookup, check `expires_at < now()`. If expired, 301 to org's `base_url` (from `app_prefixes`) or `brickos.io` as fallback.
- `org_admin.rs`: Show "Expired" badge in link list, filter by expired/active.
- Optional cleanup cron: `UPDATE short_links SET is_active = false WHERE expires_at < now() AND is_active = true` (run hourly).

---

### Day 2 (Wed) - Vanity Code UX
**Goal:** Users can check availability in real-time, edit existing vanity codes, Clarity tier works.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 3 | #0338 Real-time vanity availability check (debounced 300ms) | 1 | M7 | - |
| 4 | #0338 Edit existing vanity code (show current, allow update) | 1 | M7 | - |
| 5 | #0338 Fix Clarity tier false rejection in vanity check | 1 | M7 | - |

**Points:** 3

**Details for #3:**
- `affiliate/page.tsx`: Add `useEffect` with 300ms debounce on vanity input, call `GET /api/affiliate/vanity/check?code=X`
- Show green checkmark / red X + reason inline
- Disable save button until check passes

**Details for #4:**
- After first save, show current vanity code with "Change" button
- On change, call `PUT /api/affiliate/me/vanity` with new code
- Old code becomes available immediately (no cooldown for MVP)

**Details for #5:**
- `affiliate.rs` `set_vanity`: Check `custom_vanity_code` feature, not `custom_thresholds`
- Verify Clarity tier includes this feature in `tier_features` table

---

### Day 3 (Thu) - Sovereign Voice URL Shortening
**Goal:** Every URL in NOSTR notes is auto-shortened via Sovereign Link before publishing.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 6 | #0339 Create Voice service account + config | 1 | M8 | - |
| 7 | #0339 URL detection + shortening in publisher.ts | 2 | M8 | #6 |
| 8 | #0339 Graceful fallback if SL unreachable | 1 | M8 | #7 |

**Points:** 4

**Details for #6:**
- Insert service account into `brickos.service_accounts` (migration or seed)
- Add to Voice config: `SOVEREIGN_LINK_API_URL=https://api.sovereignhealth.io`, `SOVEREIGN_LINK_API_KEY=<key>`
- Service account scopes: `links:create`, `links:read`

**Details for #7:**
- `publisher.ts`: Before `publishEvent()`, scan note content for `https?://` URLs
- For each URL, call `POST /api/v1/service/links { target_url: url }`
- Replace URL in note text with returned `brickos.io/r/{code}`
- Cache shortened URLs in memory to avoid duplicate API calls

**Details for #8:**
- If SL API returns error or times out (5s), log warning and publish with original URL
- Never block NOSTR publishing on SL availability

---

### Day 4 (Fri) - Link Edit UI
**Goal:** Users can edit, deactivate, and set expiration on their links from the affiliate page.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 9 | #0342 Link edit modal (target URL, title, is_active, expires_at) | 2 | M7 | #0338, #0340 |

**Points:** 2

**Details:**
- Add edit icon button to each link row on affiliate page
- Modal with fields: target URL (text), title (text), active toggle, expiration date picker
- Save: `PUT /api/v1/links/{id}` with updated fields
- Deactivate: Confirmation dialog, then `PUT` with `is_active: false`
- Consistent with vanity code UX from Day 2

---

### Day 5 (Mon) - Click Analytics Dashboard
**Goal:** Org admins and platform admins can see click analytics with charts.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 10 | #0341 Analytics API endpoints (time-series, geo, referrers) | 3 | M8 | - |
| 11 | #0341 Org admin analytics page (Recharts) | 2 | M8 | #10 |

**Points:** 5

**Details for #10:**
New handler `analytics.rs` in sovereign-link:
```
GET /api/v1/orgs/{org_id}/analytics?days=30
  -> { clicks_by_day: [{date, count}], top_links: [...], top_countries: [...], top_referrers: [...] }

GET /api/v1/admin/analytics?days=30
  -> Same + by_org breakdown + by_app breakdown

GET /api/v1/links/{id}/analytics
  -> Single link deep-dive: daily clicks, referrers, countries
```

Queries aggregate from `short_link_clicks` table:
- `GROUP BY DATE(clicked_at)` for time-series
- `GROUP BY country_code` for geo (when Cloudflare enabled)
- `GROUP BY referrer_domain` for referrers

**Details for #11:**
- Org admin: `/org/{slug}/analytics` page
- Recharts line chart for clicks over time (same pattern as SHI trend charts)
- Table for top links, top referrers
- Platform admin: `/admin/analytics` with org/app breakdown tabs
- Dark theme, BrickOS design tokens

---

### Flex Day - Distribution (if time permits)
**Goal:** Sovereign Link available on Start9 marketplace and Docker Hub.

| # | Issue | Pts | Milestone | Blocked By |
|---|---|---|---|---|
| 12 | #0343 Start9 .s9pk end-to-end verification | 1 | M9 | - |
| 13 | #0344 Docker Hub CI automation | 1 | M9 | - |

**Points:** 2

---

## Summary

| Milestone | Description | Days | Issues | Points |
|---|---|---|---|---|
| **M7** | Link Management UX | 1, 2, 4 | 6 | 8 |
| **M8** | Analytics + Integration | 3, 5 | 5 | 9 |
| **M9** | Distribution | Flex | 2 | 2 |
| **Total** | | **5 days + flex** | **13 items** | **19 pts** |

## Critical Path

```
Day 1: Expiration enforcement (#0340)
  -> Day 4: Link edit UI (#0342)
    -> Day 5: Analytics dashboard (#0341)

Day 2: Vanity code UX (#0338)
  -> Day 4: Link edit UI (#0342)

Day 3: Voice URL shortening (#0339) [independent track]
```

Two parallel tracks: Link Management (Days 1-2-4-5) and Voice Integration (Day 3).

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Voice service account auth may need debugging | Blocks Day 3 | Test service account endpoints with curl first, before writing Node code |
| Analytics queries may be slow on large click tables | Slow dashboards | Add index on `short_link_clicks(clicked_at)`, use materialized views if needed |
| Recharts bundle size | Larger frontend build | Already using Recharts in SHI, no additional bundle cost |
| Start9 SDK compatibility | Can't verify .s9pk | Docker-only fallback, defer to next sprint if SDK issues |

## Definition of Done

- [ ] Expired links redirect to main domain (not 404)
- [ ] Vanity code has real-time availability indicator
- [ ] Existing vanity codes can be changed
- [ ] Sovereign Voice auto-shortens URLs in NOSTR notes
- [ ] Links can be edited/deactivated from affiliate page
- [ ] Org admin sees click analytics with time-series chart
- [ ] Platform admin sees cross-org analytics
- [ ] All new code has tests
- [ ] Staging + production deploy verified
- [ ] Sprint artifacts complete (retro, release notes)

## Carried Forward from Sprint 029

| Issue | Status | Notes |
|---|---|---|
| #0334 Admin service dashboard | Backlog | Deferred to Sprint 031 (larger scope) |
| #0337 AI-agnostic provider settings | Backlog | Deferred (architectural decision needed) |
| #0333 Click tracking geo data | Blocked | Needs Cloudflare proxy for brickos.io/r/ |
