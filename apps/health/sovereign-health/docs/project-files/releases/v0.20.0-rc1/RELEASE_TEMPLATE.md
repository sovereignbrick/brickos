<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Privacy-first platform for collecting, analyzing, and understanding
 blood markers and laboratory data.

 Own your data. Understand your biology. Build health sovereignty.

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Release Prompt Template — Sovereign Health Intelligence

**Copy this file for each release. Change ONLY the parameters below, then hand to Claude Code.**

---

## === RELEASE PARAMETERS (CHANGE THESE) ============================

```
VERSION          = 0.20.0-rc1
PREVIOUS_VERSION = 0.19.1-rc1
RELEASE_DATE     = 2026-03-16
RELEASE_TYPE     = rc          # rc | patch | minor | major
CODENAME         =             # optional, e.g. "Blood Moon"

# One-line summary
SUMMARY = "BrickOS monorepo migration, UX overhaul, device-driven measurements, i18n deep pass, template defaults, docs recovery"

# Key changes (bullet list — Claude Code expands these into full release notes)
CHANGES = """
- BrickOS monorepo migration: single repo, unified deploy, GitHub CI
- Settings Profile: compact 3-column grid, localized country list (Intl.DisplayNames)
- Settings Devices: archive instead of delete, translated marker names, dark-themed selects
- Device Modal: marker tooltips (portal-based), deduplication, abbreviation display, enhanced search
- Measurements/new: device auto-populates markers, template disabled when device selected
- Measurements/new: compact 3-column grid (Date/Device/Template), inline profile defaults
- Meal timing dropdown: Nüchtern, Vor der Mahlzeit, 30 Min. nach, etc.
- Template defaults: saves/restores session state (meal timing, sleep, stress, protocol)
- MarkerRow: abbreviation shown after name, device badge in blue, tooltip with name+desc
- Login/forgot-password: logo added to all auth pages
- Body Measurements: single-row layout (Age narrow, Height/Waist/Weight flex)
- Lifestyle Defaults: 3-column grid
- Backend: locale-aware marker_content join (fixes duplicate markers)
- Backend: clean embedded abbreviations from marker translations
- Migration 081 fix: admin_settings → app_settings
- Deploy.sh updated for monorepo paths, single GitHub repo, version 0.20.0-rc1
- 31 docs recovered from GitLab (API reference, architecture, features, guides)
- Legacy specs preserved on develop branch (internal only)
"""

# Known issues (carried into next release)
KNOWN_ISSUES = """
- Protocol Comparison not yet implemented (Coming Soon)
- Benchmark not yet implemented (Coming Soon)
- AI Dashboard not yet implemented (Coming Soon)
- Learn page videos not yet produced
- Horizon tier features all Coming Soon
- Password reset email requires valid Mailgun credentials in .env
"""

# Database migrations in this release
MIGRATIONS = """
- 077: German marker content translations
- 078: German fasting descriptions
- 079: Supplement DE columns
- 080: German calculated markers
- 081: Rename health coach settings (fix: app_settings table)
- 082: Clean marker name abbreviations (strip embedded parens)
- 083: Template defaults JSONB column
"""
```

## === END PARAMETERS ================================================

---

## INSTRUCTIONS FOR CLAUDE CODE

Using the parameters above, generate ALL of the following release artifacts. Every document gets the ASCII header at the top (adapted for file type).

---

### ASCII Header (use in all generated files)

