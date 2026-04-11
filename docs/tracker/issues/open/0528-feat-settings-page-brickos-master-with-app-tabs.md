---
number: 528
title: "feat: [P1] /settings page should be brickos master form + per-app tab extensions"
milestone: "BrickOS Platform Admin GUI"
labels: [feature, p1, platform-admin-gui, architecture, settings]
created: 2026-04-11
priority: P1
discovered_by: 526
related: [526]
---

## Summary

The `/settings` page on `https://demo.sovereignhealth.io/settings` currently
shows three tabs -- **Account**, **Security**, **Privacy** -- which is
correct as the **brickos master form** but is missing the SHI-specific
tabs that should be added on top.

The architectural pattern should be:

> **brickos provides the master Account / Security / Privacy form (the
> elevation / template). Each app adds its own additional tabs and
> settings on top.**

For SHI specifically that means tabs like `Devices`, `Lifestyle`,
`Influence Factors`, `Thresholds`, `Profile (health)`, `AI assistant`,
`Notifications`, `Push subscriptions` -- all of which existed in earlier
sprints but were removed in the previous round when we cleaned the SHI
settings page (correctly) but never re-added them as app-tab extensions.

## Current state (screenshot 2026-04-11 16:32)

| Tab | Content |
|---|---|
| Account | email, display name, language, country, date format, time format, save, push notifications, billing address, current plan, payment method |
| Security | (untested in this round) |
| Privacy | (untested in this round) |

The "Account" tab is currently overloaded -- it mixes brickos master fields
(email, display name, language, country, date/time format) with SHI-specific
fields (push notifications) AND billing/plan fields (which are arguably
brickos-master too but not "Account"). The architecture is not clean.

## Target architecture

### brickos master tabs (always present, app-agnostic)

| Tab | Fields |
|---|---|
| Account | email, display name, language, country, date format, time format, default timezone, avatar |
| Security | password, MFA, sessions, active devices, audit log of own activity |
| Privacy | data export, data deletion request, consent toggles, third-party sharing toggles |
| Billing | billing address, current plan, payment method, invoices, tax id (currently smushed into Account) |
| Notifications | email, push, ntfy, telegram channel selection (currently smushed into Account) |

### App-tab extensions registered by each BrickOS app

When a user is a member of an org that has the SHI app entitlement, the
SHI app contributes additional tabs:

| Tab (SHI) | Fields |
|---|---|
| Health profile | height, weight, waist, sex, date of birth, default org for health data |
| Devices | connected wearables, lab integrations, import sources |
| Lifestyle | sleep target, activity target, fasting window, alcohol/caffeine logging |
| Influence factors | which factors to track, default visibility |
| Thresholds | default zone thresholds, custom override per marker |
| AI assistant | Dr. Alex preferences, conversation retention, preferred provider override (defaults to brickos system AI) |

When a user is a member of an org with **sovereign-crm** the CRM contributes its tabs.
When **sovereign-vote**, its tabs. Etc. The settings page composes the union
of: `[brickos master tabs] + [tabs from each entitled app]`.

This is the same pattern as the platform admin GUI's `/platform/orgs/[id]`
page where each tab (Overview, Members, License, Branding, Invoices, Audit)
is per-domain. Same idea applied to user settings.

## Implementation sketch

1. **Frontend extension point**: settings page reads a registry of tab
   contributions. Each app exports its tab descriptors from
   `packages/<app>/settings-tabs.ts`. The settings page imports them and
   filters by the user's entitlements.
2. **Backend extension point**: each app contributes a settings handler
   under `/settings/<app>/<key>`, returning JSON for that tab's fields.
   The brickos master fields stay under `/settings/account`,
   `/settings/security`, `/settings/privacy`, `/settings/billing`,
   `/settings/notifications`.
3. **DB**: each app keeps its settings table per-app
   (`brickos.user_profile`, `public.user_preferences`, `public.devices`,
   ...). The brickos master fields live in `brickos.users` +
   `brickos.user_profile`.
4. **Migration of currently-overloaded Account tab**: split out Billing and
   Notifications into their own master tabs.
5. **Re-adding the SHI tabs**: re-register the previously-removed SHI
   settings as SHI-app tab contributions, NOT as part of the brickos
   master form.

## Acceptance criteria

- [ ] design 016 BrickOS settings extension pattern (or extend design 014)
- [ ] brickos master tabs split cleanly: Account / Security / Privacy / Billing / Notifications
- [ ] SHI app contributes its tabs back as extensions (Health profile, Devices, Lifestyle, Influence factors, Thresholds, AI assistant)
- [ ] Settings tabs render in the order: brickos master first, then app extensions in entitlement order
- [ ] An org member with only the SHI entitlement sees brickos master + SHI tabs
- [ ] An org member with no app entitlements sees only the brickos master tabs (the platform admin user case)
- [ ] e2e Playwright spec covers both cases
- [ ] Memory `reference_ui_blueprint.md` updated with the settings extension pattern

## Out of scope

- Actually implementing the future-app tabs (CRM, Vote, etc.). This issue
  defines the pattern and re-adds the SHI tabs only.
- Renaming or merging settings DB tables. The current per-app tables stay.

## Why P1

The SHI app users currently can't manage their own health profile,
devices, lifestyle preferences, or thresholds via the settings UI on
staging. This blocks the realistic Life Algorithm walkthrough at the
"customer logs in and personalizes" step. Not P0 because the data exists
and can still be set via measurement entry forms; the Settings UI just
doesn't surface it.

## Related

- #526 (brickos.io platform namespace consolidation -- the parent design)
- design 014 BrickOS Platform GUI (the umbrella for the platform-vs-app split)
- memory `reference_ui_blueprint.md` (UI pattern docs)
