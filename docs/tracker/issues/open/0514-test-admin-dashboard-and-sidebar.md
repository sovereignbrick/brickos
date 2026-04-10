---
number: 514
title: "test: [manual] /platform dashboard + sidebar navigation"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-f, manual]
created: 2026-04-11
priority: P2
sprint: 041
phase: F
estimate: 0.2d
---

Platform layout + dashboard sanity check. Covers the shared chrome around every admin screen.

## Checklist

### Layout
- [ ] Sidebar sections: OVERVIEW, MANAGE, COMMERCE, LINKS, CONTENT, AI, OPS, SECURITY, SETTINGS
- [ ] Every section's items are visible
- [ ] Collapse sidebar button works
- [ ] Expand button appears when collapsed
- [ ] Mobile hamburger works (resize viewport < 1024px)
- [ ] Search pages input filters nav items

### Header
- [ ] App switcher shows Platform / Health / Links / Voice
- [ ] Filter dropdowns (All Apps + All Orgs) work
- [ ] User profile dropdown opens
- [ ] Profile dropdown shows: user info, OrgSwitcher, Settings, Security & MFA, Logout
- [ ] Logout actually logs out and redirects to /login

### Dashboard (/platform)
- [ ] Stat cards render (if any) with real numbers
- [ ] Any errors in browser devtools console? Record them
- [ ] Network tab: any failing fetches? Record them

### Feature requests
Any UI weirdness (ugly rendering, wrong icon, confusing button label, missing feature) -> file as new issue against the `platform-admin-gui` milestone, do NOT block Sprint 041.

## Who

User (manual).

## Verification

Green/bug per checkbox. Feature requests go to the platform-admin-gui milestone immediately.
