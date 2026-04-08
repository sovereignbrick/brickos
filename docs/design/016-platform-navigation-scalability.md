# 016 - Platform Navigation Scalability

**Status:** Draft v2
**Author:** Helmut / Claude
**Date:** 2026-04-08
**Related:** 014-brickos-platform-gui, 015-brickos-unified-app-routing

---

## 1. Problem Statement

BrickOS is a multi-app platform (Health, Link, Voice, Exchange, Identity, CRM, and more). The Platform Admin GUI uses a left sidebar for navigation. As we onboard more apps and admin sections, the sidebar becomes unusable:

1. **Logo/brand section scrolls away** -- the BrickOS cube + name disappears when the user scrolls down through many menu items.
2. **No user account access** -- there is no persistent avatar/icon to reach account settings (MFA, theme toggle, session management, logout).
3. **Flat menu list does not scale** -- with 17+ items already and each new pillar app adding more, a flat list overwhelms the user. There is no grouping, no search, no way to find a page quickly.
4. **No deep linking** -- sub-pages and tabs are not individually addressable via URL. Sharing a link or bookmarking a specific view is not possible.

### Scope

This design covers the **Platform Admin GUI** navigation at `app.brickos.io/platform/*`. It does **not** cover end-user app navigation (e.g., the SHI health app at `/health/*` or CRM at `/crm/*`), which have their own simpler nav. The admin GUI manages all BrickOS apps, organizations, users, billing, compliance, and infrastructure.

### Goals

- Logo/brand section is always visible (frozen/sticky)
- User avatar with account menu is always accessible
- Menu scales to 50+ pages without overwhelming the user
- Every page, tab, and sub-tab has a unique URL (deep linking)
- Users can find any page in under 3 seconds (search)
- Works on desktop (1200px+) and tablet (768px+)
- Dark theme by default, light theme optional
- Follows state-of-the-art patterns (Linear, Notion, Vercel, VS Code)

---

