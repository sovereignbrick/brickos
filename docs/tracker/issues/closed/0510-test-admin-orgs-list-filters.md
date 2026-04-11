---
number: 510
title: "test: [manual] /platform/orgs -- every filter, sort, bulk action"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-f, manual]
created: 2026-04-11
priority: P1
sprint: 041
phase: F
estimate: 0.25d
---

Click-through checklist for the Sprint 040 #477 orgs list view. Tests every interactive element.

## Checklist

### Filters
- [ ] Text search: type "Life" -- expect Life Algorithm to appear
- [ ] Text search: paste `billing@life-algorithm.test` -- expect Life Algorithm (billing_email search)
- [ ] Type filter: select "clinic" -- expect Life Algorithm + any other clinics
- [ ] Status filter: select "active" -- expect Life Algorithm (has active horizon license from #499)
- [ ] Status filter: select "no_license" -- expect all orgs WITHOUT licenses
- [ ] Expires within: select "30 days" -- expect empty (Life Algorithm expires in 365d)
- [ ] Expires within: select "365 days" -- expect Life Algorithm

### Sorting
- [ ] Click "Name" column header -- expect alpha ascending
- [ ] Click again -- expect alpha descending
- [ ] Click "Tier" column header -- expect tiers sorted
- [ ] Click "Members" -- expect numeric sort
- [ ] Click "Expires" -- expect date sort

### Bulk actions
- [ ] Click header checkbox -- expect all visible rows selected
- [ ] Click again -- expect all unselected
- [ ] Select Life Algorithm only -- bulk action bar appears
- [ ] Click "Export CSV" -- expect file download containing Life Algorithm row
- [ ] Click "Send renewal reminder" -- expect toast "Sent 1 renewal reminder" (log-only since no Mailgun)

### Pagination
- [ ] If there are >50 orgs, verify Next/Prev work
- [ ] Otherwise verify the "Page 1 of 1" text is correct

## Who

User (manual).

## Verification

Report each checkbox green/bug. Any filter that returns wrong results is a P1 bug.
