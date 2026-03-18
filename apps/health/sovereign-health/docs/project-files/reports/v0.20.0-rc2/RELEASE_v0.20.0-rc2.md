# Release Notes — v0.20.0-rc2

**Date:** 2026-03-17
**Branch:** develop
**Previous RC:** v0.20.0-rc1 (2026-03-16)

---

## What's New

### Platform Extraction — BrickOS Shared Crates

Five services extracted from the Sovereign Health monolith into reusable BrickOS platform crates:

| Issue | Crate | What was extracted |
|---|---|---|
| #55 | `brickos-auth` | JWT tokens, Argon2 password hashing, TOTP MFA, token utilities |
| #56 | `brickos-crypto` | AES-256-GCM encryption at rest (Encryptor) |
| #57 | `brickos-billing` | Stripe + Strike BTC payment services, webhook verification |
| #58 | `brickos-email` | EmailProvider trait, Mailgun/SMTP/Log implementations, factory |
| #59 | `brickos-db` | User, Organization, OrgMember, DataShare models, role constants |

### Security Hardening

| Issue | Feature | Details |
|---|---|---|
| #43 | Row-Level Security | RLS enabled + forced on 16 user-data tables. `app_current_user_id()` function. Zero-knowledge design: no session = 0 rows, not error |
| #44 | Database role separation | `sh_app` (SELECT/INSERT/UPDATE only, no DELETE/DDL), `sh_readonly` (SELECT only) |
| #45 | Data access audit log | `data_access_log` table with RLS. GDPR Art. 15 compliance |
| #67 | pgaudit | Tamper-proof PostgreSQL audit logging. Logs all write + DDL operations |

### Testing Infrastructure

- **+33 new tests** (platform_test: 28, crud_test: 5)
- New `test-platform` and `test-crud` Makefile targets
- New `test-platform` and `test-crates` CI jobs in GitHub Actions
- Test harness updated to use `brickos_email` crate imports
- CRUD test covers full user lifecycle: create → read → update → soft-delete → RLS isolation → constraint enforcement → CASCADE delete

### Infrastructure

- **Dockerfile rewritten** for workspace-root build context (supports crate dependencies)
- **docker-compose.dev.yml** updated with new build context
- **`.dockerignore`** added at monorepo root
- **Cron jobs** for automated disk cleanup (cargo clean + docker prune, 2x daily)

---

## Migrations

| Migration | Description |
|---|---|
| 084 | Row-Level Security on 15 user-data tables |
| 085 | Data access audit log table + RLS policies |
| 087 | Database role separation (sh_app, sh_readonly) |
| 088 | pgaudit extension (CREATE IF NOT EXISTS) |

All migrations are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).

---

## Breaking Changes

- **Dockerfile build context** changed from `../api` to monorepo root (`../../../..`). Docker builds from the app directory directly will no longer work — must use `docker compose` or pass `-f` with correct context.
- **Old service files removed**: `services/email.rs`, `services/stripe.rs`, `services/strike.rs` deleted from app. All imports now from `brickos_email::*` and `brickos_billing::*`.

---

## Version Bumps

| File | From | To |
|---|---|---|
| `api/Cargo.toml` | 0.19.1-rc1 | 0.20.0-rc2 |
| `api/src/lib.rs` | 0.19.1-rc1 | 0.20.0-rc2 |
| `frontend/package.json` | 0.19.1-rc1 | 0.20.0-rc2 |
| `ops/deploy.sh` | 0.20.0-rc1 | 0.20.0-rc2 |

---

## Known Issues

- `cargo audit`: 6 unmaintained crate warnings in genpdf/printpdf PDF chain (no CVEs)
- pgaudit extension test soft-passes in CI (plain postgres:16-alpine doesn't include pgaudit)
- No automated E2E browser tests — staging smoke test is manual (tracked: #72)

---

## Contributors

- Helmut Schindlwick (@sovereignbrick)
- Claude Code (automated testing, crate extraction, CI/CD)
