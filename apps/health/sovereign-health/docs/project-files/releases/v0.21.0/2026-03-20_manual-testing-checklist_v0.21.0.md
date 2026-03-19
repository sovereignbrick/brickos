<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Manual Testing Checklist
 Version: 0.21.0 — 2026-03-20

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Manual Testing Checklist — v0.21.0

**Date:** 2026-03-20
**Environment:** Staging (demo.sovereignhealth.io)
**Tester:** _______________

---

## v0.21.0-Specific Tests

### Protected Users

- [ ] Login as demo@sovereignhealth.io / Demo2026!
- [ ] Navigate to Settings → attempt to delete account
- [ ] Verify deletion is blocked with 403 Forbidden error
- [ ] Login as admin@schindlwick.com
- [ ] Verify admin cannot delete their own account (protected)
- [ ] Create a test user, delete it → verify deletion succeeds (not protected)

### Audit Logging

- [ ] Login as admin → navigate to Admin → Audit Log
- [ ] Verify `auth.signup` events appear (from recent signups)
- [ ] Create a new measurement → verify `measurement.created` event in audit log
- [ ] Delete a measurement → verify `measurement.deleted` event
- [ ] Update profile settings → verify `profile.updated` event
- [ ] Export data as CSV → verify `data.exported` event

### Database Migrations

- [ ] Verify `is_protected` column exists: `SELECT is_protected FROM users LIMIT 1`
- [ ] Verify protected users: `SELECT email, is_protected FROM users WHERE is_protected = true`
- [ ] Verify retention settings: `SELECT * FROM app_settings WHERE key LIKE 'retention_%'`
- [ ] Verify `health_check` table dropped: `SELECT 1 FROM health_check` should fail
- [ ] Verify new indexes exist: `\di idx_cmv_user_marker_measured` in psql

### Dependency Updates (Smoke Tests)

- [ ] Login/logout works (auth flow uses rand 0.9 for token generation)
- [ ] MFA setup works (TOTP secret generation uses rand 0.9)
- [ ] Rate limiting works — rapid API calls get throttled (actix-governor 0.10)
- [ ] Error responses have correct JSON format (thiserror 2)
- [ ] Frontend UI components render correctly (@base-ui/react 1.3)

---

## Regression Tests

### Core Flows

- [ ] Login with email/password
- [ ] View dashboard with measurements
- [ ] Add a new measurement (manual entry)
- [ ] Import a lab PDF
- [ ] View trends chart
- [ ] View health zones
- [ ] Switch language (EN ↔ DE)
- [ ] Dark theme renders correctly (no white backgrounds)

### Settings

- [ ] Update profile (name, email)
- [ ] Change password
- [ ] Export data as CSV
- [ ] View license/tier information

### Demo User Integrity

- [ ] Demo user has measurements visible on dashboard
- [ ] Demo user has devices in device list
- [ ] Demo user has calculated markers (GKI, BMI, etc.)
- [ ] Demo data matches expected counts (~1,222 measurements, 5 devices, 69 calculated markers)

---

## Post-Deploy Infrastructure Checks

- [ ] `curl https://api-demo.sovereignhealth.io/health` → version = "0.21.0"
- [ ] Frontend loads: https://demo.sovereignhealth.io/
- [ ] Website loads: https://www-demo.sovereignhealth.io/
- [ ] Container creation times are fresh (check `docker inspect --format='{{.Created}}'`)
- [ ] Migrations applied (check `_sqlx_migrations` table for new entries)
- [ ] No error logs in `docker logs sovereign-health-api-staging`

---

## Sign-off

| Area | Tester | Date | Status |
|------|--------|------|--------|
| Protected users | | | |
| Audit logging | | | |
| Migrations | | | |
| Dependencies | | | |
| Core flows | | | |
| Settings | | | |
| Demo data | | | |
| Infrastructure | | | |
