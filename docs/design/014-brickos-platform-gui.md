# 014 - BrickOS Platform GUI

**Status:** Amended (2026-04-20 by Design 026)
**Author:** Helmut / Claude
**Date:** 2026-04-07 (original), 2026-04-20 (unified-admin-home amendment)
**Related:** 005, 006, 010, 025 (domain realignment), 026 (unified admin home)

---

## Amendment 2026-04-20

The unified admin home is now `/platform` per **Design 026**. The old
parallel admin surfaces (`/admin` and `/org/*`) are gone -- folded into
a single role- + plane- + context-aware sidebar under `/platform/*`.
Each BrickOS app contributes its org-scoped settings via the declarative
registry at `src/lib/admin-nav/apps/{appKey}.ts`. See Design 026 for the
full IA + migration plan.

---

## 1. Vision

One unified admin GUI that serves **two admin roles** through content filtering. No separate apps, no double maintenance. The same routes, components, and API layer -- just filtered by JWT `{ role, org_id }`.

**App name:** "BrickOS Platform" (for BrickOS admins)
**Org view:** "BrickOS Platform - {OrgName}" (e.g., "BrickOS Platform - Clinic XY")
**App icon:** BrickOS cube logo (orange brick)

**App users** (end users) have no admin view. They use `/settings` within their app.

### Security Principle

All data at rest and in transit is **encrypted**. The platform GUI handles only encrypted data. AES-256-GCM for fields at rest (same as SHI), TLS for transit. Admin views decrypt on read, never store plaintext.

