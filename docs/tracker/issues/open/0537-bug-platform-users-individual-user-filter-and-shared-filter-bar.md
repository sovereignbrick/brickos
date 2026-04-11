---
number: 537
title: "bug: [P1] /platform/users Individual User filter returns 0 + shared platform filter bar mismatches DB values"
milestone: "BrickOS Platform Admin GUI"
labels: [bug, p1, platform-admin-gui, sprint-041, filtering]
created: 2026-04-11
priority: P1
discovered_by: 526
related: [536, 525]
---

## Summary

`/platform/users` shows the same filtering bug pattern as `/platform/links`
(#536), and the root cause lives in a **shared filter bar** at
`apps/health/sovereign-health/frontend/src/app/platform/layout.tsx:85-117`
that's rendered on every `/platform/*` page. So fixing it is one fix that
benefits every admin route.

Specifically, on `/platform/users` with the org filter set to "Individual
User":

- The **Direct stat card** shows **25 users** (the real total)
- The **list area** shows **"0 users"** and is empty
- The header dropdown is on **All Apps / Individual User**

A second observation from the same screen: the user can see members in
some org contexts but not in others (e.g. test22 was reported empty).
The API returns the correct results for test22 (see verification below),
so the test22 case may be a frontend rendering issue OR a misclick --
needs re-test. The Individual User case is definitely broken.

## Reproduction (staging, 2026-04-11)

1. Log in at `https://demo.sovereignhealth.io`
2. Navigate to `/platform/users`
3. Top-right org dropdown -> select **Individual User**
4. Result: list area says "0 users", stat card still says "Direct 25"

## API verification (definitive)

Probed `/admin/users?org_id=...` directly:

| Filter | API status | rows | total |
|---|---|---|---|
| no filter | 200 | 25 | 25 |
| `org_id=00000000-0000-0000-0000-000000000001` (Individual User) | 200 | 0 | 0 |
| `org_id=200f5364-ef9a-43a5-9357-b3fa7ce45cff` (test22) | 200 | 1 | 1 |

So:
- Backend list_users honors the org filter correctly for **real** orgs (test22 -> 1 user, the `t@t.com` member created during the seat-limit walkthrough)
- Backend strict-equality bug for the **Individual User** category, identical to #536 -- there are 2 users in `brickos.users` with no `org_members` row at all, and they should be the population the filter surfaces, but the strict `INNER JOIN org_members ON ... AND om.org_id = $1::uuid` excludes them
- The user's claim that test22 was also empty either means the GUI has a *separate* rendering bug from the API, OR it was a misclick. **Needs one more re-test by the user with test22 selected.**

## Root cause -- Backend (Individual User filter)

`apps/health/sovereign-health/api/src/handlers/admin.rs:157,163` (and the
non-search path at lines 224-231):

```rust
let org_join = if !org_id_filter.is_empty() {
    "INNER JOIN org_members om ON om.user_id = u.id AND om.org_id = $4::uuid"
} else {
    ""
};
```

When `org_id_filter == "00000000-0000-0000-0000-000000000001"` (the
"Individual User" UUID), the INNER JOIN pulls only users who have an
org_members row pointing at that exact org. **No such rows exist** --
verified on staging:

```
brickos.users with no org_members row: 2
brickos.org_members rows pointing at Individual User org: 0
```

So the filter returns 0. Same root cause family as #536; same fix
options (special-case the Individual User UUID, OR pick option A
"Individual User is virtual = NULL semantic" and special-case once
in a helper, OR option B "Individual User is real, backfill all
orphans").

Recommend the same option A as #536 for consistency. Both issues should
ship in the same PR.

## Root cause -- Frontend (shared filter bar value mismatch)

`apps/health/sovereign-health/frontend/src/app/platform/layout.tsx:99-102`:

```tsx
<option value="all">All Apps</option>
<option value="shi">Sovereign Health</option>
<option value="sovereign-link">Sovereign Link</option>
<option value="sovereign-voice">Sovereign Voice</option>
```

But the DB stores:

```
brickos.short_links.app_key       = 'sovereign-health' (not 'shi')
brickos.org_apps.app_key          = 'sovereign-health'
```

So when the operator picks "Sovereign Health" from the dropdown, the
URL becomes `?app=shi` and the backend filter `WHERE app_key = 'shi'`
finds nothing. **Same root cause as #536** but exposed here on
`/platform/users` because the dropdown lives in the shared layout.

The dropdown options must use the canonical slug values:

```tsx
<option value="sovereign-health">Sovereign Health</option>
<option value="sovereign-link">Sovereign Link</option>
<option value="sovereign-voice">Sovereign Voice</option>
```

(Note: the existing `sovereign-link` and `sovereign-voice` values are
already canonical -- only `shi` is wrong. Easy fix.)

## Show-all-users mode

The user also asked for a "show all users not only per organization"
view. The good news: that already exists and works. Setting the org
dropdown to **All Orgs** sends no `org_id` query param, the backend
returns all 25 users, and the list renders. Verified above (no filter
-> 25 rows).

If the operator's complaint is that **All Orgs is not the default** when
landing on `/platform/users`, that's a separate UX point: the dropdown
should default to "All Orgs" on first load, not "Individual User"
(which currently appears to be the default per the screenshot).
Filing as a sub-task in the acceptance criteria below.

## Acceptance criteria

- [ ] **Backend**: `list_users` (and the parallel block in `admin.rs:224-231`)
      special-case the Individual User UUID to mean "users with no
      org_members row":
      ```rust
      let join_clause = if org_id_filter == INDIVIDUAL_USER_ORG_ID {
          "WHERE NOT EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = u.id)"
      } else if !org_id_filter.is_empty() {
          "INNER JOIN org_members om ON ... AND om.org_id = $1"
      } else {
          ""
      };
      ```
      Or pick option A from #536 (drop the Individual User real-org
      seed, build the UI category from `org_members IS NULL`) -- both
      fixes ship in one PR.
- [ ] **Frontend**: `platform/layout.tsx:100` change `value="shi"`
      to `value="sovereign-health"`. Verify the resulting `?app=...`
      query param matches `short_links.app_key` and `org_apps.app_key`.
- [ ] **Frontend**: filter bar defaults to **All Apps / All Orgs** on
      first load of every `/platform/*` page (currently lands on
      "Individual User" which is the *worst* default for a discovery flow)
- [ ] **Persistence**: filter selections survive a page reload. Today
      they probably don't, which means the operator has to re-pick the
      org every time they refresh. Use `useSearchParams` so the state
      lives in the URL.
- [ ] **Per-org view check**: re-test test22 with the org dropdown set
      to test22 -- API returns 1 user (`t@t.com`), GUI must render that
      same 1 user. If GUI still shows 0, file a separate frontend
      rendering bug.
- [ ] **e2e regression**: Playwright spec covering the three filter
      states above (no filter, Individual User, real org)
- [ ] **Audit reference**: every other `/platform/*` page that respects
      the shared filter bar gets re-tested after the fix
      (`/platform/links`, `/platform/users`, `/platform/orgs`,
      `/platform/licensing`, ...). #525 is the umbrella audit issue.

## Related

- #536 (`/platform/links` -- same root cause, sibling fix)
- #525 (audit `/platform/*` admin pages -- the parent audit umbrella)
- #523 (`/platform/orgs` New Organization button -- the entry point that
  surfaced this whole class of bugs)
- design 014 BrickOS Platform GUI
- memory `feedback_admin_panel_testing.md`

## Out of scope

- Reworking the "Individual User" concept entirely (that lands in #536's
  decision -- A or B)
- The full filter-bar redesign (multi-select, search, presets)
- The "Direct vs Affiliate" stat semantics on the user page
