# Migration 008: Populate Split Profile Tables (Application-Level)

**Issue:** #343
**Sprint:** 029 Day 9
**Date:** 2026-04-07
**Type:** Application-level migration (not SQL)

## Why This Cannot Be a SQL Migration

Migration 005 created `brickos.user_profile` and `brickos.billing_profile` tables and
attempted to copy data from the existing `user_profile` table. However, in production,
several columns in the source `user_profile` table are encrypted with AES-256-GCM via
the `brickos-crypto` crate.

Encrypted values are stored as `v1:{base64_iv}:{base64_ciphertext}` strings. SQL has no
way to decrypt these - decryption requires the application-layer `Encryptor` with the
hex-encoded `ENCRYPTION_KEY` environment variable. A SQL migration would copy the raw
ciphertext into the new tables without decrypting it, which defeats the purpose of
splitting the data into meaningful columns.

The affected columns include `gender`, `age`, and `country_code` (PII fields), plus all
billing fields that may have been encrypted in place.

## Application-Level Approach

### Admin API Endpoint

The SHI backend exposes a one-time admin endpoint:

```
POST /api/admin/migrate/split-profiles
Authorization: Bearer <admin_token>
```

This endpoint:

1. Reads every row from the source `user_profile` table
2. For each row, uses the `Encryptor` to decrypt encrypted fields
3. Writes decrypted generic fields (`gender`, `age`, `country_code`) into
   `brickos.user_profile`, re-encrypting them with the platform key if needed
4. Writes decrypted billing fields into `brickos.billing_profile`, re-encrypting
   as appropriate
5. Skips rows that already exist in the target tables (idempotent via
   `ON CONFLICT DO NOTHING`)
6. Returns a summary: rows processed, rows inserted, rows skipped, errors

### When to Run

- Run once, manually, after the SHI backend is updated with the endpoint
- Requires the `ENCRYPTION_KEY` environment variable to be set
- Should be run during a maintenance window (low traffic)
- Safe to re-run - it is fully idempotent

### Pseudocode

```rust
let encryptor = Encryptor::new(Some(&env::var("ENCRYPTION_KEY")?));
let rows = db.query("SELECT * FROM user_profile", &[]).await?;

for row in rows {
    let gender = encryptor.decrypt_opt(row.get("gender"));
    let age = encryptor.decrypt_opt(row.get("age"));
    let country = encryptor.decrypt_opt(row.get("country_code"));

    db.execute(
        "INSERT INTO brickos.user_profile (user_id, gender, age, country_code, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO NOTHING",
        &[&row.get("user_id"), &gender, &age, &country,
          &row.get("created_at"), &row.get("updated_at")],
    ).await?;

    // Same pattern for billing_profile fields...
}
```

## Transitional State

Until the migration endpoint is run:

- `brickos.user_profile` may be empty for users who have not updated their profile
  since migration 005 ran
- `brickos.billing_profile` may be empty or contain raw ciphertext copied by the
  SQL migration
- The source `user_profile` table remains the authoritative source of truth
- SHI continues reading from the source table via `search_path`

## Dual-Write Pattern

After the SHI backend is updated:

1. **Reads** come from `brickos.user_profile` and `brickos.billing_profile` for
   platform-level data, and from the source `user_profile` for health-specific
   fields (`height_cm`, `default_waist_cm`, `default_weight_kg`)
2. **Writes** go to both the source table and the new split tables (dual-write)
3. Once all users have been migrated (via the admin endpoint), the duplicated
   generic/billing columns can be dropped from the source table in a future
   cleanup migration

## Verification

After running the migration endpoint, verify with:

```sql
-- Count rows in each table
SELECT 'source' AS tbl, COUNT(*) FROM user_profile
UNION ALL
SELECT 'brickos.user_profile', COUNT(*) FROM brickos.user_profile
UNION ALL
SELECT 'brickos.billing_profile', COUNT(*) FROM brickos.billing_profile;

-- Spot-check: compare a specific user
SELECT user_id, gender, age, country_code
FROM brickos.user_profile
WHERE user_id = '<test_user_id>';
```

## Related

- Migration 005: `005_split_user_profile.sql` (created the target tables)
- Encryption: `brickos-crypto` crate (`Encryptor::decrypt`, `Encryptor::decrypt_opt`)
- Design doc: `docs/design/006-platform-schema-elevation.md` (section 7, Phase 3)
