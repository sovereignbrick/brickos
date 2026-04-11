---
number: 506
title: "test: [manual] single user -- self-register new SHI user"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-e, manual]
created: 2026-04-11
priority: P1
sprint: 041
phase: E
estimate: 0.15d
---

Walk the self-registration flow as a brand new user. Baseline for Phase E.

## Steps

1. Open an incognito/private browser window
2. Navigate to `http://localhost:3001/signup`
3. Fill: email `jane.doe@life-algorithm.test`, password `SprintTest2026!`, accept T&C, optional newsletter opt-in
4. Submit
5. Verify the email verification prompt (or auto-verify if REGISTRATION_ENABLED=true + skip-verify dev flag)
6. If verification email is logged-only (no Mailgun), fetch the verification token from the backend log or the `email_verifications` table and hit the verify URL manually
7. Log in as the new user
8. Land on `/dashboard`

## Expected result

- New user appears in `users` table with tier=`glimpse` and role=`user`
- Dashboard renders without errors
- Tier indicator in the profile dropdown shows "Glimpse"
- The user is NOT a member of any org (verify via `/me/orgs` returns empty)

## Who

User (manual).

## Verification

Green/bug. Any signup flow bug is P1 since this is the top-of-funnel path.
