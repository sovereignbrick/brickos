---
title: "test: Automated admin settings consistency tests"
milestone: "Infrastructure & Chores"
milestone_number: 20
status: pending
issue_number: null
---

## Context

Audit on 2026-03-22 found 86% of admin settings are orphaned (defined but never read by code). We need automated tests to prevent this from happening again.

## Requirements

### Test 1: All app_settings keys are visible in admin UI
- Parse the admin settings panel component
- Extract all settings keys rendered in the UI
- Compare against all rows in `app_settings` table
- FAIL if any DB setting is missing from the admin UI

### Test 2: No hardcoded business rule constants
- Scan backend code for numeric constants that match known `app_settings` keys
- Flag any `const` or `let` that duplicates a value that exists in `app_settings`
- Specifically check: file limits, size limits, rate limits, commission percentages, retention days, grace periods
- FAIL if a hardcoded value exists where an `app_settings` key is defined

### Test 3: All app_settings keys are read by code
- Extract all `get_setting`, `get_setting_bool`, `get_setting_i64`, `get_setting_string` calls from backend
- Compare against all keys seeded in migrations
- Report orphaned settings (defined but never read)
- WARN (not FAIL) for orphaned settings — some may be intentionally future-reserved

### Test 4: Frontend limits match backend
- Extract upload/size/count limits from frontend components
- Verify they either read from an API endpoint or match the `app_settings` defaults
- FAIL if frontend has a hardcoded limit that contradicts the DB default

## Implementation

- Backend: Rust integration tests in `tests/admin_settings_consistency.rs`
- Frontend: TypeScript tests in `src/lib/admin-settings-consistency.test.ts`
- Add to RC checklist as automated pre-deploy check

## Files

- Settings migrations: `migrations/20260312000052_app_settings.sql`
- Settings handler: `api/src/handlers/admin_settings.rs`
- Admin UI: `frontend/src/components/admin/settings-tab.tsx`
