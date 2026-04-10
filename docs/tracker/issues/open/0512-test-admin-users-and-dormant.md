---
number: 512
title: "test: [manual] /platform/users + /platform/users/dormant"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-f, manual]
created: 2026-04-11
priority: P1
sprint: 041
phase: F
estimate: 0.2d
---

Walk the Sprint 040 #482 users screens.

## Checklist -- /platform/users

- [ ] User list loads, shows Jane + coaches + clients + admins
- [ ] Search by email works
- [ ] Tier column renders per user
- [ ] Override column shows nothing for Jane (no admin override)
- [ ] Source column shows "Card" / "BTC" / "Free" correctly
- [ ] Click "Manage" on Jane -- expand panel opens
- [ ] Tier override dropdown works (don't actually override in this test)
- [ ] "Dormant accounts →" link in header navigates correctly

## Checklist -- /platform/users/dormant

- [ ] Page loads even with zero dormant users (shows "No dormant accounts")
- [ ] To test non-empty: run `UPDATE users SET lifecycle_status='dormant', last_active_at=NOW() - INTERVAL '400 days' WHERE email = 'client1@life-algorithm.test'` then reload
- [ ] client1 appears with amber "dormant" badge
- [ ] Select the row -- bulk action bar appears
- [ ] "Send re-engagement email" -- log-only, toast shows count
- [ ] "Schedule for deletion" -- updates the row's badge to red "pending_deletion"
- [ ] "Clear dormant flag" -- restores to active, removes from the list

## Who

User (manual).

## Verification

Green/bug per checkbox. Cleanup: `UPDATE users SET lifecycle_status='active', pending_deletion_at=NULL WHERE email LIKE '%life-algorithm.test'` after the test.
