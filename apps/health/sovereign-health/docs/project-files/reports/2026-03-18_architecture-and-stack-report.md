# Architecture & Technology Stack Report — BrickOS / Sovereign Health

**Date:** 2026-03-18
**Version:** v0.20.0-rc3
**Auditor:** Claude Code (automated)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Monorepo Architecture](#2-monorepo-architecture)
3. [Layer 1 — Database](#3-layer-1--database)
4. [Layer 2 — Shared Platform Crates](#4-layer-2--shared-platform-crates)
5. [Layer 3 — Backend API](#5-layer-3--backend-api)
6. [Layer 4 — Frontend Application](#6-layer-4--frontend-application)
7. [Layer 5 — Infrastructure & Deployment](#7-layer-5--infrastructure--deployment)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [Processes & Workflows](#9-processes--workflows)
10. [BrickOS Platform Core Features](#10-brickos-platform-core-features)
11. [Technology Version Matrix](#11-technology-version-matrix)
12. [Codebase Statistics](#12-codebase-statistics)

---

## 1. Executive Summary

**BrickOS** is a privacy-first, multi-tenant platform for health data management, built as a Cargo + pnpm monorepo. The flagship application, **Sovereign Health Intelligence**, enables users to track biomarkers, analyze trends, manage medications, and consult an AI health coach — all with end-to-end encryption, GDPR compliance, and self-hosting support.

The architecture is organized in five layers:

```
┌─────────────────────────────────────────────────┐
│  Layer 5 — Infrastructure (Docker, CI/CD, VPS)  │
├─────────────────────────────────────────────────┤
│  Layer 4 — Frontend (Next.js 16, React 19)      │
├─────────────────────────────────────────────────┤
│  Layer 3 — Backend API (Actix-Web 4, Rust)      │
├─────────────────────────────────────────────────┤
│  Layer 2 — Shared Crates (auth, crypto, billing)│
├─────────────────────────────────────────────────┤
│  Layer 1 — Database (PostgreSQL 16 + pgaudit)   │
└─────────────────────────────────────────────────┘
```

---

## 2. Monorepo Architecture

```
brickos/
├── platform/                     — BrickOS core platform services
│   ├── core-api/                 — Platform API (Rust, placeholder)
│   ├── dashboard/                — Admin dashboard (planned)
│   └── website/                  — Marketing site (planned)
├── crates/                       — 7 shared Rust crates
│   ├── brickos-auth              — JWT, Argon2, TOTP MFA
│   ├── brickos-crypto            — AES-256-GCM encryption
│   ├── brickos-db                — User/org/role models
│   ├── brickos-billing           — Stripe + Strike BTC
│   ├── brickos-email             — Mailgun, SMTP, Log providers
│   ├── brickos-backup            — Backup gateway (stub)
│   └── brickos-startos           — StartOS integration (planned)
├── packages/                     — Shared React packages (planned)
├── apps/health/sovereign-health/ — Sovereign Health application
│   ├── api/                      — Rust backend (Actix-Web)
│   ├── frontend/                 — Next.js 16 web app
│   ├── website/                  — Product marketing site
│   ├── ops/                      — Docker Compose, deploy scripts
│   ├── docs/                     — All project documentation
│   └── startos/                  — StartOS package (planned)
├── ops/                          — Platform-wide deploy scripts
├── docs/                         — Platform-wide documentation
├── .github/workflows/            — CI/CD pipelines
├── Cargo.toml                    — Rust workspace root
└── CLAUDE.md                     — AI-readable project guide
```

| Workspace | Manager | Members |
|---|---|---|
| Rust (Cargo) | cargo | 9 crates (1 root, 7 shared, 1 app API) |
| Node (pnpm) | pnpm | 2 packages (frontend, website) |

---

## 3. Layer 1 — Database

### Technology

| Component | Version | Purpose |
|---|---|---|
| **PostgreSQL** | 16 Alpine | Primary data store |
| **pgaudit** | REL_16_STABLE | Tamper-proof DDL/write audit logging |
| **Redis** | 7 Alpine | Caching and session store |
| **SQLx** | 0.8 | Compile-time checked SQL queries |

### Schema Overview

The database contains **93 migration files** across the following domains:

#### Core User Tables
| Table | Purpose |
|---|---|
| `users` | Identity (email, password_hash, role, tier, deleted_at) |
| `user_preferences` | Unit preferences (glucose, weight, temperature) |
| `user_profile` | Demographics (gender, age, height) |
| `user_mfa` | TOTP secrets, recovery codes |

#### Measurement & Biomarker Tables
| Table | Purpose |
|---|---|
| `markers` | 12+ biomarkers (BG, HCT, HB, KB, TCH, UA, TG, Lactate, etc.) |
| `measurements` | Core fact table (value, timestamp, protocol_tag, meal_timing) |
| `calculated_markers` | Derived markers (BMI, WHtR, GKI, HOMA-IR) |
| `calculated_marker_values` | User's computed marker results |
| `zones` | Health zones (energy_metabolic, cardiovascular, etc.) |
| `devices` | Measurement devices (Fora 6, Qardio, etc.) |
| `labs` | Laboratory providers |

#### Billing & Payments
| Table | Purpose |
|---|---|
| `subscriptions` | Stripe subscription records |
| `invoices` | Local Stripe invoice mirror |
| `invoice_line_items` | Line items per invoice |
| `payment_methods_cache` | Cached payment methods |
| `customer_tax_ids` | VAT / tax identification |

#### Health Features
| Table | Purpose |
|---|---|
| `doctor_chat_conversations` | AI chat history (encrypted at rest) |
| `user_medications` | User's medication list |
| `medications_catalog` | Medication reference data |
| `influence_factors` | Lifestyle factors (sleep, exercise, stress) |
| `measurement_templates` | Saved entry templates |
| `reference_ranges` | Custom biomarker reference ranges |

#### Content & Localization
| Table | Purpose |
|---|---|
| `zones_translations` | Zone names/descriptions (EN, DE) |
| `markers_translations` | Marker names/descriptions (EN, DE) |
| `content_foods` | Foods by marker |
| `content_supplements` | Supplements by marker |
| `content_strings` | Runtime i18n strings |
| `web_pages` / `web_page_sections` | CMS-driven website content |

#### Security & Audit
| Table | Purpose |
|---|---|
| `refresh_tokens` | SHA-256 hashed JWT refresh tokens |
| `password_reset_tokens` | Password reset tokens |
| `email_verification_tokens` | Email verification tokens |
| `data_access_log` | GDPR Art. 15 audit trail |
| `user_email_logs` | Email send history |
| pgaudit logs | DDL + write operation audit |

#### Administrative & Marketing
| Table | Purpose |
|---|---|
| `early_access_signups` | Pre-launch signups |
| `newsletter_subscriptions` | Newsletter subscribers |
| `data_shares` | Practitioner data sharing |
| `affiliate_conversions` | Affiliate tracking |
| `affiliate_payouts` | Payout records |

### Row-Level Security (RLS)

RLS policies enforce `user_id = app_current_user_id()` on **15 user-data tables**:

| Protected Table | Policy |
|---|---|
| measurements | user_id isolation |
| devices | user_id isolation |
| doctor_chat_conversations | user_id isolation |
| measurement_templates | user_id isolation |
| user_medications | user_id isolation |
| influence_factors | user_id isolation |
| calculated_marker_values | user_id isolation |
| reference_ranges | user_id isolation |
| user_mfa | user_id isolation |
| user_preferences | user_id isolation |
| user_profile | user_id isolation |
| import_history | user_id isolation |
| import_sessions | user_id isolation |
| subscriptions | user_id isolation |
| data_shares | user_id isolation |

### Migration Strategy

- All migrations use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`
- Auto-applied on server startup via `sqlx::migrate!()`
- pgaudit migration degrades gracefully if extension unavailable

---

## 4. Layer 2 — Shared Platform Crates

### brickos-auth — Authentication Library

| Feature | Implementation |
|---|---|
| JWT tokens | jsonwebtoken 9 — claims: sub, role, tier, exp, iat |
| Password hashing | Argon2id (argon2 0.5) |
| TOTP MFA | totp-rs with QR code SVG generation |
| Recovery codes | 8 codes, `xxxx-xxxx` format |
| Token utilities | SHA-256 hashing, secure random generation |

### brickos-crypto — Encryption Library

| Feature | Implementation |
|---|---|
| Algorithm | AES-256-GCM (aes-gcm 0.10) |
| Key size | 256-bit hex-encoded (64 hex chars) |
| Storage format | `v1:{base64_iv}:{base64_ciphertext+tag}` |
| Passthrough mode | When no ENCRYPTION_KEY — plaintext (self-hosted opt-out) |
| Legacy support | Values without `v1:` prefix treated as plaintext |
| Convenience methods | `encrypt_f64()`, `decrypt_f64()`, `encrypt_opt()`, `decrypt_opt()` |

**Encrypted fields:** measurement values, chat messages, MFA secrets, lifestyle notes

### brickos-db — Database Models

| Feature | Implementation |
|---|---|
| Models | User, Organization, Role types |
| Framework | SQLx 0.8, chrono, uuid |
| Scope | Shared across all BrickOS apps |

### brickos-billing — Payment Processing

| Gateway | Features |
|---|---|
| **Stripe** | Customers, checkout sessions, portal, subscriptions, refunds, invoices, promo codes, tax IDs, webhook verification (HMAC-SHA256) |
| **Strike (Bitcoin)** | Invoice creation, Lightning BOLT11 + on-chain addresses, quote generation, webhook verification |

**Tier mapping:** Price ID → (tier_slug, billing_interval) for Focus, Insight, Clarity, Horizon (monthly + annual)

### brickos-email — Email Delivery

| Provider | Mode | Features |
|---|---|---|
| **Mailgun** | SaaS | send, batch send, list management, tags, 50-concurrent rate limit |
| **SMTP** | Self-hosted | Standard SMTP/TLS, list ops are no-ops |
| **Log** | Development | Logs to stdout (useful for verification URLs) |

**Factory:** `create_email_provider(is_saas)` — Mailgun → SMTP → Log fallback

### brickos-backup — Backup Gateway (stub)

Not yet implemented.

### brickos-startos — StartOS Integration (planned)

In workspace, not yet implemented.

---

## 5. Layer 3 — Backend API

### Technology

| Component | Technology | Version |
|---|---|---|
| Language | Rust | 2021 edition |
| Framework | Actix-Web | 4.x |
| Async runtime | Tokio | 1 (full features) |
| Database driver | SQLx | 0.8 (compile-time checked, `runtime-tokio-rustls`) |
| HTTP client | reqwest | 0.12 (`rustls-tls`, no libssl-dev) |
| Serialization | Serde + serde_json | 1.x |
| PDF generation | genpdf | 0.2 |
| Image processing | image | 0.25 (JPEG, PNG, WebP) |
| Observability | tracing + tracing-subscriber | 0.1 / 0.3 (JSON structured logs) |
| Rate limiting | actix-governor | 0.5 |
| CORS | actix-cors | 0.7 |

### Middleware Stack

```
Request → CORS → RLS (set app.current_user_id) → JSON config (35MB limit)
       → Auth Governor (12 req/sec, burst 5 on /auth) → Tracing → Handler
```

### API Endpoints (100+)

#### Public (No Auth)
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/hello` | Hello response |
| GET | `/auth/registration-status` | Registration enabled status |
| POST | `/early-access` | Early access signup |
| POST | `/api/contact` | Contact form |
| POST | `/api/newsletter/subscribe` | Newsletter subscribe |
| GET | `/api/newsletter/confirm` | Confirm subscription |
| GET | `/demo/*` | 14 demo endpoints (zones, measurements, trends, markers) |
| GET | `/v1/content/*` | 10 content endpoints (zones, markers, tiers, strings, web) |
| POST | `/v1/chat/public` | Website chatbot (Dr. Alex) |

#### Authentication (Rate-limited: 12 req/sec, burst 5)
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` | Register (5/day per IP) |
| POST | `/auth/login` | Login (10/day per IP) |
| GET | `/auth/verify` | Email verification |
| POST | `/auth/forgot-password` | Password reset request (3/day) |
| POST | `/auth/reset-password` | Complete reset (5/day) |
| POST | `/auth/refresh` | Refresh JWT (60-day expiry) |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/mfa/*` | 6 MFA endpoints (setup, verify, disable, recovery) |

#### Measurements & Biomarkers (Authenticated)
| Method | Path | Purpose |
|---|---|---|
| CRUD | `/measurements` | Create, read, update, soft-delete measurements |
| GET | `/markers`, `/markers/{slug}/*` | 7 marker endpoints (details, content, foods, supplements, references) |
| GET | `/calculated-markers` | Computed markers (BMI, WHtR, GKI, HOMA-IR) |
| GET | `/trends/{marker_slug}` | Trend data for charting |
| CRUD | `/devices` | Device management + sync history |
| CRUD | `/labs` | Lab provider management |
| GET | `/zones`, `/zones/{slug}` | Health zone data |

#### Health Features (Authenticated)
| Method | Path | Purpose |
|---|---|---|
| POST | `/doctor-chat` | AI chat with Dr. Alex (Anthropic API) |
| GET | `/doctor-chat/conversations/*` | Conversation management + rating |
| CRUD | `/medications` | Medication catalog, interactions, marker effects |
| CRUD | `/user-medications` | User medication tracking + restore |
| CRUD | `/influence-factors` | Lifestyle factor tracking |
| CRUD | `/measurement-templates` | Saved entry templates |
| GET | `/knowledge/*` | Knowledge base, protocols, cohort stats |

#### Settings & Export (Authenticated)
| Method | Path | Purpose |
|---|---|---|
| GET/PUT | `/settings/*` | Profile, units, lifestyle, reference ranges, consent |
| POST | `/settings/export-all` | Full GDPR data export |
| DELETE | `/settings/account` | Account deletion (30-day grace) |
| GET | `/export/csv`, `/export/json` | Measurement export |
| POST | `/reports/health-pdf` | PDF report generation |
| POST | `/import/upload` | CSV import (measurements + medications) |

#### Billing & Payments (Authenticated)
| Method | Path | Purpose |
|---|---|---|
| POST | `/billing/checkout` | Stripe checkout session |
| GET | `/billing/portal` | Stripe customer portal |
| GET/POST | `/billing/*` | Status, sync, change plan/interval, cancel, reactivate, history |
| POST | `/billing/btc/*` | Bitcoin invoice creation, status check |
| GET | `/license`, `/license/*` | Tier info, usage, downgrade |
| POST | `/v1/promotions/validate` | Promo code validation |
| POST | `/donate/invoice` | Bitcoin donation |

#### Affiliate Program (Authenticated)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/affiliate/click` | Track referral click |
| GET | `/api/affiliate/me` | Dashboard, settings, conversions |

#### Admin (Requires admin role)
| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/dashboard` | Admin stats |
| CRUD | `/admin/users` | User management (roles, tiers, licenses) |
| CRUD | `/admin/content/*` | CMS content, translations, web pages |
| CRUD | `/admin/promotions` | Promo code management |
| GET/POST | `/admin/affiliates/*` | Affiliate management, approvals, payouts |
| POST | `/admin/email/*` | Email campaigns |
| CRUD | `/admin/features` | Feature flag management |
| GET/PUT | `/admin/settings` | Platform settings |
| POST | `/admin/publish-website` | Publish website content |

### Authentication Flow

```
1. POST /auth/signup
   → Validate email + strong password (8+ chars, uppercase, number, symbol)
   → Hash password with Argon2id
   → Send verification email

2. GET /auth/verify?token=...
   → Verify token (24-hour expiry)
   → Mark email as verified

3. POST /auth/login
   → Verify credentials against Argon2 hash
   → If MFA enabled → return mfa_token (not JWT)
   → Else → return JWT (2h expiry) + refresh token (60d expiry)

4. POST /auth/mfa/verify-login (if MFA)
   → Verify TOTP code (1-period skew tolerance)
   → Return JWT + refresh token

5. POST /auth/refresh
   → Exchange refresh token for new JWT

6. Every authenticated request:
   → Extract Bearer JWT → verify signature
   → Set PostgreSQL session: app.current_user_id (for RLS)
```

### Background Jobs

| Job | Schedule | Purpose |
|---|---|---|
| Database migrations | Startup (once) | Apply pending migrations |
| Affiliate auto-approval | Daily (24h after 60s delay) | Auto-approve conversions after 30-day window |
| Hard purge cron | Daily (24h after 120s delay) | Delete accounts past 30-day grace period (GDPR-F002) |
| Contact purge | Daily (with hard purge) | Clean up contact form submissions (GDPR-F005) |

### Error Response Format

```json
{
  "data": null,
  "error": {
    "code": "unauthorized|forbidden|not_found|invalid_json|...",
    "message": "Human-readable error message"
  }
}
```

---

## 6. Layer 4 — Frontend Application

### Technology

| Component | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI library | React | 19.2.4 |
| Styling | Tailwind CSS | v4 (@tailwindcss/postcss) |
| Component system | shadcn/ui + Base UI | Latest |
| Charts | Recharts | 3.8.0 |
| Forms | React Hook Form + Zod | 7.71.2 / 4.3.6 |
| i18n | next-intl | 4.8.3 |
| Icons | Lucide React | 0.577.0 |
| Markdown | react-markdown + remark-gfm | 10.1.0 |
| Notifications | Sonner | 2.0.7 |
| Date picker | react-datepicker | 9.1.0 |
| QR codes | qrcode.react | 4.2.0 |
| Class utilities | CVA + clsx + tailwind-merge | Latest |

### Routing Tree (27 routes)

```
/                           Landing page
├── /login                  Authentication
├── /signup                 Registration
├── /register               Registration (alias)
├── /forgot-password        Password recovery
├── /reset-password         Password reset token flow
├── /verify-email           Email verification
├── /dashboard              Main authenticated dashboard
├── /measurements           Measurement list
│   ├── /new                Create measurement
│   └── /[id]               View measurement
│       └── /edit           Edit measurement
├── /trends                 Biomarker trend charts
├── /zones                  Health zone overview
│   └── /[slug]             Zone detail
├── /markers
│   └── /[markerId]         Marker detail
├── /doctor-chat            AI health coach
├── /settings               User preferences
├── /billing                Billing overview
│   └── /btc                Bitcoin payment
├── /checkout               Payment checkout
├── /admin                  Admin dashboard
├── /affiliate              Affiliate program
├── /donate                 Donations
├── /legal/privacy          Privacy policy
├── /legal/terms            Terms of service
├── /privacy                Privacy info
└── /terms                  Terms display
```

### State Management — Context Providers

```
<html>
  <NextIntlClientProvider>
    <ThemeProvider>           — Dark/light toggle, localStorage persistence
      <AuthProvider>          — JWT cookies, session expiry, user profile
        <ContentProvider>     — Zones, markers, tiers, i18n strings (5-min cache)
          <DemoProfileProvider> — Demo persona switching
            <OnboardingTracker />
            {children}
            <Toaster />
```

| Provider | Key Features |
|---|---|
| **ThemeProvider** | localStorage (`sh_theme`), default dark, applies `.dark` class to `<html>` |
| **AuthProvider** | JWT in cookies, 401 → session expiry events, profile refresh on window focus (30s throttle) |
| **ContentProvider** | Dual fallback (static JSON → API → stale cache), 5-min TTL, `useContent()` hook with `t(key)` |
| **DemoProfileProvider** | Hostname detection (demo.sovereignhealth.io), persona switching |

### Internationalization (i18n)

| Aspect | Implementation |
|---|---|
| Locales | EN (English), DE (German) |
| Keys per locale | ~1,352 |
| Static strings | `src/i18n/messages/{en,de}.json` (build-time) |
| Dynamic strings | `/v1/content/strings` API (runtime, 5-min ISR cache) |
| Strategy | Static JSON base + API override for CMS-like flexibility |
| Hooks | `useTranslations(ns)` (next-intl) + `useContent().t(key)` (API-driven) |
| Locale detection | URL param → cookie → browser language |

### Theming

| Aspect | Implementation |
|---|---|
| Color space | OKLch (oklch) |
| Dark mode | Default, `.dark` class on `<html>` |
| White flash prevention | Inline `<script>` in root layout reads localStorage before hydration |
| CSS variables | Background, foreground, primary, accent, card, destructive, chart 1–5 |
| Toggle | Navbar theme toggle, persisted to localStorage |

### API Client (`src/lib/api.ts` — ~500+ lines)

| Feature | Implementation |
|---|---|
| Auth | JWT from cookies (`auth_token`), Accept-Language header |
| Error handling | 401 → `session-expired` custom event |
| Tor support | Detects `.onion` hostname, routes through same origin |
| Request types | `request<T>()` (JSON), `rawRequest()` (streaming), `uploadRequest<T>()` (FormData) |
| Modules | auth, measurements, zones, markers, calculatedMarkers, trends, devices, labs, settings, templates, export, doctorChat, medications, mfa, content, demo |

---

## 7. Layer 5 — Infrastructure & Deployment

### Container Architecture

```
┌──────────────────────────────────────────────────┐
│                  Reverse Proxy                    │
│            (Caddy / nginx + TLS)                 │
├──────────────┬──────────────┬────────────────────┤
│   Frontend   │   Backend    │    PostgreSQL       │
│  Next.js 16  │  Actix-Web 4 │  16 + pgaudit      │
│  :3000       │  :8080       │  :5432             │
├──────────────┴──────────────┤────────────────────┤
│         Redis 7 Alpine      │   (shared cache)   │
│         :6379               │                    │
└─────────────────────────────┴────────────────────┘
```

### Docker Compose Profiles

| Profile | File | Use Case |
|---|---|---|
| **Self-hosted** | `docker-compose.selfhosted.yml` | Builds from source, no registry needed |
| **Development** | `docker-compose.dev.yml` | Full stack with hot reload |
| **Staging** | `docker-compose.staging.yml` | Pre-built images, basic auth |
| **Production** | `docker-compose.prod.yml` | Pre-built images, full config |

### Deployment Targets

| Environment | Branch | API Domain | App Domain |
|---|---|---|---|
| **Staging** | develop | api-demo.sovereignhealth.io | demo.sovereignhealth.io |
| **Production** | main | api.sovereignhealth.io | app.sovereignhealth.io |
| **Website** | — | — | sovereignhealth.io |

### Deploy Script (`ops/deploy.sh`)

```bash
bash ops/deploy.sh staging                    # Deploy develop → staging
bash ops/deploy.sh staging backend|frontend   # Deploy specific service
bash ops/deploy.sh production --confirm       # Deploy to production (requires confirmation)
bash ops/deploy.sh promote                    # Merge develop → main
bash ops/deploy.sh status                     # Show VPS container status
bash ops/deploy.sh staging-reset-db           # Reset staging DB
```

**Post-deploy:** health check, Cloudflare cache purge, action report with status (OK/SKIP/FAIL)

### CI/CD Pipeline (`.github/workflows/ci-health.yml`)

```
Trigger: push/PR to main or develop (health/crates/packages paths only)

┌─────────────────────────────────────────────────────────┐
│ Lint (parallel)                                         │
│  ├── cargo fmt --check                                  │
│  └── cargo clippy -D warnings                           │
├─────────────────────────────────────────────────────────┤
│ Smoke tests (no DB)                                     │
│  └── cargo test --test smoke                            │
├─────────────────────────────────────────────────────────┤
│ Integration tests (no DB)                               │
│  └── cargo test --test integration                      │
├─────────────────────────────────────────────────────────┤
│ Database tests (parallel, each with PostgreSQL 16)      │
│  ├── auth_test                                          │
│  ├── measurement_test                                   │
│  ├── tier_test                                          │
│  ├── doctor_chat_test                                   │
│  └── platform_test (RLS, DB roles, pgaudit, crates)    │
├─────────────────────────────────────────────────────────┤
│ Crate unit tests (parallel)                             │
│  └── brickos-auth, brickos-crypto, brickos-billing,    │
│      brickos-email, brickos-db                          │
├─────────────────────────────────────────────────────────┤
│ Property tests                                          │
│  └── proptest (1000 randomized cases)                   │
├─────────────────────────────────────────────────────────┤
│ Security audit                                          │
│  └── cargo audit                                        │
├─────────────────────────────────────────────────────────┤
│ Frontend                                                │
│  └── pnpm build + pnpm test (Node 22, pnpm v10)        │
└─────────────────────────────────────────────────────────┘
```

### Infrastructure Details

| Component | Specification |
|---|---|
| VPS | root@72.61.154.115 |
| Base path | /opt/sovereign-health |
| Container runtime | Docker Engine 24+ |
| DNS / CDN | Cloudflare (zone purge on deploy) |
| TLS | Let's Encrypt (automatic via Caddy) |
| Staging auth | Basic auth (STAGING_AUTH_USER / STAGING_AUTH_PASS) |

---

## 8. Cross-Cutting Concerns

### Security

| Feature | Implementation |
|---|---|
| **Encryption at rest** | AES-256-GCM (optional, ENCRYPTION_KEY) |
| **Password hashing** | Argon2id |
| **JWT auth** | 2-hour access tokens, 60-day refresh tokens |
| **MFA** | TOTP with QR codes + 8 recovery codes |
| **Row-Level Security** | PostgreSQL RLS on 15 tables |
| **Audit logging** | pgaudit (DDL + writes) + data_access_log table |
| **Rate limiting** | actix-governor (12/sec on auth) + per-endpoint IP limits |
| **Webhook verification** | HMAC-SHA256 (Stripe + Strike) |
| **CORS** | Restricted to frontend + website origins |
| **TLS** | Let's Encrypt via Caddy, rustls (no OpenSSL) |

### GDPR Compliance

| Requirement | Implementation |
|---|---|
| **Art. 15 — Right of access** | Full JSON data export (`/settings/export-all`) |
| **Art. 17 — Right to erasure** | Soft delete → 30-day grace → hard purge cron |
| **Art. 20 — Portability** | CSV + JSON export of measurements |
| **Art. 25 — Data protection by design** | RLS, encryption at rest, audit logging |
| **Art. 30 — Processing records** | data_access_log table |
| **Consent management** | `/settings/consent` endpoints, anonymous data opt-in |
| **Contact retention** | Auto-purge contact form submissions |

### Internationalization

| Layer | Approach |
|---|---|
| **Backend** | Accept-Language header → content locale, DB translations tables |
| **Frontend** | next-intl (static JSON) + API content strings (runtime override) |
| **Locales** | EN (English), DE (German) — minimum required |
| **Coverage** | ~1,352 keys per locale |
| **Rule** | No hardcoded strings — all text through i18n |

### Observability

| Feature | Implementation |
|---|---|
| Structured logging | tracing + tracing-subscriber (JSON format) |
| Request tracing | tracing-actix-web |
| Health endpoint | `GET /health` |
| pgaudit | DDL + write operations logged |
| Data access log | Who accessed what user data, when |

---

## 9. Processes & Workflows

### Sprint Planning

| Aspect | Details |
|---|---|
| **Model** | Named numbered sprints (e.g., "Sprint 001 — Go-Live"), not time-boxed |
| **Board** | GitHub Project v2 with Kanban columns: Backlog → Todo → In Progress → In Review → Done |
| **Priority levels** | P0-critical, P1-high, P2-medium, P3-low |
| **Estimation** | Fibonacci points: 1, 2, 3, 5, 8 |
| **Areas** | API, Frontend, Platform, Ops, Docs |
| **Branch naming** | `feat/42-oauth-google-login`, `fix/85-stripe-upgrade-button` |
| **Commits** | Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:` |

### Documentation-as-Code Workflow

```
Sprint Planning (what & when)
    ↓ references
Design Docs (what & how)        — NNN-kebab-case.md in docs/design/
    ↓ references
ADRs (why)                       — NNN-kebab-case.md in docs/adr/
    ↓ sprint completes
Releases (proof)                 — vX.Y.Z-rcN/ in docs/releases/
Reports (evidence)               — YYYY-MM-DD_description.md in docs/reports/
```

**Naming conventions:**
- Templates: `000-TEMPLATE.md`
- Numbered docs: `NNN-kebab-case.md`
- Reports: `YYYY-MM-DD_description.md`
- Releases: `vX.Y.Z-rcN/`

### Design Doc Template

```markdown
# NNN — Feature Name
- **Issue:** https://github.com/sovereignbrick/brickos/issues/NN
- **Status:** Draft → In Review → Accepted → Implemented
- **Problem:** ...
- **Approach:** ...
- **Data Model:** ...
- **API Changes:** ...
- **UI Changes:** ...
- **Open Questions:** ...
- **References:** ...
```

**Current designs (9):**
001-oauth-social-login, 002-data-sovereignty, 003-health-connect, 004-anti-nutrient-analysis, 005-extend-measurements, 006-allergy-tracker, 007-symptom-journal, 008-admin-rewrite, 009-onboarding-and-learn-content

### Release Process

1. Cut release candidate on `develop` branch
2. Run full CI pipeline (lint, tests, security audit)
3. Deploy to staging (`bash ops/deploy.sh staging`)
4. Manual testing checklist (12-point)
5. Automated testing report + GDPR audit + release audit
6. Fix issues → next RC
7. When stable: `bash ops/deploy.sh promote` (merge develop → main)
8. Deploy production: `bash ops/deploy.sh production --confirm`

---

## 10. BrickOS Platform Core Features

### Implemented Features

| Feature | Status | Layer |
|---|---|---|
| **Biomarker tracking** (12+ markers) | Production | API + Frontend |
| **Calculated markers** (BMI, WHtR, GKI, HOMA-IR) | Production | API |
| **Trend analysis** (7d, 30d, 6mo, 1yr) | Production | API + Frontend |
| **Health zones** (metabolic, cardiovascular, etc.) | Production | API + Frontend |
| **Device management** | Production | API + Frontend |
| **Lab management** | Production | API + Frontend |
| **Measurement templates** | Production | API + Frontend |
| **CSV import/export** | Production | API + Frontend |
| **PDF health reports** | Production | API |
| **AI Doctor Chat** (Dr. Alex via Anthropic) | Production | API + Frontend |
| **Medication tracking** + interactions | Production | API + Frontend |
| **Influence factors** (lifestyle tracking) | Production | API + Frontend |
| **Knowledge base** (foods, supplements, protocols) | Production | API + Frontend |
| **MFA (TOTP + recovery codes)** | Production | API + Frontend |
| **Stripe billing** (4 tiers, monthly/annual) | Production | API + Frontend |
| **Bitcoin payments** (Strike Lightning + on-chain) | Production | API + Frontend |
| **Affiliate program** | Production | API + Frontend |
| **Promo codes / coupons** | Production | API + Frontend |
| **Feature flags** | Production | API + Admin |
| **Admin panel** (users, content, billing, affiliates) | Production | API + Frontend |
| **CMS-driven website** | Production | API + Admin |
| **Newsletter management** (Mailgun) | Production | API + Admin |
| **GDPR compliance** (export, deletion, audit) | Production | API |
| **Row-Level Security** (15 tables) | Production | Database |
| **AES-256-GCM encryption at rest** | Production | API (via crate) |
| **pgaudit logging** | Production | Database |
| **Dark/light theme** | Production | Frontend |
| **i18n (EN + DE)** | Production | API + Frontend |
| **Demo mode** (unauthenticated) | Production | API + Frontend |
| **Onboarding checklist** | Production | Frontend |
| **Self-hosted deployment** | Production | Ops |

### Planned Features (Open Milestones)

| Milestone | Description |
|---|---|
| Health Intelligence Graph | Extended analytics, correlations, trend visualizations |
| Dr. Alex as a Service | AI health coach enhancements |
| Security Hardening | Additional security measures |
| Organization Support | Multi-org, practitioner access |
| Patient Data Sharing | Controlled data sharing with practitioners |
| Advanced Multi-Tenancy | Isolated tenant environments |
| Platform Extraction | Full BrickOS Core separation |
| Auth Modernization | OAuth, social login, passkeys |
| AI & Smart Features | Intelligent insights, anomaly detection |
| User Experience & Onboarding | Improved UX flows |
| Self-Hosting & Distribution | StartOS, easier self-hosting |
| Health Ecosystem Integrations | Apple Health, Google Health Connect |
| Data Sovereignty & Vendor Independence | Vendor data mirrors |

---

## 11. Technology Version Matrix

### Backend

| Dependency | Version | Purpose |
|---|---|---|
| Rust | 2021 edition | Language |
| actix-web | 4 | HTTP framework |
| sqlx | 0.8 | Database (compile-time SQL) |
| tokio | 1 | Async runtime |
| serde / serde_json | 1 | Serialization |
| jsonwebtoken | 9 | JWT auth |
| argon2 | 0.5 | Password hashing |
| aes-gcm | 0.10 | AES-256-GCM encryption |
| reqwest | 0.12 | HTTP client (rustls) |
| actix-governor | 0.5 | Rate limiting |
| actix-cors | 0.7 | CORS |
| tracing | 0.1 | Structured logging |
| tracing-subscriber | 0.3 | Log formatting (JSON) |
| tracing-actix-web | 0.7 | Request tracing |
| chrono | 0.4 | Timestamps |
| uuid | 1 | UUIDs |
| totp-rs | — | TOTP MFA |
| genpdf | 0.2 | PDF generation |
| image | 0.25 | Image processing |
| rand | 0.8 | Random generation |
| thiserror | 1 | Error types |
| anyhow | 1 | Error handling |

### Frontend

| Dependency | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | Framework (App Router, standalone output) |
| React | 19.2.4 | UI library |
| Tailwind CSS | v4 | Styling (OKLch color space) |
| shadcn/ui | latest | Component primitives |
| @base-ui/react | 1.2.0 | Headless components |
| Recharts | 3.8.0 | Data visualization |
| React Hook Form | 7.71.2 | Form management |
| Zod | 4.3.6 | Schema validation |
| next-intl | 4.8.3 | Internationalization |
| Lucide React | 0.577.0 | Icons |
| react-markdown | 10.1.0 | Markdown rendering |
| remark-gfm | 4.0.1 | GitHub-flavored markdown |
| Sonner | 2.0.7 | Toast notifications |
| react-datepicker | 9.1.0 | Date/time selection |
| qrcode.react | 4.2.0 | QR code generation |
| CVA | 0.7.1 | Class variance authority |
| clsx | 2.1.1 | Conditional classes |
| tailwind-merge | 3.5.0 | Tailwind class dedup |
| js-cookie | 3.0.5 | Cookie management |

### Infrastructure

| Component | Version | Purpose |
|---|---|---|
| Docker Engine | 24+ | Containerization |
| Docker Compose | v2 | Orchestration |
| PostgreSQL | 16 Alpine | Database |
| pgaudit | REL_16_STABLE | Audit extension |
| Redis | 7 Alpine | Cache / sessions |
| Node.js | 22 | Frontend runtime |
| pnpm | 10 | Package manager |
| Caddy | latest | Reverse proxy + auto-TLS |
| Cloudflare | — | DNS + CDN + cache purge |
| GitHub Actions | — | CI/CD |

---

## 12. Codebase Statistics

| Metric | Value |
|---|---|
| **Total lines of code** | 147,296 |
| **Tracked files** | 720 |
| **Rust (.rs)** | 120 files / 37,975 lines |
| **TypeScript (.ts, .tsx)** | 172 files / 32,583 lines |
| **SQL (.sql)** | 161 files / 22,057 lines |
| **Markdown (.md)** | 151 files / 14,640 lines |
| **Shell (.sh)** | 5 files / 1,320 lines |
| **Docker** | ~552 lines |
| **CSS** | ~365 lines |
| **TOML** | 13 files / 236 lines |
| **SQL migrations** | 93 |
| **API endpoints** | 100+ |
| **Frontend routes** | 27 |
| **i18n keys** | ~1,352 per locale (EN + DE) |
| **Rust crates** | 9 (1 workspace root, 7 shared, 1 app) |
| **Node packages** | 2 (frontend, website) |
| **Docker Compose profiles** | 4 (self-hosted, dev, staging, prod) |
| **CI test suites** | 8 (smoke, integration, 5 DB, property, security) |
| **Open milestones** | 17 |
| **Design docs** | 9 |
| **Background crons** | 3 (affiliate, hard purge, contact purge) |
