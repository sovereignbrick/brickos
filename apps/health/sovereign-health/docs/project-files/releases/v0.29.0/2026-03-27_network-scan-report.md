# Network Security Scan Report

**Date:** 2026-03-27
**Target:** 72.61.154.115 (Hetzner VPS, production + staging)
**Tool:** Manual port scan + OpenSSL + SSH config audit
**Full OpenVAS scan:** Pending (issue #271, requires Docker setup)

## Findings

### Port Scan

| Port | Service | Status | Expected | Risk |
|------|---------|--------|----------|------|
| 22 | SSH | OPEN | Yes | LOW (but PermitRootLogin=yes) |
| 80 | HTTP (nginx) | OPEN | Yes | NONE (redirects to 443) |
| 443 | HTTPS (nginx) | OPEN | Yes | NONE |
| 5432 | PostgreSQL | CLOSED | Yes | NONE |
| 6379 | Redis | CLOSED | Yes | NONE |
| 8080 | Backend (prod) | **OPEN** | **NO** | **MEDIUM** - bypasses nginx |
| 8081 | Backend (staging) | CLOSED | Yes | NONE |

### TLS Configuration

| Check | Result |
|-------|--------|
| Protocol | TLSv1.3 |
| Cipher | TLS_AES_256_GCM_SHA384 |
| Certificate | Let's Encrypt (E8) |
| Subject | sovereignhealth.io |

**Rating:** Excellent. TLS 1.3 with AES-256-GCM is the strongest configuration.

### SSH Configuration

| Setting | Value | Recommendation |
|---------|-------|---------------|
| PermitRootLogin | yes | **Change to `prohibit-password` or `no`** |
| PasswordAuthentication | (default: yes) | **Change to `no` (key-only)** |
| Port | 22 (default) | Consider non-standard port |

## Remediation Required

### HIGH: Close port 8080 (production backend)

Port 8080 exposes the backend API directly, bypassing nginx TLS, rate limiting, and security headers. Requests to `http://72.61.154.115:8080/` reach the backend without encryption.

**Fix:** Add to Docker Compose production backend:
```yaml
ports:
  - "127.0.0.1:8080:8080"  # bind to localhost only (was: "8080:8080")
```

### MEDIUM: Harden SSH

1. `PermitRootLogin prohibit-password` (allow key auth only)
2. `PasswordAuthentication no` (key-only everywhere)
3. Consider fail2ban or similar brute-force protection

## Next Steps

- [ ] Fix port 8080 binding in docker-compose.prod.yml
- [ ] Harden SSH configuration on VPS
- [ ] Install and run full OpenVAS scan for comprehensive assessment
- [ ] Schedule monthly scans
