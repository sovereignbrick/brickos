---
github_number: 378
title: "fix: affiliate page redirect loop on expired session"
milestone: health-intelligence
labels: [fix, P1]
---

## Problem

Accessing `app.sovereignhealth.io/login?expired=true&return=%2Faffiliate` and logging in causes the affiliate page to briefly load then redirect back to login with "session expired". This creates a loop where the user can never reach the affiliate page.

Likely cause: the affiliate page's auth check fires before the token cookie is fully set, or the token validation fails and triggers another redirect to login with `?expired=true`.

## Steps to Reproduce

1. Open `app.sovereignhealth.io/affiliate` when not logged in
2. Get redirected to login with `?return=/affiliate`
3. Login with valid credentials
4. Page briefly shows then redirects to login again with `?expired=true&return=%2Faffiliate`

## Reported with user: optimized@sovereignhealth.io on production
