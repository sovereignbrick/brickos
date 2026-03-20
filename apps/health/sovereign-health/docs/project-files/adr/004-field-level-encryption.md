# ADR-004: Field-Level Encryption at Rest (AES-256-GCM)

**Status:** Accepted
**Date:** 2026-03-09

## Context
Biomarker measurement values, user profile data (height, weight), and other personally identifiable health information must be protected even if the database is compromised. Full-disk encryption alone is insufficient — it protects against physical theft but not against unauthorized DB access.

## Decision
Encrypt sensitive fields at the application level using **AES-256-GCM** (via the `aes-gcm` Rust crate). An `Encryptor` service is injected into handlers via Actix `web::Data`. Encrypted values are stored as base64-encoded TEXT columns.

**Encrypted fields include:**
- `measurements.value_canonical` — biomarker values
- `user_profile.height_cm`, `user_profile.default_weight_kg`
- `user_mfa.totp_secret_encrypted`, `user_mfa.recovery_codes_encrypted`

**Key management:**
- Encryption key loaded from `ENCRYPTION_KEY` environment variable
- Separate keys for staging and production
- Key rotation: decrypt with old key, re-encrypt with new key (manual process)

## Alternatives Considered
- **PostgreSQL pgcrypto:** Encryption in SQL. Simpler but key exposed in query logs and `pg_stat_statements`.
- **Full-disk encryption only:** Protects against physical theft but not DB credential compromise.
- **No encryption:** Unacceptable for health data under GDPR.

## Consequences
- **Easier:** Even with full DB access, measurement values are unreadable without the encryption key.
- **Harder:** Cannot use DB-level aggregations on encrypted columns (must decrypt in application), schema uses TEXT instead of NUMERIC for encrypted fields, key rotation is manual.
- **Trade-off:** Query flexibility for data protection — appropriate for health data.
