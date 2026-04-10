---
number: 459
github_number: 466
title: "test: security audit -- dependency, code, config checks (no 3rd party cost)"
milestone: "Sovereign Health Intelligence -- Production Quality"
labels: [security, testing]
created: 2026-04-10
priority: P1
sprint: 039
---

Self-service security audit covering all checks that require no external tools or budget.

## Dependency Audit

- [ ] `cargo audit` -- check all Rust crates for known CVEs
- [ ] `npm audit` -- check SHI frontend dependencies
- [ ] `npm audit` -- check CRM frontend dependencies
- [ ] Review outdated dependencies: `cargo outdated`, `npm outdated`
- [ ] Check for yanked crates: `cargo verify-project`
- [ ] Remove orphan lock files (package-lock.json in wrong locations)

## Code Security Review

- [ ] SQL injection: verify ALL queries use parameterized `.bind()` (no string interpolation in SQL)
- [ ] XSS: verify no `dangerouslySetInnerHTML` with user input
- [ ] CSRF: verify state-changing endpoints require auth token (not cookie-only)
- [ ] Auth bypass: verify all protected routes check JWT
- [ ] Broken access control: verify org-scoped queries filter by org_id
- [ ] Sensitive data exposure: verify PII fields encrypted at rest (email, phone, notes)
- [ ] Mass assignment: verify request bodies validated (no extra fields accepted)
- [ ] Rate limiting: verify auth endpoints have rate limits configured
- [ ] Error messages: verify no stack traces or internal details leaked to client

## Secrets Audit

- [ ] `grep -r "sk-ant\|sk_live\|password.*=" --include="*.rs" --include="*.ts" --include="*.tsx"` -- no hardcoded secrets in source
- [ ] `.env` files in `.gitignore` (not committed)
- [ ] JWT secrets sufficiently random (not default/weak)
- [ ] Encryption keys proper length (64 hex chars = 256 bits)
- [ ] No API keys in frontend code (NEXT_PUBLIC_ vars don't contain secrets)
- [ ] Service account keys hashed (SHA-256, not stored plaintext)

## Configuration Audit

- [ ] CORS: only allowed origins configured (not wildcard *)
- [ ] HTTPS enforced (HTTP redirects to HTTPS in nginx)
- [ ] TLS config: modern ciphers, no SSLv3/TLS1.0
- [ ] Secure cookie flags: SameSite, Secure, HttpOnly where applicable
- [ ] Content-Security-Policy headers (if configured)
- [ ] X-Frame-Options / X-Content-Type-Options headers
- [ ] Rate limiter config: reasonable limits (not too high)
- [ ] Max payload size: configured (35MB for images, reasonable for API)

## Infrastructure Audit

- [ ] SSH: key-based auth only (no password login)
- [ ] Firewall: only needed ports open (80, 443, SSH)
- [ ] Docker: containers run as non-root where possible
- [ ] Database: not exposed externally (only via Docker network)
- [ ] Swap file permissions: 600 (not world-readable)
- [ ] Log files: no sensitive data in logs (encrypted fields stay encrypted)

## Encryption Verification

- [ ] brickos-crypto: AES-256-GCM implementation correct (v1:{iv}:{ct} format)
- [ ] Different IVs per encryption (not reused)
- [ ] Encryption key rotation: procedure documented
- [ ] MFA secrets encrypted at rest (totp_secret_encrypted)
- [ ] Recovery codes hashed (Argon2)
- [ ] Password hashing: Argon2 with proper parameters
- [ ] JWT signing: HMAC-SHA256 with sufficient key length

## OWASP Top 10 Checklist

- [ ] A01 Broken Access Control: org-scoping on all queries
- [ ] A02 Cryptographic Failures: AES-256-GCM, Argon2, TLS
- [ ] A03 Injection: parameterized SQL queries everywhere
- [ ] A04 Insecure Design: rate limiting, input validation
- [ ] A05 Security Misconfiguration: CORS, headers, defaults
- [ ] A06 Vulnerable Components: cargo audit, npm audit
- [ ] A07 Authentication Failures: MFA, account lockout, token expiry
- [ ] A08 Data Integrity Failures: migration checksums, input validation
- [ ] A09 Logging Failures: structured logging, no sensitive data
- [ ] A10 SSRF: no user-controlled URLs in server-side requests (except AI providers)
