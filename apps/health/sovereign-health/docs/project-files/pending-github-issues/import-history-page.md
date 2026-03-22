---
title: "feat: Import History page — view past imports and rollback"
milestone: "User Experience & Onboarding"
milestone_number: 17
status: pending
issue_number: null
---

## Context

The backend has full import history and rollback support but no frontend page exists:
- `GET /import/history` — returns all imports with type, markers, date, provider
- `DELETE /import/sessions/:id/rollback` — undoes an import (deletes imported measurements)
- `api.import.history()` — API client already wired in `api.ts:717`

No `src/app/import-history/` page exists. No navigation link in the app.

## Requirements

- Create `/import-history` page showing past imports
- Table columns: date, type (lab/medication/measurement), file name, markers imported, lab provider
- Rollback button per import with confirmation dialog
- Add navigation link (likely in Dr. Alex sidebar or Settings)
- i18n for EN + DE

## Backend Endpoints (already implemented)

- `GET /import/history` — `handlers/import.rs:549`
- `DELETE /import/sessions/:id/rollback` — `handlers/import.rs:1738`

## Files

- API client: `frontend/src/lib/api.ts:717`
- Types: `frontend/src/lib/types.ts` (ImportHistoryEntry)
- Page needed: `frontend/src/app/import-history/page.tsx`
