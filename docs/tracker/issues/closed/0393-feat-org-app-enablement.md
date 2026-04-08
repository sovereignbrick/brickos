# 0393 - Per-org app enablement

**Type:** feat
**Priority:** medium
**Sprint:** 034
**Related:** ADR 018 (Phase 4 remaining)

## Description

Add an `org_apps` table that maps which apps are enabled for each organization.
Org admins should only see enabled apps in the App filter dropdown. Platform admins
see all apps.

## Acceptance Criteria

- [ ] Migration creates `org_apps` table (org_id, app_key, enabled, created_at)
- [ ] Seed default: all orgs get 'shi' enabled
- [ ] Admin API: GET/PUT /admin/organizations/{id}/apps
- [ ] Platform context reads enabled apps for org admin
- [ ] App filter dropdown shows only enabled apps for org admins
- [ ] Platform admin still sees all apps
