# Weekly Project Summary — BrickOS / Sovereign Health

**Period:** 2026-03-11 → 2026-03-18
**Current version:** v0.20.0-rc3
**Branch:** develop
**Auditor:** Claude Code (automated)

---

## Executive Summary

A highly productive week focused on **platform extraction**, **GDPR/security hardening**, **release candidate testing**, and **light-theme polish**. Three release candidates (RC1 → RC3) were cut. Core auth, crypto, and DB logic were extracted into shared crates, Row-Level Security was applied to 15 tables, and chat messages are now encrypted at rest. The week closed with WCAG accessibility fixes and theme-aware UI refinements.

---

## Codebase Statistics

### Lines of Code (source files, excluding binaries/locks)

| Language | Files | Lines |
|---|---|---|
| Rust (`.rs`) | 120 | 37,975 |
| TypeScript / TSX (`.ts`, `.tsx`) | 172 | 32,583 |
| SQL (`.sql`) | 161 | 22,057 |
| Markdown (`.md`) | 151 | 14,640 |
| Shell (`.sh`) | 5 | 1,320 |
| Docker (Dockerfile + Compose) | — | 552 |
| CSS (`.css`) | — | 365 |
| TOML (`.toml`) | 13 | 236 |
| **Total (all tracked)** | **720** | **147,296** |

### Repository Composition

| Metric | Value |
|---|---|
| Total tracked files | 720 |
| SQL migrations | 93 |
| Rust test files | 6 |
| Frontend test/spec files | 12 |
| i18n locales | 2 (EN, DE) |
| i18n keys (EN) | ~1,352 |
| Git tags | 4 (`v0.20.0`, `v0.20.0-rc2`, `pre-extraction`, `pre-user-extraction`) |
| GitHub milestones | 17 |

---

## Weekly Activity (2026-03-11 → 2026-03-18)

| Metric | Value |
|---|---|
| **Commits** | 57 |
| **Files touched** | 826 |
| **Lines inserted** | ~1,099+ |
| **Lines deleted** | ~188,792 (bulk restructure / legacy cleanup) |

### Commits by Day

| Date | Commits |
|---|---|
| 2026-03-16 (Sun) | 20 |
| 2026-03-17 (Mon) | 29 |
| 2026-03-18 (Tue) | 8 |

### Release Candidates Cut

| RC | Date | Highlights |
|---|---|---|
| **v0.20.0-rc1** | 2026-03-16 | UX overhaul, i18n, docs recovery, GitLab → GitHub migration |
| **v0.20.0-rc2** | 2026-03-17 | Platform extraction (shared crates), security hardening (RLS, pgaudit) |
| **v0.20.0-rc3** | 2026-03-17 | Onboarding, theme toggle, tax compliance, docs consolidation |

---

## Week in Commits — Highlights

