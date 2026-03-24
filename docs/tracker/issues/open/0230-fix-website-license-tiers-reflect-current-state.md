---
number: 230
title: "fix: website license tiers must reflect current state"
labels: [bug, website]
milestone: ux-and-onboarding
---

## Description

The website pricing/tiers page at `sovereignhealth.io/pricing` may be out of sync with the actual tier definitions in the database and backend. Previous sprints added features (PWA, Sovereign Link vanity codes, Dr. Alex quotas, Smart Import, PDF reports) that are tier-gated — the website must accurately reflect what each tier includes.

## Audit Checklist

- [ ] Tier names match database (`glimpse`, `focus`, `insight`, `clarity`, `horizon`, `core`)
- [ ] Feature lists per tier match `license_tiers` + `tier_features` tables
- [ ] Pricing (monthly + annual) matches Stripe product configuration
- [ ] Smart Import availability per tier (Insight+) correctly shown
- [ ] PDF report limits per tier correctly shown
- [ ] Dr. Alex AI chat quotas per tier correctly shown
- [ ] Vanity short links (Clarity/Horizon) mentioned
- [ ] PWA features (available to all tiers) mentioned
- [ ] Measurement caps per tier correctly shown
- [ ] BTC payment option mentioned where applicable
- [ ] Website deploys separately from frontend — changes need explicit `deploy.sh` website step

## Known Previous Issues

- Sprint 005: website tier limits were stale after backend changes
- Feedback memory: "Website is a separate deploy from frontend; tier/pricing changes need explicit website deploy"

## Files to Check

- `apps/health/sovereign-health/website/src/data/content-en.json` — EN tier descriptions
- `apps/health/sovereign-health/website/src/data/content-de.json` — DE tier descriptions
- `apps/health/sovereign-health/website/src/app/pricing/` — pricing page component
- `apps/health/sovereign-health/api/migrations/*tier*` — source of truth for tier limits
- Database: `SELECT * FROM license_tiers` — actual limits

## Deliverables

- [ ] Audit tier data against DB
- [ ] Fix any mismatches in website content files
- [ ] Deploy website explicitly after changes
- [ ] Verify both EN and DE versions match