```
┌────────────────────────────────────────────────────────────────────┐
│                   ONE ADMIN GUI -- TWO VIEWS                       │
│                                                                    │
│  Same URL: /admin/*                                                │
│  Same components, same codebase                                    │
│  Content filtered by JWT: { role, org_id }                         │
│                                                                    │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐  │
│  │    BRICKOS ADMIN        │    │    ORGANIZATION ADMIN        │  │
│  │    (Platform team)      │    │    (Clinic, partner, etc.)   │  │
│  ├─────────────────────────┤    ├──────────────────────────────┤  │
│  │ Sees ALL orgs + users   │    │ Sees OWN org + members       │  │
│  │ ALL apps + services     │    │ Enabled apps only            │  │
│  │ Infrastructure + deploy │    │ Org analytics + billing      │  │
│  │ Cross-org analytics     │    │ Branding + custom domain     │  │
│  │ Platform billing + rev  │    │ Org newsletter + content     │  │
│  │ Compliance + full audit │    │ AI provider override         │  │
│  │ AI config (all)         │    │ Org audit log                │  │
│  │ Create orgs + licensing │    │ Member management            │  │
│  │ Content + i18n (all)    │    │                              │  │
│  │ Newsletter (platform)   │    │                              │  │
│  │ Service monitor + alerts│    │                              │  │
│  └─────────────────────────┘    └──────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │    APP USER (end user)                                        │ │
│  │    No admin access. Uses /settings within the app.            │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Current State -- SHI Admin Panel (17 tabs)

From the production admin at `app.sovereignhealth.io/admin`:

```
CURRENT SHI ADMIN PANEL              ELEVATION TARGET
┌──────────────────────────┐
│ Dashboard                │ ──> Platform: cross-org metrics
│ Users                    │ ──> Platform: all users + org-scoped view
│ Admin Settings           │ ──> Platform: platform config
│ Payments                 │ ──> Platform: gateway management
│ Promotions               │ ──> Platform: promo codes cross-org
│ Affiliates               │ ──> Platform: commission mgmt + org view
│ Short Links              │ ──> Platform: Sovereign Link analytics
│ Revenue Simulator        │ ──> Platform: pricing + revenue model
│ Content App              │ ──> STAYS: SHI-specific (markers, zones)
│ Content Web              │ ──> Platform: website CMS
│ Content Strings          │ ──> SPLIT: platform strings + app strings
│ Newsletter               │ ──> Platform: multi-org subscriber mgmt
│ AI Usage                 │ ──> Platform: cross-org AI cost tracking
│ Audit Logs               │ ──> Platform: full audit + org-scoped
│ API Monitoring           │ ──> Platform: service health dashboard
│ Contact                  │ ──> Platform: support inbox
│ Website (publish)        │ ──> Platform: CMS deploy pipeline
└──────────────────────────┘
```

**Only "Content App" stays SHI-specific** (markers, zones, tiers translations).
**Content Strings splits**: platform-level strings (shared) + app-level strings (SHI-specific).
**Everything else elevates** to the platform GUI.

---

## 3. Unified Navigation

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ■ BrickOS Admin                                  Helmut  [EN]  [Logout]│
├────────────┬─────────────────────────────────────────────────────────────┤
│            │                                                             │
│  OVERVIEW  │  (Page content -- role-filtered)                            │
│  ◉ Home    │                                                             │
│            │                                                             │
│  MANAGE    │     B = BrickOS Admin only                                  │
│  ◎ Apps    │     O = Org Admin sees own scope                            │
│  ◎ Orgs  B │     (blank) = both see, filtered by role                    │
│  ◎ Users   │                                                             │
│  ◎ Members │                                                             │
│            │                                                             │
│  COMMERCE  │                                                             │
│  ◎ Billing │                                                             │
│  ◎ Affiliates                                                            │
│  ◎ Promos B│                                                             │
│  ◎ Revenue B                                                             │
│            │                                                             │
│  LINKS     │                                                             │
│  ◎ Links   │                                                             │
│  ◎ Analytics                                                             │
│            │                                                             │
│  CONTENT   │                                                             │
│  ◎ App   B │  (SHI markers, zones, tiers -- app-specific)               │
│  ◎ Web     │  (Website CMS -- platform or org website)                   │
│  ◎ Strings │  (i18n -- platform strings + app strings)                   │
│  ◎ Newsletter                                                            │
│  ◎ Contact │                                                             │
│            │                                                             │
│  AI        │                                                             │
│  ◎ Config  │  (Provider profiles + failover)                             │
│  ◎ Usage   │  (Token consumption + cost)                                 │
│            │                                                             │
│  OPS     B │                                                             │
│  ◎ Services│  (Health monitor + Gatus)                                   │
│  ◎ Alerts  │  (ntfy + Telegram rules)                                    │
│  ◎ Deploy  │  (Website publish + deploy history)                         │
│            │                                                             │
│  SECURITY  │                                                             │
│  ◎ Audit   │  (Access + event + PGAudit logs)                            │
│  ◎ Compliance B (GDPR, NIS2, CRA, AI Act)                               │
│            │                                                             │
│  SETTINGS  │                                                             │
│  ◎ Platform B (App settings by category)                                 │
│  ◎ Branding O (Logo, colors, footer -- org admin only)                   │
│  ◎ Domains O (Custom domain mapping -- org admin only)                   │
│  ◎ Licensing B (Org licensing for on-prem)                               │
│            │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 4. Role-Based Visibility Matrix

Every nav item, every API call filtered by role:

```
┌────────────────────┬────────────────┬──────────────────┐
│ Page / Feature     │ BrickOS Admin  │ Org Admin        │
├────────────────────┼────────────────┼──────────────────┤
│ OVERVIEW                                               │
│ Home Dashboard     │ All orgs       │ Own org          │
├────────────────────┼────────────────┼──────────────────┤
│ MANAGE                                                 │
│ Apps               │ All apps       │ Enabled apps     │
│ Organizations      │ All orgs CRUD  │ HIDDEN           │
│ Users              │ All users      │ HIDDEN           │
│ Members            │ HIDDEN         │ Own org members  │
├────────────────────┼────────────────┼──────────────────┤
│ COMMERCE                                               │
│ Billing            │ All orgs       │ Own org          │
│ Affiliates         │ All + approve  │ Own org stats    │
│ Promotions         │ Full CRUD      │ HIDDEN           │
│ Revenue Simulator  │ Full           │ HIDDEN           │
├────────────────────┼────────────────┼──────────────────┤
│ LINKS                                                  │
│ Short Links        │ All links      │ Own org links    │
│ Analytics          │ Cross-org      │ Own org          │
├────────────────────┼────────────────┼──────────────────┤
│ CONTENT                                                │
│ Content App        │ Full (SHI)     │ HIDDEN           │
│ Content Web        │ Platform site  │ Org website      │
│ Content Strings    │ All sections   │ Own app strings  │
│ Newsletter         │ All subscribers│ Own org subs     │
│ Contact            │ All            │ Own org          │
├────────────────────┼────────────────┼──────────────────┤
│ AI                                                     │
│ AI Config          │ Platform + all │ Own org override │
│ AI Usage           │ Cross-org      │ Own org          │
├────────────────────┼────────────────┼──────────────────┤
│ OPS                                                    │
│ Services           │ Full           │ HIDDEN           │
│ Alerts             │ Full           │ HIDDEN           │
│ Deploy             │ Full           │ HIDDEN           │
├────────────────────┼────────────────┼──────────────────┤
│ SECURITY                                               │
│ Audit Logs         │ All            │ Own org          │
│ Compliance         │ Full           │ HIDDEN           │
├────────────────────┼────────────────┼──────────────────┤
│ SETTINGS                                               │
│ Platform Settings  │ Full           │ HIDDEN           │
│ Branding           │ HIDDEN         │ Own org          │
│ Domains            │ HIDDEN         │ Own org          │
│ Licensing          │ Full           │ HIDDEN           │
└────────────────────┴────────────────┴──────────────────┘
```

---

## 5. Key Pages -- ASCII Wireframes

### 5.1 Home Dashboard

**BrickOS Admin sees:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                         [30d ▾]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐      │
│  │ Users  13 │ │ Verified  │ │Active(7d) │ │Active(30d)│      │
│  │           │ │    13     │ │     4     │ │     8     │      │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘      │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐      │
│  │Signups(7d)│ │ Measure-  │ │  Orgs     │ │  MRR      │      │
│  │     5     │ │ments 5405 │ │    18     │ │  EUR 0    │      │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘      │
│                                                                 │
│  Platform License Distribution                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Foundation (free)                                        │   │
│  │   ████████████████████████████████████████  13 (81.3%)  │   │
│  │ Builder                                                  │   │
│  │   ██████                                    2 (12.5%)   │   │
│  │ Sovereign                                                │   │
│  │   ██                                        1  (6.3%)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  Note: Platform tiers are app-agnostic. Each tier grants        │
│  a bundle of app entitlements (see Section 5.8 Licensing).      │
│                                                                 │
│  Service Health                                    [All ▾]     │
│  ┌──────────────┬───────┬───────┬────────┬─────────────────┐   │
│  │ Service      │ Prod  │ Stag  │ Avg ms │ Uptime (30d)    │   │
│  ├──────────────┼───────┼───────┼────────┼─────────────────┤   │
│  │ SHI API      │  ●    │  ●    │   12   │ ████████ 99.9%  │   │
│  │ SHI App      │  ●    │  ●    │    8   │ ████████ 100%   │   │
│  │ SHI Website  │  ●    │  ●    │   45   │ ████████ 100%   │   │
│  │ Sov. Link    │  ●    │  ●    │    3   │ ████████ 100%   │   │
│  │ Sov. Voice   │  ●    │  --   │   --   │ ████████ active │   │
│  │ PostgreSQL   │  ●    │  ●    │   ok   │ ████████ healthy│   │
│  │ Redis        │  ●    │  ●    │   ok   │ ████████ healthy│   │
│  └──────────────┴───────┴───────┴────────┴─────────────────┘   │
│                                                                 │
│  Translation Status                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ EN  ████████████████████████████████████████  181/187   │   │
│  │ DE  ████████████████████████████████████████  181/187   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recent Activity                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 07 Apr 06:23  Deploy v0.38.1 -> production       [OK]  │   │
│  │ 07 Apr 05:33  Deploy v0.38.1 -> staging          [OK]  │   │
│  │ 07 Apr 04:53  Signup: test@example.com                  │   │
│  │ 06 Apr 12:50  NOSTR: pob-day01 published (3/3)         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Org Admin sees** (same page, filtered):
```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard -- Clinic XY                            [30d ▾]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐      │
│  │Members 12 │ │Active(7d) │ │ Links  8  │ │ Clicks 89 │      │
│  │ 3 admins  │ │     7     │ │ 3 vanity  │ │  +12 7d   │      │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘      │
│                                                                 │
│  Enabled Apps                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● SHI          v0.38.1   12 users   1,234 measurements │   │
│  │ ● Sov. Link    v0.3.0    8 links    89 clicks          │   │
│  │ ○ Sov. Voice   --        [Request Access]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recent Member Activity                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ dr.mueller@clinic  logged in 2h ago                     │   │
│  │ nurse.anna@clinic  imported 15 measurements             │   │
│  │ patient.hans       viewed trends                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 AI Configuration -- Provider Profiles with Failover

