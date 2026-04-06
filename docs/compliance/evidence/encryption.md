# Encryption -- Evidence Package

**Control:** Encryption at rest (AES-256-GCM) and in transit (TLS 1.2+)
**Regimes:** GDPR Art. 32, CRA Annex I, NIS 2 Art. 21
**Last verified:** 2026-04-06
**Verification method:** Automated test + Code audit

## Implementation

All sensitive health data (biomarker values, chat messages, lifestyle notes, MFA secrets) is encrypted at rest using AES-256-GCM with random 12-byte nonces before storage in PostgreSQL. Encrypted values use a versioned format (`v1:{base64_iv}:{base64_ciphertext}`) enabling future algorithm rotation. Encryption in transit is enforced via TLS termination at the Caddy reverse proxy (automatic HTTPS via Let's Encrypt).

Self-hosted users can opt out of field-level encryption (passthrough mode) -- this is a deliberate design choice documented in ADR-007.

## Code References

| Component | File | Lines | Purpose |
|---|---|---|---|
| Encryptor struct | `crates/brickos-crypto/src/lib.rs` | L25-27 | AES-256-GCM cipher initialization |
| Key validation | `crates/brickos-crypto/src/lib.rs` | L31-43 | 256-bit hex key parsing + assertion |
| Encrypt | `crates/brickos-crypto/src/lib.rs` | L47-64 | Random nonce generation + GCM encryption |
| Decrypt | `crates/brickos-crypto/src/lib.rs` | L68-87 | Versioned format parsing + GCM decryption |
| Tamper detection | `crates/brickos-crypto/src/lib.rs` | L83-85 | GCM tag verification (integrity) |
| f64 encrypt/decrypt | `crates/brickos-crypto/src/lib.rs` | L90-100 | Numeric value encryption for biomarkers |
| CSV export decryption | `apps/health/sovereign-health/api/src/handlers/export.rs` | L192 | Decrypts values before export |
| Chat message decryption | `apps/health/sovereign-health/api/src/handlers/export.rs` | L338 | Decrypts chat content for GDPR export |

## Test References

| Test | File | Assertion |
|---|---|---|
| encrypt_decrypt_roundtrip | `crates/brickos-crypto/src/lib.rs` | L127-134 | Encrypt then decrypt returns original plaintext |
| different_ivs_produce_different_ciphertexts | `crates/brickos-crypto/src/lib.rs` | L137-142 | Same plaintext produces different ciphertext (nonce uniqueness) |
| tampered_ciphertext_fails | `crates/brickos-crypto/src/lib.rs` | L145-150 | Modified ciphertext is rejected (integrity check) |
| legacy_plaintext_passes_through | `crates/brickos-crypto/src/lib.rs` | L153-157 | Backward compatibility with unencrypted data |
| no_key_passthrough_mode | `crates/brickos-crypto/src/lib.rs` | L159-165 | Self-hosted passthrough mode works correctly |
| f64_roundtrip | `crates/brickos-crypto/src/lib.rs` | L168-174 | Numeric precision preserved through encrypt/decrypt |

## ADR References

| ADR | Title | Relevance |
|---|---|---|
| ADR-004 | Field-Level Encryption | Design decision for AES-256-GCM, versioned format, key management |
| ADR-005 | Rustls (No OpenSSL) | TLS implementation choice -- pure Rust, no native OpenSSL dependency |
| ADR-007 | Dual-Mode SaaS/Self-Hosted | Passthrough mode for self-hosted users who opt out of encryption |

## Automated Verification

```bash
# Unit tests for encryption roundtrip, tamper detection, nonce uniqueness
cargo test -p brickos-crypto

# Verify no plaintext health data in database (staging)
# Values starting with "v1:" are encrypted
psql -c "SELECT COUNT(*) FROM measurements WHERE value_canonical NOT LIKE 'v1:%'" sovereign_health
```

## Manual Verification Steps

1. Check TLS certificate validity: `curl -vI https://api.sovereignhealth.io 2>&1 | grep "SSL certificate"`
2. Verify HSTS header: `curl -sI https://api.sovereignhealth.io | grep Strict-Transport`
3. Confirm encrypted values in DB: query `measurements.value_canonical` -- all should start with `v1:`
4. Test tamper detection: modify a ciphertext byte in DB, verify API returns decryption error
