---
number: 456
title: "chore: website marker consistency audit -- 117 markers vs DB vs app"
milestone: "Sovereign Health App Elevation"
labels: [content, website]
created: 2026-04-10
priority: P1
sprint: 039
---

Cross-check all marker-related content across three sources:
1. Database: marker_translations table (source of truth)
2. App frontend: marker display, abbreviations, zone colors
3. Website: content-en.json, content-de.json, pricing page claims

## Checks
- [ ] Count markers in DB vs website claim ("117 markers")
- [ ] All markers have EN + DE translations
- [ ] All markers have abbreviations
- [ ] All markers assigned to zones
- [ ] All calculated markers have formulas
- [ ] Reference ranges defined for all markers
- [ ] Pricing page tier limits match tier_features table
- [ ] Feature descriptions match implementation
