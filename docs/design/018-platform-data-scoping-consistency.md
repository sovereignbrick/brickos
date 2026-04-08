# 018 - Platform Data Scoping & Consistency

**Status:** Draft
**Author:** Helmut / Claude
**Date:** 2026-04-08
**Related:** 014-brickos-platform-gui, 005-platform-multi-tenant

---

## 1. Problem

The platform admin at /platform/* currently shows ALL data from ALL apps in every tab. When you click "Audit Logs", you see every audit entry from SHI, Sovereign Link, and future apps mixed together. When you click "Links", you see all links from all orgs. There's no scoping by app or organization.

This creates confusion:
- Are these audit logs for the platform itself, or for SHI?
- When I'm on the Links page, do I see all links or just my org's?
- The Newsletter page shows all subscribers -- but from which app?

---

## 2. Principle: Context-Aware Data Scoping

Every platform page must know TWO contexts:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  SCOPE = APP CONTEXT + ORG CONTEXT                      │
│                                                         │
│  App Context:                                           │
│    "all"           -> platform-wide (BrickOS admin)     │
│    "shi"           -> Sovereign Health only              │
│    "sovereign-link"-> Sovereign Link only                │
│    "sovereign-voice"-> Sovereign Voice only              │
│                                                         │
│  Org Context:                                           │
│    "all"           -> all organizations (BrickOS admin)  │
│    "brickos"       -> BrickOS platform org               │
│    "clinic-xy"     -> specific org (org admin)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Current State vs Target

### 3.1 Pages That Need App Scoping

| Page | Current | Target |
|------|---------|--------|
| Audit Logs | Shows ALL events | Filter by app: Platform / SHI / Link / Voice |
| Links | Shows ALL links | Filter by source app (app_key column exists) |
| Analytics | Shows ALL clicks | Filter by app (app_key on short_links) |
| Newsletter | Shows ALL subscribers | Filter by app interest (auto-detected) |
| AI Usage | Shows ALL AI consumption | Filter by app (already has provider breakdown) |
| Users | Shows ALL users | Filter by org membership |
| Billing | Shows ALL gateways | Scope by org (future: per-org billing) |
| Settings | Shows ALL settings | Filter by category + app_key |

### 3.2 Pages That Need Org Scoping

| Page | Current | Target |
|------|---------|--------|
| Organizations | BrickOS admin sees all | Already correct |
| Members | Select org dropdown | Already correct |
| Users | Shows all users | Add org filter (which org is user in?) |
| Billing | Platform-wide gateways | Per-org billing view for org admin |
| Analytics | All link clicks | Per-org click data |
| Newsletter | All subscribers | Per-org subscriber list |
| Branding | Static page | Load/save per-org branding from DB |

### 3.3 Pages That Are Platform-Only (No Scoping Needed)

| Page | Why |
|------|-----|
| Dashboard | Aggregates -- already correct |
| Services | Infrastructure monitoring |
| Compliance | Framework status |
| AI Config | Provider profiles |
| Apps Registry | Static app list |
| Deploy | Build/release pipeline |

---

## 4. Implementation Plan

### 4.1 Add Context Selectors to Layout

Add two dropdowns to the platform header (next to app switcher):

```
[Platform ▾] [Health ▾] [Links] [Voice]    [Org: All ▾]  [App: All ▾]    User Menu
```

The "Org" dropdown shows all organizations (for BrickOS admin) or just the user's org (for org admin). The "App" dropdown shows all apps or a specific one.

These filters are passed as query params or stored in a context:

```typescript
const { orgFilter, appFilter } = usePlatformContext()
// orgFilter: 'all' | org_id
// appFilter: 'all' | 'shi' | 'sovereign-link' | 'sovereign-voice'
```

### 4.2 Backend: Add app_key + org_id Filters

Every admin API endpoint needs optional query params:

```
GET /admin/audit/access-logs?app_key=shi&org_id=xxx
GET /admin/links?app_key=sovereign-link&org_id=xxx
GET /admin/newsletter/subscribers?app_key=shi&org_id=xxx
GET /admin/ai-usage?app_key=shi
```

The existing queries already have some of this:
- `short_links` table has `app_key` column
- `audit_log` may need `app_key` column added
- `newsletter` may need `app_source` column

### 4.3 Frontend: Consistent Filter Bar

Every scopeable page gets a consistent filter bar at the top:

```
┌─────────────────────────────────────────────────────────┐
│ Audit Logs                                              │
│ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐      │
│ │ App: All  ▾ │ │ Org: All   ▾ │ │ Date: 7d   ▾ │      │
│ └─────────────┘ └──────────────┘ └──────────────┘      │
│                                                         │
│ [table content filtered by selections]                  │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Data Flow

```
User selects "App: Sovereign Link" + "Org: Clinic XY"
  -> Frontend updates context
  -> API call: GET /admin/links?app_key=sovereign-link&org_id={clinic-id}
  -> Backend: WHERE app_key = $1 AND owner_org_id = $2
  -> Returns only Sovereign Link links for Clinic XY
```

---

## 5. Database Changes Needed

### 5.1 Add app_key to audit_log

```sql
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS app_key TEXT DEFAULT 'shi';
```

### 5.2 Add app_source to newsletter subscribers

```sql
ALTER TABLE newsletter_subscribers ADD COLUMN IF NOT EXISTS app_source TEXT;
-- Auto-detect: if user has measurements -> 'shi', if user has short_links -> 'sovereign-link'
```

### 5.3 Ensure org_id on relevant tables

Most tables already have user_id which maps to org via org_members. For direct org queries:
- `short_links` has `owner_org_id` -- already correct
- `audit_log` needs `org_id` column
- `newsletter_subscribers` needs `org_id` via user_id join

---

## 6. Phased Implementation

### Phase 1: Add Filter Dropdowns (Sprint 033)
- Add org + app filter dropdowns to platform header
- Store in PlatformContext
- Pass as query params to API calls from pages that already support filtering (links, analytics)

### Phase 2: Backend Filter Support (Sprint 033-034)
- Add ?app_key and ?org_id to admin API endpoints
- Audit log app_key migration
- Newsletter app_source detection

### Phase 3: Per-Page Scoping (Sprint 034)
- Each page reads the filters and adjusts its API calls
- Pages that don't support filtering show "All" and ignore the dropdowns

### Phase 4: Org Admin Scoping (Sprint 035)
- Org admin sees only their org's data automatically
- No "Org" dropdown for org admin -- locked to their org
- "App" dropdown shows only enabled apps for their org

---

## 7. Sidebar Visibility by Role (Updated)

Currently Members and Branding are hidden for platform admin because they're scoped to org admin. Fix: show them for platform admin too with "select an org" prompt.

```
Platform Admin sees: ALL sidebar items
  Members -> shows org selector, then members
  Branding -> shows org selector, then branding

Org Admin sees: SCOPED sidebar items
  Members -> locked to own org
  Branding -> locked to own org
```

---

## 8. Issues to Create

- [ ] Add app_key + org_id filter dropdowns to platform header
- [ ] Add ?app_key filter to audit log API
- [ ] Add ?org_id filter to links, analytics, newsletter APIs
- [ ] Show Members + Branding for platform admin (with org selector)
- [ ] Per-page filter bar component (reusable)
- [ ] audit_log app_key migration
