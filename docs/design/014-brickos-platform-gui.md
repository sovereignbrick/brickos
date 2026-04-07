# 014 - BrickOS Platform GUI

**Status:** Draft
**Author:** Helmut / Claude
**Date:** 2026-04-07
**Related:** 005-platform-multi-tenant, 006-platform-schema-elevation, 010-multi-tenant-platform-offering

---

## 1. Vision

The BrickOS Platform GUI is the **command center** for the entire Sovereign Brick ecosystem. It replaces the current app-level SHI admin panel with a platform-aware control surface that manages all apps, services, organizations, and infrastructure from a single interface.

Two distinct user roles access it:
- **Platform Admin** (BrickOS team): Full control over all orgs, apps, services, infrastructure
- **Org Admin** (customer): Control over their org's apps, users, billing, branding

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      BrickOS Platform GUI                        │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │  Platform   │  │    Org     │  │    App     │  │  Service  │ │
│  │   Admin     │  │   Admin    │  │  Consoles  │  │  Monitor  │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘ │
│        │               │               │               │        │
│  ══════╪═══════════════╪═══════════════╪═══════════════╪══════  │
│        │          BrickOS Platform API Layer            │        │
│  ══════╪═══════════════╪═══════════════╪═══════════════╪══════  │
│        │               │               │               │        │
│  ┌─────┴──────┐  ┌─────┴──────┐  ┌─────┴──────┐  ┌────┴─────┐ │
│  │  brickos   │  │  brickos   │  │  App DBs   │  │  Gatus   │ │
│  │  schema    │  │  auth/org  │  │  (public)  │  │  + ntfy  │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ■ BrickOS                                          Helmut  [EN]  [Admin]  │
├──────────┬──────────────────────────────────────────────────────────────────┤
│          │                                                                  │
│ PLATFORM │  Dashboard                                                       │
│          │  ┌─────────────────────────────────────────────────────────────┐ │
│ ◉ Home   │  │                                                             │ │
│ ◎ Apps   │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │ │
│ ◎ Orgs   │  │  │ 5 Apps   │ │ 18 Orgs  │ │ 16 Users │ │ 99.8%    │      │ │
│ ◎ Users  │  │  │ 4 live   │ │ 2 active │ │ 3 paying │ │ Uptime   │      │ │
│ ◎ Billing│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │ │
│          │  │                                                             │ │
│ SERVICES │  │  Service Health                              Last 24h      │ │
│          │  │  ┌─────────────────────────────────────────────────────┐    │ │
│ ◎ Health │  │  │ SHI Backend    [●] prod  [●] staging   12ms  99.9% │    │ │
│ ◎ Status │  │  │ SHI Frontend   [●] prod  [●] staging    8ms 100.0% │    │ │
│ ◎ Alerts │  │  │ Sov. Link      [●] prod  [●] staging    3ms 100.0% │    │ │
│ ◎ Logs   │  │  │ Sov. Voice     [●] prod  [○] --        --   active │    │ │
│          │  │  │ PostgreSQL     [●] prod  [●] staging   ok  healthy │    │ │
│ CONTENT  │  │  │ Redis          [●] prod  [●] staging   ok  healthy │    │ │
│          │  │  │ Gatus          [●] running              ok          │    │ │
│ ◎ i18n   │  │  │ ntfy           [●] running              ok          │    │ │
│ ◎ Web    │  │  └─────────────────────────────────────────────────────┘    │ │
│ ◎ Email  │  │                                                             │ │
│          │  │  Recent Activity                                            │ │
│ SECURITY │  │  ┌─────────────────────────────────────────────────────┐    │ │
│          │  │  │ 07 Apr 06:23  Deploy v0.38.1 -> production   [OK]  │    │ │
│ ◎ Audit  │  │  │ 07 Apr 05:33  Deploy v0.38.1 -> staging     [OK]  │    │ │
│ ◎ Access │  │  │ 07 Apr 04:53  User signup: test@example.com       │    │ │
│ ◎ Comply │  │  │ 06 Apr 20:49  Sprint 029 merged to main           │    │ │
│          │  │  └─────────────────────────────────────────────────────┘    │ │
│ SETTINGS │  │                                                             │ │
│          │  └─────────────────────────────────────────────────────────────┘ │
│ ◎ Config │                                                                  │
│ ◎ AI     │                                                                  │
│ ◎ Tiers  │                                                                  │
│          │                                                                  │
└──────────┴──────────────────────────────────────────────────────────────────┘

