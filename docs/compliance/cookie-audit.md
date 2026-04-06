# Cookie & Client Storage Audit

**Product:** Sovereign Health (app.sovereignhealth.io)
**Last updated:** 2026-04-05
**Audit scope:** All cookies, localStorage, and sessionStorage usage in the frontend

---

## Cookies

### 1. `auth_token`

| Field | Value |
|---|---|
| **Purpose** | JWT authentication token for API requests |
| **Set by** | `src/lib/api.ts` via `js-cookie` |
| **Duration** | Persistent -- expires after `sessionTimeoutHours` (default: 2 hours) |
| **Attributes** | `SameSite=Strict; Path=/` |
| **Classification** | Strictly Necessary |
| **GDPR basis** | Contract performance -- Art. 6(1)(b); required for authenticated access |

### 2. `locale`

| Field | Value |
|---|---|
| **Purpose** | Persist user language preference (en/de) across navigation and server-side rendering |
| **Set by** | `src/i18n/locale-cookie.ts`, `src/lib/content-context.tsx` |
| **Duration** | Persistent -- 365 days (`max-age=31536000`) |
| **Attributes** | `SameSite=Lax; Path=/` |
| **Classification** | Strictly Necessary |
| **GDPR basis** | Legitimate interest -- Art. 6(1)(f); essential for bilingual UI functionality |

### 3. `sh_ref`

| Field | Value |
|---|---|
| **Purpose** | First-touch affiliate referral code for attribution |
| **Set by** | `src/components/referral-tracker.tsx` via `js-cookie` |
| **Duration** | Persistent -- 30 days |
| **Attributes** | `SameSite=Lax; Path=/` |
| **Classification** | Functional |
| **GDPR basis** | Legitimate interest -- Art. 6(1)(f); affiliate program attribution |
| **Note** | Only set when user arrives via `?ref=` URL parameter; first-touch only (not overwritten) |

---

## localStorage

### 4. `sh_theme`

| Field | Value |
|---|---|
| **Purpose** | Persist user dark/light theme preference |
| **Set by** | `src/lib/theme-context.tsx` |
| **Duration** | Persistent (no expiry) |
| **Classification** | Strictly Necessary |
| **GDPR basis** | Legitimate interest -- essential UI preference |

### 5. `sh_content_cache`

| Field | Value |
|---|---|
| **Purpose** | Cache i18n content strings locally to reduce API calls |
| **Set by** | `src/lib/content-context.tsx` |
| **Duration** | Persistent (cleared on locale change or content update) |
| **Classification** | Strictly Necessary |
| **GDPR basis** | Legitimate interest -- performance optimization for essential functionality |

### 6. `sh_onboarding_dismissed_{userId}`

| Field | Value |
|---|---|
| **Purpose** | Track whether user dismissed the onboarding checklist |
| **Set by** | `src/components/onboarding-checklist.tsx` |
| **Duration** | Persistent (no expiry) |
| **Classification** | Functional |
| **GDPR basis** | Legitimate interest -- UX preference |

### 7. `sh_onboarding_manual_{userId}`

| Field | Value |
|---|---|
| **Purpose** | Track manually completed onboarding steps (page visits) |
| **Set by** | `src/components/onboarding-tracker.tsx`, `src/components/onboarding-checklist.tsx` |
| **Duration** | Persistent (no expiry) |
| **Classification** | Functional |
| **GDPR basis** | Legitimate interest -- UX guidance |

### 8. `sh_recent_searches`

| Field | Value |
|---|---|
| **Purpose** | Store recent search queries for quick access (max 5 entries) |
| **Set by** | `src/components/search/search-overlay.tsx` |
| **Duration** | Persistent (no expiry; user can clear) |
| **Classification** | Functional |
| **GDPR basis** | Legitimate interest -- UX convenience |

### 9. `sh_has_logged_in`

| Field | Value |
|---|---|
| **Purpose** | Track whether user has logged in before (to show/hide signup prompt) |
| **Set by** | `src/app/login/page.tsx` |
| **Duration** | Persistent (no expiry) |
| **Classification** | Functional |
| **GDPR basis** | Legitimate interest -- UX optimization |

### 10. `sh_preset_dismissed_for`

| Field | Value |
|---|---|
| **Purpose** | Remember which threshold preset the user dismissed the suggestion for |
| **Set by** | `src/app/settings/components/thresholds-tab.tsx` |
| **Duration** | Persistent (no expiry) |
| **Classification** | Functional |
| **GDPR basis** | Legitimate interest -- UX preference |

---

## sessionStorage

### 11. `sh_infobar_dismissed`

| Field | Value |
|---|---|
| **Purpose** | Track info bar dismissal for current browser session |
| **Set by** | `src/components/layout/info-bar.tsx` |
| **Duration** | Session (cleared on tab close) |
| **Classification** | Functional |
| **GDPR basis** | Legitimate interest -- UX preference |

### 12. `sh_pending_checkout`

| Field | Value |
|---|---|
| **Purpose** | Preserve pending checkout state across signup/login redirect flow |
| **Set by** | `src/app/signup/page.tsx`, `src/app/checkout/page.tsx` |
| **Duration** | Session (cleared after checkout completes or tab closes) |
| **Classification** | Strictly Necessary |
| **GDPR basis** | Contract performance -- required for payment flow continuity |

---

## Classification Summary

| Classification | Count | Items |
|---|---|---|
| **Strictly Necessary** | 5 | `auth_token`, `locale`, `sh_theme`, `sh_content_cache`, `sh_pending_checkout` |
| **Functional** | 7 | `sh_ref`, `sh_onboarding_dismissed_*`, `sh_onboarding_manual_*`, `sh_recent_searches`, `sh_has_logged_in`, `sh_preset_dismissed_for`, `sh_infobar_dismissed` |
| **Analytics** | 0 | None |
| **Marketing** | 0 | None |

## Cookie Consent Banner Assessment

**A cookie consent banner is NOT required** based on the current audit:

1. **No analytics cookies** -- The platform uses no third-party analytics (no Google Analytics, Hotjar, etc.)
2. **No marketing/advertising cookies** -- No tracking pixels, ad networks, or cross-site tracking
3. **No third-party cookies** -- All cookies are first-party
4. **Strictly necessary cookies** are exempt from consent under ePrivacy Directive Art. 5(3)
5. **Functional cookies** (`sh_ref`, onboarding, search history) store only UX preferences and do not profile users

The `sh_ref` cookie is the closest to requiring consent, but it:
- Only stores a referral code string (no user profiling)
- Is first-touch only (not updated on subsequent visits)
- Falls under legitimate interest for affiliate program operation

**Recommendation:** No cookie banner needed. If the `sh_ref` cookie's classification is contested, it could be disclosed in the privacy policy without requiring active consent. If a third-party analytics or marketing tool is ever added, a consent banner will be required at that point.

## API-Side Cookies

The API (`sovereign-health-api`) does **not** set any cookies via `Set-Cookie` headers. Authentication is handled entirely via the frontend setting `auth_token` as a cookie from JavaScript.

---

## Review Schedule

This audit must be updated:
- When any new cookie or client storage item is added
- When any third-party script is integrated
- At minimum every 12 months
- Next review due: 2027-04-05
