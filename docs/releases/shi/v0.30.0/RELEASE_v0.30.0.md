# Release v0.30.0

**Date:** 2026-03-28
**Sprint:** 017 -- Security Remediation & Dependency Hardening
**Previous:** v0.29.1
**Velocity:** 25 pts
**Commits:** 11
**Duration:** 1 day

---

## Highlights

- **Dependabot 38 -> 0 vulnerabilities** -- jsonwebtoken v9->v10, rand 0.10, all GitHub Actions pinned, stale lockfiles removed
- **Vegan + Mediterranean reference ranges** -- 6 vegan markers (B12, iron, ferritin, zinc, homocysteine, omega-3), 3 Mediterranean markers (HDL, triglycerides, hs-CRP), protocol-aware fallback chain
- **Admin Revenue Simulator** -- scenario modeling for tier pricing and conversion rates
- **k6 load tests for authenticated endpoints** -- expanded beyond health-only smoke tests
- **Design 034: Security Testing Architecture** -- blind spot analysis, priority action backlog (issues #290-#294)
- **CI workflow_dispatch** -- all workflows now support manual triggers
- **Build provenance attestation** -- issue #283 for CRA compliance (GitHub Actions SLSA)

---

## Security Updates

### Dependencies
| Package | From | To | Impact |
|---------|------|-----|--------|
| jsonwebtoken | 9 | 10 | JWT auth -- requires explicit CryptoProvider (see blocker below) |
| rustls-webpki | 0.103.x | 0.103.10 | CRL handling fix |
| pnpm/action-setup | v4 | v5 | CI security |
| GitHub Actions | various | latest | Pinned to SHA for supply chain safety |

### Vulnerability Status
- **Dependabot:** 0 open alerts (was 38: 5 high, 28 moderate, 5 low)
- **Secret scanning:** enabled with push protection
- **Semgrep SAST:** active in security.yml workflow
- **Stale lockfiles removed:** eliminated orphan package-lock.json files that Dependabot was scanning

---

## RC Test Results

### Blocker Found and Fixed
**jsonwebtoken v10 CryptoProvider panic** -- backend crash-looped on first JWT operation after the v9->v10 upgrade. The `rust_crypto` Cargo feature alone is insufficient when both crypto backends are transitively enabled. Fix: explicit `DEFAULT_PROVIDER.install_default()` in main.rs before any JWT usage. Commit 55c88c9.

### Test Coverage
| Layer | Items | Result |
|-------|-------|--------|
| 0: Infrastructure | 6 | PASS (after CryptoProvider fix) |
| 1: Auth & Session | 7 | PASS (registration disabled on staging) |
| 2-3: Dashboard & Markers | 12 | PASS |
| 4-5: Measurements | 13 | PASS |
| 6-9: Dr. Alex & Import | 12 | SKIPPED (demo user on Glimpse tier) |
| 10: Settings (7 tabs) | 14 | PASS |
| 11: Theme & Styling | 4 | PASS |
| 12: Admin Panel | 7 | PASS |
| 13: Licensing | 8 | PASS (Strike/AI credits not configured) |
| 14: i18n | 6 | PASS |
| 15: Calculated Markers | 6 | PASS |
| 16: Reference Ranges | 7 | PASS |
| 17: GDPR | 5 | PASS |
| 18: PWA | 4 | PASS |
| 19: Security | 6 | PASS |
| 20: Website | 3 | PASS |
| 21: Cross-Cutting | 12 | PASS |

### New Issues Filed
- **#295** (medium): SHBG / "Sex Hormone Binding Globulin" not recognized by marker matcher
- **#296** (low): Lab name and address not extracted from imported PDFs
- **#297** (medium): No dedicated import history page with rollback

---

## New Features

### Vegan + Mediterranean Reference Ranges (Sprint 017)
- 6 vegan-specific markers with adjusted bounds
- 3 Mediterranean-specific markers
- Fasting protocol ranges (glucose, ketones, insulin, uric acid)
- Fallback chain: user-specific -> protocol-specific -> standard
- `resolve_protocol_context()` maps diet_protocol to correct ranges

### Admin Revenue Simulator (Sprint 017)
- Scenario modeling for tier pricing, conversion rates, and churn
- Issues #284-#288 filed for future revenue features

### k6 Load Tests (Sprint 017)
- Authenticated endpoint testing beyond health-only smoke
- RC checklist updated for Sprints 014-017

---

## Infrastructure

- **CI:** workflow_dispatch added to all workflows for manual triggers
- **CI:** self-trigger path for cascading workflow runs
- **Docs:** Design 034 -- Security Testing Architecture & Blind Spot Analysis
- **Docs:** Issues #290-#294 -- priority action backlog from Design 034

---

## Known Issues

- **ntfy pre-flight failing (HTTP 000)** -- NTFY_TOKEN on VPS may need rotation
- **CF_API_TOKEN not set** -- Cloudflare cache purge requires manual action
- **Dr. Alex + Import untested on staging** -- demo user on Glimpse tier

---

## Production URLs

- App: https://app.sovereignhealth.io/
- API: https://api.sovereignhealth.io/health
- Website: https://sovereignhealth.io/