Legend: [●] green (healthy)  [◐] yellow (degraded)  [○] red (down)
```

---

## 4. Page Specifications

### 4.1 Home Dashboard

The landing page after login. Platform-wide overview at a glance.

```
┌─────────────────────────────────────────────────────────────────┐
│  PLATFORM OVERVIEW                                    [30d ▾]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   Apps   │ │   Orgs   │ │  Users   │ │ Revenue  │          │
│  │    5     │ │    18    │ │    16    │ │  EUR 0   │          │
│  │ 4 live   │ │ 2 active │ │ 3 paying │ │ MRR      │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  Service Health Matrix                                          │
│  ┌──────────────┬────────────┬────────────┬────────┬─────────┐ │
│  │ Service      │ Production │ Staging    │ Avg ms │ Uptime  │ │
│  ├──────────────┼────────────┼────────────┼────────┼─────────┤ │
│  │ SHI API      │     ●      │     ●      │   12   │  99.9%  │ │
│  │ SHI App      │     ●      │     ●      │    8   │ 100.0%  │ │
│  │ SHI Website  │     ●      │     ●      │   45   │ 100.0%  │ │
│  │ Sov. Link    │     ●      │     ●      │    3   │ 100.0%  │ │
│  │ Sov. Voice   │     ●      │     --     │   --   │ active  │ │
│  │ PostgreSQL   │     ●      │     ●      │   ok   │ healthy │ │
│  │ Redis        │     ●      │     ●      │   ok   │ healthy │ │
│  │ Gatus        │     ●      │            │   ok   │         │ │
│  │ ntfy         │     ●      │            │   ok   │         │ │
│  └──────────────┴────────────┴────────────┴────────┴─────────┘ │
│                                                                 │
│  ┌──────────────────────────┐ ┌────────────────────────────┐   │
│  │ Clicks (30d)             │ │ Signups (30d)              │   │
│  │                          │ │                            │   │
│  │    ╱╲    ╱╲              │ │        ╱╲                  │   │
│  │ ──╱──╲──╱──╲─────       │ │ ──────╱──╲─────────        │   │
│  │       ╲╱                 │ │                            │   │
│  │  Total: 247              │ │  Total: 4                  │   │
│  └──────────────────────────┘ └────────────────────────────┘   │
│                                                                 │
│  Recent Activity                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 07 Apr 06:23  Deploy SHI v0.38.1 production      [OK]  │   │
│  │ 07 Apr 05:33  Deploy SHI v0.38.1 staging          [OK]  │   │
│  │ 07 Apr 04:53  New signup: test@example.com              │   │
│  │ 06 Apr 20:49  Sprint 029 merged to main                 │   │
│  │ 06 Apr 12:50  NOSTR: pob-day01 published (3/3 relays)  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Apps Registry

All BrickOS apps organized by pillar. Shows live status, version, and environment.

