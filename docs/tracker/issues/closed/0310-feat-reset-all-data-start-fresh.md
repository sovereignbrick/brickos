# Issue #310: Allow user to reset all data and start fresh (without deleting account)

**Type:** feature
**Priority:** medium
**Component:** backend + frontend / settings
**Found during:** feature request (2026-04-02)

## Description

Users who have messed up their data (bad imports, test data, wrong values) need a way to wipe all health data and start fresh without deleting their entire account. Currently the only option is GDPR account deletion, which removes the account itself after a 30-day grace period.

## Current State

- `DELETE /settings/account` → soft-deletes entire account (is_deleted=true), hard purge after 30 days
- No way to keep the account (login, subscription, settings) but clear all health data

## Proposed Feature

### "Reset All Data" action in Settings
Wipes all user health data while preserving:
- **Keep:** Account, login credentials, email, subscription/tier, preferences, notification settings
- **Delete:** All measurements, import sessions, devices, labs, medications/supplements, Dr. Alex chat history, calculated marker values, custom reference ranges, templates

### Safety measures
- Require explicit confirmation (type "RESET" or similar)
- Show count of records that will be deleted ("This will remove 1,247 measurements, 5 import sessions, 3 labs, ...")
- Optional: 24h cooldown / undo window before hard delete
- Log the action in audit trail
- Notify admins via ntfy

### Implementation

#### Backend
- New endpoint: `POST /settings/reset-data` (or `DELETE /settings/data`)
- Transaction that deletes from all user data tables:
  - measurements
  - calculated_marker_values
  - import_sessions (+ imported measurements)
  - devices
  - labs
  - medications
  - templates
  - doctor_chat_sessions + messages
  - custom reference ranges
- Audit log entry: "User initiated full data reset"

#### Frontend
- Settings page: "Reset All Data" button (danger zone section, alongside "Delete Account")
- Confirmation modal showing record counts
- i18n: EN + DE

## Alternative Considered

Reusing GDPR delete + re-register — but this loses the subscription, requires re-onboarding, and the 30-day grace period is unnecessarily slow for a data reset.

## Location

- Backend: `apps/health/sovereign-health/api/src/handlers/settings.rs` (new endpoint near delete_account)
- Frontend: settings page, danger zone section
- Purge service: `apps/health/sovereign-health/api/src/services/purge.rs` (reuse table list)
