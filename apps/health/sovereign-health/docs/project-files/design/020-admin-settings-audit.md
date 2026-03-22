# 020 - Admin Settings Audit

**Date:** 2026-03-22
**Sprint:** 007
**Issue:** [#180](https://github.com/sovereignbrick/brickos/issues/180)
**Status:** Audit complete, remediation deferred

## Problem

The admin panel exposes 53 settings in `app_settings`, but only 15 (28%) are actually read by API code. The remaining 38 are orphaned -- admins can toggle them but nothing happens. This creates false expectations and maintenance debt.

## Audit Results

### Active Settings (15) -- Read by code

| Setting Key | Used In | Purpose |
|---|---|---|
| registration_enabled | auth.rs | Gate new user registration |
| registration_whitelist_ips | auth.rs | IP-based registration access |
| admin_whitelist_ips | admin_settings.rs | Admin IP bypass |
| payment_enabled | payments.rs | Gate payment processing |
| payment_whitelist_ips | payments.rs | IP-based payment access |
| payment_fiat_gateway | payment_gateways.rs | Select fiat gateway (stripe/strike) |
| payment_btc_gateway | payment_gateways.rs | Select BTC gateway |
| gateway_stripe_enabled | payment_gateways.rs | Enable/disable Stripe |
| gateway_strike_enabled | payment_gateways.rs | Enable/disable Strike |
| btc_discount_percent | billing_btc.rs | BTC payment discount |
| health_coach_web_enabled | public_chat.rs | Enable/disable public chat |
| health_coach_daily_limit | public_chat.rs | Public chat daily IP limit |
| app_infobar_* (6 keys) | admin_settings.rs | App info bar content |
| web_infobar_* (6 keys) | admin_settings.rs | Website info bar content |

### Orphaned Settings (38) -- In DB, never read

**Feature flags with no enforcement:**
- `maintenance_mode`, `user_login_enabled`
- `dr_alex_app_enabled`, `dr_alex_app_model`
- `mailgun_enabled`, `stripe_live_mode`, `btcpay_enabled`
- `welcome_email_enabled`, `admin_alert_new_user`, `admin_alert_new_subscription`
- `promo_codes_enabled`, `affiliate_enabled`

**Config values overridden by env vars:**
- `health_coach_session_limit`, `health_coach_model`, `health_coach_max_tokens`
- `dr_alex_web_daily_limit`, `dr_alex_web_model`

**Limits not enforced:**
- `max_upload_files`, `max_upload_size_mb`, `supported_lab_formats`
- `api_rate_limit_per_minute`, `login_max_attempts`, `login_lockout_minutes`
- `audit_retention_days`, `retention_ai_usage_days`, `retention_data_access_days`, `retention_payment_events_days`

**Affiliate system (no code gates):**
- `affiliate_commission_pct`, `affiliate_min_payout_cents`, `affiliate_evaluation_days`, `affiliate_btc_bonus_pct`

### Hardcoded Values That Should Be Settings

| Value | Location | Current | Should Be |
|---|---|---|---|
| Upload per-file limit | import.rs:27 | 10MB hardcoded | Read from `max_upload_size_mb` |
| BTC annual free months | billing_btc.rs:160 | 2 hardcoded | Admin-configurable |

### Legacy Key Shadowing

`health_coach_web_enabled` shadows `dr_alex_web_enabled` with fallback logic. Both exist in DB. Should consolidate to one key.

## Remediation Plan (Future Sprint)

### Phase 1: Clean up (3 pts)
- Remove orphaned settings that will never have code (affiliate, retention, promo)
- Or: add `is_active` / `implemented` flag to admin UI so admins can see what works

### Phase 2: Wire up critical flags (5 pts)
- Implement `maintenance_mode` check (middleware)
- Implement `user_login_enabled` check (auth handler)
- Route `max_upload_size_mb` through settings instead of hardcoding
- Route chat model/tokens through settings instead of env vars

### Phase 3: Admin UI honesty (2 pts)
- Add visual indicator for unimplemented settings
- Remove legacy `dr_alex_*` keys, consolidate to `health_coach_*`

## Files

- `api/migrations/20260312000052_app_settings.sql` -- primary settings definitions
- `api/src/handlers/admin_settings.rs` -- admin CRUD + public endpoint
- `api/src/handlers/auth.rs` -- registration checks
- `api/src/handlers/payments.rs` -- payment checks
- `api/src/handlers/payment_gateways.rs` -- gateway selection
- `api/src/handlers/public_chat.rs` -- health coach settings
- `api/src/handlers/import.rs` -- hardcoded upload limits
- `api/src/handlers/billing_btc.rs` -- hardcoded BTC free months
