---
title: "feat: Consent management UI — newsletter & partner offers toggles (GDPR)"
milestone: "UI: Privacy & Security Features"
milestone_number: 13
status: created
issue_number: 177
---

## Context

ADR-016 requires:
> Granular consent toggles: newsletter, anonymous data sharing

The backend has `GET/PUT /settings/consent` endpoints supporting `newsletter` and `partner_offers` flags, with Mailgun tag sync. However, **only the anonymous data sharing toggle** is visible in the frontend. Newsletter and partner offers toggles are missing from the UI.

## Requirements

- Add consent toggles for **newsletter** and **partner offers** to the Data & Privacy tab
- Wire to existing `PUT /settings/consent` endpoint
- Show current state via `GET /settings/consent`
- i18n for EN + DE
- Audit: changes are already tracked server-side

## References

- ADR: `apps/health/sovereign-health/docs/project-files/adr/016-gdpr-privacy-architecture.md`
- Backend: `apps/health/sovereign-health/api/src/handlers/settings.rs` (lines ~1276-1398)
- Frontend: `apps/health/sovereign-health/frontend/src/app/settings/page.tsx` (Data & Privacy tab)
