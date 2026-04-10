---
number: 484
github_number: 425
title: "feat: multi-org switcher in user profile dropdown"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-d, feature, ux]
created: 2026-04-10
priority: P1
sprint: 040
phase: D
design: 022
estimate: 0.5d
blocked_by: [465]
---

Locked decision: switcher lives in the user profile dropdown alongside the existing theme toggle (design 022 §7.3).

## Scope

- [ ] User profile dropdown component (existing)
- [ ] Add "Org" row alongside "Theme" toggle
- [ ] Lists all org_members rows for the current user, plus "Personal (Individual)"
- [ ] Selecting an org switches the request context (sets a session cookie `org_context`)
- [ ] Page reload after switch to refresh tier-aware UI
- [ ] URL query `?org=<id>` overrides the cookie for shareable links
- [ ] Default selection: most-recently-active org
- [ ] If user has 0 active org memberships: hide the row entirely (no need)
- [ ] i18n (EN + DE)

## Verification

- [ ] Test user with 2 org memberships sees 3 options (2 orgs + Personal)
- [ ] Switching changes effective tier (e.g. from Glimpse personal to Insight via clinic membership)
- [ ] Cookie persists across page navigation
- [ ] URL query overrides cookie
- [ ] Single-org user does not see the switcher

## References

- design 022 §7.3, locked decision Q5
