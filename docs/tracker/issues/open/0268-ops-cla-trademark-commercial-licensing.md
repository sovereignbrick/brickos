---
number: 268
github_number: 434
title: "ops: CLA setup, trademark registration, commercial licensing page"
labels: [ops, legal, business]
milestone: release-workflow
---

## Description

Design 016 recommends AGPL-3.0 + CLA + Trademark Protection. The AGPL license and headers are implemented. Three items remain:

### 1. CLA (Contributor License Agreement)
- Choose: CLA Assistant (GitHub app, free) vs DCO (lighter, sign-off only)
- Implement on GitHub repo so external contributors grant relicensing rights
- Required for dual-licensing to work

### 2. Trademark Registration
- Register "BrickOS" and "Sovereign Health" as trademarks
- Decide jurisdiction: Estonia (Sovereign Brick OU) or EU-wide (EUIPO)
- Trademarks are NOT covered by AGPL -- separate protection needed

### 3. Commercial Licensing Page
- Add page to brickos.io explaining dual-licensing model
- Decide: public pricing vs "contact us" only
- Include: what commercial license covers, AGPL obligations, how to purchase

## Decisions Needed

- [ ] CLA tool choice (CLA Assistant vs DCO)
- [ ] Trademark jurisdiction (Estonia vs EUIPO)
- [ ] Commercial page format (public pricing vs contact form)

## Requirements

- [ ] CLA integrated into GitHub PR workflow
- [ ] Trademark applications filed
- [ ] Commercial licensing page live on brickos.io
- [ ] CONTRIBUTING.md updated with dual-licensing explanation
