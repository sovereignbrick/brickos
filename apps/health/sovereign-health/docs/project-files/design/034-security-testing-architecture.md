# Design 034: Security Testing Architecture & Blind Spot Analysis

**Author:** Claude + Helmut Schindlwick
**Date:** 2026-03-28
**Status:** Living Document

---

## 1. Overview

BrickOS employs a defense-in-depth security strategy across 7 layers. This document maps every automated security tool, identifies what each covers, and highlights blind spots that need attention.

## 2. Security Tool Inventory

### Layer 1: Code Quality (Static Analysis)

| Tool | What It Does | Runs | Scope |
|------|-------------|------|-------|
| **cargo clippy** | Rust lint rules, catches unsafe patterns | Every push | Backend |
| **cargo fmt** | Code formatting (prevents obfuscation) | Every push | Backend |
| **Semgrep SAST** | OWASP Top 10, secrets, injection patterns | Weekly + push | Full stack |
| **ESLint** | TypeScript/React lint rules | Every build | Frontend |

### Layer 2: Dependency Security

| Tool | What It Does | Runs | Scope |
|------|-------------|------|-------|
| **cargo audit** | Rust advisory database (RustSec) | Every push | Backend |
| **cargo deny** | License + advisory check | Weekly | Backend |
| **pnpm audit** | npm advisory database (GitHub) | Weekly | Frontend |
| **Dependabot** | Auto-PRs for vulnerable dependencies | Continuous | Both |
| **Trivy** | Container image CVE scanning | Weekly | Docker images |

### Layer 3: Network Security (OSI Layer 3-4)

| Tool | What It Does | Runs | Scope |
|------|-------------|------|-------|
| **OpenVAS/Greenbone** | Full vulnerability scan (ports, TLS, SSH, services, CVEs) | Monthly (planned) | VPS infrastructure |
| **nmap** (manual) | Port scan, service detection | Ad-hoc | VPS |
| **OpenSSL** (manual) | TLS configuration audit | Ad-hoc | VPS |

**What OpenVAS Scans:**
- All TCP/UDP ports and running services
- TLS/SSL configuration (cipher suites, protocol versions, certificate chain)
- SSH configuration (key exchange, MAC algorithms, password auth)
- Known CVEs against detected service versions
- Firewall rule gaps and exposed services
- DNS configuration (DNSSEC, zone transfer)
- Default credentials on detected services
- ICMP/ping response policy
- Generates PDF/HTML compliance reports (CIS benchmarks)

### Layer 4: Application Security (OSI Layer 7)

| Tool | What It Does | Runs | Scope |
|------|-------------|------|-------|
| **ZAP (Checkmarx)** | Web app vulnerability scan (XSS, injection, headers) | Ad-hoc | Website + App |
| **Security headers** | HSTS, X-Frame-Options, CSP, nosniff, Permissions-Policy | Runtime | API + nginx |
| **Rate limiting** | Sliding window on auth endpoints | Runtime | API |
| **CORS** | Origin whitelist | Runtime | API |

**Latest ZAP Results (2026-03-27):** 0 High, 1 Medium (CSP), 2 Low (HSTS/nosniff on static assets), 4 Info.

### Layer 5: Data Security

| Tool | What It Does | Scope |
|------|-------------|-------|
| **AES-256-GCM** | Field-level encryption at rest | Measurement values, profile data |
| **Row-Level Security** | DB enforces user isolation (16 tables) | All user data |
| **pgAudit** | SQL-level audit logging (all writes/DDL) | Database |
| **Argon2** | Password hashing | User credentials |
| **JWT (HS256)** | Token-based auth (2h access, 60d refresh) | API sessions |
| **TOTP MFA** | Time-based one-time passwords | User accounts |
| **DB Role Separation** | sh_app (no DELETE/DDL), sh_readonly | Database |

### Layer 6: Secret Management

| Tool | What It Does | Scope |
|------|-------------|------|
| **Semgrep p/secrets** | Detects hardcoded secrets in code | CI |
| **GitHub Secret Scanning** | Detects leaked tokens in repos | Continuous |
| **dotenv** | Secrets in .env files (not in code) | Runtime |

### Layer 7: Compliance & Privacy