```
┌─────────────────────────────────────────────────────────────────┐
│  AI Configuration                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AI PROFILES                                    [+ New Profile] │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  ★ DEFAULT (active)                                     │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │ Provider:    Anthropic                            │  │   │
│  │  │ Model:       Claude Sonnet 4                      │  │   │
│  │  │ API Key:     ●●●●●●●●●●●  [Reveal] [Rotate]     │  │   │
│  │  │ Max tokens:  4096                                 │  │   │
│  │  │ Temperature: 0.7                                  │  │   │
│  │  │ Status:      ● Connected (342ms)                  │  │   │
│  │  │ EU AI Act:   Limited Risk (Art. 50)               │  │   │
│  │  │              [Test Connection]  [Set as Default]   │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  │  FAILOVER                                               │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │ Provider:    OpenAI                               │  │   │
│  │  │ Model:       GPT-4o                               │  │   │
│  │  │ API Key:     ●●●●●●●●●●●  [Reveal] [Rotate]     │  │   │
│  │  │ Max tokens:  4096                                 │  │   │
│  │  │ Status:      ● Connected (289ms)                  │  │   │
│  │  │ Auto-switch: After 3 failures in 5min             │  │   │
│  │  │              [Test Connection]  [Set as Default]   │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  │  SELF-HOSTED (for on-prem orgs)                         │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │ Provider:    Ollama                               │  │   │
│  │  │ Model:       Llama 3.1 70B                        │  │   │
│  │  │ Base URL:    http://localhost:11434                │  │   │
│  │  │ Status:      ○ Not configured                     │  │   │
│  │  │              [Test Connection]                     │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ORG OVERRIDES (BrickOS Admin only)                             │
│  ┌──────────────┬────────────┬──────────┬──────────┬────────┐  │
│  │ Organization │ Profile    │ Model    │ Status   │ Action │  │
│  ├──────────────┼────────────┼──────────┼──────────┼────────┤  │
│  │ BrickOS      │ Default    │ Sonnet 4 │   ●      │ [Edit] │  │
│  │ Clinic XY    │ Failover   │ GPT-4o   │   ●      │ [Edit] │  │
│  │ Self-hosted  │ Self-hosted│ Llama 3  │   ◐      │ [Edit] │  │
│  │ (others)     │ Default    │ --       │   ●      │        │  │
│  └──────────────┴────────────┴──────────┴──────────┴────────┘  │
│                                                                 │
│  Failover Rules                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ If DEFAULT fails 3x in 5min -> switch to FAILOVER       │   │
│  │ If FAILOVER fails 3x in 5min -> queue requests (no AI)  │   │
│  │ Auto-recover: check DEFAULT every 5min, switch back     │   │
│  │ Notify: ntfy + telegram on every provider switch        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Usage (30d)                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Total: 1,245K tokens  |  Cost: EUR 12.45                │   │
│  │ By org:  BrickOS 80%  |  Demo 15%  |  Clinic XY 5%     │   │
│  │ By feat: Dr. Alex 70% |  Import 25% |  Other 5%        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Organizations + Licensing (BrickOS Admin)

```
┌─────────────────────────────────────────────────────────────────┐
│  Organizations                                  [+ New Org]    │
├─────────────────────────────────────────────────────────────────┤
│  Search: [____________]  Type: [All ▾]  Status: [All ▾]       │
│                                                                 │
│  ┌──────────┬──────────┬────────┬────────┬────────┬─────────┐ │
│  │ Name     │ Type     │ Members│ License│ Apps   │ Status  │ │
│  ├──────────┼──────────┼────────┼────────┼────────┼─────────┤ │
│  │ BrickOS  │ platform │   16   │ --     │ all    │  ●      │ │
│  │ Demo     │ demo     │    3   │ --     │ SHI    │  ●      │ │
│  │ Clinic XY│ clinic   │   12   │ Enterp.│ SHI+SL │  ●      │ │
│  │ Helmut   │ personal │    1   │ Horizon│ SHI    │  ●      │ │
│  └──────────┴──────────┴────────┴────────┴────────┴─────────┘ │
│                                                                 │
│  CREATE NEW ORGANIZATION                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Name:     [________________________]                     │   │
│  │ Type:     [Clinic ▾]  (personal/clinic/enterprise/demo) │   │
│  │ Admin:    [admin@clinic.com________]  (creates account) │   │
│  │ License:  [Enterprise ▾]                                │   │
│  │                                                         │   │
│  │ Enable Apps:                                            │   │
│  │   [x] Sovereign Health (SHI)                            │   │
│  │   [x] Sovereign Link                                    │   │
│  │   [ ] Sovereign Voice                                   │   │
│  │                                                         │   │
│  │ Deployment:                                             │   │
│  │   ( ) Platform hosted (brickos.io)                      │   │
│  │   ( ) Customer server (on-prem license)                 │   │
│  │                                                         │   │
│  │ On-Prem License Key:                                    │   │
│  │   [Auto-generated on create -- JWT signed]              │   │
│  │   Expires: [2027-04-07]  Features: [SHI, Sov. Link]    │   │
│  │                                                         │   │
│  │ [Create Organization]                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ORG PARAMETERS (editable after creation)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Org: Clinic XY                          [Save Changes]  │   │
│  │                                                         │   │
│  │ Seat Limits:                                            │   │
│  │   Admins:       [  3  ]  (org owners + admins)          │   │
│  │   Editors:      [ 10  ]  (practitioners, assistants)    │   │
│  │   Consumers:    [unlimited ▾]  (patients, read-only)    │   │
│  │                                                         │   │
│  │ App Entitlements:                                       │   │
│  │   SHI:          [x] Enabled  Max markers: [unlimited]   │   │
│  │   Sov. Link:    [x] Enabled  Max links: [500]          │   │
│  │   Sov. Voice:   [ ] Disabled                            │   │
│  │                                                         │   │
│  │ Storage / Limits:                                       │   │
│  │   Max measurements per user: [unlimited]                │   │
│  │   Max imports per month:     [100]                      │   │
│  │   AI credits per month:      [10,000 tokens]            │   │
│  │                                                         │   │
│  │ License:                                                │   │
│  │   Type:     [Enterprise ▾]                              │   │
│  │   Expires:  [2027-04-07]  [Renew]                       │   │
│  │   Key:      eyJ...  [Regenerate]                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Members (Org Admin View)

