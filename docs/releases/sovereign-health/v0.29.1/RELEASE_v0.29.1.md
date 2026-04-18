# Release v0.29.1

**Date:** 2026-03-27
**Sprint:** 015 -- Stability, Security & Production Hardening
**Previous:** v0.29.0
**Velocity:** 32 pts
**Commits:** 12
**Duration:** 1 day

---

## Highlights

- **4 dependency updates** -- sentry 0.47, jsonwebtoken 10, rand 0.10 (security advisories addressed)
- **GitHub security tools enabled** -- Semgrep SAST, Trivy container scanning, secret scanning + push protection, Dependabot security updates, cargo deny, npm audit
- **Admin panel fixes** -- data access log now visible (RLS admin bypass), user cards show "Free" instead of "Card" for unpaid users, mobile menu toggle with label
- **Gatus monitoring improved** -- alerts now include ISO 8601 timestamps, HTTP status, response time, failure count
- **PWA offline page** -- detailed capability breakdown (what works offline vs needs network)
- **Network security scan** -- manual port scan report, 2 findings documented (port 8080 + SSH)
- **OpenVAS installed** -- local vulnerability scanner on 6TB drive, ready for full scan
- **Compliance framework** -- Design 033: two-layer audit model for 14 EU regulatory regimes

---

## Security Updates

### Dependencies
| Package | From | To | Impact |
|---------|------|-----|--------|
| sentry | 0.35 | 0.47 | Error tracking improvements |
| sentry-actix | 0.35 | 0.47 | Actix-web integration |
| jsonwebtoken | 9 | 10 | JWT auth (security patches) |
| rand | 0.9 | 0.10 | RNG (API change: RngExt trait) |

### GitHub Security Features Enabled
- Secret scanning (detects leaked credentials in commits)
- Secret scanning push protection (blocks pushes with secrets)
- Dependabot security updates (auto-PRs for vulnerable deps)
- Semgrep SAST (Rust + TypeScript + OWASP Top 10)
- Trivy container image scanning (HIGH/CRITICAL CVEs)
- cargo deny (license + advisory checking)
- npm audit (frontend dependency scanning)

### Network Security Findings
| Finding | Severity | Status |
|---------|----------|--------|
| Port 8080 externally accessible (Docker iptables bypass) | MEDIUM | Documented, fix in Sprint 016 |
| SSH PermitRootLogin=yes | MEDIUM | Documented, fix in Sprint 016 |
| TLS 1.3 + AES-256-GCM | PASS | Excellent |
| PostgreSQL not exposed | PASS | Internal Docker network only |
| Redis not exposed | PASS | Internal Docker network only |

---

## Bug Fixes

- **#258 Admin access log empty** -- RLS policy on data_access_log only allowed users to see their own logs. Added admin bypass policy. Admin can now see all access log entries.
- **#258 User card "Card" label** -- Users on Glimpse/Core (free tiers) showed "Card" as payment method. Now shows "Free".
- **#258 Mobile admin menu** -- Floating toggle button now shows "Menu"/"Close" text for better discoverability.
- **#257 Gatus/ntfy alerts** -- Alert templates updated with timestamps, HTTP status, response time, failure count, and endpoint URL.
- **#256 PWA offline** -- Offline fallback page now explains what works offline (cached data) vs what needs network (new measurements, AI chat, imports). EN + DE.

---

## New Migrations (1)

| Migration | Purpose |
|-----------|---------|
| `20260327000004` | Admin RLS bypass for data_access_log table |

---

## Documentation

| Doc | Title |
|-----|-------|
| Design 033 | Compliance Audit Framework (two-layer model, 14 EU regimes, quarterly cycle) |
| Network Scan Report | Manual port scan of production VPS with findings |
| Sprint 015 Retro | Retrospective with action items |

---

## Breaking Changes

None.

---

## Upgrade Notes

1. Migrations run automatically on startup
2. Frontend build required (PWA offline page, admin panel fixes)
3. Gatus config needs redeployment on VPS for timestamp templates
4. GitHub security features already enabled via API (no action needed)
