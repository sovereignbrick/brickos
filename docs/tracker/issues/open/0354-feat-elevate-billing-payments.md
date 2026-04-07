---
github_number: 354
title: "feat: elevate billing + payments to platform with org scope"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Overview

Move billing/payment gateway management to platform level. Org commercial admins see own org billing. BrickOS admin sees all.

## Includes

- Payment gateway management (Stripe, Strike, Boltz, BTCPay)
- Org billing: per-org invoicing with included seats
- BTC 5% discount on all paid tiers
- Gateway status, test connectivity, activate/disable

## Blocked By

- #0346 (admin layout)
- #0360 (tier system -- billing depends on tier structure)