| Tool | What It Does | Scope |
|------|-------------|------|
| **GDPR data access log** | Tracks who accessed what data | Runtime |
| **Consent management** | Granular opt-in/out toggles | Frontend + API |
| **Data export (Art. 20)** | Full JSON export of user data | API |
| **Soft delete + purge** | 30-day grace period before hard delete | API |
| **IP hashing** | SHA-256 hashed IPs in audit logs | API |
| **Retention policies** | Configurable audit log retention (90 days) | Database |

## 3. Test Suite Coverage

### Automated Tests (34 total)

| Test Suite | Tests | What It Validates |
|-----------|-------|-------------------|
| **smoke** | ~5 | Health endpoint, basic routing |
| **integration** | ~10 | HTTP response shapes, snapshots |
| **auth_test** | ~5 | Signup, login, token refresh, MFA |
| **tier_test** | 17 | Feature gates, AI credits, tier enforcement |
| **calculated_test** | 17 | Marker formulas, protocol resolution |
| **reference_range_test** | 8 | Range completeness, consistency |
| **measurement_test** | ~5 | CRUD, access control, encryption |
| **doctor_chat_test** | ~3 | Chat auth, quota enforcement |
| **platform_test** | ~5 | RLS, DB roles, crate integration |
| **property** | 1000 cases | Serialization invariants (proptest) |
| **k6 load test** | 8 endpoints | Auth, markers, measurements, license, chat |

### Manual Testing

| Checklist | Layers | Items |
|-----------|--------|-------|
| **RC v0.30.0** | 21 layers | ~120 test items |
| **Network scan report** | Ports, TLS, SSH | 7 port checks |

## 4. Security Data Flow

```
User Request
    |
    v
[Cloudflare] -- DDoS protection, WAF, TLS termination
    |
    v
[nginx] -- Reverse proxy, security headers, rate limiting
    |
    v
[Actix-web API] -- JWT auth, CORS, rate limiting, input validation
    |
    v
[RLS Middleware] -- Sets app.current_user_id per request
    |
    v
[PostgreSQL + RLS] -- Row-Level Security enforces isolation
    |
    v
[AES-256-GCM] -- Field-level encryption for health values
    |
    v
[pgAudit] -- SQL audit trail of all operations
```

## 5. Blind Spots & Gaps

### CRITICAL (Should fix now)