```
┌─────────────────────────────────────────────────────────────────┐
│  Members -- Clinic XY                           [+ Invite]     │
├─────────────────────────────────────────────────────────────────┤
│  Search: [____________]  Role: [All ▾]                         │
│                                                                 │
│  ┌────────────────────┬────────┬───────┬───────────┬────────┐  │
│  │ Name               │ Role   │ Apps  │ Last seen │ Action │  │
│  ├────────────────────┼────────┼───────┼───────────┼────────┤  │
│  │ Dr. Mueller        │ owner  │ SHI   │ 2h ago    │ [...]  │  │
│  │ Nurse Anna         │ admin  │ SHI+SL│ 1d ago    │ [...]  │  │
│  │ Dr. Schmidt        │ member │ SHI   │ 3d ago    │ [...]  │  │
│  │ Hans (patient)     │ patient│ SHI   │ 1w ago    │ [...]  │  │
│  └────────────────────┴────────┴───────┴───────────┴────────┘  │
│                                                                 │
│  INVITE MEMBER                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Email: [__________________]                              │   │
│  │ Role:  [Member ▾]  (owner/admin/member/patient)         │   │
│  │ Apps:  [x] SHI  [x] Sovereign Link                     │   │
│  │ [Send Invitation]                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Newsletter (Elevated to Platform)

```
┌─────────────────────────────────────────────────────────────────┐
│  Newsletter                                                     │
├─────────────────────────────────────────────────────────────────┤
│  [Subscribers]  [Campaigns]  [Settings]                        │
│                                                                 │
│  BrickOS Admin sees: ALL subscribers across all orgs            │
│  Org Admin sees: OWN org subscribers only                       │
│                                                                 │
│  Subscribers                     Org: [All ▾]  Status: [All ▾]│
│  ┌──────────────────┬──────────┬──────────┬─────────┬───────┐  │
│  │ Email            │ Org      │ Status   │ Source  │ Date  │  │
│  ├──────────────────┼──────────┼──────────┼─────────┼───────┤  │
│  │ user1@...        │ BrickOS  │subscribed│ signup  │ Mar 1 │  │
│  │ user2@...        │ Clinic   │subscribed│ invite  │ Mar 5 │  │
│  │ user3@...        │ BrickOS  │ unsub    │ signup  │ Feb 1 │  │
│  └──────────────────┴──────────┴──────────┴─────────┴───────┘  │
│                                                                 │
│  Total: 45 subscribed  |  3 unsubscribed  |  [Export CSV]      │
│  [Sync to Mailgun]                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.6 Service Health Monitor (BrickOS Admin only)

