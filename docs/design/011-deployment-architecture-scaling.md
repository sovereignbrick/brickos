# Design 022: Deployment Architecture & Scaling Strategy

**Date:** 2026-03-23
**Status:** Draft
**Context:** BrickOS platform scaling from 1 app (Sovereign Health) to 5-10 apps, with PWA and Start9 self-hosted packaging as near-term goals.

---

## Problem Statement

Deploy times are growing (7-13 min per full deploy). The backend is a single Rust binary containing all functionality. As the app grows (PWA, more features) and new apps join the platform, we need a strategy that supports:

1. **Cloud SaaS** — multi-tenant, centrally hosted (current model)
2. **Start9 package** — single-user, self-hosted on personal hardware (Raspberry Pi, mini PC)
3. **PWA** — installable frontend with offline capabilities
4. **Platform growth** — 5-10 apps sharing platform services (auth, billing)

---

## Glossary

| Term | Meaning |
|------|---------|
| **Monolith** | Single deployable unit containing all application logic. One binary, one container. Current state. |
| **Modular Monolith** | Single deployable unit, but internally organized into clear modules with defined boundaries. Can be split later without rewriting. |
| **Microservices** | Multiple independently deployable services, each owning a specific domain. Communicate via APIs or message queues. |
| **PWA** | Progressive Web App — a web app that can be installed on devices, works offline via service workers, receives push notifications. Still served as static files. |
| **Start9** | StartOS — a self-hosted platform for running sovereign services on personal hardware. Apps are packaged as Docker containers with a manifest. |
| **Cargo workspace** | Rust's built-in monorepo tool. Multiple crates (libraries/binaries) share dependencies and compile together. |
| **cargo-chef** | Docker build optimization for Rust. Pre-compiles dependencies in a cached layer so only app code recompiles on changes. Cuts build time from minutes to seconds. |
| **Multi-tenant** | One instance serves multiple users/organizations. Data is isolated by user_id/org_id. Current SaaS model. |
| **Single-tenant** | One instance per user. Each Start9 user runs their own complete stack. |
| **Feature flags** | Runtime switches that enable/disable features per environment, tier, or deployment target. |

---

## Current Architecture

```
┌─────────────────────────────────────────┐
│           sovereign-health-backend      │
│  (single Rust binary, ~197MB image)     │
│                                         │
│  auth + billing + markers + import +    │
│  doctor chat + admin + notifications +  │
│  devices + zones + trends + reports +   │
│  affiliate + newsletter + settings      │
├─────────────────────────────────────────┤
│  PostgreSQL + Redis                     │
├─────────────────────────────────────────┤
│  sovereign-health-frontend (Next.js)    │
├─────────────────────────────────────────┤
│  sovereign-health-website (Next.js)     │
└─────────────────────────────────────────┘
```

**Strengths:** Simple to reason about, single deploy, shared DB, no network hops.
**Weaknesses:** Full rebuild on any change, cannot scale components independently, Start9 package would include billing/admin that's irrelevant for self-hosted.

---

## Target Architecture

### Two deployment profiles from one codebase

The key insight: **Start9 and SaaS need different subsets of the same code**, not different code.

```
┌─────────────────────────────────────────────────────────┐
│                    Cargo Workspace                       │
│                                                         │
│  crates/brickos-auth       → auth, JWT, MFA             │
│  crates/brickos-crypto     → encryption at rest          │
│  crates/brickos-db         → pool, migrations            │
│  crates/brickos-email      → email provider trait         │
│  crates/brickos-billing    → Stripe, BTC payments        │
│  crates/brickos-backup     → encrypted backup gateway    │
│                                                          │
│  apps/health/sovereign-health/api/                       │
│    src/                                                  │
│      handlers/             → HTTP handlers               │
│      services/             → business logic              │
│      main.rs               → binary entry point          │
│                                                          │
│  Compile-time features:                                  │
│    --features saas         → billing, admin, affiliate   │
│    --features selfhosted   → backup, local AI, no billing│
│    --features start9       → StartOS manifest, s9pk      │
└─────────────────────────────────────────────────────────┘
```

### Deployment Profile: Cloud SaaS

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Frontend   │  │   Backend    │  │   Website    │
│   (Next.js)  │  │   (Rust)     │  │   (Next.js)  │
│   PWA-ready  │  │  --features  │  │   Static     │
│              │  │    saas      │  │              │
└──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │
       └────────┬────────┘
          ┌─────┴─────┐
          │ PostgreSQL │
          │   Redis    │
          └───────────┘
