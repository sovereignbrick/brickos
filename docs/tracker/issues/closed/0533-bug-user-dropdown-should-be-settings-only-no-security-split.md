---
number: 533
title: "bug: [P2] user dropdown should be 'Settings' only -- 'Security & MFA' is a tab inside Settings, not a sibling"
milestone: "BrickOS Platform Admin GUI"
labels: [bug, p2, platform-admin-gui, sprint-041, ux, settings]
created: 2026-04-11
priority: P2
discovered_by: 526
related: [528]
---

## Summary

The user-avatar dropdown (top-right of every page) currently shows three
entries:

```
Demo Admin
demo@sovereignhealth.io  Admin
─────────────
Settings
Security & MFA
Logout
```

`Security & MFA` should not be a sibling of `Settings`. Per the brickos
master template (#528), Settings is the umbrella page with multiple tabs:
**Account / Security / Privacy / Billing / Notifications**. Security
(including MFA) is one of those tabs. Surfacing it twice as a separate
dropdown entry is:

1. **Inconsistent with the template** -- every other tab (Account, Privacy,
   Billing, Notifications) lives only inside Settings; Security is the
   only one that got promoted out, with no clear reason
2. **Confusing for users** -- "Settings" and "Security & MFA" sound like
   distinct pages but they overlap; clicking either lands you in the same
   Settings page with a tab pre-selected
3. **Doesn't scale** -- when sovereign-vote ships and contributes a "Voting
   keys" tab, do we promote that to the dropdown too? When the SHI
   contributions from #528 land (Devices, Lifestyle, Thresholds, AI
   assistant) does each one get a dropdown entry? Obviously not. Settings
   is the right roof.

## Reproduction (staging, 2026-04-11, screenshot at 16:5x CEST)

1. Log in at `https://demo.sovereignhealth.io`
2. Click the avatar in the top-right corner
3. Result: dropdown shows **Settings** *and* **Security & MFA** as two separate entries

## Target

Dropdown collapsed to one Settings entry:

```
Demo Admin
demo@sovereignhealth.io  Admin
─────────────
Settings
Logout
```

Clicking **Settings** opens the brickos-master Settings page on the
**Account** tab by default. Users who specifically want MFA can click the
**Security** tab. Optional polish: if a user with no MFA enrolled lands
on the Account tab, show a small banner "Set up two-factor authentication
in the Security tab" the first time -- but that's a one-time nudge, not
a permanent navigation entry.

## Why P2

Not a functional bug -- both entries probably navigate somewhere reasonable
right now -- but a template-consistency bug. Lower priority than #528
itself (which defines the master template), and trivial to fix as part of
the same PR.

## Acceptance criteria

- [ ] User-avatar dropdown component shows only `Settings` + `Logout`
      (plus the user identity at top)
- [ ] `Settings` entry navigates to `/settings` (the brickos-master
      Settings page) -- not `/settings#security` or any tab pre-selection
- [ ] If the user previously had `Security & MFA` bookmarked, the URL
      `/security` (or whatever it currently resolves to) 301-redirects
      to `/settings?tab=security`
- [ ] Same fix applied to the platform admin top-bar dropdown (the one
      visible in `/platform/*` pages) AND the SHI app top-bar dropdown
      (the one visible in `/sovereignhealth/*` pages)

## Related

- #528 (settings page brickos master + per-app tabs -- the parent template
  this enforces)
- #525 (audit /platform/* for missing/extra CRUD buttons -- this surfaced
  during that walkthrough)
- design 014 BrickOS Platform GUI
- memory `reference_ui_blueprint.md`

## Out of scope

- Renaming the Security tab to "Security & MFA" inside Settings. The
  current "Security" name is fine; users discover MFA in there.
- Reordering the tabs (Account / Security / Privacy / ... is the right
  order per #528).
