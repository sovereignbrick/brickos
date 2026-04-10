---
number: 410
github_number: 532
title: "feat: CRM i18n setup (EN + DE) + /api/v1/i18n/status endpoint"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, i18n]
created: 2026-04-08
sprint: 036
points: 2
blocked_by: [391]
---

Set up internationalization for Sovereign CRM frontend and API status endpoint.

## Frontend i18n

- Create `frontend/src/i18n/messages/en.json` and `de.json`
- All CRM UI strings: navigation, form labels, buttons, error messages, empty states
- Use `useContent()` hook pattern (per feedback_i18n_content_markers)
- Never hardcode strings (per CLAUDE.md)
- Proper UTF-8 umlauts in German (per feedback_umlaut_utf8)

## Key Categories

- `crm.nav.*` -- sidebar navigation (Contacts, Companies, Projects, Tags)
- `crm.contacts.*` -- contact list, detail, form labels
- `crm.companies.*` -- company list, detail, form labels
- `crm.projects.*` -- project list, detail, form labels
- `crm.tags.*` -- tag management labels
- `crm.common.*` -- shared strings (Save, Cancel, Delete, Search, etc.)
- `crm.errors.*` -- validation and error messages

## API Endpoint

- `GET /api/v1/i18n/status` via `brickos_i18n::compute_status("sovereign-crm", ...)`
- Reports translation completeness per locale
- Lists missing keys for each locale

## Acceptance Criteria

- All visible UI text comes from i18n files (no hardcoded strings)
- Switching locale to DE shows German translations
- `/api/v1/i18n/status` returns correct key counts and missing keys
