---
github_number: 360
title: "feat: platform license tier system (two-layer, app-agnostic)"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

Implement the two-layer tier system: 5 platform tiers (T1-T5) with app-specific display names.

## Requirements

### Platform Tiers

T1 Free, T2 Starter (EUR 9.99), T3 Pro (EUR 24.99), T4 Premium (EUR 49.99), T5 Enterprise (Custom)

### App Name Mapping

- SHI: Glimpse/Focus/Insight/Clarity/Horizon -> T1-T5
- Link: Basic/Growth/Scale/Agency/Self-hosted -> T1-T5
- Voice: Free/Creator/Pro/Studio/Self-hosted -> T1-T5

### Database

- `tier_features` table: tier_slug + app_key + feature_key + limit_value
- `app_tier_names` table: app_key + tier_slug + display_name + tagline + price

### Migration

- Migrate existing SHI tier data to new structure
- Map current users: Glimpse->T1, Focus->T2, Insight->T3, Clarity->T4, Horizon->T5

## Testing

- Feature limit enforcement tests per tier per app
- Tier upgrade/downgrade tests
- Migration rollback safety

## Blocked By

- None (foundational for billing)
