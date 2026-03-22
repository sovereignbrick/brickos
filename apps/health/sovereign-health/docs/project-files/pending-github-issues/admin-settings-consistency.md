---
title: "fix: Admin settings — 86% of settings are orphaned or mismatched with hardcoded values"
milestone: "Infrastructure & Chores"
milestone_number: 20
status: pending
issue_number: null
---

## Context

Audit on 2026-03-22 found that of 57 `app_settings` defined in the database, only 8 are actually read by the code (14%). The rest are orphaned — the admin can change them, but the code ignores them and uses hardcoded constants instead.

## Critical Mismatches

| Setting Key | DB Default | Hardcoded | Files |
|-------------|-----------|-----------|-------|
| `max_upload_files` | 10 | 3 | `import.rs:69`, `agent-grid.tsx:167`, `chat-input.tsx` |
| `max_upload_size_mb` | 50 | 10 | `import.rs:27`, `agent-grid.tsx:168` |
| `affiliate_commission_pct` | 20 | 20 (const) | `pricing.rs:50` — const used, setting ignored |

## Orphaned Settings (31 total, defined but never read)

- `welcome_email_enabled` — always sends
- `admin_alert_new_user` — always sends
- `admin_alert_new_subscription` — always sends
- `api_rate_limit_per_minute` — uses env var instead
- `login_max_attempts` — uses env var instead
- `login_lockout_minutes` — uses env var instead
- `promo_codes_enabled` — never checked
- `dr_alex_app_enabled` — never checked (app chat always on)
- `dr_alex_app_model` — never read (hardcoded in handler)
- `supported_lab_formats` — never validated against
- `affiliate_btc_bonus_pct` — never read
- `max_upload_files` — never read
- `max_upload_size_mb` — never read
- + 18 more

## GDPR-Critical Values Not Admin-Configurable

- `GRACE_PERIOD_DAYS = 30` — hardcoded in `services/purge.rs:14`
- `CONTACT_RETENTION_DAYS = 90` — hardcoded in `services/purge.rs:15`

## Requirements

### Phase 1: Wire existing settings (P0)
- [ ] Backend: Replace hardcoded `MAX_FILES` (3) and `MAX_FILE_SIZE` (10MB) with `get_setting_i64("max_upload_files")` and `get_setting_i64("max_upload_size_mb")`
- [ ] Frontend: Fetch upload limits from a public settings endpoint (e.g., `GET /settings/upload-limits`)
- [ ] Wire `dr_alex_app_enabled` and `dr_alex_app_model` in the app chat handler
- [ ] Wire `welcome_email_enabled`, `admin_alert_new_user`, `admin_alert_new_subscription`
- [ ] Wire `promo_codes_enabled` in promo validation
- [ ] Wire `affiliate_commission_pct` instead of const in `pricing.rs`

### Phase 2: Add missing settings (P1)
- [ ] Add `grace_period_days` to app_settings (GDPR)
- [ ] Add `contact_retention_days` to app_settings (GDPR)
- [ ] Add `minimum_charge_cents` to app_settings
- [ ] Consolidate rate limit settings (env vars vs app_settings)

### Phase 3: Cleanup (P2)
- [ ] Remove or document intentionally-orphaned settings
- [ ] Rename `health_coach_*` keys to `dr_alex_web_*` for consistency
- [ ] Add missing seed migrations for hidden settings
- [ ] Admin UI: show which settings are "active" vs "not yet wired"

## Files

- Settings table: `migrations/20260312000052_app_settings.sql`
- Settings API: `api/src/handlers/admin_settings.rs`
- Upload handler: `api/src/handlers/import.rs`
- Pricing: `api/src/payments/pricing.rs`
- Purge: `api/src/services/purge.rs`
- Frontend: `components/doctor-chat/agent-grid.tsx`, `chat-input.tsx`

## Design Reference

See: `docs/project-files/design/017-monitoring-and-resilience-strategy.md` (for similar ops consistency pattern)