## 2. Current Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Browser Window                                                       │
├────────────────┬─────────────────────────────────────────────────────┤
│                │                                                     │
│  [BrickOS]     │  Page Content                                       │
│  Platform      │                                                     │
│                │  (no breadcrumbs)                                    │
│  Dashboard     │  (no tabs -- sub-views are inline, not routed)      │
│  Users         │                                                     │
│  Settings      │                                                     │
│  Payments      │                                                     │
│  Promotions    │                                                     │
│  Affiliates    │                                                     │
│  Short Links   │                                                     │
│  Revenue Sim   │                                                     │
│  Content App   │                                                     │
│  Content Web   │                                                     │
│  Content Str   │                                                     │
│  Newsletter    │                                                     │
│  AI Usage      │                                                     │
│  Audit Logs    │                                                     │
│  API Monitor   │                                                     │
│  Contact       │  <-- must scroll to see these                       │
│  Compliance    │                                                     │
│  ...more       │  <-- no user avatar, no MFA, no theme toggle        │
│                │                                                     │
└────────────────┴─────────────────────────────────────────────────────┘
```

**Problems:** Logo scrolls out of view. No user account area. All items flat. Sub-pages have no distinct URL. Finding "Compliance" requires scrolling past 15+ items.

---

## 3. Proposed Layout -- Collapsible Sidebar with Search

### 3.1 Full Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Browser Window                                                           │
├─────────────────┬────────────────────────────────────────────────────────┤
│ ┌─────────────┐ │                                                        │
│ │ [Cube]      │ │  Platform > Apps > Sovereign Health > Settings         │
│ │ BrickOS     │ │  ──────────────────────────────────────────────        │
│ │ Platform    │ │                                                        │
│ │        [HM] │ │  [ Overview | API Keys | Webhooks | Permissions ]      │
│ ├─────────────┤ │  ──────────────────────────────────────────────        │
│ │ [Search..]  │ │                                                        │
│ │  Ctrl+K     │ │  Page Content                                          │
│ ├─────────────┤ │                                                        │
│ │             │ │  ┌──────────────────────────────────────────┐           │
│ │ OVERVIEW    │ │  │                                          │           │
│ │   Dashboard │ │  │  Content for "API Keys" tab              │           │
│ │             │ │  │                                          │           │
│ │ APPS     [v]│ │  │  URL: /platform/apps/health/api-keys     │           │
│ │   Health    │ │  │                                          │           │
│ │   Link      │ │  └──────────────────────────────────────────┘           │
│ │   Voice     │ │                                                        │
│ │   CRM       │ │                                                        │
│ │   Exchange  │ │                                                        │
│ │             │ │                                                        │
│ │ USERS    [v]│ │                                                        │
│ │   All Users │ │                                                        │
│ │   Roles     │ │                                                        │
│ │   Invites   │ │                                                        │
│ │             │ │                                                        │
│ │ COMMERCE [>]│ │  <-- collapsed, click to expand                        │
│ │             │ │                                                        │
│ │ CONTENT  [>]│ │                                                        │
│ │             │ │                                                        │
│ │ SYSTEM   [>]│ │                                                        │
│ │             │ │                                                        │
│ │ COMPLY   [>]│ │                                                        │
│ │             │ │                                                        │
│ │ ─────────── │ │                                                        │
│ │ v0.39.0     │ │                                                        │
│ └─────────────┘ │                                                        │
├─────────────────┴────────────────────────────────────────────────────────┤
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Sidebar Header (Sticky -- Never Scrolls)

```
┌─────────────────┐
│                  │
│  [Cube] BrickOS  │   <-- brand logo + name, always visible
│  Platform  [HM]  │       position: sticky; top: 0
│                  │       [HM] = user avatar circle, top-right
├─────────────────┤
│  [Q] Search...   │   <-- search trigger, Ctrl+K shortcut
│                  │
├─────────────────┤
│                  │   <-- below here: scrollable nav
│  (menu groups)   │
│  ...             │
```

### 3.3 User Account Popover

Click on [HM] opens popover anchored to the avatar:

```
                    ┌──────────────────────────┐
                    │  Helmut M.               │
                    │  helmut@brickos.io       │
                    │  BrickOS Admin           │
                    │  ──────────────────────  │
                    │  [user]  Account Settings│  -> /platform/account/profile
                    │  [lock]  Security / MFA  │  -> /platform/account/security
                    │  ──────────────────────  │
                    │  [moon]  Dark theme   [*]│  -> toggle, instant
                    │  [lang]  Deutsch      [ ]│  -> toggle, instant
                    │  [bell]  Notifications[*]│  -> toggle
                    │  ──────────────────────  │
                    │  [org]   Switch Org   [>]│  -> org picker sub-menu
                    │  ──────────────────────  │
                    │  [out]   Log out         │
                    └──────────────────────────┘
```

Account settings are full pages with real URLs:
```
/platform/account                  -> redirect to /profile
/platform/account/profile          -> Name, email, avatar upload
/platform/account/security         -> MFA setup, active sessions, password change
/platform/account/preferences      -> Theme, language, notification preferences
```

### 3.4 Sidebar Nav (Scrollable)

```
┌─────────────────┐
│                  │
│ OVERVIEW         │   <-- group header (uppercase, muted color)
│   Dashboard      │       /platform/dashboard
│                  │
│ APPS          [v]│   <-- [v] expanded, [>] collapsed
│   Health         │       /platform/apps/health
│   Link           │       /platform/apps/link
│   Voice          │       /platform/apps/voice
│   CRM            │       /platform/apps/crm
│   Exchange       │       /platform/apps/exchange
│   Identity       │       /platform/apps/identity
│   (+ future)     │       auto-populated from app registry
│                  │
│ USERS         [v]│
│   All Users      │       /platform/users
│   Roles          │       /platform/users/roles
│   Invitations    │       /platform/users/invitations
│                  │
│ COMMERCE      [>]│   <-- collapsed (click header to expand)
│                  │
│ CONTENT       [>]│
│                  │
│ SERVICES      [>]│
│                  │
│ SYSTEM        [>]│
│                  │
│ COMPLIANCE    [>]│
│                  │
│ ─────────────── │
│ v0.39.0          │
│                  │
└─────────────────┘
```

When "COMMERCE" is expanded:
```
│ COMMERCE      [v]│
│   Payments       │       /platform/commerce/payments
│   Promotions     │       /platform/commerce/promotions
│   Affiliates     │       /platform/commerce/affiliates
│   Revenue        │       /platform/commerce/revenue
│                  │
```

**Behaviors:**
- Click group header to expand/collapse
- Collapse state persisted in localStorage per user
- Navigating to a page auto-expands its parent group
- Active page highlighted (left accent border + background)
- Badge counts on group headers (e.g., "USERS (2)" for pending invites)
- Groups with zero visible items (role-filtered) are hidden entirely

### 3.5 Content Area Header (Breadcrumbs + Tabs)

Every content page has breadcrumbs and optional tabs. Each tab is a **separate route**.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Platform > Commerce > Affiliates                                │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  [ Tree ]  [ Commissions ]  [ Payouts ]  [ Settings ]            │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  (tab content -- each tab is a separate route)                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Each tab maps to a URL:
```
/platform/commerce/affiliates              -> redirects to /tree (default tab)
/platform/commerce/affiliates/tree         -> Tree view
/platform/commerce/affiliates/commissions  -> Commission rules
/platform/commerce/affiliates/payouts      -> Payout history
/platform/commerce/affiliates/settings     -> Affiliate program settings
```

---

## 4. Deep Linking -- URL Structure

Every page, tab, sub-view, and detail view has a unique, bookmarkable, shareable URL.

### 4.1 URL Pattern

```
/platform/{group}/{page}/{tab?}/{detail?}
```

### 4.2 Complete Route Map

```
ROUTE                                                   PAGE TITLE
──────────────────────────────────────────────────────  ──────────────────────
/platform/                                              -> redirect to /dashboard
/platform/dashboard                                     Dashboard

