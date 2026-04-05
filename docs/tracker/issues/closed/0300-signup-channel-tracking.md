---
github_number: 300
title: "feat: Signup channel tracking (affiliate, source in admin)"
milestone: health-intelligence
labels: [enhancement, sprint-023, app:health, admin, backend]
points: 3
---

## Description
Surface existing affiliate/referral tracking data in the admin panel with org-level views. Backend already tracks `users.referred_by`, `users.affiliate_code`, `users.parent_referrer_id`. Missing piece is admin visibility + org-scoped views.

## Sub-tasks
- [ ] Add `referred_by`, `affiliate_code` to admin Users query
- [ ] Add columns to admin Users tab UI
- [ ] Acquisition channel derivation: affiliate vs direct, filterable/sortable
- [ ] Org-level affiliate view: org owners see stats scoped to their org members
- [ ] BrickOS admin full view: cross-org affiliate overview, per org_type
- [ ] Affiliate performance summary in admin dashboard
- [ ] Distinguish native growth vs affiliate-acquired, per organisation
