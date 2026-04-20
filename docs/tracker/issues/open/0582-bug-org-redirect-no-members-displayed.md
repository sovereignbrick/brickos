---
number: 582
title: "bug: /org -> /platform/org redirect works but landing page shows 0 members"
milestone: "Sprint 046 -- Unified Admin Home"
labels: [bug, frontend, p1]
created: 2026-04-20
priority: P1
estimate: 0.25d
---

Reported during Sprint 046 RC #28 on 2026-04-20:

> "OK but no org member displayed"

On the /platform/org overview page, the member-count card shows no
data (blank or 0). But /platform/members lists the members correctly.
So the org-overview fetch is either failing or not populating the
stats card.

## Likely cause

`/platform/org/page.tsx` fetches from `/org-settings/analytics`. Either:
1. The endpoint returns 0 members because the query uses a stale
   org_id (wrong org scope)
2. The page component state update isn't triggering a re-render
3. Same fetch-refresh loop as #579 if it's the same root cause

## Debug plan

1. DevTools -> Network -> look at the response for `/org-settings/analytics`
2. Verify `members` field value and whether it matches the actual
   `/platform/members` list count
3. If mismatched, check the backend query for the members stat

## Acceptance

- /platform/org Overview shows the correct member count for the org
- Same count visible on /platform/members