| # | Blind Spot | Risk | Remediation |
|---|-----------|------|-------------|
| 1 | **Port 8080 exposed externally** | Backend accessible without TLS, bypasses nginx | UFW rule or bind to 127.0.0.1 |
| 2 | **SSH root login enabled** | PermitRootLogin=yes on VPS | Change to prohibit-password + fail2ban |
| 3 | **ntfy exposes VPS IP** | DNS-only A record reveals origin IP | Cloudflare Tunnel (#282) |
| 4 | **No CSP header on website** | XSS risk on marketing site | Cloudflare Transform Rules (#288) |

### HIGH (Should fix this quarter)

| # | Blind Spot | Risk | Remediation |
|---|-----------|------|-------------|
| 5 | **No DAST (Dynamic Application Security Testing)** | Automated web app pen testing not scheduled | Schedule monthly ZAP scans |
| 6 | **No API fuzzing** | Malformed input not systematically tested | Add cargo-fuzz targets for API handlers |
| 7 | **No dependency pinning (Cargo.lock in Docker)** | Build reproducibility risk | Already mitigated by multi-stage build |
| 8 | **JWT secret rotation** | No mechanism to rotate JWT_SECRET | Implement key rotation with grace period |
| 9 | **No intrusion detection** | No alerting on suspicious login patterns | Add fail2ban or login anomaly detection |
| 10 | **CI workflows not running** | brickos-apps account has Actions disabled | Fix account or switch push account (#284) |

### MEDIUM (Should fix this year)

| # | Blind Spot | Risk | Remediation |
|---|-----------|------|-------------|
| 11 | **No SBOM (Software Bill of Materials)** | EU Cyber Resilience Act requires it | cargo-sbom + build attestation (#283) |
| 12 | **No pen test by third party** | Self-assessed only | Schedule professional pen test |
| 13 | **No WAF rules beyond Cloudflare defaults** | Custom attack patterns not blocked | Cloudflare WAF custom rules |
| 14 | **No database backup encryption** | pg_dump backups are plaintext on disk | Encrypt backup files with GPG |
| 15 | **No secrets rotation automation** | DB passwords, API keys are static | Implement secrets rotation schedule |
| 16 | **No container runtime security** | No seccomp/AppArmor profiles | Add Docker security profiles |
| 17 | **No outbound traffic filtering** | Container can reach any external host | Network policy / iptables egress rules |
| 18 | **Email security** | No SPF/DKIM/DMARC validation for sent emails | Configure DNS records |
| 19 | **No rate limiting on non-auth endpoints** | Potential API abuse on data endpoints | Add per-user rate limiting |

### LOW (Nice to have)

| # | Blind Spot | Risk | Remediation |
|---|-----------|------|-------------|
| 20 | **No canary tokens** | Can't detect if database is exfiltrated | Add honeypot records |
| 21 | **No Content-Security-Policy reporting** | Can't detect CSP violations in the wild | Add report-uri directive |
| 22 | **No Subresource Integrity (SRI)** | CDN-served scripts could be tampered | Add integrity attributes |
| 23 | **No certificate transparency monitoring** | Can't detect unauthorized cert issuance | Monitor CT logs |

## 6. Tool Coverage Matrix

```
                    Code  Deps  Network  App   Data  Secrets  Compliance
                    ----  ----  -------  ---   ----  -------  ----------
cargo clippy        [XX]  [  ]  [  ]    [  ]  [  ]  [  ]     [  ]
Semgrep SAST        [XX]  [  ]  [  ]    [XX]  [  ]  [XX]     [  ]
cargo audit         [  ]  [XX]  [  ]    [  ]  [  ]  [  ]     [  ]
pnpm audit          [  ]  [XX]  [  ]    [  ]  [  ]  [  ]     [  ]
Dependabot          [  ]  [XX]  [  ]    [  ]  [  ]  [  ]     [  ]
Trivy               [  ]  [XX]  [  ]    [  ]  [  ]  [  ]     [  ]
OpenVAS             [  ]  [  ]  [XX]    [  ]  [  ]  [  ]     [XX]
ZAP                 [  ]  [  ]  [  ]    [XX]  [  ]  [  ]     [  ]
RLS                 [  ]  [  ]  [  ]    [  ]  [XX]  [  ]     [XX]
AES-256-GCM         [  ]  [  ]  [  ]    [  ]  [XX]  [  ]     [XX]
pgAudit             [  ]  [  ]  [  ]    [  ]  [XX]  [  ]     [XX]
Secret Scanning     [  ]  [  ]  [  ]    [  ]  [  ]  [XX]     [  ]
k6 Load Tests       [  ]  [  ]  [  ]    [XX]  [  ]  [  ]     [  ]
Unit/Integ Tests    [XX]  [  ]  [  ]    [XX]  [XX]  [  ]     [  ]
```

**Legend:** `[XX]` = covered, `[  ]` = not covered

## 7. Recommended Priority Actions

1. **Fix port 8080** -- immediate (1 hour, needs root)
2. **Harden SSH** -- immediate (30 min, needs root)
3. **Complete OpenVAS scan** -- in progress
4. **Schedule recurring ZAP scans** -- monthly automated DAST
5. **Add CSP/HSTS via Cloudflare** -- 15 min in dashboard
6. **Fix CI (GitHub Actions)** -- contact GitHub support or switch account
7. **API fuzzing** -- add cargo-fuzz targets for critical handlers
8. **JWT rotation mechanism** -- design doc needed
9. **SBOM generation** -- cargo-sbom for EU compliance
10. **Professional pen test** -- schedule for next quarter

## 8. Conclusion

BrickOS has a **strong security posture** for an early-stage platform:
- **14 automated security tools** across the CI/CD pipeline
- **Defense-in-depth** from Cloudflare edge to database-level RLS
- **Encryption at rest** with AES-256-GCM for health data
- **GDPR-compliant** data handling with audit trails

The primary gaps are in **infrastructure hardening** (port 8080, SSH, ntfy IP exposure) and **missing automated DAST** (web app pen testing). The OpenVAS scan will close the network-level gap. A professional pen test would validate the full stack.