```
┌─────────────────────────────────────────────────────────────────┐
│  Service Health                          [Prod ▾]  [24h ▾]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Uptime Timeline                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ SHI API     ████████████████████████████████████████████│   │
│  │ SHI App     ████████████████████████████████████████████│   │
│  │ Website     ████████████████████████████████████████████│   │
│  │ Sov. Link   ████████████████████████████████████████████│   │
│  │ Sov. Voice  ████████████████████████████████████████████│   │
│  │ PostgreSQL  ████████████████████████████████████████████│   │
│  │ Redis       ████████████████████████████████████████████│   │
│  │ Gatus       ████████████████████████████████████████████│   │
│  │ ntfy        ████████████████████████████████████████████│   │
│  │             00:00    06:00    12:00    18:00    now     │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ████ healthy  ░░░░ degraded  ▓▓▓▓ down                       │
│                                                                 │
│  Container Details                                              │
│  ┌──────────────┬─────────┬────────┬────────┬────────────┐    │
│  │ Container    │ Version │ CPU    │ Memory │ Uptime     │    │
│  ├──────────────┼─────────┼────────┼────────┼────────────┤    │
│  │ sh-backend   │ v0.38.1 │  2.3%  │ 245MB  │ 3h         │    │
│  │ sh-frontend  │ v0.28.0 │  0.1%  │  75MB  │ 3h         │    │
│  │ sh-db        │ PG 16   │  1.2%  │ 512MB  │ 26h        │    │
│  │ sh-redis     │ 7.4     │  0.0%  │  12MB  │ 26h        │    │
│  └──────────────┴─────────┴────────┴────────┴────────────┘    │
│                                                                 │
│  Alert Rules (all via ntfy + telegram)          [+ New Rule]   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● API response > 500ms     -> ntfy + telegram    [ON]  │   │
│  │ ● Any service down > 2min  -> ntfy + telegram    [ON]  │   │
│  │ ● DB connections > 15/20   -> ntfy + telegram    [ON]  │   │
│  │ ● Deploy failure           -> ntfy + telegram    [ON]  │   │
│  │ ● TLS cert < 14d           -> ntfy + telegram    [ON]  │   │
│  │ ● AI provider switch       -> ntfy + telegram    [ON]  │   │
│  │ ● Migration failure        -> ntfy + telegram    [ON]  │   │
│  │ ● Disk usage > 80%         -> ntfy + telegram    [ON]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  All notifications route through ntfy (push) AND telegram      │
│  (chat). No silent alerts -- every alert hits both channels.   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.7 Org Branding + Custom Domains (Org Admin only)

```
┌─────────────────────────────────────────────────────────────────┐
│  Branding -- Clinic XY                                          │
├─────────────────────────────────────────────────────────────────┤
│  [Branding]  [Custom Domain]                                    │
│                                                                 │
│  Logo:    [Upload]  Current: clinic-xy-logo.svg                │
│  Colors:                                                        │
│    Primary:    [#2563eb ■]                                      │
│    Accent:     [#f97316 ■]                                      │
│  Footer:  [Clinic XY GmbH - Impressum____________]             │
│                                                                 │
│  Preview:                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [clinic-logo]  Sovereign Health    Dr. Mueller  [DE]   │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  (Preview of branded header with org colors)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Theme Template:                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Base: [BrickOS Dark ▾]                                  │   │
│  │                                                         │   │
│  │ Presets:                                                │   │
│  │   ● BrickOS Dark (default)                              │   │
│  │   ○ BrickOS Light                                       │   │
│  │   ○ Clinical (blue accent)                              │   │
│  │   ○ Minimal (neutral)                                   │   │
│  │   ○ Custom JSON                                         │   │
│  │                                                         │   │
│  │ Override Colors:                                        │   │
│  │   Primary:    [#2563eb ■]                               │   │
│  │   Accent:     [#f97316 ■]                               │   │
│  │   Background: [#09090b ■]                               │   │
│  │                                                         │   │
│  │ [Upload JSON theme]  [Download Default]  [Preview]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Custom Domain:                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Domain:  health.clinic-xy.de                             │   │
│  │ Status:  ● SSL active (Let's Encrypt, expires 2026-07)  │   │
│  │ DNS:     CNAME -> app.sovereignhealth.io                │   │
│  │                                                         │   │
│  │ [Verify DNS]  [Renew SSL]                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Save Changes]                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Architecture

### 6.1 Frontend

```
/admin/                          -- layout.tsx (role check, sidebar filter)
/admin/page.tsx                  -- Dashboard (role-filtered)
/admin/apps/page.tsx             -- App registry
/admin/orgs/page.tsx             -- Orgs list (BrickOS) / redirect (Org)
/admin/orgs/new/page.tsx         -- Create org (BrickOS only)
/admin/users/page.tsx            -- All users (BrickOS only)
/admin/members/page.tsx          -- Org members (Org admin only)
/admin/billing/page.tsx          -- Billing (role-filtered)
/admin/affiliates/page.tsx       -- Affiliates (role-filtered)
/admin/promotions/page.tsx       -- Promotions (BrickOS only)
/admin/revenue/page.tsx          -- Revenue simulator (BrickOS only)
/admin/links/page.tsx            -- Short links (role-filtered)
/admin/analytics/page.tsx        -- Click analytics (role-filtered)
/admin/content/app/page.tsx      -- App content (BrickOS only)
/admin/content/web/page.tsx      -- Website CMS (role-filtered)
/admin/content/strings/page.tsx  -- i18n strings
/admin/newsletter/page.tsx       -- Newsletter (role-filtered)
/admin/contact/page.tsx          -- Contact inbox (role-filtered)
/admin/ai/config/page.tsx        -- AI profiles + failover
/admin/ai/usage/page.tsx         -- AI usage stats (role-filtered)
/admin/services/page.tsx         -- Service monitor (BrickOS only)
/admin/alerts/page.tsx           -- Alert rules (BrickOS only)
/admin/deploy/page.tsx           -- Deploy + website publish (BrickOS only)
/admin/audit/page.tsx            -- Audit logs (role-filtered)
/admin/compliance/page.tsx       -- Compliance (BrickOS only)
/admin/settings/page.tsx         -- Platform settings (BrickOS only)
/admin/branding/page.tsx         -- Org branding (Org admin only)
/admin/domains/page.tsx          -- Custom domains (Org admin only)
/admin/licensing/page.tsx        -- Org licensing (BrickOS only)
```

### 6.2 Middleware Pattern

```typescript
// /admin/layout.tsx
export default function AdminLayout({ children }) {
  const { user, role, org_id } = useAuth()

  // No admin access for regular users
  if (role !== 'platform_admin' && role !== 'org_admin') {
    redirect('/dashboard')
  }

  const isPlatform = role === 'platform_admin'
  const isOrg = role === 'org_admin'

  return (
    <AdminShell
      nav={buildNav(isPlatform, isOrg)}
      orgName={isOrg ? org?.name : 'BrickOS'}
    >
      <AdminContext.Provider value={{ isPlatform, isOrg, org_id }}>
        {children}
      </AdminContext.Provider>
    </AdminShell>
  )
}
```

### 6.3 API Scoping

```rust
// Backend middleware
pub struct PlatformAdmin;  // role == platform_admin
pub struct OrgAdmin;       // role == org_admin, org_id in JWT
pub struct AnyAdmin;       // either role

// Endpoints use the appropriate guard:
#[get("/admin/orgs")]
async fn list_orgs(_: PlatformAdmin) -> Result<...>  // BrickOS only

#[get("/admin/members")]
async fn list_members(admin: OrgAdmin) -> Result<...>  // scoped to admin.org_id

#[get("/admin/analytics")]
async fn analytics(admin: AnyAdmin, query: Query) -> Result<...>
  // PlatformAdmin: cross-org
  // OrgAdmin: WHERE org_id = admin.org_id
```

---

## 7. SHI Admin Elevation Map

Complete mapping of current 17 tabs to new admin GUI:

```
CURRENT TAB            NEW LOCATION              CHANGES NEEDED
──────────────────────────────────────────────────────────────────
Dashboard          ->  /admin (home)             Add service health, org filter
Users              ->  /admin/users              Add org filter for org admins
Admin Settings     ->  /admin/settings           No change (platform only)
Payments           ->  /admin/billing            Add org scope
Promotions         ->  /admin/promotions         No change (platform only)
Affiliates         ->  /admin/affiliates         Add org scope for org admins
Short Links        ->  /admin/links              Add org scope + analytics
Revenue Simulator  ->  /admin/revenue            No change (platform only)
Content App        ->  /admin/content/app        STAYS SHI-specific
Content Web        ->  /admin/content/web        Add org website support
Content Strings    ->  /admin/content/strings    Split platform/app sections
Newsletter         ->  /admin/newsletter         Add org scope
AI Usage           ->  /admin/ai/usage           Add org scope
Audit Logs         ->  /admin/audit              Add org scope
API Monitoring     ->  /admin/services           Expand to full service monitor
Contact            ->  /admin/contact            Add org scope
Website            ->  /admin/deploy             Expand to deploy pipeline

NEW PAGES (not in current SHI admin):
──────────────────────────────────────────────────────────────────
/admin/apps                    App registry + pillar view
/admin/orgs                    Org management + create
/admin/orgs/new                Create org + licensing
/admin/members                 Org member management
/admin/analytics               Click analytics (Recharts)
/admin/ai/config               AI profiles + failover
/admin/alerts                  Alert rules (ntfy + telegram)
/admin/compliance              GDPR/NIS2/CRA/AI Act status
/admin/branding                Org branding (logo, colors)
/admin/domains                 Custom domain mapping
/admin/licensing               On-prem license key management
```

---

## 8. Migration Path

### Phase 1: Foundation (Sprint 031)
- Create `/admin/` layout with role-based sidebar
- Move Dashboard tab (add org filter)
- Move Users tab (add org scope -> becomes Members for org admin)
- Add Service Health page (Gatus integration)
- Add Apps Registry page (read-only)

### Phase 2: Commerce + Content (Sprint 032)
- Move Billing, Affiliates, Promotions, Revenue
- Move Newsletter (add org scope)
- Move Content Web, Content Strings (split platform/app)
- Move Contact
- Add Org Management page (create org, licensing)

### Phase 3: Analytics + AI (Sprint 033)
- Add Click Analytics dashboard (Recharts)
- Add AI Config page (profiles, failover, org overrides)
- Move AI Usage (add org scope)
- Move Audit Logs (add org scope)
- Add Compliance dashboard

### Phase 4: Org Self-Service (Sprint 034)
- Add Branding page (org admin)
- Add Custom Domains page (org admin)
- Add Member Management (invite, roles)
- Add On-prem Licensing page
- Deprecate old `/admin/` SHI routes

---

## 9. Design Tokens

```
Background:     #09090b (zinc-950)
Surface:        #18181b (zinc-900)
Border:         #27272a (zinc-800)
Text primary:   #fafafa (zinc-50)
Text secondary: #a1a1aa (zinc-400)
Accent:         #f97316 (orange-500)    -- BrickOS brand
Success:        #4ade80 (green-400)
Warning:        #fbbf24 (amber-400)
Error:          #ef4444 (red-400)
Info:           #60a5fa (blue-400)

Font:           Geist / Geist Mono
Border radius:  0.75rem (rounded-xl)
Cards:          rounded-2xl border p-5
Sidebar:        240px fixed, collapsible to 64px (icons only)
```

---

## 10. Decisions (Confirmed)

1. **On-prem licensing**: JWT-based license key. Signed by BrickOS platform key.
   Claims: `{ org_id, features: ["shi", "sovereign-link"], max_admins: 3, max_editors: 10, max_consumers: "unlimited", expires: "2027-04-07" }`.
   Validated offline (no phone-home). Regeneratable from platform admin.

2. **Gatus integration**: Custom health aggregator that reads Gatus config + polls
   service `/health` endpoints directly. More secure than exposing Gatus API.
   Aggregator runs server-side, caches results 60s, no external API exposure.

3. **AI failover timing**: 3 failures in 5 minutes triggers switch to failover profile.
   Auto-recover: check default every 5 minutes, switch back when healthy.
   Every provider switch notifies via ntfy + telegram.

4. **Org admin self-signup**: Only BrickOS admin can create organizations.
   Org admin is assigned during org creation. No self-service org creation.

5. **Content App**: Stays in SHI context (markers, zones, tier translations).
   Platform GUI does not manage app-specific health content.

6. **Notifications**: ALL alerts route through both ntfy AND telegram. No silent channels.

7. **Encryption**: All data at rest encrypted (AES-256-GCM). Platform GUI decrypts
   on read via Encryptor service. No plaintext storage for PII or health data.

8. **App naming**: "BrickOS Platform" for admin app. Org view shows
   "BrickOS Platform - {OrgName}". BrickOS cube logo as app icon.

## 11. Platform License Tiers

### 11.1 Two-Layer Tier System

BrickOS uses a **two-layer** licensing model:

1. **Platform tiers** (5 tiers) -- the common denominator across all apps
2. **App-specific tier names** -- each app can brand/name tiers differently,
   but they MAP to the same 5 platform tiers under the hood

This keeps 5 tiers total (not more), allows apps to use domain-appropriate
naming, and has one central place to define features.

```
┌─────────────────────────────────────────────────────────────────────┐
│  PLATFORM TIERS (internal, stored in DB)                            │
│                                                                     │
│  T1: Free  ->  T2: Starter  ->  T3: Pro  ->  T4: Premium  ->  T5  │
│                                                     Enterprise/Self │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SHI NAMES         │ LINK NAMES       │ VOICE NAMES                │
│  (user-facing)     │ (user-facing)    │ (user-facing)              │
│  ─────────────     │ ────────────     │ ───────────                │
│  Glimpse  -> T1    │ Basic   -> T1    │ Free     -> T1             │
│  Focus    -> T2    │ Growth  -> T2    │ Creator  -> T2             │
│  Insight  -> T3    │ Scale   -> T3    │ Pro      -> T3             │
│  Clarity  -> T4    │ Agency  -> T4    │ Studio   -> T4             │
│  Horizon  -> T5    │ Self-   -> T5    │ Self-    -> T5             │
│                    │  hosted          │  hosted                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Feature Entitlements per Platform Tier

All feature limits defined once in `tier_features` table with `app_key`:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    T1 Free   T2 Starter  T3 Pro     T4 Premium  T5 Self │
│                    EUR 0     EUR 9.99    EUR 24.99  EUR 49.99   Custom  │
├──────────────────────────────────────────────────────────────────────────┤
│ SHI                                                                      │
│  Biomarkers        8         20          50         Unlimited   Unlim.  │
│  History           30d       365d        Unlimited  Unlimited   Unlim.  │
│  Calc. markers     1         3           8          Unlimited   Unlim.  │
│  Measurements      100       250         500        Unlimited   Unlim.  │
│  AI credits/mo     5         15          50         Unlimited   Unlim.  │
│  Trend analysis    --        3/mo        10/mo      Unlimited   Unlim.  │
│  Lab explanations  --        3/mo        10/mo      Unlimited   Unlim.  │
│  Influence factors 2         10          25         Unlimited   Unlim.  │
│  Reference ranges  --        Unlimited   Unlimited  Unlimited   Unlim.  │
│  PDF reports       --        --          1/mo       2/mo        Unlim.  │
│  Lab import        --        --          3/mo       4/mo        Unlim.  │
│  Protocol compare  --        --          5/mo       Unlimited   Unlim.  │
│  Body composition  --        Unlimited   Unlimited  Unlimited   Unlim.  │
│  2FA               --        Unlimited   Unlimited  Unlimited   Unlim.  │
│  CSV/JSON export   --        Unlimited   Unlimited  Unlimited   Unlim.  │
├──────────────────────────────────────────────────────────────────────────┤
│ Sovereign Link                                                           │
│  Short links       5         50          200        Unlimited   Unlim.  │
│  Vanity codes      --        1           5          Unlimited   Unlim.  │
│  Click analytics   Basic     Full        Full       Full + API  Full    │
│  Campaign links    --        3           10         Unlimited   Unlim.  │
├──────────────────────────────────────────────────────────────────────────┤
│ Sovereign Voice                                                          │
│  Scheduled notes   --        5           20         Unlimited   Unlim.  │
│  Relays            --        3           5          Custom      Custom  │
│  Auto-shorten URLs --        Yes         Yes        Yes         Yes     │
├──────────────────────────────────────────────────────────────────────────┤
│ Platform                                                                 │
│  Custom branding   --        --          --         Yes         Yes     │
│  Custom domain     --        --          --         Yes         Yes     │
│  Team sharing      --        --          --         Yes         Yes     │
│  Data export       --        Yes         Yes        Yes         Yes     │
│  API access        --        --          --         Unlimited   Unlim.  │
│  Self-hosted       --        --          --         --          Yes     │
│  Priority support  --        --          --         Yes         Yes     │
│  BTC discount      --        5%          5%         5%          5%      │
├──────────────────────────────────────────────────────────────────────────┤
│ Organization (add-on for T4/T5)                                          │
│  Included licenses --        --          --         5           Custom  │
│  Additional seats  --        --          --         EUR 9/seat  Custom  │
│  Org admin panel   --        --          --         Yes         Yes     │
│  Org billing       --        --          --         Invoice     Custom  │
│  Service monitor   --        --          --         --          Yes     │
└──────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Implementation

```sql
-- tier_features table (one row per feature per tier per app)
tier_features (
  id UUID,
  tier_slug TEXT,       -- 'free', 'starter', 'pro', 'premium', 'enterprise'
  app_key TEXT,         -- 'shi', 'sovereign-link', 'sovereign-voice', 'platform'
  feature_key TEXT,     -- 'biomarkers', 'short_links', 'vanity_codes', etc.
  limit_value TEXT,     -- '8', '50', 'unlimited', 'true', 'false'
  created_at, updated_at
)

-- app_tier_names table (maps platform tier to app-specific display name)
app_tier_names (
  app_key TEXT,         -- 'shi'
  tier_slug TEXT,       -- 'free'
  display_name TEXT,    -- 'Glimpse'
  tagline TEXT,         -- 'Start your health journey'
  price_eur_cents INT,  -- 0
  price_btc_sats INT    -- 0
)
```

## 12. Organization Roles (Expanded)

### 12.1 Role Matrix

Organizations need more than just "admin" and "user". Real-world clinics,
practices, and partners have distinct operational roles:

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ORG ROLES                                                                │
├──────────────┬────────────────────────────────────────────────────────────┤
│ Role         │ Description + Access                                       │
├──────────────┼────────────────────────────────────────────────────────────┤
│              │                                                            │
│ OWNER        │ Full org control. One per org (the org creator).           │
│              │ Can transfer ownership. Sees everything.                   │
│              │                                                            │
│ TECH ADMIN   │ Technical operations -- manages the portal/platform.       │
│              │ ● Service health monitor (if self-hosted)                  │
│              │ ● Custom domain / SSL configuration                        │
│              │ ● Theme / branding setup                                   │
│              │ ● Member management (invite, disable)                      │
│              │ ● Audit logs                                               │
│              │ ● App enablement + configuration                           │
│              │ ✗ NO access to: billing, licenses, revenue, pricing        │
│              │                                                            │
│ COMMERCIAL   │ Business operations -- manages commerce + subscriptions.   │
│ ADMIN        │ ● Billing + invoices                                       │
│              │ ● License management + seat allocation                     │
│              │ ● Newsletter + subscriber management                       │
│              │ ● Affiliate program + commissions                          │
│              │ ● Revenue reporting                                        │
│              │ ● Promotions                                               │
│              │ ✗ NO access to: service monitor, audit logs, config        │
│              │                                                            │
│ EDITOR       │ Content creator -- works with consumer data.               │
│ (practitioner│ ● View assigned consumers' health data (with consent)      │
│  assistant)  │ ● Import lab results for consumers                         │
│              │ ● Add measurements on behalf of consumers                  │
│              │ ● View trends / analysis for assigned consumers            │
│              │ ● Share data summaries (PDF reports)                       │
│              │ ● Use Dr. Alex for consumer data analysis                  │
│              │ ● Manage own profile + settings                            │
│              │ ✗ NO admin access (no /admin/ routes)                      │
│              │                                                            │
│ CONSUMER     │ End user / patient. Uses the app directly.                 │
│ (patient)    │ ● Own data only (measurements, trends, Dr. Alex)           │
│              │ ● Can grant/revoke data sharing to editors                 │
│              │ ● Manage own profile + settings                            │
│              │ ● Self-service tier upgrade                                │
│              │ ✗ NO admin access                                          │
│              │                                                            │
└──────────────┴────────────────────────────────────────────────────────────┘
```

### 12.2 Admin GUI Visibility per Role

```
┌────────────────────┬─────────┬───────┬──────────┬────────┬──────────┐
│ Page               │ BrickOS │ Owner │ Tech     │ Commer.│ Editor / │
│                    │ Admin   │       │ Admin    │ Admin  │ Consumer │
├────────────────────┼─────────┼───────┼──────────┼────────┼──────────┤
│ Dashboard          │ All     │ Org   │ Org(tech)│Org(biz)│ --       │
│ Apps               │ All     │ Org   │ Org      │ --     │ --       │
│ Organizations      │ All     │ --    │ --       │ --     │ --       │
│ Users (platform)   │ All     │ --    │ --       │ --     │ --       │
│ Members            │ --      │ Full  │ Full     │ View   │ --       │
│ Billing            │ All     │ Org   │ --       │ Org    │ --       │
│ Affiliates         │ All     │ Org   │ --       │ Org    │ --       │
│ Promotions         │ Full    │ --    │ --       │ --     │ --       │
│ Revenue            │ Full    │ Org   │ --       │ Org    │ --       │
│ Links              │ All     │ Org   │ Org      │ Org    │ --       │
│ Analytics          │ All     │ Org   │ Org      │ Org    │ --       │
│ Content App        │ Full    │ --    │ --       │ --     │ --       │
│ Content Web        │ Full    │ Org   │ Org      │ --     │ --       │
│ Content Strings    │ Full    │ --    │ --       │ --     │ --       │
│ Newsletter         │ All     │ Org   │ --       │ Org    │ --       │
│ Contact            │ All     │ Org   │ Org      │ Org    │ --       │
│ AI Config          │ All     │ Org   │ Org      │ --     │ --       │
│ AI Usage           │ All     │ Org   │ Org      │ Org    │ --       │
│ Services           │ Full    │ --    │ Self-host│ --     │ --       │
│ Alerts             │ Full    │ --    │ Self-host│ --     │ --       │
│ Deploy             │ Full    │ --    │ --       │ --     │ --       │
│ Audit Logs         │ All     │ Org   │ Org      │ --     │ --       │
│ Compliance         │ Full    │ --    │ --       │ --     │ --       │
│ Platform Settings  │ Full    │ --    │ --       │ --     │ --       │
│ Branding           │ --      │ Full  │ Full     │ --     │ --       │
│ Domains            │ --      │ Full  │ Full     │ --     │ --       │
│ Licensing          │ Full    │ --    │ --       │ --     │ --       │
└────────────────────┴─────────┴───────┴──────────┴────────┴──────────┘
```

### 12.3 Editor Workflow

Editors (practitioners, assistants) work with consumer data in the **app itself**
(not the admin GUI). Their workflow:

```
┌─────────────────────────────────────────────────────────────────┐
│  EDITOR VIEW (in SHI app, not admin)                            │
│                                                                 │
│  My Consumers                                    [+ Request]   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Hans Mueller    ● shared     Last: 2h ago   [View]      │   │
│  │ Anna Schmidt    ● shared     Last: 1d ago   [View]      │   │
│  │ Peter Braun     ◐ pending    Awaiting consent            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Viewing: Hans Mueller                          [Back to list] │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Scope: measurements + trends (granted 2026-03-15)       │   │
│  │                                                         │   │
│  │ [Dashboard]  [History]  [Trends]  [Import]  [Dr. Alex]  │   │
│  │                                                         │   │
│  │ (Same views as the consumer sees, read-only or          │   │
│  │  with import capability depending on data_shares.scope) │   │
│  │                                                         │   │
│  │ Actions available:                                      │   │
│  │   ● View health zones + marker details                  │   │
│  │   ● View measurement history + trends                   │   │
│  │   ● Import lab results (PDF/CSV) on behalf              │   │
│  │   ● Add manual measurements on behalf                   │   │
│  │   ● Ask Dr. Alex about this consumer's data             │   │
│  │   ● Generate PDF health report                          │   │
│  │   ✗ Cannot edit consumer's settings                     │   │
│  │   ✗ Cannot delete consumer's data                       │   │
│  │   ✗ Cannot change consumer's tier/role                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

The `data_shares` table (already in brickos schema) controls exactly what
an editor can see:
- `scope: all` -- full read access
- `scope: measurements` -- can view + add measurements
- `scope: measurements_readonly` -- view only
- `scope: trends` -- can view trends + analysis
- `scope: summary` -- overview dashboard only
- `scope: doctor_chat` -- can use Dr. Alex for this consumer

## 13. Newsletter -- App Interest Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│  Newsletter Subscribers                                         │
├─────────────────────────────────────────────────────────────────┤
│  Org: [All ▾]  App: [All ▾]  Status: [All ▾]                 │
│                                                                 │
│  ┌────────────────┬────────┬──────────┬────────────┬────────┐  │
│  │ Email          │ Org    │ Status   │ Interests  │ Since  │  │
│  ├────────────────┼────────┼──────────┼────────────┼────────┤  │
│  │ user1@...      │BrickOS │subscribed│ SHI, Link  │ Mar 1  │  │
│  │ user2@...      │Clinic  │subscribed│ SHI        │ Mar 5  │  │
│  │ user3@...      │BrickOS │subscribed│ Voice      │ Apr 1  │  │
│  └────────────────┴────────┴──────────┴────────────┴────────┘  │
│                                                                 │
│  Interest is auto-detected from which apps the user has used.   │
│  No extra signup question needed -- derive from activity:       │
│    - Has SHI measurements -> interest: SHI                     │
│    - Has short links -> interest: Sovereign Link               │
│    - Has scheduled NOSTR notes -> interest: Sovereign Voice    │
│    - No activity -> interest: General (platform news only)     │
│                                                                 │
│  Filter campaigns by interest to avoid irrelevant emails.       │
└─────────────────────────────────────────────────────────────────┘
```

Decision: **Auto-detect interest from app usage** rather than asking during signup.
Simpler UX, more accurate, and updates automatically as users try new apps.

## 14. Service Monitor for Self-Hosted Orgs

For self-hosted (T5/Enterprise) deployments, the **Tech Admin** of the org
needs access to the service health monitor for their own instance:

```
┌─────────────────────────────────────────────────────────────────┐
│  Service Health -- Clinic XY (self-hosted)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Instance: clinic-xy.local:8080                                 │
│  License:  Valid until 2027-04-07  (342 days remaining)        │
│                                                                 │
│  ┌──────────────┬───────┬────────┬─────────────────────────┐   │
│  │ Service      │ Status│ Avg ms │ Uptime (30d)            │   │
│  ├──────────────┼───────┼────────┼─────────────────────────┤   │
│  │ SHI API      │  ●    │   15   │ ████████████████ 99.8%  │   │
│  │ SHI Frontend │  ●    │    5   │ ████████████████ 100%   │   │
│  │ PostgreSQL   │  ●    │   ok   │ ████████████████ healthy│   │
│  │ Redis        │  ●    │   ok   │ ████████████████ healthy│   │
│  └──────────────┴───────┴────────┴─────────────────────────┘   │
│                                                                 │
│  Disk: 45% used (23GB / 50GB)                                  │
│  Backup: Last 2h ago (auto-daily)                              │
│  Updates: v0.38.1 (current)  Latest: v0.38.1 (up to date)    │
│                                                                 │
│  Alerts route to org's own ntfy + telegram channels.            │
└─────────────────────────────────────────────────────────────────┘
```

Self-hosted service monitor reads from the local Gatus instance
(or custom health aggregator) on the org's own server. Alerts go to
the org's configured ntfy + telegram channels, not BrickOS platform.

## 15. Theme System

Decision: **JSON** (not XML) for theme templates. More developer-friendly,
native to the web stack, and can be validated with JSON Schema.

```json
{
  "name": "clinic-xy",
  "version": "1.0",
  "extends": "brickos-dark",
  "colors": {
    "primary": "#2563eb",
    "accent": "#f97316",
    "background": "#09090b",
    "surface": "#18181b",
    "border": "#27272a",
    "text": "#fafafa",
    "text-muted": "#a1a1aa"
  },
  "fonts": {
    "heading": "Geist",
    "body": "Geist",
    "mono": "Geist Mono"
  },
  "layout": {
    "sidebar": "left",
    "border-radius": "0.75rem",
    "card-padding": "1.25rem"
  },
  "logo": {
    "url": "/branding/clinic-xy-logo.svg",
    "height": "32px"
  }
}
```

- `extends: "brickos-dark"` -- inherits all defaults, only override what changes
- JSON Schema validation on upload (reject invalid themes)
- Download default template from admin
- Preview before applying

Built-in presets:
- `brickos-dark` (default -- dark bg, orange accent)
- `brickos-light` (light bg, orange accent)
- `clinical` (dark bg, blue accent, medical aesthetic)
- `minimal` (dark bg, neutral, no accent colors)

## 16. Decisions (Confirmed)

1. **On-prem licensing**: JWT-based license key. Signed by BrickOS platform key.
   Claims: `{ org_id, features, max_admins, max_editors, max_consumers, expires }`.
   Validated offline (no phone-home). Regeneratable from platform admin.

2. **Gatus integration**: Custom health aggregator that polls `/health` endpoints
   server-side. More secure than exposing Gatus API. Caches 60s.
   Self-hosted orgs run their own aggregator locally.

3. **AI failover**: 3 failures in 5 minutes triggers switch. Auto-recover every 5min.
   Every provider switch notifies via ntfy + telegram.

4. **Org creation**: BrickOS admin only. No self-service org signup.

5. **Content App**: Stays in SHI context (markers, zones, tier translations).

6. **Notifications**: ALL alerts via ntfy + telegram. No silent channels.

7. **Encryption**: All data at rest AES-256-GCM. Decrypt on read.

8. **BTC discount**: 5% on all paid tiers.

9. **Org billing**: Per-org invoicing. License includes N seats, additional at EUR 9/seat.

10. **Themes**: JSON (not XML). Extends base theme, JSON Schema validated.

11. **Newsletter interests**: Auto-detected from app usage, no signup question.

12. **Roles**: Owner + Tech Admin + Commercial Admin + Editor + Consumer.
    Tech admin cannot see commercial data. Commercial admin cannot see infra/audit.

13. **Service monitor**: Available to self-hosted org tech admins for their instance.

## 17. Remaining Open Questions

1. **Tier naming per app**: Are Glimpse/Focus/Insight/Clarity/Horizon final for SHI,
   or should we rename to match the cleaner platform tier progression?
2. **Editor pricing**: Do editors count as paid seats, or only admins?
3. **Data sharing consent flow**: In-app popup, or email-based approval?
4. **Self-hosted update mechanism**: Pull-based (check for updates), or manual?