```
┌─────────────────────────────────────────────────────────────────┐
│  APPS                                       [All Pillars ▾]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  HEALTH PILLAR                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Sovereign Health Intelligence (SHI)                    │   │
│  │   API: v0.38.1  Frontend: v0.28.0  Website: v1.2.0     │   │
│  │   [prod ●] [staging ●]  16 users  3,438 measurements   │   │
│  │   [Open Console] [Deploy] [Settings]                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  TECHNOLOGY PILLAR                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Sovereign Link                                         │   │
│  │   Platform: v0.3.0  Standalone: v0.3.0                  │   │
│  │   [prod ●] [staging ●]  247 clicks  42 links            │   │
│  │   [Open Console] [Deploy] [Settings]                     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ Sovereign Identity                          [PLANNED] │   │
│  │   NOSTR-based identity, WebAuthn/FIDO2                  │   │
│  │   Milestone: auth-modernization                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ○ NOSTR Relay                                 [PLANNED] │   │
│  │   Platform relay for all BrickOS apps                    │   │
│  │   Milestone: infrastructure                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ATTENTION PILLAR                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ● Sovereign Voice                                        │   │
│  │   NOSTR Scheduler: v1.0.0  13 notes pending             │   │
│  │   [prod ●] systemd active  Next: pob-day02 Apr 15      │   │
│  │   [View Schedule] [Settings]                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  FINANCE PILLAR                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Sovereign Exchange                          [PLANNED] │   │
│  │ ○ BTC Tracker                                 [PLANNED] │   │
│  │ ○ Cashu Mint                                  [PLANNED] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  DATA  ○ Sovereign Proposal Platform             [PLANNED]    │
│  ENERGY ○ Sovereign Almanac                      [PLANNED]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Organizations

Multi-tenant org management.

```
┌─────────────────────────────────────────────────────────────────┐
│  ORGANIZATIONS                              [+ New Org]        │
├─────────────────────────────────────────────────────────────────┤
│  Search: [________________________]  Type: [All ▾]             │
│                                                                 │
│  ┌──────────┬──────────┬────────┬────────┬────────┬─────────┐ │
│  │ Name     │ Type     │ Users  │ Tier   │ Apps   │ Status  │ │
│  ├──────────┼──────────┼────────┼────────┼────────┼─────────┤ │
│  │ BrickOS  │ platform │   16   │ --     │ all    │  ●      │ │
│  │ Demo     │ demo     │    3   │ --     │ SHI    │  ●      │ │
│  │ Helmut.. │ personal │    1   │ Horiz. │ SHI    │  ●      │ │
│  │ (14 more personal orgs...)                               │ │
│  └──────────┴──────────┴────────┴────────┴────────┴─────────┘ │
│                                                                 │
│  ORG DETAIL: BrickOS                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Members       Apps          Branding       Billing      │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │                                                         │   │
│  │ Owner: admin@sovereignhealth.io                         │   │
│  │ Members: 16 (12 free, 3 clarity, 1 horizon)            │   │
│  │                                                         │   │
│  │ Enabled Apps:                                           │   │
│  │   ● SHI (all users)                                     │   │
│  │   ● Sovereign Link (all users)                          │   │
│  │   ○ Sovereign Voice (admin only)                        │   │
│  │                                                         │   │
│  │ Branding: {} (default)                                  │   │
│  │ Custom Domain: --                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Service Monitor

Real-time health monitoring with Gatus integration.

