---
number: 536
title: "bug: [P1] /platform/links app filter and 'Individual User' org filter both return empty"
milestone: "BrickOS Platform Admin GUI"
labels: [bug, p1, platform-admin-gui, sprint-041, sovereign-link, filtering]
created: 2026-04-11
priority: P1
discovered_by: 526
related: [525]
---

## Summary

Two distinct filtering bugs on `/platform/links`, both surfaced in the
same Sprint 041 walkthrough:

1. **App filter**: selecting "All Apps" shows all 13 links, but selecting
   any specific app from the **App** dropdown returns 0 results. The
   dropdown values do not match the actual `short_links.app_key` values
   stored in the DB.
2. **Org filter**: selecting "Individual User" from the **Org** dropdown
   returns 0 results. The "Individual User" org exists at
   `00000000-0000-0000-0000-000000000001` but every link in the DB has
   `owner_org_id = NULL` (only `owner_user_id` is set). The filter does
   a strict `WHERE owner_org_id = $1` so the NULL rows -- which are
   exactly the ones a user expects to see under "Individual User" --
   are excluded.

## Reproduction (staging, 2026-04-11)

1. Log in at `https://demo.sovereignhealth.io`
2. Navigate to `/platform/links`
3. Top-right filter dropdowns: leave both at "All Apps" / "All Orgs"
   -> **13 links visible**
4. Change **App** dropdown to anything specific (e.g. "Sovereign Health")
   -> **0 links visible**
5. Reset App, change **Org** dropdown to "Individual User" -> **0 links**

Expected: filtering by Sovereign Health should show all 13 links (they
are all `app_key = 'sovereign-health'`). Filtering by Individual User
should show all the links that belong to a user with no clinic org
membership -- in this dataset, that's most of them (every row has
`owner_user_id` set and `owner_org_id = NULL`).

## DB state on staging (2026-04-11)

```
brickos.short_links               -- 13 rows
   app_key       owner_user_id    owner_org_id
   sovereign-health  set           NULL
   sovereign-health  set           NULL
   ...                             (all NULL)

brickos.organizations
   00000000-0000-0000-0000-000000000001 | Individual User | individual
```

```
\d brickos.short_links
   app_key      varchar(50)  NOT NULL DEFAULT 'sovereign-health'
   owner_user_id uuid         NULL
   owner_org_id  uuid         NULL
```

## Root cause (Bug 1 -- app filter)

The `app_key` column stores the canonical app slug (`sovereign-health`).
The frontend filter dropdown probably uses a *short alias* (`health`,
matching the `short_links.domain` column which holds the route shorthand)
or uses the human-readable name. The query then does
`WHERE sl.app_key = $1` (or similar) and finds nothing.

Two fix paths:

- **Frontend** -- align the dropdown options to the canonical slug values
  (`sovereign-health`, `sovereign-crm`, `sovereign-vote`, ...). The
  display label can stay human-readable; the *value* must match the DB.
- **Backend** -- make the filter accept either the slug or an alias, e.g.
  `WHERE sl.app_key = $1 OR sl.domain = $1`. Less clean.

Recommend the frontend fix.

### Verification needed

Source for the frontend dropdown is in
`apps/health/sovereign-health/frontend/src/app/platform/links/page.tsx`
or its child component. Grep there for the `<select>` that defines the
`All Apps` options to find where the alias mismatch lives.

Source for the backend list query is in
`apps/technology/sovereign-link/src/handlers/platform_admin.rs` (around
line 90-180 for the list_links endpoint).

## Root cause (Bug 2 -- Individual User filter)

Confirmed strict-equality at `apps/technology/sovereign-link/src/handlers/platform_admin.rs:246`:

```rust
(SELECT COUNT(*) FROM short_links WHERE owner_org_id = $1) AS total_links,
```

The same pattern is repeated at lines 247-264. Each `WHERE owner_org_id = $1`
will exclude every row where `owner_org_id IS NULL` -- which is exactly
the population the "Individual User" filter is supposed to surface.

The semantics of "Individual User" are: *a link created by a user who
is not a member of any clinic org*. Two interpretations:

- **A real org row** named "Individual User" that all such users get
  assigned to as a fallback membership -> filter is `WHERE owner_org_id = $individualOrgId`
- **A virtual / synthetic org** used only as a UI category -> filter is
  `WHERE owner_org_id IS NULL`

Looking at the DB: `Individual User` exists as a real row, but **no
short_links currently reference it**, and all the orphan links have
`owner_org_id IS NULL`. So the data is using interpretation 2 (virtual)
but the UI dropdown is presenting interpretation 1 (real org). They
disagree, and the filter returns 0.

Fix: the platform_admin handler must special-case the "Individual User"
org id:

```rust
let where_clause = if org_id == INDIVIDUAL_USER_ORG_ID {
    "owner_org_id IS NULL OR owner_org_id = $1"
} else {
    "owner_org_id = $1"
};
```

Or, cleaner: **decide which interpretation we're committing to** and
make the data match the choice.

### Decision needed

| Option | Pros | Cons |
|---|---|---|
| **A** -- Individual User is a virtual category. Filter = `IS NULL`. Drop the org row. | Simplest data model. No FK to maintain. | Have to special-case in every query that joins by org. The `Individual User` row in `brickos.organizations` becomes a dead seed. |
| **B** -- Individual User is a real fallback org. All users with no real clinic membership get auto-assigned to it. Existing rows backfilled. | Uniform query pattern (`owner_org_id` is always non-NULL). No special-cases. | Requires a backfill migration; the "is this user really at a clinic" semantic is now ambiguous because everyone is "in an org". |

Recommend **option A** because:
1. Less data churn
2. Matches the existing column nullability (`owner_org_id` is
   `NULL`-able, which signals option A is the intended design)
3. The "Individual User" UI category is purely a presentation convenience

If A is chosen, **delete the `Individual User` row** from
`brickos.organizations` so we don't have a confused stub.

## Acceptance criteria

- [ ] Frontend dropdown for **App** uses canonical slug values that
      match `short_links.app_key` (e.g. `sovereign-health` not `health`)
- [ ] Selecting "Sovereign Health" from the App filter on the staging
      dataset returns all 13 links
- [ ] Filter for **Individual User** works per the chosen interpretation
      (A or B)
- [ ] Selecting "Individual User" on the staging dataset returns the
      orphan links (all 13 today)
- [ ] If option A: the `Individual User` row in `brickos.organizations`
      is deleted, the UI category is built from `owner_org_id IS NULL`
- [ ] If option B: backfill migration applied to staging + dev,
      `owner_org_id` set to the Individual User org id for any orphan
      link, and the column made `NOT NULL`
- [ ] e2e regression: Playwright spec that creates a link, applies the
      filter for that link's app + org, verifies the link appears in
      both filter views

## Related

- #525 (audit `/platform/*` admin pages -- this is exactly the kind of
  silent UI gap that audit will surface)
- design 014 BrickOS Platform GUI
- memory `feedback_admin_panel_testing.md` ("admin panel has own
  fetch/auth; test independently, verify endpoints match")

## Out of scope

- The whole multi-app filter UX redesign. This issue is just about the
  current dropdown returning correct results.
- Reworking the `domain` vs `app_key` distinction in the short_links
  schema. Both columns serve a purpose; cleaning up which is "the
  canonical slug" can wait.
