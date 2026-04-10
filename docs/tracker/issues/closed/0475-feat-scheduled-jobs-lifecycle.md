---
number: 475
github_number: 416
title: "feat: scheduled jobs (payment failure cadence, dormant flag, org termination grace)"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-c, feature]
created: 2026-04-10
priority: P1
sprint: 040
phase: C
design: 022
estimate: 1.5d
blocked_by: [473, 474]
---

Three scheduled jobs that drive the user lifecycle automatically.

## Scope -- payment failure reminder cadence

- [ ] Daily job: find users with `user_licenses.status = 'downgrade_grace'` AND `grace_period_ends - NOW() IN (14, 7, 1)` days
- [ ] Send the matching template (#473) for that day
- [ ] Idempotency: track `payment_failure_email_sent_at` to avoid duplicate sends
- [ ] Day 14 (grace expired): downgrade to Glimpse, send the "downgraded" email (#474)

## Scope -- dormant flag (Glimpse only)

- [ ] Daily job: find users with `tier = 'glimpse'` AND `last_active_at < NOW() - INTERVAL '365 days'`
- [ ] Set `users.lifecycle_status = 'dormant'`
- [ ] Send "inactivity warning" email (#474) once per user (idempotent on `lifecycle_status` change)
- [ ] **Paying users are exempt** -- skip if tier is anything other than glimpse
- [ ] Reset to `'active'` on next login or API call (handled in middleware/auth)

## Scope -- org termination grace

- [ ] Daily job: find orgs with `org_licenses.expires_at < NOW()` AND `org_status != 'terminated_grace'`
- [ ] Set `org_status = 'terminated_grace'`, `terminated_at = NOW()`
- [ ] Send termination email to all `org_members` (#474)
- [ ] Day 30 after termination: invite consumers to individual plan (default action) per locked decision

## Scope -- infrastructure

- [ ] Job runner: tokio-cron or similar
- [ ] All jobs idempotent (safe to re-run)
- [ ] Logged + metered for ops visibility
- [ ] Test fixtures with time-mocked clock

## Verification

- [ ] Test fixture: user 14 days into grace → downgrade triggered, email sent
- [ ] Test fixture: Glimpse user 366 days inactive → dormant flag set
- [ ] Test fixture: paying user 366 days inactive → no flag
- [ ] Test fixture: org expired 30 days ago → consumers receive switch-to-individual email
- [ ] Jobs run on staging without errors for one cycle

## References

- design 022 §2.5, §3.7
