---
number: 530
title: "bug: [P1] license issuance defaults to 0/0 practitioners/members blocking first member add"
milestone: "BrickOS Platform Admin GUI"
labels: [bug, p1, platform-admin-gui, licensing, sprint-041]
created: 2026-04-11
priority: P1
discovered_by: 526
related: [527, 525, 467]
---

## Summary

When a platform admin issues an org license via the License tab on
`/platform/orgs/[id]`, the seat count fields default to **1 owner /
0 practitioners / 0 members** -- which makes the very next thing the
admin tries to do (add a member via the Members tab) fail with:

> Seat limit exceeded: role member (0/0)

This blocks the entire Sprint 041 Life Algorithm walkthrough at the
"add the first practitioner" step. The customer-onboarding flow that
this whole sprint exists to validate is dead at the second click.

## Reproduction (staging, 2026-04-11)

1. Log in to `https://demo.sovereignhealth.io` as `demo@sovereignhealth.io`
2. `/platform/orgs` -> "New Organization" -> create `test22`
3. Open `/platform/orgs/{newId}` -> License tab
4. Pick tier "clarity" (or any tier), accept the seat-count defaults, Save
5. Switch to Members tab -> enter `test@t.com` -> Role `member` -> Add
6. Result: red banner **"Seat limit exceeded: role member (0/0)"**

Verified DB state (org `200f5364-ef9a-43a5-9357-b3fa7ce45cff`):

```
license_id                            tier_slug  max_o  max_p  max_m
718a6cc2-351d-4989-b2e7-7b6a2f954ef0  clarity    1      0      0
```

Hotfix already applied: re-issued the license with `1 / 3 / 10` via
`POST /admin/organizations/{id}/license` to unblock the manual test.
Auto-revocation worked correctly. The new license:

```
5c4aab8a-0eeb-40a6-bbbe-fe4ab945b4db  clarity    1      3      10
```

## Why this happens (root cause)

Two architectural gaps stack on top of each other:

### Gap 1 -- tiers don't define seat counts

`brickos.license_tiers` has SHI consumer-product columns
(`max_markers`, `chat_general_monthly`, `pdf_reports_monthly`, ...) but
**no `max_owners` / `max_practitioners` / `max_members` columns at all**.
So when the License tab UI picks a tier and asks "what should the seat
counts be?", there's nothing to read from. Each issuance has to ask the
operator to type the numbers in.

This is a leftover from Sprint 040 #467, which migrated from a 5-role
seat model to a 3-role one but never extended `license_tiers` with the
new seat-count columns.

### Gap 2 -- the License tab form defaults to 1/0/0

Even given Gap 1, the form should default to *something* sensible based
on the tier name. Instead it defaults to `max_owners=1, max_practitioners=0,
max_members=0`. The operator has no signal that "0" is dead-on-arrival,
so they accept the defaults and immediately get blocked at member-add.

## Fix paths

**Path A (proper, Sprint 042) -- tiers carry seat counts.** Add columns
to `brickos.license_tiers`:

```sql
ALTER TABLE brickos.license_tiers
  ADD COLUMN default_max_owners INT NOT NULL DEFAULT 1,
  ADD COLUMN default_max_practitioners INT NOT NULL DEFAULT 0,
  ADD COLUMN default_max_members INT NOT NULL DEFAULT 0;
```

Seed sensible per-tier defaults (a starter draft):

| tier | owners | practitioners | members |
|---|---|---|---|
| glimpse (free) | 1 | 0 | 0 (single-user) |
| focus (€9.99) | 1 | 0 | 0 (single-user) |
| insight (€24.99) | 1 | 0 | 1 (couple) |
| clarity (€49.99) | 1 | 0 | 5 (small family / health team) |
| horizon (€99.99) | 1 | 3 | 10 (clinic team, per the marketing copy) |
| core (self-host) | -1 | -1 | -1 (unlimited) |

The License tab form pre-fills from these defaults when a tier is
selected. The operator can override on a per-license basis (some clinics
buy custom seat counts), but the *default is sane*.

**Path B (immediate, hotfix) -- form-side default sanity.** Even without
schema changes, the License tab can ship with defaults that aren't
zero. Suggest `1 / 1 / 5` as a "first license, somebody will bump it"
default. Plus a soft validation: if the operator is about to save with
0 in any field, show a warning "this org will not be able to add any
{role}s until you increase this".

**Path C (UX, complementary)** -- when the seat-cap error fires on
member-add, the error banner should include a deep link to the License
tab: *"Seat limit exceeded: role member (0/0). [Open License tab]
to issue more seats."* Today the operator has to figure out for themselves
that the License tab is where they fix this.

## Acceptance criteria

- [ ] **Path A** schema change + seed (or design 014.1 documenting why we deferred it)
- [ ] **Path B** License tab form pre-fills sane defaults from the selected tier
- [ ] **Path B** Form refuses to save (or warns) when any seat count is 0 unless the operator explicitly opts into "single-user license"
- [ ] **Path C** Member-add error banner includes the deep link to the License tab
- [ ] **e2e regression** Playwright spec: create org, issue default license, add 1 owner + 1 practitioner + 1 member, all succeed without intermediate license edits
- [ ] **Backend test** integration test that asserts: for each tier in `license_tiers`, an issued license with default seats can host 1 owner

## Related

- #467 (Sprint 040 5->3 role consolidation that introduced the new seat model without backfilling tier defaults)
- #525 (audit `/platform/*` admin pages for missing CRUD buttons -- this is a sibling discoverability bug)
- #527 (the OTHER P0 bug found in the same manual session -- handlers querying legacy product_features)
- #523 (`/platform/orgs` New Organization button -- the entry point for this whole flow)
- design 014 BrickOS Platform GUI

## Out of scope

- Per-customer custom seat negotiation (sales handles that, not the GUI)
- Live-resize of existing licenses (covered by the existing License tab "edit license")
- The whole licensing-tier-pricing redesign (separate Sprint 04N work)
