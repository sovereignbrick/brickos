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

# Release Template — Sovereign Health Intelligence

**This document defines the release workflow and artifact requirements for every RC/release.**

---

## Deployment Phases

### Phase 1: Pre-deployment checks (automated, localhost)

All must pass before proceeding. Any failure blocks the release.

```bash
# 1. Backend tests
cargo test -p sovereign-health-api

# 2. Backend lint
cargo fmt --check && cargo clippy -- -D warnings

# 3. Frontend lint
pnpm --filter sovereign-health-frontend lint

# 4. Frontend tests
pnpm --filter sovereign-health-frontend test

# 5. Theme color audit (0 critical violations required)
bash apps/health/sovereign-health/frontend/scripts/check-theme-colors.sh

# 6. Security audit (advisory, non-blocking)
cargo audit
```

### Phase 2: Version bump (localhost)

Bump VERSION in these 5 files:
- `ops/deploy.sh` — `VERSION="X.Y.Z-rcN"`
- `api/src/lib.rs` — `pub const VERSION: &str = "X.Y.Z-rcN";`
- `api/Cargo.toml` — `version = "X.Y.Z-rcN"`
- `frontend/package.json` — `"version": "X.Y.Z-rcN"`
- `website/package.json` — `"version": "X.Y.Z-rcN"`

### Phase 3: Generate release artifacts & commit (localhost — no push)

**All release artifacts go into a single directory:**
`docs/project-files/releases/vX.Y.Z-rcN/`

Generate these 4 files:

| # | File | Description |
|---|------|-------------|
| 1 | `release-audit.json` | Automated check results from Phase 1 (tests, lint, theme, lighthouse, cargo audit, issues closed/created, migrations, key changes) |
| 2 | `RELEASE_vX.Y.Z-rcN.md` | Release notes — summary, key changes by category (features/fixes/backend/ops/docs), migrations table, issues, pre-deployment audit table, known issues, files changed |
| 3 | `YYYY-MM-DD_testing-report_vX.Y.Z-rcN.md` | Full testing report — test pyramid, backend/frontend suite results, RC-specific change coverage, theme audit, security audit, docker build status, environment |
| 4 | `YYYY-MM-DD_manual-testing-checklist_vX.Y.Z-rcN.md` | Manual testing checklist — RC-specific tests for new features, regression tests carried from previous RC, post-deploy infrastructure checks, sign-off table |

Then commit to `develop` (local only, no push to GitHub):
```bash
git add <files>
git commit -m "release: vX.Y.Z-rcN — summary"
```

### Phase 4: Deploy to staging (localhost → VPS)

```bash
bash apps/health/sovereign-health/ops/deploy.sh staging
```

Builds Docker images locally → transfers to VPS via SSH → restarts containers → runs migrations → rsyncs website → purges Cloudflare cache.

### Phase 5: Post-deploy verification (staging)

1. API health: `curl https://api-demo.sovereignhealth.io/health` → version matches
2. Frontend loads: `https://demo.sovereignhealth.io/` (behind basic auth)
3. Website loads: `https://www-demo.sovereignhealth.io/` (behind basic auth)
4. Container creation times are fresh (not old containers surviving)
5. Migrations applied: verify new tables/columns exist in staging DB
6. Login works: demo@sovereignhealth.io / Demo2026!

### Phase 6: RC testing (manual, staging)

Walk through the manual testing checklist generated in Phase 3. Test on staging environment.

### Phase 7: Promote to production (when RC is approved)

```bash
# Merge develop → main
git checkout main && git merge develop

# Deploy production
bash apps/health/sovereign-health/ops/deploy.sh production --confirm

# Push to GitHub (only now)
git push origin develop main

# Tag
git tag -a vX.Y.Z-rcN -m "Sovereign Health Intelligence vX.Y.Z-rcN"
git push origin --tags
```

---

## Release Artifact Templates

### release-audit.json

```json
{
  "audit_version": "4.0",
  "audit_date": "YYYY-MM-DD",
  "previous_audit": "YYYY-MM-DD (vPREVIOUS)",
  "auditor": "Claude Code (automated)",
  "target_version": "vX.Y.Z-rcN",
  "repository": "github.com/sovereignbrick/brickos",
  "environment": "localhost (dev)",
  "summary": {
    "total_checks": 6,
    "passed": 0,
    "failed": 0,
    "backend_tests": 0,
    "frontend_tests": 0,
    "theme_violations": 0,
    "lighthouse_accessibility": 0,
    "security_advisories": 0,
    "security_warnings": 0
  },
  "checks": [
    { "name": "cargo test", "status": "pass|fail", "details": "N tests passed" },
    { "name": "cargo fmt + clippy", "status": "pass|fail", "details": "" },
    { "name": "pnpm test", "status": "pass|fail", "details": "N tests, N files" },
    { "name": "theme-colors.sh", "status": "pass|fail", "details": "" },
    { "name": "lighthouse", "status": "pass|fail", "details": "N% accessibility" },
    { "name": "cargo audit", "status": "pass|fail", "details": "" }
  ],
  "issues_closed": [],
  "issues_created": [],
  "migrations": [],
  "files_changed_estimate": 0,
  "key_changes": []
}
```

### RELEASE_vX.Y.Z-rcN.md

Sections: Summary, Key Changes (Features / Fixes / Backend / Ops / Documentation), Database Migrations table, Issues (closed/created), Pre-deployment Audit table, Known Issues, Files Changed.

### Testing Report

Sections: Summary table, Test Pyramid diagram, Backend Test Results table (by suite), Frontend Test Results table (by file), RC-Specific Changes coverage table, Theme Audit, Security Audit (cargo audit advisories), Docker Build status, Deployment Verification, Environment.

### Manual Testing Checklist

Sections: RC-Specific Tests (grouped by feature with checkboxes), Regression Tests (carried from previous RC), Post-Deploy Infrastructure checks, Sign-off table by area.

---

## ASCII Headers

**For Markdown files:**
```
<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 [File-specific subtitle]
 Version: X.Y.Z-rcN — YYYY-MM-DD

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->
```

**For Rust / SQL / config files (// comments):**
```
// Sovereign Health Intelligence — AGPL-3.0 — https://sovereignhealth.io/
```

**For HTML (website):**
```html
<!--
  Sovereign Health Intelligence — BLOOD · BIOMARKERS · INSIGHT
  https://sovereignhealth.io/ — AGPL-3.0
-->
```

Do NOT add headers to: migrations/, tests/, node_modules/, .next/, target/, build/, dist/, generated files, JSON files.

---

## Known Issues (update each release)

- Protocol Comparison not yet implemented (Coming Soon)
- Benchmark not yet implemented (Coming Soon)
- AI Dashboard not yet implemented (Coming Soon)
- Learn page content pending (#101)
- Horizon tier features all Coming Soon
- Password reset email requires valid Mailgun credentials in .env

---

## Contributors

- Helmut Schindlwick — Product, Architecture, Development
- Claude Code (Anthropic) — AI pair programming
