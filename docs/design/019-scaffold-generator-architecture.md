# 019 -- BrickOS Scaffold Generator Architecture

**Status:** Active v1
**Author:** Helmut / Claude
**Date:** 2026-04-09
**Related:** 014-brickos-platform-gui, 017-sovereign-crm, 018-platform-service-elevation, ADR-042 (3-char app prefix)

---

## 1. Purpose

Every new BrickOS app (Sovereign CRM, Voice, Almanac, etc.) needs the same foundation: two-pool database architecture, auth handlers writing to the platform DB, encrypted PII fields, dark theme with brand detection, i18n (EN/DE), Docker deployment, and integration with all `brickos-*` platform crates.

The scaffold generator creates this entire foundation with a single command, guaranteeing consistency across all apps in the ecosystem.

```bash
bash ops/scaffold-app.sh sovereign-crm scr data 8084 "Sovereign CRM"
```

---

## 2. Post-Scaffold Fix Registry

During the first scaffold run (Sovereign CRM, 2026-04-08), six bugs were discovered that required manual fixes. All have been resolved in v2.

| # | Bug | Root Cause | Fix | Prevention |
|---|-----|-----------|-----|------------|
| 1 | Title casing: "Sovereign Crm" instead of "Sovereign CRM" | `sed 's/\b\(.\)/\u\1/g'` doesn't know acronyms | `smart_title_case()`: words <= 3 chars get uppercased; optional 5th arg for custom title | Heuristic + override |
| 2 | `Encryptor::new(key).expect(...)` fails -- wrong API | Scaffold assumed `Encryptor::new` returns `Result` | `Encryptor::new(Option<&str>) -> Self`, wrap in `Arc` (no Clone) | `scaffold-api:` comments in main.rs |
| 3 | Hand-constructed `Box<dyn EmailProvider>` with wrong arity | Scaffold called `MailgunProvider::new(3 args)` and `LogProvider::new()` | Use factory: `brickos_email::create_email_provider(is_saas)` -> `Arc<dyn EmailProvider>` | Factory abstraction |
| 4 | `Notifier::from_env()` doesn't exist | Scaffold invented a convenience method | `NotifyConfig::from_env()` then `Notifier::new(config)` | `scaffold-api:` comments |
| 5 | `cargo clippy -D warnings` fails on dead code | Model stubs (SignupRequest, etc.) not referenced by handler stubs | `#[allow(dead_code)]` on all 6 auth model structs | Pre-applied in template |
| 6 | `cargo fmt` produces diff on generated code | Heredoc templates aren't formatted by rustfmt | Templates are real `.rs` files; auto-run `cargo fmt` post-generation | Real files + auto-fmt |

---

## 3. Architecture

### v1 (monolithic, deprecated)
Single 2,066-line bash script with heredoc-embedded templates. Code inside heredocs cannot be linted, formatted, or type-checked.

### v2 (template-based, current)
~210-line orchestrator + 36 template files in `ops/scaffold-templates/`.

```
ops/
  scaffold-app.sh                 # Orchestrator (~210 lines)
  scaffold-test.sh                # Integration test
  scaffold-templates/
    api/                          # Rust API templates
      Cargo.toml.tmpl             # .tmpl = envsubst variables
      src/
        main.rs                   # Real .rs file (IDE-lintable)
        config.rs.tmpl            # .tmpl = has ${PREFIX_UPPER} etc.
        error.rs                  # Real .rs file
        handlers/                 # auth.rs, health.rs, mod.rs
        models/mod.rs             # With #[allow(dead_code)]
      tests/, benches/, Makefile
      .env.example.tmpl
    frontend/                     # Next.js templates
      package.json.tmpl
      src/app/
        layout.tsx.tmpl           # .tmpl = has ${APP_TITLE}
        globals.css               # Static
        login/page.tsx            # Static (no variables)
        signup/page.tsx
        dashboard/page.tsx
        settings/page.tsx
      src/lib/
        auth-context.tsx          # Static
        theme-context.tsx
        providers.tsx
        brand.ts.tmpl             # .tmpl = has ${APP_TITLE}
      src/components/layout/
        navbar.tsx                # Static (204 lines, IDE-lintable)
      src/i18n/messages/
        en.json, de.json
    ops/                          # Docker + deploy templates
      Dockerfile.api.tmpl
      Dockerfile.web.tmpl
      docker-compose.*.tmpl
      deploy.sh.tmpl
    .gitignore, .dockerignore     # Static
```

