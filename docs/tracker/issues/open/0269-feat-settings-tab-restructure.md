---
number: 269
title: "feat: settings tab restructure -- split Profile into Health Profile + Account"
labels: [feat, frontend, ux, design-018]
milestone: ux-and-onboarding
---

## Description

Implement Design 018 (settings tab restructure). The current Profile tab is overloaded -- it mixes account settings (email, language, country) with health data (measurements, lifestyle defaults).

## Design (from Design 018)

### Current: 7 tabs
Profile | Devices/Labs | Reference Ranges | Influence Factors | License | Security | Data & Privacy

### Target: 7 tabs (restructured)
Health Profile | Devices/Labs | Reference Ranges | Influence Factors | Account | Security | Data & Privacy

### Changes
1. **Profile -> Health Profile**: keep gender, age, height, waist, weight, lifestyle defaults. Add health reports (PDF/CSV/JSON) from Data & Privacy.
2. **New Account tab**: email, display name, language, country, date/time format, license badge
3. **Data & Privacy**: remove health reports (moved to Health Profile), keep GDPR controls only

## Design Doc
`apps/health/sovereign-health/docs/project-files/design/018-settings-tab-restructure.md`

## Status
Design complete, implementation pending.
