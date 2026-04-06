# Sprint 027 -- Sovereign Link v1.0

**Started:** TBD
**Duration:** 7 days (3 phases)
**Status:** PLANNED
**Goal:** Ship Sovereign Link as a standalone self-hosted URL shortener with NOSTR + email login, deployable via Docker, static binary, and Start9.

## Design Documents

- `apps/technology/sovereign-link/docs/design-001-sovereign-link-v1.md` -- Architecture + decisions
- `apps/technology/sovereign-link/docs/design-002-sovereign-link-specification.md` -- Full product spec

## Sprint Backlog

### Phase A: Core + Auth (Days 1-3, 20 pts)

| # | Title | Area | Pts | Day |
|---|-------|------|-----|-----|
| A1 | SQLite backend: LinkStore + UserStore trait implementations | Backend | 3 | 1 |
| A2 | Database migrations (SQLite schema) | Backend | 1 | 1 |
| A3 | Config system (TOML + ENV, auto-generate JWT secret) | Backend | 1 | 1 |
| A4 | Email auth: register, login, JWT, Argon2id password hashing | Backend | 3 | 1 |
| A5 | NOSTR NIP-98 auth: event verification (secp256k1), auto-create user, JWT | Backend | 5 | 2 |
| A6 | API key auth: generate, hash, verify | Backend | 1 | 2 |
| A7 | AuthProvider trait (extensible for future SSO) | Backend | 1 | 2 |
| A8 | Web UI: login page (email form + NOSTR NIP-07 button) | Frontend | 2 | 2 |
| A9 | Web UI: dashboard (link list with click counts) | Frontend | 1 | 3 |
| A10 | Web UI: create link form + link detail page | Frontend | 1 | 3 |
| A11 | Docker single-container build (Alpine, musl) | Ops | 1 | 3 |

**A1 sub-tasks:**
- [ ] Define `LinkStore` trait (get_by_code, create, update, delete, list_by_user, record_click, get_stats, export, import)
- [ ] Define `UserStore` trait (get_by_id, get_by_email, get_by_nostr_pubkey, get_by_api_key, create, update, link_nostr)
- [ ] Implement both traits for SQLite using `rusqlite`
- [ ] Connection pool with r2d2

**A2 sub-tasks:**
- [ ] Create `migrations/sqlite/001_initial.sql` (users, links, clicks, sessions tables)
- [ ] Auto-run migrations on startup

**A4 sub-tasks:**
- [ ] `POST /auth/register` -- create user with Argon2id hashed password
- [ ] `POST /auth/login` -- verify password, issue JWT
- [ ] `POST /auth/refresh` -- refresh JWT token
- [ ] First registered user auto-becomes admin
- [ ] Admin can toggle `allow_registration`

**A5 sub-tasks:**
- [ ] Parse NIP-98 event JSON (kind 27235)
- [ ] Verify: kind, URL tag matches endpoint, created_at within 60s
- [ ] Verify secp256k1 signature against pubkey (use `secp256k1` crate or `nostr` crate)
- [ ] Lookup user by pubkey, auto-create if new
- [ ] Issue JWT same as email login
- [ ] Frontend: detect NIP-07 extension (`window.nostr`), call `signEvent()`, POST to `/auth/nostr`

**A8 sub-tasks:**
- [ ] askama base template with BrickOS dark theme CSS tokens
- [ ] Login page: two tabs (Email / NOSTR)
- [ ] Email tab: email + password form, register link
- [ ] NOSTR tab: "Sign in with NOSTR" button, detects NIP-07
- [ ] Fallback for no NIP-07: paste nsec field (with security warning)
- [ ] This is the ONLY page requiring JavaScript (for NIP-07 interaction)

**A11 sub-tasks:**
- [ ] Multi-stage Dockerfile (builder + Alpine runtime)
- [ ] Expose port 8080
- [ ] Volume mount for /data (SQLite file)
- [ ] ENV vars for config overrides
- [ ] Health check: `GET /health`