### Rendering Strategy

**Static files** (no `.tmpl` suffix): Copied verbatim. These are real source files that can be opened in an IDE, formatted by `cargo fmt` / `prettier`, and linted by `clippy` / `eslint`.

**Template files** (`.tmpl` suffix): Processed by `envsubst`. The `.tmpl` suffix is stripped in the output. Variables use `${VARIABLE}` syntax.

### Variables Available in Templates

| Variable | Example | Used in |
|----------|---------|---------|
| `${APP_NAME}` | `sovereign-crm` | package.json, Dockerfiles |
| `${APP_TITLE}` | `Sovereign CRM` | Cargo.toml, layout.tsx, brand.ts |
| `${PREFIX}` | `scr` | docker-compose, deploy |
| `${PREFIX_UPPER}` | `SCR` | config.rs, .env.example |
| `${CRATE_NAME}` | `sovereign-crm-api` | Cargo.toml, Dockerfiles |
| `${PILLAR}` | `data` | Dockerfiles |
| `${PROD_PORT}` | `8084` | config.rs, docker-compose |
| `${STAGING_PORT}` | `8085` | docker-compose |
| `${DOCKER_PREFIX}` | `sovereignbrick/scr` | docker-compose, deploy |
| `${DOLLAR}` | `$` | docker-compose (literal `${VERSION}`) |

---

## 4. Template API Contract

Templates reference specific crate APIs. When crates change, templates must be updated. API signatures are documented with `scaffold-api:` comments in `main.rs`:

```rust
// scaffold-api: brickos_crypto::Encryptor::new(Option<&str>) -> Self (no Clone, wrap in Arc)
// scaffold-api: brickos_email::create_email_provider(bool) -> Arc<dyn EmailProvider>
// scaffold-api: brickos_notify::NotifyConfig::from_env() -> NotifyConfig
// scaffold-api: brickos_notify::Notifier::new(NotifyConfig) -> Notifier
```

To find all API contracts: `grep -r 'scaffold-api:' ops/scaffold-templates/`

---

## 5. Usage

```bash
# Basic usage (title auto-generated from name)
bash ops/scaffold-app.sh <app-name> <prefix> <pillar> <prod-port>

# With custom title (for acronyms, special casing)
bash ops/scaffold-app.sh <app-name> <prefix> <pillar> <prod-port> "Custom Title"

# Examples
bash ops/scaffold-app.sh sovereign-crm scr data 8084 "Sovereign CRM"
bash ops/scaffold-app.sh sovereign-voice svo attention 8086
bash ops/scaffold-app.sh sovereign-almanac sal energy 8088
bash ops/scaffold-app.sh sovereign-exchange sex finance 8090
```

### Title Casing Heuristic

Words <= 3 characters are auto-uppercased:
- `sovereign-crm` -> `Sovereign CRM`
- `sovereign-api` -> `Sovereign API`
- `sovereign-health` -> `Sovereign Health`

Override with the optional 5th argument when the heuristic doesn't apply.

---

## 6. What Gets Generated (38 files)

### Backend (Rust / Actix-web)
- `api/Cargo.toml` -- all brickos-* workspace deps
- `api/src/main.rs` -- two-pool init, CORS, tracing, services
- `api/src/config.rs` -- `PREFIX_*` env var loading
- `api/src/error.rs` -- AppError enum with ResponseError
- `api/src/handlers/mod.rs` -- route configuration
- `api/src/handlers/auth.rs` -- signup, login, MFA, password reset stubs
- `api/src/handlers/health.rs` -- health check endpoint
- `api/src/models/mod.rs` -- auth request/response types
- `api/tests/smoke.rs`, `api/tests/integration.rs`
- `api/benches/endpoints.rs`
- `api/Makefile` -- ci, lint, test, bench
- `api/.env.example` -- all required env vars
- `api/migrations/.gitkeep`