APPS
/platform/apps                                          All Apps overview
/platform/apps/health                                   Sovereign Health
/platform/apps/health/overview                          SHI Overview
/platform/apps/health/api-keys                          SHI API Keys
/platform/apps/health/webhooks                          SHI Webhooks
/platform/apps/health/permissions                       SHI Permissions
/platform/apps/health/settings                          SHI App Settings
/platform/apps/link                                     Sovereign Link
/platform/apps/link/overview                            Link Overview
/platform/apps/link/analytics                           Link Analytics
/platform/apps/link/settings                            Link Settings
/platform/apps/voice                                    Sovereign Voice
/platform/apps/crm                                      Sovereign CRM
/platform/apps/crm/overview                             CRM Overview
/platform/apps/crm/api-keys                             CRM API Keys
/platform/apps/crm/settings                             CRM Settings
/platform/apps/exchange                                 Sovereign Exchange
/platform/apps/identity                                 Sovereign Identity

USERS
/platform/users                                         All Users list
/platform/users/:id                                     User detail
/platform/users/:id/profile                             User profile tab
/platform/users/:id/sessions                            User sessions tab
/platform/users/:id/audit                               User audit log tab
/platform/users/roles                                   Roles & Permissions
/platform/users/roles/:id                               Role detail
/platform/users/invitations                             Invitations

COMMERCE
/platform/commerce/payments                             Payments
/platform/commerce/payments/transactions                Transactions
/platform/commerce/payments/refunds                     Refunds
/platform/commerce/payments/settings                    Payment settings
/platform/commerce/promotions                           Promotions
/platform/commerce/promotions/active                    Active promos
/platform/commerce/promotions/expired                   Expired promos
/platform/commerce/affiliates                           Affiliates
/platform/commerce/affiliates/tree                      Affiliate tree
/platform/commerce/affiliates/commissions               Commissions
/platform/commerce/affiliates/payouts                   Payouts
/platform/commerce/revenue                              Revenue simulator

CONTENT
/platform/content/strings                               i18n Strings
/platform/content/strings/en                            English strings
/platform/content/strings/de                            German strings
/platform/content/web                                   Website CMS
/platform/content/web/pages                             Web pages
/platform/content/web/media                             Media library
/platform/content/newsletter                            Newsletter
/platform/content/newsletter/campaigns                  Campaigns
/platform/content/newsletter/subscribers                Subscribers

SERVICES
/platform/services/links                                Short Links (Sovereign Link admin)
/platform/services/ai                                   AI Usage
/platform/services/ai/by-org                            AI by organization
/platform/services/ai/by-model                          AI by model
/platform/services/api                                  API Monitoring
/platform/services/api/health                           Service health
/platform/services/api/latency                          Latency dashboard
/platform/services/api/errors                           Error log