### Phase B: Distribution (Days 4-5, 9 pts)

| # | Title | Area | Pts | Day |
|---|-------|------|-----|-----|
| B1 | Static binary release (musl cross-compile for linux-amd64) | Ops | 2 | 4 |
| B2 | NOSTR NIP-89 app listing publisher (on startup) | Backend | 2 | 4 |
| B3 | Start9 package: manifest.yaml, config spec, instructions, health check | Ops | 3 | 5 |
| B4 | Documentation: README, self-hosting guide, Start9 guide, API reference | Docs | 2 | 5 |

**B1 sub-tasks:**
- [ ] Cross-compile with `cross` or `cargo build --target x86_64-unknown-linux-musl`
- [ ] GitHub Release with binary artifact
- [ ] SHA256 checksum file
- [ ] Install instructions: curl + chmod + run

**B2 sub-tasks:**
- [ ] On startup (if `nostr.nip89_publish = true`), sign and publish kind 31990 event
- [ ] Event includes: app name, description, base URL, source repo, supported NIPs
- [ ] Publish to configured relay list
- [ ] Only re-publish if version changed (store last published version in DB)

**B3 sub-tasks:**
- [ ] `startos/manifest.yaml` with service metadata, ports, volumes, health check
- [ ] Config spec: admin email/password, base URL, NOSTR enabled, registration toggle
- [ ] `startos/instructions.md` for Start9 UI (how to access, first login, NOSTR setup)
- [ ] Health check endpoint integration
- [ ] Test on Start9 dev environment (if available) or document manual testing steps

**B4 sub-tasks:**
- [ ] `README.md`: project overview, quickstart (Docker + binary + Start9), screenshots
- [ ] `docs/self-hosting.md`: detailed setup for Docker Compose, VPS, reverse proxy
- [ ] `docs/start9-guide.md`: Start9-specific instructions
- [ ] `docs/api-reference.md`: all endpoints with examples

### Phase C: Polish + Port (Days 6-7, 10 pts)

| # | Title | Area | Pts | Day |
|---|-------|------|-----|-----|
| C1 | Click analytics UI: daily chart (server-rendered SVG), top referrers | Frontend | 3 | 6 |
| C2 | Settings page: change password, link NOSTR key, API key management | Frontend | 2 | 6 |
| C3 | Account linking: connect email + NOSTR to same user account | Backend | 2 | 6 |
| C4 | Port NOSTR NIP-98 auth to Sovereign Health (AuthProvider impl) | Backend | 3 | 7 |

**C1 sub-tasks:**
- [ ] Link detail page: clicks per day bar chart (last 30 days)
- [ ] Chart rendered as inline SVG (no JS charting library)
- [ ] Top 5 referrer domains table
- [ ] Country breakdown (if data available from CF header)

**C3 sub-tasks:**
- [ ] Settings: "Link NOSTR Key" button for email-only users
- [ ] Settings: "Link Email" form for NOSTR-only users
- [ ] Verification: sign NIP-98 event to prove NOSTR key ownership
- [ ] DB: update user record with both email + nostr_pubkey

**C4 sub-tasks:**
- [ ] Add `nostr` feature flag to Sovereign Health API
- [ ] Implement `AuthProvider` for NIP-98 in SHI auth middleware
- [ ] `POST /auth/nostr` endpoint in SHI
- [ ] Frontend: "Login with NOSTR" button on SHI login page
- [ ] Test: NOSTR login creates SHI user, can access health data

## Dependency Graph