### Features
- **Platform extraction** — auth (`brickos-auth`), crypto (`brickos-crypto`), DB models (`brickos-db`) extracted into shared crates
- **PostgreSQL Row-Level Security** on 15 user-data tables (#43)
- **pgaudit** for tamper-proof database audit logging (#67)
- **GDPR-F001/F002** — chat export + hard purge cron
- **GDPR-F003** — AES-256-GCM encryption of Doctor Chat messages at rest
- **Data access audit log** table + export logging (#45)
- **Contact retention** + DB role separation (#42, #44)
- **Comprehensive GDPR JSON export v2.0**
- **Lab entity**, image compression, measurement improvements
- **Testing architecture** + `test-all.sh` runner

### Fixes
- WCAG accessibility — form label associations and aria-labels
- Theme-aware tooltips, popovers, badges, medications tab, login demo section
- Light theme fixes for onboarding, calculated badges (#107, #109, #110, #111, #112)
- Chat error handling, audit logging, graceful API errors (#113, #114)
- Marker name i18n in trends dropdowns
- React hydration mismatch in Navbar (#83)
- Staging deploy fixes (CORS, build context, demo mode)
- pgaudit migration graceful degradation
- Email/password trimming on auth forms

### Documentation
- Error handling & fault tolerance design doc (010)
- GDPR compliance audit (78 checks, 67 passed)
- Release audit v0.20.0-rc1 (142 checks, 126 passed)
- License tier matrix audit (22 tests, 6 findings)
- User/role/multi-tenancy model report
- Testing strategy report + manual testing checklist
- RC3 testing report + release template updates

### Tests
- GDPR export completeness guard
- Regression tests: i18n, dark theme, markers, templates
- License tier matrix: 22 tests

---

## Tech Stack

### Backend

| Component | Technology | Version |
|---|---|---|
| **Language** | Rust | 2021 edition |
| **Web framework** | Actix-Web | 4.x |
| **Database** | PostgreSQL | + pgaudit |
| **ORM / queries** | SQLx | 0.8 (compile-time checked) |
| **Auth** | JWT (jsonwebtoken 9) + Argon2 password hashing |
| **Encryption** | AES-256-GCM (aes-gcm 0.10) |
| **Rate limiting** | actix-governor | 0.5 |
| **Observability** | tracing + tracing-subscriber (JSON) |
| **HTTP client** | reqwest 0.12 (rustls) |
| **Async runtime** | Tokio (full) |

### Frontend

| Component | Technology | Version |
|---|---|---|
| **Framework** | Next.js | 16.1.6 |
| **UI library** | React | 19.2.4 |
| **Styling** | Tailwind CSS (tw-animate-css, tailwind-merge, CVA, clsx) |
| **Components** | shadcn/ui + Base UI (React) |
| **Charts** | Recharts | 3.8.0 |
| **Forms** | React Hook Form + Zod validation |
| **i18n** | next-intl | 4.8.3 |
| **Icons** | Lucide React |
| **Markdown** | react-markdown + remark-gfm |
| **Notifications** | Sonner |
| **Date picker** | react-datepicker |
| **QR codes** | qrcode.react |

### Infrastructure

| Component | Technology |
|---|---|
| **Containerization** | Docker (multi-stage builds) |
| **Orchestration** | Docker Compose v2 |
| **CI/CD** | GitHub Actions |
| **Package manager (Rust)** | Cargo workspace |
| **Package manager (Node)** | pnpm workspaces |
| **Reverse proxy** | Caddy (recommended) or nginx |
| **TLS** | Let's Encrypt (automatic via Caddy) |

### Monorepo Architecture

```
brickos/
├── platform/              — BrickOS core services
│   ├── core-api/          — Platform API (Rust)
│   ├── dashboard/         — Admin dashboard
│   └── website/           — Marketing site
├── crates/                — Shared Rust crates (7)
│   ├── brickos-auth       — Auth service (JWT, sessions)
│   ├── brickos-crypto     — Encryption (AES-256-GCM)
│   ├── brickos-db         — User/org/role models, migrations
│   ├── brickos-email      — Email service
│   ├── brickos-billing    — Billing / license tiers
│   ├── brickos-backup     — Backup gateway
│   └── brickos-startos    — StartOS integration (planned)
├── apps/health/sovereign-health/
│   ├── api/               — Rust backend (Actix-Web)
│   ├── frontend/          — Next.js 16 frontend
│   ├── website/           — Product website
│   ├── ops/               — Docker Compose, deploy scripts
│   ├── docs/              — Project documentation
│   └── startos/           — StartOS package (planned)
└── docs/                  — Platform-wide docs
```

### Deployment Profiles

| Profile | Compose file | Use case |
|---|---|---|
| **Self-hosted** | `docker-compose.selfhosted.yml` | Builds from source, no registry |
| **Development** | `docker-compose.dev.yml` | Full stack, hot reload |
| **Staging** | `docker-compose.staging.yml` | Pre-built images, staging env |
| **Production** | `docker-compose.prod.yml` | Pre-built images, production |

---

## Open Milestones (17)

| # | Milestone |
|---|---|
| 5 | Health Intelligence Graph |
| 6 | Dr. Alex as a Service |
| 8 | Security Hardening |
| 9 | Organization Support |
| 10 | Patient Data Sharing |
| 11 | Advanced Multi-Tenancy |
| 12 | Platform Extraction — BrickOS Core |
| 13 | UI: Privacy & Security Features |
| 14 | Auth Modernization |
| 15 | Release Workflow Improvements |
| 16 | AI & Smart Features |
| 17 | User Experience & Onboarding |
| 18 | Self-Hosting & Distribution |
| 19 | Horizon Tier Features |
| 20 | Infrastructure & Chores |
| 21 | Data Sovereignty & Vendor Independence |
| 22 | Health Ecosystem Integrations |

---

## Key Metrics at a Glance

| Metric | Value |
|---|---|
| Total lines of code | **147,296** |
| Tracked files | **720** |
| Rust crates | **9** (1 workspace root, 7 shared, 1 app) |
| Node packages | **2** (frontend, website) |
| SQL migrations | **93** |
| i18n keys | **~1,352** (EN + DE) |
| Docker Compose profiles | **4** |
| Commits this week | **57** |
| Release candidates this week | **3** |
| Open milestones | **17** |
