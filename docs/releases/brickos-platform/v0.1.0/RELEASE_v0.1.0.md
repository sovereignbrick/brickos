# BrickOS Platform v0.1.0

**Date:** 2026-04-06
**Sprint:** 028
**Tag:** `brickos-platform/v0.1.0`

## Summary

First release of the BrickOS platform schema. Elevates 39 shared tables from the SHI `public` schema to a dedicated `brickos` PostgreSQL schema, establishing the foundation for multi-app platform architecture.

## What This Release Includes

### Platform Schema (`brickos`)
- 39 tables moved from public to brickos schema
- Categories: Identity (4), Organizations (5), Billing (17), Communication (5), Audit (4), Infrastructure (4)
- `search_path = public, brickos` for zero-code-change backward compatibility

### Service Accounts
- `brickos.service_accounts` - API access for cross-app communication
- `brickos.service_account_keys` - key rotation with overlap periods
- SHA256 hashed keys, scoped permissions, rate limiting

### Reserved Codes
- `brickos.reserved_codes` - 42 codes reserved for product names and system routes
- Prevents namespace collisions in Sovereign Link

### Schema Refactoring
- `license_tiers` gains `app_key` column for multi-app tier management
- `product_features`, `tier_features`, `app_settings`, `search_index` gain `app_key`
- `brickos.user_profile` and `brickos.billing_profile` split from monolithic user_profile
- No columns dropped (deprecated only)

### Platform Org
- BrickOS itself registered as an organization (UUID `00000000-0000-0000-0000-000000000000`)
- `org_type: platform`

### Documentation
- `docs/design/006-platform-schema-elevation.md` - full table classification and migration strategy
- `docs/design/005-platform-multi-tenant.md` - org hierarchy and namespace specification
- `docs/design/013-testing-architecture.md` - platform testing strategy
- `docs/deployment/README.md` - platform deployment workflow
- `crates/brickos-db/migrations/README.md` - migration execution guide

### Test Infrastructure
- `tests/platform-smoke.sh` - 17 checks across all apps
- `tests/platform-db-test.sh` - 23 DB integrity checks
- `tests/rc-test.sh` - unified release candidate test runner

## Migrations

5 SQL files in `crates/brickos-db/migrations/`. All idempotent, non-destructive, zero-downtime.

## Monitoring

Gatus status page (status.sovereignhealth.io) now monitors:
- BrickOS Website
- Sovereign Link redirect
- Platform DB health