```
┌─────────────────────────────────────────────────────────────────┐
│  SERVICE HEALTH                         [Production ▾] [24h]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Uptime Timeline (24h)                                          │
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
│  │             00:00    06:00    12:00    18:00    24:00   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  Legend: ████ healthy  ░░░░ degraded  ▓▓▓▓ down                │
│                                                                 │
│  Service Detail                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Production          Staging             │   │
│  │ SHI API        v0.38.1 ●           v0.38.1 ●           │   │
│  │   Response:    12ms avg            15ms avg             │   │
│  │   Uptime:      99.97% (30d)        99.8% (30d)         │   │
│  │   Container:   Up 2h, 510MB        Up 1h, 510MB        │   │
│  │   CPU:         2.3% avg            1.1% avg            │   │
│  │   Memory:      245MB / 4GB         180MB / 4GB         │   │
│  │   DB conns:    8 / 20              5 / 20              │   │
│  │   Last deploy: 07 Apr 06:23        07 Apr 05:33        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Alert Rules                                    [+ New Rule]   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ SHI API response > 500ms    -> ntfy + telegram   [ON]  │   │
│  │ Any service down > 2min     -> ntfy + telegram   [ON]  │   │
│  │ DB connections > 15/20      -> ntfy              [ON]  │   │
│  │ Deploy failure              -> ntfy + telegram   [ON]  │   │
│  │ TLS cert expires < 14d      -> ntfy              [ON]  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Users

Platform-wide user management across all orgs.

```
┌─────────────────────────────────────────────────────────────────┐
│  USERS                                              [+ Invite] │
├─────────────────────────────────────────────────────────────────┤
│  Search: [____________]  Tier: [All ▾]  Role: [All ▾]         │
│                                                                 │
│  ┌────────────────────┬────────┬────────┬───────┬───────────┐  │
│  │ Email              │ Org    │ Tier   │ Role  │ Last seen │  │
│  ├────────────────────┼────────┼────────┼───────┼───────────┤  │
│  │ admin@sov...       │BrickOS │ --     │ admin │ 2h ago    │  │
│  │ helmut@...         │personal│Horizon │ user  │ 1h ago    │  │
│  │ demo@sov...        │Demo    │ --     │ demo  │ 30m ago   │  │
│  │ optimized@...      │Demo    │ --     │ demo  │ --        │  │
│  │ ...                │        │        │       │           │  │
│  └────────────────────┴────────┴────────┴───────┴───────────┘  │
│                                                                 │
│  USER DETAIL: helmut@...                                        │
│  ┌──────────┬────────────┬────────────┬──────────────────────┐ │
│  │ Profile  │ Licenses   │ Activity   │ Security             │ │
│  ├──────────┴────────────┴────────────┴──────────────────────┤ │
│  │                                                            │ │
│  │ Apps:  SHI (Horizon), Sovereign Link                      │ │
│  │ MFA:   TOTP enabled                                       │ │
│  │ Measurements: 305  |  Dr. Alex sessions: 12               │ │
│  │ Affiliate: DEMO2026  |  Conversions: 0                    │ │
│  │ Last login: 07 Apr 04:53  |  IP: [hashed]                │ │
│  │                                                            │ │
│  │ [Change Tier] [Change Role] [Reset Password] [Disable]    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.6 AI Configuration

