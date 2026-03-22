# Design: Settings Tab Restructure

**Status:** Draft
**Date:** 2026-03-22

## Problem

The Settings page has grown organically and now has structural issues:

1. **Profile tab is overloaded** — mixes account/technical settings (email, date format, language) with health-critical data (body measurements, lifestyle defaults). The health data gets pushed below the fold.

2. **"Daten & Datenschutz" mixes concerns** — combines GDPR privacy controls (consent toggles, data export, account deletion) with health report generation (PDF/CSV/JSON export for sharing with doctors). These serve different purposes for different user intents.

3. **Missing GDPR consent controls** — newsletter and partner offers toggles exist in the backend but are not exposed in the UI (see ADR-016, issues #176, #177).

4. **Onboarding flow links to "Profile"** — the onboarding guide directs users to complete their health profile (height, weight, age). If we rename or restructure tabs, onboarding deep links must be updated.

5. **Health Reports belong to the health workflow** — generating a PDF to share with your doctor is a health action, not a privacy action. Placing it under "Data & Privacy" makes it hard to find and conceptually wrong.

## Current Tab Structure

| Tab | Content | Issues |
|-----|---------|--------|
| Profil | Email, name, gender, country, language, date/time format, body measurements, lifestyle defaults | Overloaded — 4 distinct concerns |
| Geraete / Labore | Devices and labs | OK |
| Grenzwerte | Custom reference ranges | OK |
| Einflussfaktoren | Medications and supplements | OK |
| Lizenz | Current tier, pricing | OK |
| Sicherheit | MFA, password, sessions | OK |
| Daten & Datenschutz | Anonymous data toggle, health reports (PDF/CSV/JSON), full GDPR export, delete account | Mixed concerns — health reports ≠ privacy |

## Proposed Tab Structure

| Tab | URL slug | Content | Rationale |
|-----|----------|---------|-----------|
| **Health Profile** | `profile` | Gender, age, height, waist, weight, lifestyle defaults, health reports (PDF/CSV/JSON) | Health identity + health outputs together |
| **Devices / Labs** | `devices` | (unchanged) | OK |
| **Reference Ranges** | `ranges` | (unchanged) | OK |
| **Influence Factors** | `factors` | (unchanged) | OK |
| **Account** | `account` | Email, display name, language, country, date/time format, license badge | Technical/identity settings |
| **Security** | `security` | (unchanged — MFA, password, sessions) | OK |
| **Data & Privacy** | `privacy` | Consent toggles (anonymous data, newsletter, partner offers), data access log, full GDPR export, delete account | Pure GDPR/privacy — auditor-friendly |

### Key Changes

**1. Profile → Health Profile**

Move out:
- Email, display name → Account
- Language, country, date/time format → Account
- License badge → Account

Keep:
- Gender, age, height, waist, weight (body measurements)
- Lifestyle defaults (diet, fasting, exercise, sleep, stress)

Add:
- Health Reports section (moved from Data & Privacy)
  - Period selector + PDF/CSV/JSON export buttons
  - Recent reports history
  - This is where you generate reports to share with your doctor

**2. New Account tab**

Contains:
- Email (read-only)
- Display name
- Language selector
- Country selector
- Date format / time format
- "Reset to country defaults" button
- License badge (read-only, link to pricing)

**3. Data & Privacy → pure GDPR**

Remove:
- Health Reports section (moved to Health Profile)

Keep:
- Anonymous data sharing toggle
- Full GDPR export ("Alle Daten exportieren")
- Delete account (with 30-day grace period)

Add (from issues #176, #177):
- Newsletter consent toggle
- Partner offers consent toggle
- Data access log viewer ("Who accessed my data")

## Tab Layout Rationale

The tab order follows user priority:

```
Health Profile → Devices → Ranges → Factors → Account → Security → Privacy
|_____________ health workflow ______________|  |____ account mgmt ____|
```

- **Left side (tabs 1-4):** Health-related — what users interact with most
- **Right side (tabs 5-7):** Account management — set once, rarely revisited
- Health Reports live in Health Profile because the user intent is "I want to see/share my health data" — that's a health action, not a privacy action
- GDPR Export stays in Privacy because the user intent there is "I want all my data for legal/portability reasons" — different from "show me a PDF for my doctor"

## Cross-References & Dependencies

### Onboarding Flow
The onboarding guide links users to complete their health profile. Currently it points to the Profile tab. After restructure:
- Deep link `/settings?tab=profile` still works (slug unchanged)
- Onboarding content may need update if it references "email" or "language" being on the profile page
- Verify: `src/app/settings/page.tsx` URL slug mapping
- Verify: onboarding guide content in `docs/` or `content_strings`

### Import History
The proposed Import History page (pending issue) should link to Health Reports in Health Profile, since both deal with "my health data in/out."

### Dr. Alex Context
Dr. Alex reads the health profile (height, weight, age, lifestyle) for personalized analysis. The Health Profile tab is where users ensure this data is current. Consider adding a subtle note: "Dr. Alex uses this data for personalized health insights."

### Admin Settings
The consent toggles (newsletter, partner offers) wire to existing `PUT /settings/consent` endpoint. No new backend work needed — just frontend UI.

### Mobile / PWA
Tab count (7) is at the limit for mobile horizontal scrolling. The current 7-tab layout works but adding more tabs would require a dropdown or vertical layout. The restructure keeps the same count.

## Migration Plan

1. Restructure the settings page component (reorder sections, move elements between tabs)
2. Update URL slug mapping (ensure `profile`, `account`, `privacy` all resolve)
3. Add newsletter + partner offers toggles to Privacy tab
4. Move health reports section from Privacy to Health Profile
5. Update onboarding guide links if needed
6. Update i18n keys for new tab names (EN + DE)
7. Verify all existing deep links still work

## Open Questions

- [ ] Should Account show a "change email" flow, or keep email read-only?
- [ ] Should Health Reports have its own dedicated page instead of living in a tab section?
- [ ] Should we add an "Import History" link in Health Profile near Health Reports?
- [ ] Does the License badge in Account need a "Manage subscription" link?

## References

- [ADR-016: GDPR & Privacy Architecture](../adr/016-gdpr-privacy-architecture.md)
- [Design-009: Onboarding & Learn Content](009-onboarding-and-learn-content.md)
- Issue #176: Privacy tab — access log UI
- Issue #177: Consent management UI
- Pending issue: Import History page
