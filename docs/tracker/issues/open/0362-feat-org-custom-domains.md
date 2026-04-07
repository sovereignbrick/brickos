---
github_number: 362
title: "feat: org custom domain mapping with SSL"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Overview

Org admin can map a custom domain (e.g., health.clinic-xy.de) to their org instance with automatic SSL.

## Requirements

- Domain input + DNS verification (CNAME check)
- Let's Encrypt SSL automation (certbot or acme.sh)
- Nginx server block template per custom domain
- SSL renewal monitoring (alert if < 14 days)
- Domain -> org_id resolution via `domain_mappings` table (already exists)

## Blocked By

- #0346 (admin layout)
- #0351 (org roles -- tech admin access)
- #0361 (branding -- domain + branding go together)
