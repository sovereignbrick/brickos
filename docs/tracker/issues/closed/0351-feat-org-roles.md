---
github_number: 351
title: "feat: organization roles (owner, tech admin, commercial admin, editor, consumer)"
milestone: platform-admin-gui
labels: [feat, P1]
---

## Overview

Implement 5 distinct org roles with role-based access control:

## Roles

- **Owner**: Full org control, one per org, can transfer ownership
- **Tech Admin**: Service monitor, domains, branding, members, audit. NO commercial data.
- **Commercial Admin**: Billing, licenses, newsletter, affiliates, revenue. NO infra/audit.
- **Editor**: Works in app (not admin). Views/imports consumer data with consent.
- **Consumer**: End user. Own data only. Can grant/revoke sharing.

## Technical

- `org_members.role` column: owner, tech_admin, commercial_admin, editor, consumer
- JWT claims: `{ role, org_id, org_role }`
- Backend middleware: `TechAdmin`, `CommercialAdmin`, `OrgOwner` extractors
- Frontend: `useOrgRole()` hook for visibility filtering

## Testing

- Role-based API access tests (tech admin cannot GET /admin/billing)
- Role assignment + transfer tests
- At least one owner per org constraint

## Blocked By

- None (schema change, unblocks many others)