Platform and org-level AI provider settings (ref: #0337).

```
┌─────────────────────────────────────────────────────────────────┐
│  AI CONFIGURATION                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Platform Default                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Provider:  [Anthropic ▾]                                │   │
│  │ Model:     [Claude Sonnet 4 ▾]                          │   │
│  │ API Key:   ●●●●●●●●●●●●●●●●  [Reveal] [Rotate]        │   │
│  │ Max tokens: [4096]                                      │   │
│  │ Temperature: [0.7]                                      │   │
│  │                                                         │   │
│  │ EU AI Act Classification: Limited Risk (Art. 50)        │   │
│  │ Transparency notice: Auto-generated from config         │   │
│  │                                                         │   │
│  │ [Test Connection]  Last test: OK (342ms)                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Org Overrides                                                  │
│  ┌──────────────┬────────────┬──────────┬──────────┬────────┐  │
│  │ Organization │ Provider   │ Model    │ Status   │ Action │  │
│  ├──────────────┼────────────┼──────────┼──────────┼────────┤  │
│  │ BrickOS      │ (default)  │ (default)│   ●      │ [Edit] │  │
│  │ Demo         │ (default)  │ (default)│   ●      │ [Edit] │  │
│  │ Clinic XY    │ OpenAI     │ GPT-4o   │   ●      │ [Edit] │  │
│  │ Self-hosted  │ Ollama     │ Llama3   │   ◐      │ [Edit] │  │
│  └──────────────┴────────────┴──────────┴──────────┴────────┘  │
│                                                                 │
│  Usage (30d)                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Total tokens: 1,245,000  |  Est. cost: EUR 12.45        │   │
│  │ By org:  BrickOS 80%  |  Demo 15%  |  Others 5%        │   │
│  │ By feature:  Dr. Alex 70%  |  Import 25%  |  Other 5%  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.7 Click Analytics (Sovereign Link)

Ref: #0341. Shared between org admin and platform admin.

```
┌─────────────────────────────────────────────────────────────────┐
│  LINK ANALYTICS                     [All Orgs ▾] [30d ▾]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Clicks  │ │  Links   │ │ Visitors │ │ Top Ref  │          │
│  │    247   │ │    42    │ │   189    │ │ primal   │          │
│  │  +23 7d  │ │  +3 7d   │ │ unique   │ │ .net     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  Clicks Over Time                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 20 ┤                                                     │   │
│  │    │          ╱╲                                          │   │
│  │ 15 ┤    ╱╲  ╱  ╲     ╱╲                                 │   │
│  │    │   ╱  ╲╱    ╲   ╱  ╲                                │   │
│  │ 10 ┤──╱────────────╲╱────╲──────                        │   │
│  │    │                      ╲                              │   │
│  │  5 ┤                       ╲───                          │   │
│  │    │                                                     │   │
│  │  0 ┼────┬────┬────┬────┬────┬────┬───                   │   │
│  │    Mar 8  Mar 15  Mar 22  Mar 29  Apr 5                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ Top Links ──────────────────┐ ┌─ Top Countries ─────────┐  │
│  │ 1. shDEMO2026         89 ▏▎  │ │ 1. DE    45%  ████████  │  │
│  │ 2. sht01h6ofv         34 ▏   │ │ 2. US    23%  █████     │  │
│  │ 3. sh7ufooe3q         21 ▏   │ │ 3. AT    12%  ███       │  │
│  │ 4. test-manual-029    15 ▏   │ │ 4. CH     8%  ██        │  │
│  │ 5. sha6apqno0         12 ▏   │ │ 5. Other 12%  ███       │  │
│  └──────────────────────────────┘ └──────────────────────────┘  │
│                                                                 │
│  ┌─ Top Referrers ──────────────┐ ┌─ By App ────────────────┐  │
│  │ 1. primal.net         42%    │ │ SHI (sh)         78%    │  │
│  │ 2. (direct)           31%    │ │ Voice (sv)       15%    │  │
│  │ 3. twitter.com        12%    │ │ Link (lk)         7%    │  │
│  │ 4. nostr.band          8%    │ │                         │  │
│  │ 5. google.com          7%    │ │                         │  │
│  └──────────────────────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.8 Security & Compliance

Audit logs, access control, compliance status.

```
┌─────────────────────────────────────────────────────────────────┐
│  SECURITY & COMPLIANCE                                          │
├─────────────────────────────────────────────────────────────────┤
│  [Audit Log]  [Access Log]  [Compliance]  [PGAudit]            │
│                                                                 │
│  Compliance Dashboard                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ GDPR          [●] Compliant   Last audit: 2026-04-01   │   │
│  │ EU AI Act     [●] Compliant   Art. 50 transparency OK  │   │
│  │ NIS2          [◐] Partial     Incident channel needed   │   │
│  │ CRA           [◐] Partial     SBOM generated, review    │   │
│  │ ePrivacy      [●] Compliant   Cookie audit passed       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recent Audit Events                                            │
│  ┌───────────┬───────────┬──────────────────────┬───────────┐  │
│  │ Timestamp │ User      │ Action               │ Resource  │  │
│  ├───────────┼───────────┼──────────────────────┼───────────┤  │
│  │ 07 Apr    │ admin     │ deploy.production    │ SHI       │  │
│  │ 07 Apr    │ system    │ migration.applied    │ DB        │  │
│  │ 07 Apr    │ helmut    │ measurement.create   │ glucose   │  │
│  │ 06 Apr    │ admin     │ user.tier.change     │ helmut    │  │
│  └───────────┴───────────┴──────────────────────┴───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.9 Billing & Tiers

Platform-wide billing management.

```
┌─────────────────────────────────────────────────────────────────┐
│  BILLING & TIERS                                                │
├─────────────────────────────────────────────────────────────────┤
│  [Overview]  [Tiers]  [Payments]  [Affiliates]  [Revenue]      │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   MRR    │ │  Paying  │ │  Free    │ │  Churn   │          │
│  │ EUR 0    │ │    3     │ │   13     │ │   0%     │          │
│  │          │ │  users   │ │  users   │ │  (30d)   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  Tier Distribution                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Foundation (free)  ████████████████████████████  13      │   │
│  │ Clarity            ████                          2       │   │
│  │ Horizon            ██                            1       │   │
│  │ Enterprise         ▏                             0       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Tier Configuration                             [Edit Tiers]   │
│  ┌──────────┬────────┬──────────────────────────────────────┐  │
│  │ Tier     │ Price  │ Features                             │  │
│  ├──────────┼────────┼──────────────────────────────────────┤  │
│  │ Found.   │ Free   │ 85 markers, 5 imports/mo, Dr. Alex  │  │
│  │ Clarity  │ 9/mo   │ Unlimited imports, custom ranges     │  │
│  │ Horizon  │ 19/mo  │ Vanity codes, team sharing, export  │  │
│  │ Enterp.  │ Custom │ SSO, custom branding, SLA           │  │
│  └──────────┴────────┴──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Technical Implementation

### 5.1 Deployment Options

**Option A: Embedded in SHI Frontend (recommended for MVP)**
- Add `/platform/` routes to existing Next.js app
- Reuse existing auth, dark theme, component library
- Platform admin role gates access
- Fastest to ship, minimal new infrastructure

**Option B: Standalone Platform App (future)**
- Separate `platform/dashboard/` Next.js app
- Own deployment pipeline
- Org admins access this directly (not through SHI)
- Required when non-SHI apps have their own frontends

### 5.2 Route Structure

```
/platform/                      -- Dashboard (home)
/platform/apps                  -- App registry
/platform/apps/{app_key}        -- App detail + console
/platform/orgs                  -- Organization list
/platform/orgs/{slug}           -- Org detail (members, apps, branding)
/platform/orgs/{slug}/analytics -- Org click analytics
/platform/users                 -- User list
/platform/users/{id}            -- User detail
/platform/services              -- Service health monitor
/platform/services/{name}       -- Service detail + metrics
/platform/alerts                -- Alert rules + history
/platform/billing               -- Tier management + revenue
/platform/billing/affiliates    -- Affiliate program management
/platform/analytics             -- Platform-wide click analytics
/platform/security/audit        -- Audit logs
/platform/security/access       -- Access logs
/platform/security/compliance   -- Compliance dashboard
/platform/settings              -- Platform configuration
/platform/settings/ai           -- AI provider configuration
/platform/content/i18n          -- Translation management
/platform/content/web           -- Website content management
/platform/content/email         -- Email templates + campaigns
```

### 5.3 Data Sources

| Page | Data Source | API |
|------|-----------|-----|
| Dashboard | Aggregated from all sources | `GET /platform/dashboard` |
| Apps | App registry + health endpoints | `GET /platform/apps` |
| Service Health | Gatus API + Docker stats via SSH | `GET /platform/services` |
| Orgs | `brickos.organizations` table | `GET /platform/orgs` |
| Users | `brickos.users` table | `GET /platform/users` |
| Analytics | `short_link_clicks` aggregation | `GET /platform/analytics` |
| Audit | `audit_log` + PGAudit | `GET /platform/audit` |
| AI Config | `brickos.app_settings` | `GET /platform/settings/ai` |
| Billing | `user_licenses` + Stripe API | `GET /platform/billing` |
| Alerts | Gatus alerts + ntfy channels | `GET /platform/alerts` |

### 5.4 Auth & Access Control -- Unified Role-Based Filtering

**One admin GUI, three views.** The same `/platform/` routes render different
content based on the logged-in user's role. No separate apps or builds.

```
┌────────────────────────────────────────────────────────────────────┐
│                    UNIFIED ADMIN GUI                                │
│                                                                    │
│  Same URL, same app, same components.                              │
│  Content filtered by JWT claims: { role, org_id }                  │
│                                                                    │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────────┐ │
│  │ PLATFORM ADMIN   │ │   ORG ADMIN      │ │   APP USER         │ │
│  │ (BrickOS team)   │ │ (Clinic owner)   │ │ (End user)         │ │
│  ├──────────────────┤ ├──────────────────┤ ├────────────────────┤ │
│  │ ● All orgs       │ │ ● Own org only   │ │ No admin access    │ │
│  │ ● All users      │ │ ● Org members    │ │ Uses /settings     │ │
│  │ ● All apps       │ │ ● Enabled apps   │ │ in the app itself  │ │
│  │ ● Services/infra │ │ ● Org analytics  │ │                    │ │
│  │ ● Billing/rev    │ │ ● Org billing    │ │                    │ │
│  │ ● AI config      │ │ ● AI override    │ │                    │ │
│  │ ● Compliance     │ │ ● Branding       │ │                    │ │
│  │ ● Deploy/ops     │ │ ● Custom domain  │ │                    │ │
│  │ ● Content/i18n   │ │ ● Org content    │ │                    │ │
│  │ ● Audit (all)    │ │ ● Audit (own)    │ │                    │ │
│  └──────────────────┘ └──────────────────┘ └────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

**Filtering logic (frontend):**

```typescript
// In layout.tsx or middleware
const { role, org_id } = useAuth()

const isPlatformAdmin = role === 'platform_admin'
const isOrgAdmin = role === 'org_admin' && org_id != null

// Sidebar items filtered by role
const navItems = [
  { label: 'Home',       path: '/platform',           visible: true },
  { label: 'Apps',       path: '/platform/apps',       visible: true },
  { label: 'Orgs',       path: '/platform/orgs',       visible: isPlatformAdmin },
  { label: 'Members',    path: '/platform/members',    visible: isOrgAdmin },
  { label: 'Users',      path: '/platform/users',      visible: isPlatformAdmin },
  { label: 'Services',   path: '/platform/services',   visible: isPlatformAdmin },
  { label: 'Alerts',     path: '/platform/alerts',     visible: isPlatformAdmin },
  { label: 'Analytics',  path: '/platform/analytics',  visible: true },
  { label: 'Branding',   path: '/platform/branding',   visible: isOrgAdmin },
  { label: 'Domains',    path: '/platform/domains',    visible: isOrgAdmin },
  { label: 'Billing',    path: '/platform/billing',    visible: true },
  { label: 'AI Config',  path: '/platform/ai',         visible: isPlatformAdmin || isOrgAdmin },
  { label: 'Content',    path: '/platform/content',    visible: isPlatformAdmin },
  { label: 'Security',   path: '/platform/security',   visible: true },
  { label: 'Settings',   path: '/platform/settings',   visible: isPlatformAdmin },
]
```

**Backend enforcement (Rust):**

```rust
// Platform admin: sees all
GET /platform/orgs         -> returns all organizations
GET /platform/users        -> returns all users
GET /platform/analytics    -> returns cross-org data

// Org admin: scoped by org_id from JWT
GET /platform/orgs         -> 403 (use /platform/org instead)
GET /platform/org           -> returns own org only
GET /platform/members      -> returns own org members only
GET /platform/analytics    -> returns own org analytics only
GET /platform/billing      -> returns own org billing only
```

### 5.5 SHI Admin Feature Elevation

The current SHI admin panel (16 tabs) contains features that belong at different levels:

```
┌─────────────────────────────────────────────────────────────────┐
│  CURRENT SHI ADMIN (16 tabs)                                    │
│                                                                 │
│  ELEVATE TO PLATFORM ADMIN:              KEEP IN APP:           │
│  ┌────────────────────────────┐  ┌──────────────────────────┐  │
│  │ ● Users (cross-app)       │  │ ○ Content (App) -- SHI   │  │
│  │ ● Billing/Payments        │  │ ○ Content (Strings)      │  │
│  │ ● Affiliates (cross-app)  │  │ ○ AI Usage -- per-app    │  │
│  │ ● Links (Sov. Link)       │  │ ○ Metrics -- app-specific│  │
│  │ ● Newsletter              │  │                          │  │
│  │ ● Audit Logs              │  │                          │  │
│  │ ● Settings (platform)     │  │                          │  │
│  │ ● Content (Web/Website)   │  │                          │  │
│  │ ● Revenue Simulator       │  │                          │  │
│  │ ● Promotions              │  │                          │  │
│  │ ● Contact (support)       │  │                          │  │
│  └────────────────────────────┘  └──────────────────────────┘  │
│                                                                 │
│  NEW IN PLATFORM:                                               │
│  ┌────────────────────────────┐                                 │
│  │ ★ Service Monitor         │  (Gatus + Docker stats)         │
│  │ ★ App Registry            │  (all apps, versions, status)   │
│  │ ★ Org Management          │  (CRUD, members, branding)      │
│  │ ★ AI Provider Config      │  (per-org provider override)    │
│  │ ★ Compliance Dashboard    │  (GDPR, NIS2, CRA status)      │
│  │ ★ Click Analytics         │  (Sovereign Link dashboards)    │
│  │ ★ Alert Configuration     │  (ntfy + telegram rules)        │
│  │ ★ Deploy History          │  (version timeline per app)     │
│  └────────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Migration strategy:**
1. Build new `/platform/` routes alongside existing `/admin/` routes
2. Move elevated features one-by-one (users first, then billing, etc.)
3. Keep app-specific admin tabs in `/admin/` (content, AI usage, metrics)
4. Eventually `/admin/` becomes app-console accessed from platform GUI

### 5.5 Technology

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | Next.js 16 (App Router) | Same as SHI frontend |
| Components | shadcn/ui | Same component library |
| Charts | Recharts | Already used for trend charts |
| Theme | Dark (forced) | BrickOS design standard |
| i18n | next-intl (EN + DE) | Same as all BrickOS apps |
| State | React hooks + SWR | Lightweight, no Redux |
| Auth | JWT + platform role check | Existing brickos-auth |

---

## 6. Org Admin View

Org admins see a **scoped subset** of the platform GUI:

```
┌─────────────────────────────────────────────────────────────────┐
│  ■ Clinic XY (Org Admin)                    Dr. Mueller  [DE]  │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│ MY ORG   │  Organization Dashboard                              │
│          │                                                      │
│ ◉ Home   │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ ◎ Members│  │ 12 Users │ │ 3 Apps   │ │ 89 Links │            │
│ ◎ Apps   │  │ 3 admins │ │ enabled  │ │ 247 clicks│            │
│ ◎ Links  │  └──────────┘ └──────────┘ └──────────┘            │
│ ◎ Analytc│                                                      │
│          │  Enabled Apps                                        │
│ SETTINGS │  ● SHI    ● Sovereign Link    ○ Voice (request)     │
│          │                                                      │
│ ◎ Brand  │  Recent Member Activity                              │
│ ◎ Domains│  dr.mueller@clinic - logged in 2h ago               │
│ ◎ AI     │  nurse.anna@clinic - imported 15 measurements       │
│ ◎ Billing│  patient.hans@clinic - viewed trends                │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

---

## 7. Migration Path

### Phase 1: Platform Dashboard (Sprint 031)
- Home dashboard with service health matrix
- Apps registry page (read-only)
- Service monitor (Gatus integration)
- Move existing SHI admin to `/platform/` routes

### Phase 2: Multi-Tenant Activation (Sprint 032)
- Org management (CRUD, members, roles)
- Org-scoped admin view
- Org branding and custom domains
- Per-org app enablement

### Phase 3: Analytics + AI (Sprint 033)
- Click analytics dashboard
- AI provider configuration
- Revenue and billing dashboard
- Compliance dashboard

### Phase 4: Full Platform (Sprint 034+)
- Org admin self-service portal
- App marketplace (enable/disable apps per org)
- Custom domain SSL automation
- Webhook + notification configuration
- API key management for orgs

---

## 8. Design Tokens

Consistent with BrickOS design system:

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
Card:           rounded-2xl border p-5
```

---

## 9. Open Questions

1. **Standalone vs embedded?** MVP as SHI routes, or separate app from the start?
2. **Gatus API access**: Does Gatus expose a JSON API we can consume, or do we need to scrape/replicate?
3. **Docker stats**: SSH from platform API to VPS for container stats, or deploy a metrics agent (Prometheus)?
4. **Org admin billing**: Stripe per-org, or platform invoicing?
5. **App marketplace**: Should orgs be able to self-enable apps, or is it admin-only?