**For Rust / SQL / config files (// comments):**
```
// ============================================================================
//  SOVEREIGN HEALTH INTELLIGENCE
//
//  BLOOD · BIOMARKERS · INSIGHT
//
//  Privacy-first platform for collecting, analyzing, and understanding
//  blood markers and laboratory data.
//
//  Your body is the operating system of your life.
//  Blood is its diagnostic interface.
//
//  Bitcoin introduced Proof of Work.
//  Health needs Proof of Blood.
//
//  Inspired by the principles of sovereignty, self-custody,
//  and the ideas explored in "Brick by Brick":
//  https://www.amazon.de/-/en/Brick-Building-Sovereign-Life-Bitcoin/dp/B0FR42K8R1
//
//  Own your data. Understand your biology. Build health sovereignty.
//
//  https://sovereignhealth.io/
//  AGPL-3.0 — https://github.com/sovereignbrick/brickos
// ============================================================================
```

**For Markdown files:**
```
<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Privacy-first platform for collecting, analyzing, and understanding
 blood markers and laboratory data.

 Own your data. Understand your biology. Build health sovereignty.

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->
```

**For HTML (website):**
```html
<!--
  Sovereign Health Intelligence — BLOOD · BIOMARKERS · INSIGHT
  https://sovereignhealth.io/ — AGPL-3.0
-->
```

**Short one-liner (for individual .rs, .tsx, .ts files):**
```
// Sovereign Health Intelligence — AGPL-3.0 — https://sovereignhealth.io/
```

---

### ARTIFACT 1: Place ASCII Headers

Add the FULL header block to these files (if not already present):
- `README.md` (repo root)
- `apps/health/sovereign-health/api/src/main.rs`
- `apps/health/sovereign-health/api/src/lib.rs`
- `apps/health/sovereign-health/frontend/src/app/layout.tsx`
- `apps/health/sovereign-health/website/src/app/layout.tsx`
- `.github/workflows/ci-health.yml`
- `apps/health/sovereign-health/ops/docker-compose.dev.yml`
- Each `Dockerfile`

Add the SHORT one-liner to the top of every `.rs` file in `apps/health/sovereign-health/api/src/` that doesn't already have it:
```bash
HEADER="// Sovereign Health Intelligence — AGPL-3.0 — https://sovereignhealth.io/"
find apps/health/sovereign-health/api/src -name "*.rs" | while read f; do
  if ! head -1 "$f" | grep -q "Sovereign Health"; then
    sed -i "1i\\$HEADER\n" "$f"
  fi
done
```

Do NOT add headers to: migrations/, tests/, node_modules/, .next/, target/, build/, dist/, generated files, JSON files.

---

### ARTIFACT 2: Release Notes — `RELEASE_NOTES_${VERSION}.md`

Generate at: `apps/health/sovereign-health/docs/releases/RELEASE_NOTES_${VERSION}.md`

Format:
```markdown
<!-- (ASCII header) -->

# Sovereign Health Intelligence — Release ${VERSION}

**Date:** ${RELEASE_DATE}
**Type:** ${RELEASE_TYPE}
**Previous:** ${PREVIOUS_VERSION}

## Summary
${SUMMARY}

## What's New

### Architecture
(expand relevant CHANGES items — monorepo migration, deploy updates)

### User Interface
(expand relevant CHANGES items — settings, measurements, device modal)

### Internationalization
(expand relevant CHANGES items — i18n, localized countries, meal timing labels)

### Backend
(expand relevant CHANGES items — duplicate fix, abbreviation cleanup, template defaults)

### Testing
(expand relevant CHANGES items — test suite status)

### Bug Fixes
(expand relevant CHANGES items — migration 081, marker duplication, etc.)

## Database Migrations
${MIGRATIONS}

## Known Issues
${KNOWN_ISSUES}

## Upgrade Notes
(any manual steps required: env vars, DB seeds, Cloudflare cache purge, etc.)

## Contributors
- Helmut Schindlwick — Product, Architecture, Development
- Claude Code (Anthropic) — AI pair programming
```

---

### ARTIFACT 3: CHANGELOG.md Update

Append to `apps/health/sovereign-health/CHANGELOG.md` (create if missing):

```markdown
## [${VERSION}] — ${RELEASE_DATE}

### Added
- (list new features from CHANGES)

### Changed
- (list changes/renames from CHANGES)

### Fixed
- (list bug fixes from CHANGES)

### Security
- (any security-related changes)
```

Follow [Keep a Changelog](https://keepachangelog.com/) format.

---

### ARTIFACT 4: GDPR Data Processing Record — `docs/compliance/GDPR_RECORD_${VERSION}.md`

Required by GDPR Article 30. Generate based on current system state.

```markdown
<!-- (ASCII header) -->

# Record of Processing Activities (Art. 30 GDPR)
# Verzeichnis der Verarbeitungstätigkeiten

**Controller:** Sovereign Health Intelligence (Einzelunternehmer)
**Contact:** contact@sovereignhealth.io
**Date:** ${RELEASE_DATE}
**Version:** ${VERSION}

## 1. Processing Activities

| # | Activity | Purpose | Legal Basis | Data Categories | Data Subjects | Recipients | Retention | Transfer |
|---|----------|---------|-------------|-----------------|---------------|------------|-----------|----------|
| 1 | Account registration | Provide service | Art. 6(1)(b) Contract | Email, password (hashed), display name, DOB (optional) | Users | — | Until account deletion | EU only |
| 2 | Health data storage | Core service | Art. 6(1)(b) Contract, Art. 9(2)(a) Explicit consent | Biomarker values (encrypted AES-256-GCM) | Users | — | Until account deletion | EU only |
| 3 | AI health analysis | Doctor Chat feature | Art. 6(1)(b) Contract, Art. 9(2)(a) Explicit consent | Anonymized marker values (no PII) | Users | Anthropic (US, DPF) | Transient (no storage by Anthropic) | US (DPF adequacy) |
| 4 | Payment processing | Subscription billing | Art. 6(1)(b) Contract | Customer ID, subscription status | Users | Stripe (US, DPF) | Per Stripe retention policy | US (DPF adequacy) |
| 5 | BTC payment processing | Subscription billing | Art. 6(1)(b) Contract | Invoice ID, payment amount | Users | Strike (US) | Per Strike retention policy | US |
| 6 | Transactional email | Account verification, notifications | Art. 6(1)(b) Contract | Email address | Users | Mailgun (US, DPF) | Transient | US (DPF adequacy) |
| 7 | Referral tracking | Affiliate program | Art. 6(1)(f) Legitimate interest | Referral code (anonymous), signup attribution | Users | — | Until account deletion | EU only |
| 8 | Anonymous benchmarking | Cohort comparison (opt-in) | Art. 6(1)(a) Consent | Anonymized, aggregated marker averages | Opted-in users | — | Aggregated (no individual data) | EU only |

## 2. Technical & Organizational Measures (Art. 32)

| Measure | Implementation |
|---------|---------------|
| Encryption at rest | AES-256-GCM (health data) |
| Encryption in transit | TLS 1.3 |
| Zero-knowledge architecture | Admin cannot read health data |
| Authentication | Argon2 password hashing, optional TOTP 2FA |
| Access control | Role-based (user, admin), IP whitelist for admin |
| AI anonymization | No PII sent to AI provider |
| Backup encryption | Encrypted backups, purged 90 days after deletion |
| No tracking | Zero cookies (except session + optional referral), zero analytics |
| Data minimization | Collect only required data |
| Right to erasure | Full account + data deletion from Settings |
| Data portability | CSV/JSON export anytime |
| Breach notification | 72-hour notification process (Art. 33) |

## 3. Sub-Processors

| Processor | Purpose | Location | Safeguard |
|-----------|---------|----------|-----------|
| Hostinger | Server hosting | EU (Lithuania) | EU data residency |
| Anthropic | AI model (Claude) | US | EU-US DPF, anonymized queries only |
| Stripe | Card payments | US | EU-US DPF, PCI DSS Level 1 |
| Strike | BTC payments | US | Invoice-based, minimal data |
| Mailgun | Transactional email | US | EU-US DPF, email only |
| Cloudflare | CDN/DNS | Global | EU-US DPF, no health data |

## 4. Data Subject Rights

All rights exercisable via Settings page or contact@sovereignhealth.io:
- Access (Art. 15): JSON/CSV export
- Rectification (Art. 16): Edit any data in-app
- Erasure (Art. 17): Delete account + all data
- Portability (Art. 20): JSON/CSV download
- Restriction (Art. 18): Via contact
- Objection (Art. 21): Via contact
- Withdraw consent: Opt out of benchmarking, delete account
```

---

### ARTIFACT 5: Security Report — `docs/compliance/SECURITY_REPORT_${VERSION}.md`

```markdown
<!-- (ASCII header) -->

# Security Report — Sovereign Health Intelligence
**Version:** ${VERSION}
**Date:** ${RELEASE_DATE}
**Classification:** Internal

## 1. Encryption

| Layer | Standard | Implementation |
|-------|----------|----------------|
| Data at rest | AES-256-GCM | All health measurement values encrypted before DB write |
| Data in transit | TLS 1.3 | All client-server communication |
| Password storage | Argon2id | Industry-standard, no plaintext |
| Session management | HTTP-only, Secure, SameSite cookies | No localStorage tokens |
| Encryption key | Separate from DB | Stored in environment variable, not in database |

## 2. Authentication & Authorization

| Feature | Status |
|---------|--------|
| Email + password login | Active |
| TOTP 2FA | Active (Focus+ tiers) |
| Session expiry | Configurable |
| Admin IP whitelist | Active |
| Rate limiting | Login attempts |
| CSRF protection | Active |
| CORS policy | Restricted origins |

## 3. AI Security

| Measure | Status |
|---------|--------|
| PII stripping before AI queries | Active — Name, email never sent |
| No AI training on user data | Anthropic API policy |
| Chat deletion | User can delete anytime |
| Anonymized context | Marker values only |

## 4. Infrastructure

| Component | Details |
|-----------|---------|
| Hosting | Hostinger VPS (EU, Lithuania) |
| OS | Ubuntu/Debian with regular updates |
| Containers | Docker Compose (isolated services) |
| Database | PostgreSQL (encrypted connections) |
| CDN/DNS | Cloudflare (DDoS protection, SSL termination) |
| Monitoring | Docker health checks |
| Source code | GitHub (github.com/sovereignbrick/brickos) |

## 5. Dependency Audit

Run and document:
```bash
# Rust dependencies
cd apps/health/sovereign-health/api
cargo audit

# Node dependencies (frontend)
cd apps/health/sovereign-health/frontend
pnpm audit

# Node dependencies (website)
cd apps/health/sovereign-health/website
pnpm audit
```

Record findings and remediation status.

## 6. Penetration Testing Status
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF testing
- [ ] Auth bypass testing
- [ ] Rate limit testing
- [ ] File upload testing

## 7. Incident Response
- Breach detection: monitoring + alerts
- Notification: 72 hours (GDPR Art. 33)
- Contact: contact@sovereignhealth.io
```

---

### ARTIFACT 6: Version Bumps

Update version strings in:
```bash
# Backend — src/lib.rs VERSION constant
sed -i 's/pub const VERSION: &str = ".*"/pub const VERSION: \&str = "${VERSION}"/' \
  apps/health/sovereign-health/api/src/lib.rs

# Backend — Cargo.toml
sed -i 's/^version = ".*"/version = "${VERSION}"/' \
  apps/health/sovereign-health/api/Cargo.toml

# Frontend package.json
cd apps/health/sovereign-health/frontend && pnpm version ${VERSION} --no-git-tag-version

# Website package.json
cd apps/health/sovereign-health/website && pnpm version ${VERSION} --no-git-tag-version

# Deploy script VERSION
sed -i 's/VERSION=".*"/VERSION="${VERSION}"/' \
  apps/health/sovereign-health/ops/deploy.sh
```

---

### ARTIFACT 7: Git Tag

```bash
git add -A
git commit -m "Release ${VERSION}: ${SUMMARY}"
git tag -a v${VERSION} -m "Sovereign Health Intelligence v${VERSION} — ${RELEASE_DATE}

${SUMMARY}

Full release notes: apps/health/sovereign-health/docs/releases/RELEASE_NOTES_${VERSION}.md
GDPR record: apps/health/sovereign-health/docs/compliance/GDPR_RECORD_${VERSION}.md
Security report: apps/health/sovereign-health/docs/compliance/SECURITY_REPORT_${VERSION}.md
"
git push origin main --tags
```

---

### ARTIFACT 8: Build & Deploy

```bash
# Use the unified deploy script
cd apps/health/sovereign-health/ops

# Deploy to staging first
bash deploy.sh staging

# After staging verification, deploy to production
bash deploy.sh production --confirm

# Or deploy individual services
bash deploy.sh staging backend
bash deploy.sh staging frontend
bash deploy.sh staging website
```

---

### ARTIFACT 9: Post-Deploy Smoke Test

Quick production checks:

- [ ] https://sovereignhealth.io/ — loads, favicon visible
- [ ] https://sovereignhealth.io/pricing/ — tier cards correct
- [ ] https://app.sovereignhealth.io/login — login works, logo visible
- [ ] https://app.sovereignhealth.io/signup — registration form works
- [ ] Dashboard loads, zones display correctly
- [ ] Settings → Profile: 3-column layout, localized countries
- [ ] Settings → Devices: archive button, translated markers
- [ ] Measurements/new: device populates markers, meal timing dropdown
- [ ] Doctor Chat — responds with knowledge
- [ ] Language switch DE ↔ EN works throughout
- [ ] API health: https://api.sovereignhealth.io/health
- [ ] Staging: https://dev.sovereignhealth.io/ (basic auth)

---

## CHECKLIST (Claude Code: verify all before finishing)

- [ ] ASCII headers placed in all key files
- [ ] Release notes generated
- [ ] CHANGELOG.md updated
- [ ] GDPR record generated
- [ ] Security report generated
- [ ] Version bumped in Cargo.toml + package.json + lib.rs + deploy.sh
- [ ] `cargo test` passes
- [ ] `pnpm test` passes (frontend)
- [ ] Git committed, tagged, pushed
- [ ] Docker images built and transferred
- [ ] Website built and rsynced
- [ ] Containers restarted on VPS
- [ ] Cloudflare cache purged
- [ ] Smoke test passed
