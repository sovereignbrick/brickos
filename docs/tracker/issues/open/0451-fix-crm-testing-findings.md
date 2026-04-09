---
number: 451
title: "fix: CRM testing findings -- bugs and issues found during manual testing"
milestone: "Sovereign CRM MVP"
labels: [bug, testing]
created: 2026-04-09
priority: P1
sprint: 038
---

Collect and fix bugs found during manual testing of Sovereign CRM.

## Findings

<!-- Add findings below as you test. Format: - [ ] Description (page/endpoint, expected vs actual) -->

- [ ] _Testing in progress -- add items here_

## Test Checklist

### Auth
- [ ] Signup flow (new user registration)
- [ ] Login flow (existing user)
- [ ] MFA setup + login with TOTP
- [ ] Password reset flow
- [ ] Session persistence (refresh, window focus)
- [ ] Logout

### Navigation
- [ ] All nav links work (Dashboard, Capture, Contacts, Companies, Projects, Meetings, Pipeline, Graph, Settings)
- [ ] User menu: Settings, Affiliate, Admin, Theme toggle, Sign out
- [ ] Mobile hamburger menu
- [ ] Dark theme consistent on all pages

### Contacts
- [ ] Create contact (all fields)
- [ ] List contacts (card grid renders)
- [ ] View contact detail
- [ ] Edit contact
- [ ] Delete contact
- [ ] Encrypted fields (email, phone, notes) stored as v1:... in DB

### Companies
- [ ] Create company with domain
- [ ] Unique domain enforcement
- [ ] View company with member contacts
- [ ] Delete company

### Projects
- [ ] Create project with color
- [ ] Assign contact to project
- [ ] Unassign contact
- [ ] Delete project (cascades assignments)

### Tags
- [ ] Create tag
- [ ] Assign tag to contact
- [ ] Filter by tag
- [ ] Delete tag (cascades)

### Capture
- [ ] Photo capture (mobile camera)
- [ ] Text note capture
- [ ] Project scope selector
- [ ] Conference mode (rapid scan)

### Meetings
- [ ] Create meeting
- [ ] Add attendees
- [ ] Transcribe (paste transcript)
- [ ] AI summarize
- [ ] Action items created
- [ ] Mark action complete

### Search
- [ ] Reindex
- [ ] Search returns results
- [ ] Suggest returns matches

### Pipeline
- [ ] Kanban shows contacts by stage
- [ ] Move contact between stages

### Settings
- [ ] Profile edit (display name)
- [ ] Password change
- [ ] MFA setup/disable
- [ ] Data export (JSON download)

### Export
- [ ] vCard export
- [ ] NOSTR NIP-02 export
