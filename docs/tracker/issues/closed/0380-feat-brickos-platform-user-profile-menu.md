---
github_number: 380
title: "feat: BrickOS platform user profile button (login, logout, MFA, settings)"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Problem

The BrickOS platform at app.brickos.io/platform has no user profile button in the top-right corner. Users need:

- Login/logout button
- Current user display (name/email + avatar)
- MFA settings access
- Theme toggle (if applicable)
- User settings link

## Requirements

Top-right corner of the platform layout header:

### When logged in:
- User avatar/initials circle
- Dropdown menu:
  - Display name + email
  - "Settings" -> user profile settings
  - "Security" -> MFA configuration
  - "Logout" -> clear session, redirect to login

### When not logged in:
- "Login" button -> /login?return=/platform

## Reference

The SHI app has a similar user menu in the navbar (avatar + dropdown with settings/logout). Reuse the same pattern but with BrickOS branding.
