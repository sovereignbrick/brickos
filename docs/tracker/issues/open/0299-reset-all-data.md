---
github_number: 299
title: "feat: Reset all data / start fresh (keep account)"
milestone: health-intelligence
labels: [enhancement, sprint-023, app:health, backend, frontend]
points: 5
---

## Description
Allow users to reset all health data while keeping their account, subscription, and settings intact.

## Sub-tasks
- [ ] Backend: `POST /settings/reset-data` endpoint
- [ ] Delete from: measurements, calculated_marker_values, import_sessions, devices, labs, medications, chat sessions, templates, custom reference ranges
- [ ] Return record counts before deletion (confirmation dialog data)
- [ ] Frontend: "Reset All Data" in Settings danger zone
- [ ] Confirmation modal: user must type "RESET" to proceed
- [ ] Audit log entry + ntfy notification on reset
- [ ] i18n: EN + DE
