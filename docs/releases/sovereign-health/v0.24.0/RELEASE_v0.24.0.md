<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Release Notes — v0.24.0
 Date: 2026-03-22

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Release v0.24.0

**Date:** 2026-03-22
**Sprint:** 006 — DX Hardening & UX Polish
**Previous:** v0.23.0

---

## Highlights

- **Deep health monitoring** — `/health?deep=1` checks database connectivity. Gatus now detects DB outages within 60 seconds.
- **Container watchdog** — systemd timer auto-restarts crashed containers and alerts via ntfy + Telegram.
- **Trend chart improvements** — data points always visible with status-colored dots and rich hover tooltips.
- **Smart Import enhancements** — editable protocol mapping, duplicate detection, multi-file uploads from conversation view.
- **Shared UI package** — `@brickos/ui` extracted with MultiSelect component for cross-app reuse.

---

## Features

### Infrastructure & Monitoring
- **Deep health endpoint** (`GET /health?deep=1`) — verifies DB connectivity, returns `checks.database.status` and latency. Returns 503 when degraded. (#187)
- **Container watchdog** — systemd timer runs every 60s, checks all critical containers, auto-restarts and alerts via ntfy + Telegram.
- **Compose project isolation** — explicit `name:` field in compose files prevents staging/production cross-contamination.
- **Gatus deep monitoring** — body conditions check `database.status == ok`; TLS certificate expiry alerts added.
- **Deploy script hardening** — pre-flight checks for compose isolation, lockfile sync fix.

### Smart Import — Tabular Measurements
- **Editable protocol mapping** — change measurement protocol (fasting, postprandial, etc.) per source column in the import review screen.
- **Duplicate detection** — rows with identical date+time+values highlighted in amber with "dup" label and skip checkbox.
- **Multi-sheet ODS support** — correctly selects data sheet (not summary/explanation sheets).
- **Improved marker matching** — "Blutdruck syst./diast." correctly matches to Systolic/Diastolic BP; 4+ char minimum prevents false positives.

### Dr. Alex Chat
- **Conversation deletion** — soft-delete with `is_deleted` + `deleted_at` columns; deleted conversations filtered from sidebar and fetch queries.
- **URL-based routing** — `/doctor-chat/{id}` deep links; browser back button returns to landing page.
- **Multi-file upload** — paperclip submenu now accepts up to 3 files for all import types (was limited to 1).

### Trend Chart
- **Always-visible data points** — status-colored dots (green/orange/red) shown on all period views with adaptive radius (r=4 for <30 pts, r=3 for 30-60, r=2 for 60+).
- **Custom hover tooltip** — shows date, value with status color dot, and protocol tag. No redundant status text.
- **Fasting period legend tooltip** — hovering over "Fastenperiode" explains what shaded areas mean and why they matter.

### Shared Packages
- **`@brickos/ui`** — extracted MultiSelect component into shared package (`packages/ui/`). Used by measurements filter page. Supports search, count labels, and theme-aware styling.

---

## Fixes

### Backend
- Newsletter signup sync — signup with newsletter checkbox now correctly appears in admin newsletter tab.
- Newsletter label — removed "monthly" from signup checkbox ("Subscribe to newsletter").
- Tab label — "Grenzwerte" renamed to "Referenzbereiche" in content_strings.
- Tier features_summary — populated EN + DE for all 6 tiers.
- Staging build numbers — auto-increment (`v0.23.0-b1`, `-b2`, `-b3`) for version traceability.

### Frontend
- Measurements history — no React hydration error #418 on page load.
- DateOnlyPicker — used consistently (no native date inputs); selected day number now visible on blue background.
- Em-dash removal — billing country select uses hyphen, not em-dash.
- Language switching — zone and marker names update without page refresh.
- Protocol labels — translated correctly in DE mode (not raw English tags).
- German i18n — 7 strings fixed from ASCII umlaut substitutes (ue/oe/ae) to proper UTF-8 (ü/ö/ä).

### Ops
- Deploy script — lockfile check no longer false-positives on workspace deps.
- Image transfer verification — uses size comparison instead of image ID.

---

## Migrations

| Migration | Description |
|-----------|-------------|
| `20260322000001` | Fix newsletter label (content_strings) |
| `20260322000002` | Doctor chat soft-delete columns (is_deleted, deleted_at) |
| `20260322000003` | Tab label "Grenzwerte" → "Referenzbereiche" (content_strings) |
| `20260322000004` | Populate tier features_summary (EN + DE) |

All migrations are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).

---

## Infrastructure Changes

| Change | Status |
|--------|--------|
| Container watchdog (systemd timer) | Deployed to VPS |
| Gatus deep health body conditions | Enabled |
| Gatus TLS cert expiry checks | Enabled |
| Compose `name:` isolation | Deployed (prod + staging) |
| Deploy script compose pre-flight | Active |
| Mailgun configured for staging | Active (sovereignhealth.io domain) |
| ntfy admin password reset + verified | Active |

---

## Known Issues

- React hydration #418 — suppressed on `<html>` and `<body>`; root cause investigation tracked in #185/#189.
- Migration checksum warning on `20260312000056` — cosmetic, does not affect functionality.
- Website content_strings — ~10 German strings still use ASCII umlaut substitutes (website only, not app).
- Import History page — backend ready, frontend not built (#186).
- Newsletter consent toggle — backend ready, frontend not built (#188).

---

## Backlog Created

16 issues raised (#176-191) spanning GDPR compliance, admin settings consistency, monitoring improvements, UX enhancements, and deploy workflow hardening. See [RC test results](../releases/v0.24.0-rc1/2026-03-22_rc-test-results_v0.24.0-rc1.md) for full details.

---

## Testing

- **Backend:** 324/324 tests passing
- **Frontend:** 223/223 tests passing (14 test files)
- **RC testing:** 121-item manual browser checklist — 17 areas pass, 4 fixed during testing, 2 skipped (not implemented)
- **Code verification:** 22 automated checks — 21 pass, 1 fixed (em-dash)

See: `releases/v0.24.0-rc1/` for full test reports.

---

## Stats

- **Commits:** 30 (from v0.23.0 to v0.24.0)
- **Files changed:** 77
- **Lines added:** 4,636
- **Lines removed:** 491
- **Issues created:** 16
- **Design docs:** 3 (016-licensing, 017-monitoring, 018-settings-restructure)
- **Production incident resolved:** 1 (DB container disappearance)