SYSTEM
/platform/system/settings                               Platform Settings
/platform/system/settings/general                       General settings
/platform/system/settings/auth                          Auth configuration
/platform/system/settings/mail                          Mail / SMTP
/platform/system/audit                                  Audit Logs
/platform/system/backups                                Backups

COMPLIANCE
/platform/compliance/gdpr                               GDPR Management
/platform/compliance/gdpr/consent                       Consent records
/platform/compliance/gdpr/deletion                      Deletion requests
/platform/compliance/contact                            Contact / Support
/platform/compliance/contact/inbox                      Support inbox
/platform/compliance/contact/templates                  Response templates
/platform/compliance/legal                              Legal documents

ACCOUNT (from user avatar popover)
/platform/account                                       -> redirect to /profile
/platform/account/profile                               Edit profile
/platform/account/security                              MFA, password, sessions
/platform/account/preferences                           Theme, language, notifications
```

### 4.3 Deep Link Rules

1. **Every tab is a route.** Tabs use `<NavLink>`, not JS-only state. Browser back/forward works.
2. **Default tab redirect.** Parent route (e.g., `/platform/commerce/affiliates`) redirects to default tab (`/tree`).
3. **Detail views preserve context.** `/platform/users/u_abc123/sessions` keeps "Users" highlighted in sidebar, shows breadcrumb `Platform > Users > John Doe > Sessions`.
4. **Query params for filters.** `/platform/users?role=admin&page=2&sort=created_desc` -- shareable, bookmarkable.
5. **Hash fragments for scroll targets.** `/platform/system/settings/general#smtp-config`.

---

## 5. Command Palette (Ctrl+K)

Global search overlay, available from any page.

```
┌───────────────────────────────────────────────────┐
│                                                   │
│  [Q] Search pages, actions...                     │
│  ─────────────────────────────────────────        │
│                                                   │
│  RECENT                                           │
│  [icon] Users > All Users                         │
│  [icon] Apps > Sovereign Health > API Keys        │
│                                                   │
│  PAGES                                            │
│  [icon] Dashboard                                 │
│  [icon] Commerce > Payments > Transactions        │
│  [icon] Compliance > GDPR > Deletion Requests     │
│                                                   │
│  APPS                                             │
│  [icon] Sovereign Health                          │
│  [icon] Sovereign CRM                             │
│  [icon] Sovereign Link                            │
│                                                   │
│  ACTIONS                                          │
│  [icon] Create new user                           │
│  [icon] Switch organization                       │
│  [icon] Toggle dark/light theme                   │
│                                                   │
│  Arrow keys to navigate, Enter to select, Esc     │
└───────────────────────────────────────────────────┘
```

After typing "affil":
```
┌───────────────────────────────────────────────────┐
│  [Q] affil                                        │
│  ─────────────────────────────────────────        │
│                                                   │
│  Commerce > [Affil]iates                          │
│  Commerce > [Affil]iates > Tree                   │
│  Commerce > [Affil]iates > Commissions            │
│  Commerce > [Affil]iates > Payouts                │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Implementation:** cmdk library (pacocoursey/cmdk, ~5KB). Used by Vercel, Linear.

**Search index:** Built from route config at build time. Each entry: `title`, `path`, `breadcrumb`, `keywords`, `group`.

---

## 6. Navigation Hierarchy

Three levels, each mapped to URL segments:

```
Level 1: Sidebar Group      Level 2: Sidebar Item     Level 3: Content Tab
(collapsible)               (link in group)            (horizontal tabs)
─────────────────           ─────────────────          ─────────────────
URL: /platform/             URL: /platform/{group}/    URL: /.../{page}/{tab}
                            {page}

Example:
APPS                        Sovereign CRM              Overview
                                                       API Keys
                                                       Settings

COMMERCE                    Affiliates                 Tree
                                                       Commissions
                                                       Payouts

USERS                       All Users                  (list view)
                            -> User Detail (:id)       Profile | Sessions | Audit