```
Phase A (sequential within, no external deps):
═══════════════════════════════════════════════
  A1 SQLite backend ─────┐
  A2 Migrations ─────────┤
  A3 Config ─────────────┤── Foundation (Day 1)
  A4 Email auth ─────────┘
           │
           ▼
  A5 NOSTR auth ─────────┐
  A6 API key auth ────────┤── Auth complete (Day 2)
  A7 AuthProvider trait ──┘
           │
           ▼
  A8 Login UI ───────────┐
  A9 Dashboard UI ────────┤── UI + Docker (Day 3)
  A10 Link forms ─────────┤
  A11 Docker build ───────┘

Phase B (after A is working):
═════════════════════════════
  B1 Static binary ──── independent
  B2 NIP-89 listing ─── needs NOSTR from A5
  B3 Start9 package ─── needs Docker from A11
  B4 Documentation ──── needs everything above

Phase C (after B, can overlap):
════════════════════════════════
  C1 Analytics UI ──── needs A9 (dashboard)
  C2 Settings UI ───── needs A4+A5 (both auth methods)
  C3 Account linking ── needs A4+A5
  C4 Port to SHI ───── needs A5+A7 (NOSTR auth + trait)
```

## Execution Order

```
DAY 1 -- Foundation
════════════════════
  AM: A1 SQLite LinkStore + UserStore (trait + impl)
      A2 Migration: 001_initial.sql
      A3 Config system (TOML + ENV)
  PM: A4 Email auth (register, login, JWT, Argon2)
      Basic redirect handler wired up

DAY 2 -- NOSTR Auth
════════════════════
  AM: A5 NIP-98 event verification + auto-create
      A6 API key auth
      A7 AuthProvider trait
  PM: A8 Login page (askama, email + NOSTR tabs)
      Test all 3 auth flows

DAY 3 -- UI + Docker
═════════════════════
  AM: A9 Dashboard (link list)
      A10 Create link + link detail
  PM: A11 Docker build
      Integration testing
      RC: verify redirect, all auth, CRUD

DAY 4 -- Distribution
══════════════════════
  AM: B1 Static binary (musl cross-compile + GitHub Release)
  PM: B2 NIP-89 app listing publisher
      Test: binary runs standalone, NIP-89 event published

DAY 5 -- Start9 + Docs
════════════════════════
  AM: B3 Start9 package (.s9pk)
  PM: B4 Documentation (README, guides, API reference)

DAY 6 -- Polish
════════════════
  AM: C1 Analytics UI (SVG charts, referrer table)
  PM: C2 Settings page
      C3 Account linking (email + NOSTR)

DAY 7 -- Port to SHI + Ship
═════════════════════════════
  AM: C4 Port NOSTR auth to Sovereign Health
  PM: RC testing all deployment modes
      Tag v1.0.0 release
      Publish to Docker Hub + Start9 marketplace + NOSTR relays
```

## Total Points: 39

## Risk Assessment

- **A5 NOSTR NIP-98** (5 pts): Highest complexity. secp256k1 signature verification in Rust + NIP-07 browser extension integration. Mitigated by: `nostr` crate handles crypto, NIP-07 is well-documented.
- **B3 Start9 package** (3 pts): First time packaging for Start9. May need Start9 dev environment or emulator. Mitigated by: simple service (single binary + SQLite), good Start9 docs.
- **C4 Port to SHI** (3 pts): Sovereign Health has more complex auth middleware. Mitigated by: AuthProvider trait designed for pluggability, NOSTR auth is just a new variant.
- **Browser extension dependency**: NIP-07 requires a NOSTR browser extension (nos2x, Alby). Mitigated by: nsec paste fallback, clear "Install extension" prompt.
- **Cross-compilation**: musl static binary for Linux amd64. May have issues with SQLite linkage. Mitigated by: bundled SQLite (rusqlite with `bundled` feature).

## Success Criteria

- [ ] `docker run` creates first short link in < 60 seconds
- [ ] NOSTR NIP-07 login works without email account
- [ ] Start9 one-click install + .onion shortening works
- [ ] Static binary runs for 30 days without crashes
- [ ] Redirect latency < 10ms p95
- [ ] Binary < 20MB, Docker image < 30MB, memory < 50MB
- [ ] NIP-89 listing discoverable by at least 1 NOSTR client
- [ ] Sovereign Health has working NOSTR login (ported from Sovereign Link)
