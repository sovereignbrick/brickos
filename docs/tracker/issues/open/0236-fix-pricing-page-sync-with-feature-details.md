---
number: 236
title: "fix: pricing page must sync with feature-details master table"
labels: [bug, website, priority-high]
milestone: ux-and-onboarding
---

## Description

The pricing page (`/pricing`) uses hardcoded feature lists in locale JSON files that are out of sync with the master feature table (`/feature-details`). Feature names, limits, and tier assignments don't match.

## Current Problems

1. **Feature names mismatch** — "AI Chats" vs "Dr. Alex Chat", "Lab import" vs "Smart Import: Lab Results"
2. **Old limits** — Glimpse shows 8 markers (should be 20), 30 days history (should be 90)
3. **Missing features** — PWA, GDPR Export, Security features not shown
4. **Removed features still shown** — "Check Influence Factors", "Priority Support"
5. **"Dr. Alex" reference** — should be consistent with feature-details naming
6. **Too many features per tier card** — overwhelming, needs curation

## Proposed Solution

### Option A: Curate a subset for pricing cards (quick)
Keep pricing page static but update locale JSON to show only ~8 key features per tier:
- **Glimpse:** Biomarkers (20), History (90 days), Dr. Alex Chat (10/mo), Smart Import (✓), PWA (✓)
- **Focus:** + everything in Glimpse, Templates (5), Influence Factors (10), CSV/JSON Export
- **Insight:** + everything in Focus, Dr. Alex (50/mo), PDF Reports, Measurement Table Import
- **Clarity:** + everything in Insight, Unlimited AI, Vanity Links, Team Sharing
- **Horizon:** + everything in Clarity, Org Structure, White-Label, API, Dedicated Support, LOINC

### Option B: Pricing reads from API (robust, more effort)
Replace hardcoded feature lists with API-driven data from `/api/tiers/features`, filtering to show only the most important features per card.

### Recommendation
**Option A first** (1-2 hours) — update locale JSON for EN + DE with curated subset matching the master table. Add "View full feature comparison" link to feature-details page.

**Option B later** — when we have time to refactor the pricing component.

## Files
- `website/src/locales/en.json` — pricing feature labels + per-tier feature lists
- `website/src/locales/de.json` — same in German
- `website/src/app/pricing/page.tsx` — pricing component (tier cards + feature lists)
