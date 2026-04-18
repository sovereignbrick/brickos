<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Release Notes
 Version: 0.21.0 — 2026-03-20

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Release v0.21.0 — Stabilize & Strengthen

**Date:** 2026-03-20
**Sprint:** 003 — Stabilize & Strengthen
**Previous version:** 0.20.0

---

## Summary

v0.21.0 is a hardening release focused on data integrity, operational safety, and dependency freshness. No new user-facing features — this release strengthens the foundation for upcoming feature work.

Key themes:
- **Protected users** — demo and admin accounts can no longer be accidentally deleted
- **Audit trail** — comprehensive event logging across all critical operations
- **Data integrity** — FK constraints fixed, soft-delete standardized, retention policies automated
- **Deploy safety** — compose file drift detection, container image verification
- **Dependency hygiene** — 6 Dependabot PRs resolved (thiserror 2, rand 0.9, actix-governor 0.10, criterion 0.8, @base-ui/react 1.3, @types/node 25)

---

## Key Changes

### Backend

- **Protected users system**: `is_protected` column on `users` table with PostgreSQL BEFORE DELETE and BEFORE UPDATE triggers. App-level guard in `delete_account` handler returns 403. Hard purge cron skips protected users. Three-layer defense: DB triggers + app guard + purge filter.
- **Audit logging**: Added `crate::services::audit::log()` calls to auth (signup, password reset), measurements (create, update, delete), devices (create, delete), import (started, completed), export (data exported), settings (profile updated, account delete requested, account purged).
- **Retention-based purging**: New `cron_cleanup_stale_data()` runs daily — cleans expired refresh tokens, expired email verifications, and configurable retention purges for AI usage (180d), data access logs (365d), payment events (730d). Config stored in `app_settings` table.
- **FK constraint hardening**: 14 tables converted from NO ACTION to CASCADE or SET NULL, ensuring `DELETE FROM users` cascades correctly without manual cleanup.
- **Soft-delete standardization**: Added `deleted_at` to devices and organizations; added `is_deleted` + `deleted_at` to influence_factors.
- **Performance indexes**: 4 new composite indexes for common query patterns.

### Dependencies

| Package | From | To | Scope |
|---------|------|----|-------|
| thiserror | 1 | 2 | workspace + api |
| rand | 0.8 | 0.9 | api + brickos-auth |
| actix-governor | 0.5 | 0.10 | api |
| criterion | 0.5 | 0.8 | api (dev) |
| @base-ui/react | 1.2.0 | 1.3.0 | frontend |
| @types/node | 20 | 25.5.0 | frontend (dev) |

Breaking API changes handled:
- `rand::thread_rng()` → `rand::rng()`, `.gen_range()` → `.random_range()` (5 call sites)
- `GovernorConfigBuilder::per_second()` → `.seconds_per_request()` (1 call site)

### Ops

- **Deploy script**: Added `sync_compose_file()` (md5sum comparison, warn-only for drift) and `verify_container_image()` (image ID comparison between local build and running container).
- **Compose files**: Aligned `docker-compose.prod.yml` and `docker-compose.staging.yml` to use `postgres:16-alpine` (matches VPS reality). Removed pgaudit references.
- **Version bump script**: New `ops/bump-version.sh` updates all 7 version files + regenerates Cargo.lock.

### Documentation

- **Release workflow**: Updated to full-release model (no more RC tags). Minor for sprints, patch for fixes.
- **Weekly reports**: Now generated on Fridays only.
- **Project documentation guide**: Updated to reflect new release/reports structure.

---

## Database Migrations

| # | Migration | Description |
|---|-----------|-------------|
| 098 | `protected_users` | `is_protected` column + deletion prevention triggers |
| 099 | `fix_fk_constraints` | 14 FK constraints converted to CASCADE/SET NULL |
| 100 | `standardize_soft_delete` | `deleted_at` on devices/orgs, `is_deleted`+`deleted_at` on influence_factors |
| 101 | `add_missing_indexes` | 4 composite performance indexes |
| 102 | `retention_policies` | Retention config in `app_settings`, drops unused `health_check` table |

---

## Pre-deployment Audit

| Check | Status | Details |
|-------|--------|---------|
| cargo test | PASS | 99 tests, 0 failed |
| cargo fmt + clippy | PASS | 0 warnings |
| pnpm test | PASS | 192 tests, 0 failed |
| Theme audit | PASS | 0 critical violations |
| ESLint | ADVISORY | Config format migration needed (pre-existing) |
| cargo audit | PASS | 0 advisories, 6 allowed warnings |

---

## Known Issues

- Protocol Comparison not yet implemented (Coming Soon)
- Benchmark not yet implemented (Coming Soon)
- AI Dashboard not yet implemented (Coming Soon)
- Learn page content pending (#101)
- Horizon tier features all Coming Soon
- Password reset email requires valid Mailgun credentials in .env
- ESLint config needs migration to new flat config format
- 12 known `bg-white` violations in frontend (tracked, non-critical)

---

## Files Changed

28 files changed, 482 insertions, 325 deletions.

---

## Contributors

- Helmut Schindlwick — Product, Architecture, Development
- Claude Code (Anthropic) — AI pair programming
