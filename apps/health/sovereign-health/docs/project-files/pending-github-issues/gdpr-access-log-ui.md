---
title: "feat: Privacy tab — show user's data access log (GDPR Art. 15)"
milestone: "UI: Privacy & Security Features"
milestone_number: 13
status: created
issue_number: 176
---

## Context

ADR-016 (GDPR & Privacy Architecture) requires:
> Users can view their own access log via the Privacy tab

The `data_access_log` table exists with RLS, and the backend already records access events via `services/access_log.rs`. However, there is **no frontend UI** for users to view who accessed their data and when.

## Requirements

- Add a "Who Accessed My Data" section to the **Data & Privacy** tab in Settings
- Query `data_access_log` for the current user (RLS already enforces isolation)
- Display: action, resource, timestamp, IP hash (masked)
- Pagination or "load more" for long histories
- i18n for EN + DE

## References

- ADR: `apps/health/sovereign-health/docs/project-files/adr/016-gdpr-privacy-architecture.md`
- Backend service: `apps/health/sovereign-health/api/src/services/access_log.rs`
- Migration: `20260317000085_data_access_log.sql`
- Frontend: `apps/health/sovereign-health/frontend/src/app/settings/page.tsx` (Data & Privacy tab)
