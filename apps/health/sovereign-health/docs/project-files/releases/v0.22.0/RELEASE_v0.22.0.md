<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Release Notes
 Version: 0.22.0 — 2026-03-20

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Release v0.22.0 — Polish & Precision (Sprint 004)

**Date:** 2026-03-20
**Branch:** develop
**Previous:** v0.21.0

---

## Summary

Sprint 004 focused on UX polish from hands-on production testing of v0.20.0. All 16 user-reported issues were addressed across 5 phases: quick wins, UX improvements, search & AI quality, hygiene, and a new admin notification system. 30 of 35 planned points delivered. Phase 4 (thresholds redesign, 5 pts) and carry-over items deferred to backlog.

---

## Key Changes

### Features

- **Admin notification system** — Dual-dispatch to ntfy (sovereign) + Telegram (admin UI) with 17 event hooks covering auth, billing, and security events. Fire-and-forget pattern — notifications never block API responses.
- **Gatus monitoring** — Uptime monitoring with public status page, alerting via ntfy + Telegram on service degradation.

### Fixes — Phase 1: Quick Wins (6 pts)

- **MFA TOTP issuer** — QR code now shows "BrickOS - Sovereign Health Intelligence" in authenticator apps
- **Exercise dropdown** — Added Yoga, Pilates, Swimming, Cycling, and more (EN + DE)
- **Light theme tooltip** — Fixed black-on-black hover state on device manufacturer tooltip
- **Dr. Alex banner** — Removed blue promotional banner from influence factors tab
- **Powder dosage form** — Added "Pulver" (DE) / "Powder" (EN) to dosage form dropdown
- **Supplement toast link** — Added "View in Settings" link to supplement import success toast

### Fixes — Phase 2: UX Improvements (12 pts)

- **Locale-aware decimals** — Weight and sleeping hours inputs accept both `.` and `,`, display per locale
- **Security tab** — Two-column grid layout (MFA left, password right)
- **Privacy tab** — Two-column grid layout (consent left, export right)
- **Influence factors** — Clear section headers and explanation text for medications vs supplements
- **Medication edit** — Column labels, readable widths, improved layout

### Fixes — Phase 3: Search & AI (8 pts)

- **Marker search ranking** — Prioritize exact/word matches over substrings. "muscle" now returns CK, Myoglobin, Creatinine as top results
- **Dr. Alex photo validation** — Max 3 photos validated on frontend before upload (no wasted API calls)
- **Dr. Alex results** — Brand extraction from supplement photos, improved dosage prompt, inline editing of extracted values

### Fixes — Phase 5: Hygiene (4 pts)

- **Drop unused tables** — Migration 103: removed `health_check` (0 rows) and `content_audit_log` (5 rows, overlaps `audit_log`). Kept `ui_strings`/`ui_string_translations` (actively used by content API).
- **Quota table evaluation** — Documented: `chat_agent_quota` (generic per-agent-type) and `doctor_chat_quota` (Dr. Alex-specific with rollover) both needed.
- **Lockfile check** — Already implemented in `deploy.sh` preflight.
- **Crash report cleanup** — `.gitignore` already had `crash-report-*.md`.

### Backend

- **Notification service** (`services/notify.rs`) — `Notifier` struct with `NotifyConfig::from_env()`, injected as `web::Data<Notifier>`. Channels: Critical, Errors, Billing, Users, Info. Priorities: Min through Urgent.
- **17 notification hooks** wired into handlers:
  - Auth: signup, email verified, password reset
  - MFA: enabled, disabled, brute force lockout (Critical/High)
  - Security: password changed, account deletion (High)
  - Billing: new subscription, plan change, cancellation, reactivation, payment failed (Urgent), refund, admin refund
- **Gatus config** — Internal ntfy URL, removed unreachable TCP checks, fixed staging conditions

### Documentation

- **16 Architecture Decision Records** (ADR-001 through ADR-016) covering all major architectural decisions
- **Deployment & CI/CD documentation** — Full pipeline docs at `docs/project-files/deployment/README.md`
- **v0.22.0 RC testing checklist** — 100+ test items across 4 sections
- **Sprint 003 retrospective**
- **Sprint 004 plan + design docs** (SSO, affiliate hierarchy, notification system)

### Ops

- **Gatus monitoring** — `docker-compose.monitoring.yml` with ntfy + Gatus stack
- **Deploy notifications** — `deploy.sh` sends ntfy + Telegram alerts on deploy start, success, and failure

---

## Database Migrations

| Migration | Description |
|-----------|-------------|
| `20260320000103_drop_unused_tables.sql` | Drop `health_check` and `content_audit_log` tables |

---

## Issues

| Action | Issue | Title |
|--------|-------|-------|
| Created | #151 | feat: branded affiliate URL shortener (brickos.io/r/{code}) |

---

## Pre-deployment Audit

| Check | Result |
|-------|--------|
| `cargo fmt --check` | ✅ PASS |
| `cargo clippy -D warnings` | ✅ PASS |
| `cargo test` (smoke + integration + property) | ✅ 15 tests passed |
| `vitest` (frontend) | ✅ 192 tests passed |
| Theme color audit | ✅ 0 violations |
| `cargo audit` | ✅ 0 vulnerabilities (6 unmaintained warnings) |

---

## Known Issues

- Protocol Comparison not yet implemented (Coming Soon)
- Benchmark not yet implemented (Coming Soon)
- AI Dashboard not yet implemented (Coming Soon)
- Learn page content pending (#101)
- Horizon tier features all Coming Soon
- Password reset email requires valid Mailgun credentials in .env
- Phase 4 (Thresholds redesign) deferred — thresholds tab shows single reference scheme only
- P2-2 (Toast/notification consistency + route-change cleanup) partially addressed — inline notifications may persist across navigation
- `genpdf` transitive deps unmaintained (6 warnings) — no security vulnerabilities

---

## Files Changed

68 files changed, 4,890 insertions, 3,456 deletions.

---

## Contributors

- Helmut Schindlwick — Product, Architecture, Development
- Claude Code (Anthropic) — AI pair programming