```

**Includes:** Auth, billing, admin panel, affiliate system, multi-tenant, email verification, Stripe/BTC payments, ntfy notifications, tier enforcement.

**Deploys to:** VPS via Docker + SSH (current workflow).

### Deployment Profile: Start9 / Self-hosted

```
┌─────────────────────────────────┐
│         Start9 Package          │
│         (s9pk archive)          │
│                                 │
│  ┌───────────┐  ┌───────────┐  │
│  │ Frontend  │  │  Backend   │  │
│  │  (PWA)    │  │ --features │  │
│  │           │  │ selfhosted │  │
│  └─────┬─────┘  └─────┬─────┘  │
│        └──────┬────────┘        │
│         ┌─────┴─────┐          │
│         │ PostgreSQL │          │
│         └───────────┘          │
│                                 │
│  No billing, no admin panel,   │
│  no affiliate, no email verify │
│  Single user, local auth       │
│  Backup via brickos-backup     │
│  Local AI (ollama) optional    │
└─────────────────────────────────┘
```

**Excludes:** Billing, admin panel, affiliate, newsletter, multi-tenant, Stripe, email provider.

**Includes:** All health features, import, doctor chat (local or API-key AI), encrypted backup, PWA offline support.

**Deploys to:** StartOS marketplace as `.s9pk` package.

---

## PWA Strategy

PWA is a frontend concern, independent of backend architecture.

| Feature | Implementation | Effort |
|---------|---------------|--------|
| **Installable** | `manifest.json` + service worker | Small — already have manifest from Next.js |
| **Offline data** | IndexedDB cache of recent measurements + markers | Medium — need sync strategy |
| **Background sync** | Queue measurements offline, sync when online | Medium |
| **Push notifications** | Web Push API → backend sends via push subscription | Medium — replaces/complements ntfy for end-users |
| **App shell** | Cache layout/navigation, load data dynamically | Small — Next.js standalone already does this |

**Key decision:** PWA works identically for SaaS and Start9. The frontend doesn't care where the API lives — it's just a URL. On Start9, it's `http://sovereign-health.local:8080`. On SaaS, it's `https://api.sovereignhealth.io`.

---

## Scaling Strategy (phased)

### Phase 1: Build Optimization (now — sprint 009)

**Goal:** Cut deploy time from 7-13 min to 2-3 min.

1. **cargo-chef in Dockerfile** — cache dependency compilation. Only recompile app code on changes (~30s vs 3-4 min).
2. **Component-level deploy** — `deploy.sh` detects what changed and only builds/transfers dirty components. Already partially works (`deploy.sh staging backend`).
3. **Docker BuildKit cache mount** — persist cargo registry + target dir across builds.

**Impact:** 3-5x faster deploys. No architecture changes needed.

### Phase 2: Compile-time Feature Flags (before Start9 launch)

**Goal:** Single codebase, multiple binaries.

1. Add Cargo features: `saas`, `selfhosted`, `start9`.
2. Gate billing/admin/affiliate handlers behind `#[cfg(feature = "saas")]`.
3. Gate backup/local-AI behind `#[cfg(feature = "selfhosted")]`.
4. Start9 package build: `cargo build --release --features selfhosted,start9`.
5. SaaS build: `cargo build --release --features saas` (current default).

**Impact:** Start9 binary is smaller (no billing code), cleaner separation, same codebase.

### Phase 3: Modular Monolith (at 2-3 apps)

**Goal:** Share platform services across apps without microservice complexity.

```
platform/
  core-api/          → auth, user management, org management
  billing-api/       → subscriptions, payments (SaaS only)
apps/
  health/api/        → health-specific handlers, uses platform crates
  fitness/api/       → fitness-specific handlers, uses platform crates
crates/
  brickos-auth/      → JWT, MFA, session management (library)
  brickos-billing/   → Stripe, BTC (library)
  brickos-db/        → pool, migrations (library)
```

Each app compiles its own binary, importing shared crates. Apps deploy independently. Platform services deploy once.

**Impact:** New apps don't slow down existing deploys. Shared code stays DRY.

### Phase 4: Service Split (at 5+ apps, only if needed)

**Goal:** Independent scaling and deployment.

Only split if you hit one of these triggers:
- One app's traffic overwhelms the VPS and needs horizontal scaling
- Deploy coupling causes team friction (multiple people deploying different apps)
- A service needs different infrastructure (e.g., GPU for local AI)

**What to split first:** Auth/billing as a standalone service. It changes least and everything depends on it.

---

## Start9 Package Specifics

Start9 packages use the `.s9pk` format:

```
sovereign-health.s9pk
├── manifest.yaml          → metadata, ports, volumes, dependencies
├── docker-images/
│   ├── backend.tar        → Rust API (selfhosted features)
│   ├── frontend.tar       → Next.js PWA
│   └── postgres.tar       → PostgreSQL + pgaudit
├── instructions.md        → user-facing setup guide
└── LICENSE
```

**Key differences from SaaS:**
| Concern | SaaS | Start9 |
|---------|------|--------|
| Auth | Email/password + MFA | Local password or Tor auth |
| Billing | Stripe + BTC | None (self-hosted = free) |
| AI | Anthropic API | User's API key or local Ollama |
| Backup | Server-side encrypted | Encrypted export to USB/NAS |
| Updates | We deploy | User pulls from marketplace |
| Multi-user | Yes (orgs) | Single user (or family) |
| Domain | app.sovereignhealth.io | sovereign-health.local |
| TLS | Cloudflare | Tor hidden service or LAN |

---

## Recommendation

**Immediate (sprint 009):** cargo-chef + component-level deploy. Biggest ROI, smallest effort.

**Next milestone (PWA):** PWA is frontend-only, doesn't require backend changes. Can ship independently.

**Next milestone (Start9):** Implement compile-time feature flags. Build separate `selfhosted` binary. Package as `.s9pk`.

**Don't do yet:** Microservices, service mesh, Kubernetes. The monolith serves you well until you have multiple teams or genuine scaling pressure.

---

## Decision

TBD — awaiting review.
