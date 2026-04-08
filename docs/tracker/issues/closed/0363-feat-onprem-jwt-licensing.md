---
github_number: 363
title: "feat: on-prem JWT licensing for self-hosted orgs"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

Generate and validate JWT-based license keys for self-hosted (T5/Enterprise) deployments.

## Requirements

### License Key Generation (BrickOS Admin)

- JWT signed by BrickOS platform key (RS256)
- Claims: `{ org_id, org_name, features: ["shi", "sovereign-link"], max_admins, max_editors, max_consumers, tier: "enterprise", expires_at }`
- Regeneratable from org management page
- Revocable (add to revocation list)

### License Validation (Self-Hosted Instance)

- Offline validation (no phone-home) -- verify JWT signature with public key
- Check expiry, feature gates, seat limits
- Graceful degradation on expiry: read-only mode for 30 days, then lock

### Admin UI

- Generate key on org creation
- View key, copy, download
- Regenerate (invalidates old key)
- Expiry management

## Testing

- JWT generation + validation roundtrip test
- Expired license behavior test
- Feature gate enforcement test
- Seat limit enforcement test

## Blocked By

- #0350 (org management -- license is part of org creation)
