# BrickOS Platform Migrations

Platform-level database migrations for the BrickOS schema. These migrations manage tables shared across all BrickOS applications (identity, organizations, billing, audit, infrastructure).

## Migration Strategy

### Two Migration Pipelines

BrickOS uses two separate migration pipelines:

1. **Platform migrations** (this directory): `crates/brickos-db/migrations/`
   - Manage the `brickos` schema
   - Tables shared across all apps: users, organizations, billing, audit, etc.
   - Run BEFORE app-specific migrations

2. **App-specific migrations** (per-app): e.g., `apps/health/sovereign-health/api/migrations/`
   - Manage app-specific tables in `public` schema (or future app schemas like `shi`)
   - Health data, markers, measurements, devices, etc.
   - Run AFTER platform migrations

### Execution Order

```
1. Platform migrations (crates/brickos-db/migrations/001, 002, 003, ...)
2. SHI migrations      (apps/health/sovereign-health/api/migrations/...)
3. Other app migrations (future apps add their own migration directories)
```

### Search Path

After migration 001 runs, the database search_path is set to `public, brickos`. This means:

- Existing SHI queries like `SELECT * FROM users` resolve to `brickos.users` automatically
- No SHI code changes required for Phase 1
- New apps can use explicit schema references: `SELECT * FROM brickos.users`

## Running Migrations

### With sqlx (recommended)

```bash
# Run platform migrations
sqlx migrate run --source crates/brickos-db/migrations/

# Run SHI migrations (after platform migrations)
sqlx migrate run --source apps/health/sovereign-health/api/migrations/
```

### Manual execution

```bash
# Connect to the database
psql $DATABASE_URL

# Run each migration file in order
\i crates/brickos-db/migrations/001_create_brickos_schema.sql
\i crates/brickos-db/migrations/002_service_accounts.sql
\i crates/brickos-db/migrations/003_refactor_license_tiers.sql
\i crates/brickos-db/migrations/004_add_app_key_columns.sql
\i crates/brickos-db/migrations/005_split_user_profile.sql
```

## Migration Files

| File | Issue | Description |
|---|---|---|
| `001_create_brickos_schema.sql` | #326 | Creates `brickos` schema, moves 39 platform tables from `public`, sets search_path |
| `002_service_accounts.sql` | #330 | Service accounts, key rotation, reserved codes, BrickOS platform org |
| `003_refactor_license_tiers.sql` | #327 | Moves license_tiers to brickos schema, adds app_key column |
| `004_add_app_key_columns.sql` | #329 | Adds app_key to product_features, tier_features, app_settings, search_index |
| `005_split_user_profile.sql` | #328 | Creates brickos.user_profile and brickos.billing_profile from existing data |

## Safety Guarantees

All migrations in this directory follow these rules:

- **IF EXISTS / IF NOT EXISTS** on every DDL statement for idempotency
- **Never DROP columns** - only add, move, or copy
- **Zero downtime** - ALTER TABLE SET SCHEMA is metadata-only (instantaneous)
- **Safe on fresh installs** - IF EXISTS prevents errors when tables do not exist yet
- **Backward compatible** - search_path ensures existing SHI code works unchanged

## Relationship to SHI Migrations

Before platform schema elevation, all tables lived in the SHI migration pipeline. After elevation:

- Platform tables are owned by `crates/brickos-db/migrations/`
- Health-specific tables remain owned by SHI migrations
- The SHI migration pipeline continues to work because search_path resolves table names across both schemas

SHI-specific data that was split out (e.g., health columns from user_profile) stays in the original SHI tables. The platform migrations create new tables and copy data - they never modify or drop SHI-owned columns.

## Encryption

PII columns in the brickos schema (email, display_name, nostr_pubkey, billing address fields, VAT IDs) are marked for encryption at rest via the `brickos-crypto` crate. This will be implemented in a future migration. See `docs/design/006-platform-schema-elevation.md` section 10 for the encryption plan.
