---
title: "feat: Restructure Settings tabs — separate Health Profile, Account, and Privacy concerns"
milestone: "User Experience & Onboarding"
milestone_number: 17
status: pending
issue_number: null
---

## Context

The Settings Profile tab mixes account settings (email, date format) with health-critical data (body measurements, lifestyle). Health Reports are buried under "Data & Privacy" where they don't belong. GDPR consent toggles (newsletter, partner offers) are missing from the UI.

See: `docs/project-files/design/018-settings-tab-restructure.md`

## Changes

1. **Health Profile tab** — body measurements, lifestyle defaults, + health reports (moved from Privacy)
2. **New Account tab** — email, name, language, country, date/time format, license badge
3. **Data & Privacy tab** — pure GDPR: consent toggles (anonymous, newsletter, partner offers), access log, GDPR export, delete account
4. Update onboarding guide deep links
5. i18n for EN + DE

## Dependencies

- Issue #176 (access log UI) → adds to restructured Privacy tab
- Issue #177 (consent toggles) → adds to restructured Privacy tab
- Onboarding guide links to Profile tab

## Acceptance Criteria

- [ ] Health-critical data (measurements, lifestyle) is the first thing visible on Health Profile
- [ ] Account/technical settings are in a separate Account tab
- [ ] Health Reports (PDF/CSV/JSON) are in Health Profile, not Privacy
- [ ] Privacy tab has: anonymous data, newsletter, partner offers toggles, GDPR export, delete account
- [ ] Existing deep links (`/settings?tab=profile`, `/settings?tab=privacy`) still work
- [ ] Onboarding flow still navigates to the correct tab