### Frontend (Next.js 16)
- Login page with MFA (TOTP 6-digit + recovery codes)
- Signup page with password strength indicator
- Dashboard placeholder
- Settings page (Profile, Security, Account, Data & Privacy tabs)
- Navbar: logo, top nav, search (Ctrl+K), language selector, user menu
  - User menu: Settings, Affiliate, Admin (amber, role-gated), Toggle theme, Sign out (red)
- AuthProvider (cookie JWT, session expiry, window focus refresh)
- ThemeProvider (dark/light toggle, localStorage)
- Brand detection (hostname-based: app domain vs brickos.io)
- i18n (EN + DE translations)
- Dark theme enforced (BrickOS design tokens)

### Ops (Docker + Deploy)
- `Dockerfile.api` -- cargo-chef multi-stage build
- `Dockerfile.web` -- standalone Next.js build
- `docker-compose.staging.yml` -- staging containers
- `docker-compose.prod.yml` -- production containers
- `deploy.sh` -- deployment script template

---

## 7. Post-Generation Verification

The scaffold automatically runs after generation:

1. `cargo fmt -p {crate}` -- auto-formats to canonical style
2. `cargo check -p {crate}` -- verifies compilation
3. `cargo clippy -p {crate} -- -D warnings` -- zero warnings

If the crate is not yet registered in `Cargo.toml`, these steps are skipped with a note.

---

## 8. Platform Integration Roadmap

### Phase 1: CLI Scaffold (current -- v2)
Developer runs `bash ops/scaffold-app.sh` from terminal. Manual steps: add to workspace, create database, copy assets.

### Phase 2: Platform API Endpoint
Add to `brickos-platform-api` (port 9000):

```
POST /platform/api/v1/apps/scaffold
{
    "app_name": "sovereign-crm",
    "prefix": "scr",
    "pillar": "data",
    "port": 8084,
    "title": "Sovereign CRM",
    "logo_url": "...",
    "favicon_url": "..."
}
```

The endpoint:
1. Validates prefix uniqueness against `brickos.org_apps`
2. Validates port not already assigned
3. Creates database: `CREATE DATABASE scr`
4. Inserts into `brickos.org_apps` for platform org
5. Inserts default `brickos.app_settings`
6. Creates service account via existing CRUD
7. Runs scaffold-app.sh server-side
8. Copies logo/favicon to frontend/public/
9. Returns status + file manifest

### Phase 3: Platform GUI "Create App" Wizard
Integrate into Platform Admin GUI (design 014):

- "Apps" section in admin sidebar
- "Create App" button opens wizard form:
  - Name (validated: lowercase, hyphenated)
  - Prefix (3 chars, validated unique)
  - Pillar (dropdown)
  - Port (auto-suggested next available)
  - Title (auto-generated, editable)
  - Logo upload (PNG/SVG, max 100KB)
  - Favicon upload (ICO/PNG)
  - Theme color override (optional)
- Preview panel shows generated structure
- "Create" button calls Phase 2 API
- Progress indicator (database, scaffold, verification)
- Success: links to app directory, next steps checklist

### Phase 4: App Marketplace / Template Variants
- Template variants: "CRM template", "Chat template", "Analytics dashboard"
- Each variant adds domain-specific handlers and migrations
- Community-contributed templates (vetted, signed)
- Version-controlled template registry

---

## 9. CI Verification

`ops/scaffold-test.sh` is an integration test that verifies the scaffold produces compilable, clean code:

```bash
# Generate test app -> register -> verify -> clean up
bash ops/scaffold-test.sh
```

Can be run as a CI job to catch template drift when crate APIs change.

---

## 10. Future Improvements

1. **Template inheritance**: Base template + app-specific overrides (e.g., CRM adds contact handlers)
2. **Scaffold update command**: Re-apply templates to existing apps (sync new platform patterns)
3. **Feature flags**: `--with-ai`, `--with-billing`, `--with-payments` to include/exclude optional integrations
4. **Frontend component library**: Pre-scaffold shadcn/ui components (data tables, filter bars, etc.)
5. **E2E test scaffold**: Playwright test stubs matching generated pages
6. **CLAUDE.md generation**: App-specific AI context file