```

---

## 7. Menu Group Definitions

| Group       | Sidebar Items                                              | Visibility      |
|-------------|------------------------------------------------------------|-----------------|
| Overview    | Dashboard                                                  | All admins      |
| Apps        | One entry per registered app (Health, Link, Voice, CRM, ...) | All admins (filtered by org app access) |
| Users       | All Users, Roles & Permissions, Invitations                | All admins      |
| Commerce    | Payments, Promotions, Affiliates, Revenue Simulator        | BrickOS only    |
| Content     | i18n Strings, Website CMS, Newsletter                      | All admins      |
| Services    | Short Links, AI Usage, API Monitoring                      | BrickOS only    |
| System      | Settings, Audit Logs, Backups                              | All admins      |
| Compliance  | GDPR, Contact/Support, Legal                               | All admins      |

**APPS group** grows automatically as new pillar apps are added. Each app entry expands into tab-based admin pages. Org admins see only apps enabled for their org.

---

## 8. Responsive Behavior

### Desktop (>= 1200px)
Full sidebar (240px) always visible. Content fills remaining width.

### Tablet (768px - 1199px)
Sidebar collapses to icon-only rail (48px). Hover/click expands as overlay.

```
┌────┬────────────────────────────────────────────────────┐
│    │                                                    │
│[C] │  Platform > Users                                  │
│[HM]│  ──────────────────                                │
│    │                                                    │
│[Q] │  [ All Users | Roles | Invitations ]               │
│────│  ──────────────────                                │
│[Ho]│                                                    │
│[Ap]│  User list...                                      │
│[Us]│                                                    │
│[Co]│                                                    │
│[Cn]│                                                    │
│[Sv]│                                                    │
│[Sy]│                                                    │
│[Cm]│                                                    │
│    │                                                    │
└────┴────────────────────────────────────────────────────┘
 48px
```

### Mobile (< 768px)
Sidebar hidden. Hamburger button in top bar opens full-width slide-over drawer.

```
┌──────────────────────────────────────────────┐
│  [=]  BrickOS Platform           [HM] [Q]   │
│  ────────────────────────────────────────    │
│                                              │
│  Platform > Users                            │
│  [ All Users | Roles | Invitations ]         │
│  ────────────────────────────────────────    │
│  User list...                                │
└──────────────────────────────────────────────┘
```

---

## 9. Technical Design

### 9.1 Sidebar Component Tree

```tsx
<SidebarLayout>
  <SidebarHeader>                    {/* position: sticky; top: 0 */}
    <BrandLogo />                    {/* cube + "BrickOS Platform" */}
    <UserAvatar onClick={openPopover} />  {/* top-right, initials */}
    <SearchTrigger />                {/* [Q] Search... Ctrl+K */}
  </SidebarHeader>

  <SidebarNav>                       {/* flex: 1; overflow-y: auto */}
    <NavGroup id="overview" label="Overview" collapsible={false}>
      <NavItem to="/platform/dashboard" icon={Home} />
    </NavGroup>

    <NavGroup id="apps" label="Apps" defaultOpen>
      {apps.map(app =>
        <NavItem to={`/platform/apps/${app.slug}`} icon={app.icon} />
      )}
    </NavGroup>

    <NavGroup id="users" label="Users" defaultOpen>
      <NavItem to="/platform/users" icon={Users} />
      <NavItem to="/platform/users/roles" icon={Shield} />
      <NavItem to="/platform/users/invitations" icon={Mail} />
    </NavGroup>

    <NavGroup id="commerce" label="Commerce">...</NavGroup>
    <NavGroup id="content" label="Content">...</NavGroup>
    <NavGroup id="services" label="Services">...</NavGroup>
    <NavGroup id="system" label="System">...</NavGroup>
    <NavGroup id="compliance" label="Compliance">...</NavGroup>
  </SidebarNav>

  <SidebarFooter>                    {/* position: sticky; bottom: 0 */}
    <VersionBadge version="0.39.0" />
  </SidebarFooter>
