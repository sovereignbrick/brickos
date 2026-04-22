# 0592 -- bug: Privacy tab "Data Access Log" card uses stale Sprint 026 endpoint

**Type:** bug (UX + GDPR transparency)
**Priority:** P2 (user sees "No data access recorded" while data access HAS been recorded)
**Found:** Sprint 050 RC layer 5.5 by helmut, 2026-04-22
**Sprint target:** 051

## Observed

On `/settings` > Privacy tab, the "Data Access Log" card shows "No data access recorded yet." But `/sovereign-health/data-access-log` (the full-page view) shows real entries for the same user -- in the RC walk, the practitioner's impersonation of Anna from earlier in the day is visible on the full page but absent on the Privacy card.

## Root cause

Two endpoints, divergent data sources:

| Surface | Endpoint | Data |
|---|---|---|
| Privacy tab card (`src/app/settings/components/privacy-tab.tsx:264`, fetch via `api.settings.getAccessLog()`) | `GET /settings/access-log` | Sprint 026 legacy audit log -- generic user-settings events only |
| Full page (`src/app/sovereign-health/data-access-log/page.tsx`, fetch `/user/data-access-log`) | `GET /user/data-access-log` | Sprint 048 practitioner-impersonation events |

The Privacy card's endpoint predates the Sprint 048 impersonation feature. When Sprint 048 shipped, the full-page surface was added using a new endpoint, but the Privacy card's fetch was never updated to query the new combined view.

## Impact

- GDPR Art. 15 transparency regression: the Privacy tab is the natural place a patient goes to see "who accessed my data" (it's labelled as such, EN + DE). Showing "No data access recorded yet" while the backend has actually recorded accesses is misleading.
- No visible link from the Privacy card to the full-page view, so a curious user has no path to discover the richer log.

## Fix options

1. **Unify backend (preferred):** make `/settings/access-log` return the same combined view as `/user/data-access-log` (or have one redirect internally). Keep the card focused on recent-3 rows + "View all" link.
2. **Swap client endpoint:** change the Privacy card to call `/user/data-access-log` directly. Simpler, no backend change. Risk: two endpoints continue to exist and drift further.
3. **Remove the card + link only:** drop the inline table from the Privacy tab and replace it with a button "See data access log ->" linking to `/sovereign-health/data-access-log`. Simplest; loses the at-a-glance value.

Recommend option 1 + option 3 combined: unify backend into one endpoint, keep a recent-3 summary on the Privacy card + "See all" link.

## Repro

1. As `anna.meier@patients.clinic.com` on `test-clinic.demo.sovereignhealth.io`, open `/sovereign-health/data-access-log`. Note there's at least one recent entry from a practitioner or admin.
2. Navigate to `/settings?tab=privacy`, scroll to "Data Access Log" card.
3. See "No data access recorded yet." despite step 1.

## Notes

- Not a v0.48.0 regression -- the Privacy card has been out of sync since Sprint 048 shipped. Sprint 050 RC is the first time both surfaces were eyeballed back-to-back.
