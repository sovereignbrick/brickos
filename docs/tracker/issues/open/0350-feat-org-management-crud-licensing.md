---
github_number: 350
title: "feat: organization management (CRUD + licensing + parameters)"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

BrickOS admin can create, edit, and manage organizations with configurable parameters.

## Requirements

### Create Organization

- Name, type (personal/clinic/enterprise/demo), admin email
- Enable apps (SHI, Sovereign Link, Sovereign Voice)
- Deployment: platform-hosted or on-prem (customer server)
- For on-prem: generate JWT license key with features + expiry

### Org Parameters (editable)

- Seat limits: admins, editors, consumers (unlimited option)
- App entitlements per app (max links, max measurements, etc.)
- Storage/AI limits per month
- License type, expiry, key regeneration

### Org List

- Search, filter by type/status
- Show: name, type, members, license, enabled apps, status

## Error Handling

- Validate email uniqueness for new org admin
- Prevent deleting org with active members (soft-delete with confirmation)

## Testing

- CRUD integration tests
- JWT license key generation + validation tests
- Seat limit enforcement tests

## Blocked By

- #0346 (admin layout)
- #0351 (org roles -- needed for admin assignment)