</SidebarLayout>
```

### 9.2 Route Configuration with Tabs

Each route defines its own tab set declaratively:

```typescript
{
  path: "/platform/commerce/affiliates",
  redirect: "/platform/commerce/affiliates/tree",
  tabs: [
    { label: "Tree",        path: "tree",        component: AffiliateTree },
    { label: "Commissions", path: "commissions", component: CommissionRules },
    { label: "Payouts",     path: "payouts",     component: PayoutHistory },
    { label: "Settings",    path: "settings",    component: AffiliateSettings },
  ],
  breadcrumb: ["Commerce", "Affiliates"],
  sidebarGroup: "commerce",
  sidebarItem: "affiliates",
}
```

### 9.3 Collapsible Group State

```typescript
const STORAGE_KEY = "brickos:nav-groups";

function useNavGroupState(groupId: string, defaultOpen: boolean) {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      return state[groupId] ?? defaultOpen;
    }
    return defaultOpen;
  });

  const location = useLocation();
  useEffect(() => {
    if (isRouteInGroup(location.pathname, groupId)) {
      setOpen(true);  // auto-expand when active route is in this group
    }
  }, [location.pathname]);

  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      stored[groupId] = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      return next;
    });
  };

  return { open, toggle };
}
```

### 9.4 CSS Structure

```css
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 240px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
}

.sidebar-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--sidebar-bg);
  border-bottom: 1px solid var(--border);
  padding: 16px;
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.sidebar-header .brand { flex: 1; }
.sidebar-header .avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar-footer {
  position: sticky;
  bottom: 0;
  background: var(--sidebar-bg);
  border-top: 1px solid var(--border);
  padding: 8px 16px;
  flex-shrink: 0;
}

.nav-group-items {
  overflow: hidden;
  transition: max-height 150ms ease;
}
.nav-group-items[data-collapsed="true"] { max-height: 0; }

.nav-item[aria-current="page"] {
  background: var(--accent-bg);
  border-left: 2px solid var(--accent);
  color: var(--accent);
}
```

---

## 10. Accessibility

- Collapsible groups: `aria-expanded`, `aria-controls`, `role="group"`
- Command palette: `role="dialog"`, focus trap, `aria-modal="true"`
- Tabs: `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected`
- Keyboard: Tab moves between groups, Enter expands, Arrow keys navigate items
- Focus ring visible on all interactive elements (dark theme compatible)
- Reduced motion: disable `transition` when `prefers-reduced-motion: reduce`
- Screen reader: skip-nav link, `<nav aria-label="Platform navigation">`

---

## 11. Implementation Phases

**Phase 1 -- Sticky Header + User Avatar + Collapsible Groups**
- Sticky sidebar header with logo + user avatar + popover
- Group existing menu items into 8 categories
- Expand/collapse with localStorage persistence
- Auto-expand active group
- Account pages: /platform/account/{profile,security,preferences}

**Phase 2 -- Deep Linking + Tab Navigation**
- Refactor all sub-views from inline state to routed tabs
- Each tab = separate route with own URL
- Breadcrumb component reading route config
- Default tab redirects
- Query param preservation on tab switch

**Phase 3 -- Command Palette**
- cmdk integration
- Build search index from route config
- Recent pages (localStorage)
- Fuzzy match with highlighted results
- Action items (create user, switch org, toggle theme)

**Phase 4 -- Responsive + Polish**
- Tablet: icon rail with overlay expand
- Mobile: hamburger + slide-over drawer
- Badge counts on group headers
- Smooth expand/collapse animation (150ms)
- Keyboard shortcut hints in tooltips

---

## 12. Open Questions

1. **APPS group ordering** -- alphabetical, or manual priority? Sub-group by pillar when >10 apps?
2. **App admin tabs** -- hardcoded per app, or self-declared registry?
3. **Cross-app pages** -- "AI Usage" spans all apps. Lives under Services, or per-app view too?
4. **Tab state vs. route** -- should filter/sort within a tab persist in query params?
5. **Theme storage** -- localStorage (per-device) or server-side (syncs across devices)?
6. **Org switcher** -- full page reload or re-fetch with new org context?
7. **Max sidebar items** -- auto-paginate if a group has 15+ items? "Show all" link?
8. **Pinned/favorites** -- pin frequently used pages to sidebar top?
9. **Route config source of truth** -- single file driving sidebar, breadcrumbs, tabs, and search?
10. **Sidebar resizable** -- drag handle with width saved to localStorage?
