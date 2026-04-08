---
github_number: 384
title: "feat: break glass emergency access for platform and org admins"
milestone: platform-admin-gui
labels: [feat, P1, security]
---

## Problem

If the primary admin account is locked, MFA device lost, or credentials compromised, there's no emergency access path to the platform or organization admin panels.

## Requirements

### Platform Level (BrickOS Admin)
- Break glass procedure documented and tested
- Secondary admin account with MFA (different device/method)
- Emergency access token generated offline (signed JWT with short expiry)
- Audit log: every break glass access logged with reason
- Notification: ntfy + telegram alert on break glass use

### Organization Level (Org Admin)
- Org owner can designate a break glass contact
- BrickOS platform admin can break glass into any org (with audit trail)
- Break glass access is read-only by default, requires explicit escalation for write
- Auto-expires after 1 hour

### Implementation
- `POST /admin/break-glass` endpoint (requires platform admin or emergency token)
- `break_glass_log` table: who, when, why, org_id, actions_taken
- CLI tool for generating emergency tokens from the VPS
- Rate limited: max 1 break glass per hour per org

## Security Controls
- Break glass tokens stored separately from normal JWT secrets
- All break glass sessions force MFA re-verification within 15 minutes
- Protected accounts (admin@schindlwick.com) cannot be deleted or demoted
