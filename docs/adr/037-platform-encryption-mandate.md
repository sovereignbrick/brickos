# ADR-037: Full Encryption at Platform Level (No Plaintext PII)

**Status:** Accepted
**Date:** 2026-04-06

## Context

SHI encrypts health measurements with AES-256-GCM at rest. The platform schema elevation raised the question: should platform tables (users, organizations, billing) also be encrypted at rest?

The user's position: "Full encryption and no PII also on platform level, in the same way we have dealt with SHI. This way new apps are forced to adhere to the high security standard."

## Decision

All PII columns in the `brickos` schema must be encrypted at rest using AES-256-GCM, the same standard as SHI measurements. This includes: user email, display_name, billing addresses, and any future PII fields.

The shared `brickos-crypto` crate provides the encryption implementation. All BrickOS apps inherit this requirement.

Service account API keys are stored as SHA256 hashes (one-way, not reversible), which is a separate pattern from symmetric encryption.

## Alternatives Considered

- **Encrypt only at disk level (LUKS/dm-crypt):** Protects against physical theft but not against SQL injection, admin access, or backup exposure. Insufficient.
- **Encrypt only health data (SHI approach):** Platform tables would have weaker protection than app tables. Inconsistent security posture.
- **No encryption on platform tables:** Faster queries, simpler code. But violates the sovereignty principle: even the server admin should not be able to read user data.

## Consequences

**Easier:**
- Uniform security model across all BrickOS apps
- New apps inherit encryption by using platform tables
- Compliance: GDPR Art. 32 (appropriate technical measures) satisfied at platform level
- Trust: even platform administrators cannot read user PII

**Harder:**
- Cannot query encrypted columns with SQL (no WHERE email = 'x', need application-layer lookup)
- Need email-hash index for login lookups (hash of email stored alongside encrypted email)
- Backup data is encrypted (cannot grep backups for user data without the encryption key)
- Key management becomes a platform concern (key rotation affects all apps)
- SQL-level data migrations fail on encrypted columns (must use application layer)
