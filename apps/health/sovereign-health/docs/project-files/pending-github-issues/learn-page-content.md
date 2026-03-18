# Pending GitHub Actions — Push when rate limit resets

---

## 1. Close #84 — Dark/light theme toggle

```bash
gh issue close 84 --repo sovereignbrick/brickos \
  --comment "Implemented and verified. Theme toggle in navbar user menu, ThemeProvider in root layout, localStorage persistence. Light theme fully applied across all pages: globals.css theme variables, navbar, doctor-chat (all 9 components — 61 hardcoded white refs converted), settings (90+ refs), measurements, trends, markers, zones, checkout, dashboard, onboarding checklist. Tier colors applied to website pricing page. Global CSS ensures select/option elements follow theme."
```

---

## 2. Close #19 — In-app onboarding flow

```bash
gh issue close 19 --repo sovereignbrick/brickos \
  --comment "Implemented: 6-step onboarding checklist on dashboard with numbered descriptions, global page-visit tracking via OnboardingTracker, auto/manual completion, progress bar, dismiss/auto-dismiss. i18n complete (EN + DE)."
```

---

## 3. Create new issue — Learn page content needed before deploy

```bash
gh issue create --repo sovereignbrick/brickos \
  --title "content: create Learn page tutorials and screenshot content" \
  --label "content,user-experience" \
  --milestone "User Experience & Onboarding" \
  --body "$(cat <<'GHEOF'
## Context

The Learn page (\`/learn\`) and screenshot infrastructure are implemented (#22), but the page currently has placeholder content. Before promoting to staging/production, we need real tutorial content and screenshots.

## What exists

- Learn page at \`website/src/app/learn/page.tsx\` — renders tutorial cards with screenshots and video support
- Screenshot lightbox component — click-to-enlarge, Escape to close, locale-aware (EN/DE fallback)
- Video embed component — supports YouTube, Vimeo, direct video URLs
- Bilingual screenshot infrastructure — \`website/public/screenshots/\` with \`*-EN.png\` / \`*-DE.png\` naming
- 3 placeholder screenshots already in place (add devices, Dr. Alex medication import, influence factors)

## What's needed

### Screenshots (EN + DE for each)
- [ ] Dashboard overview with health zones
- [ ] Adding a new measurement (step by step)
- [ ] Settings — Profile tab
- [ ] Settings — Devices tab (adding a device)
- [ ] Trends view with marker comparison
- [ ] Doctor Chat conversation example
- [ ] Marker detail page with reference ranges
- [ ] Onboarding checklist (Getting Started)

### Tutorial content (EN + DE)
- [ ] "Getting Started" — walkthrough of first-time setup
- [ ] "Understanding Your Markers" — how to read marker detail pages
- [ ] "Tracking Trends" — how to use the trends view
- [ ] "Ask Dr. Alex" — how to use the AI health assistant
- [ ] "Managing Devices" — how to add and manage lab devices
- [ ] "Privacy & Data" — how encryption and data sovereignty work

### Videos (optional, stretch goal)
- [ ] Short intro/demo video (1-2 min)
- [ ] Per-tutorial walkthrough videos

## Naming convention

Screenshots: \`website/public/screenshots/NN-kebab-case-EN.png\` / \`NN-kebab-case-DE.png\`

## Blocked

Do NOT deploy Learn page to staging/production until this content is created.

## References

- Implemented in #22
- Design doc: \`docs/project-files/design/009-onboarding-and-learn-content.md\`
GHEOF
)"
```

---

## 4. Create new issue — Remove consent_product_updates

```bash
gh issue create --repo sovereignbrick/brickos \
  --title "fix: remove product updates consent field from signup and database" \
  --label "cleanup,gdpr" \
  --body "$(cat <<'GHEOF'
## Done

Removed the \"Produktupdates und Funktionsankündigungen per E-Mail erhalten\" checkbox and its backing \`consent_product_updates\` column entirely.

### Frontend
- Removed checkbox from signup form (\`signup/page.tsx\`)
- Removed from form defaults and API submission payload
- Removed from Zod validator (\`validators.ts\`)

### Backend
- \`auth.rs\` — removed from INSERT into user_profile and Mailgun tags
- \`settings.rs\` — removed from GET/PUT consent endpoints
- \`reports.rs\` — removed from GDPR consent report
- \`admin_email.rs\` — removed from admin consent stats query
- \`segments.rs\` — changed default consent filter to \`newsletter\`
- \`brickos-db/models/user.rs\` — removed from \`SignupRequest\` struct

### Database
- Column dropped: \`ALTER TABLE user_profile DROP COLUMN consent_product_updates\`
- Migration: \`20260318000092_drop_consent_product_updates.sql\`

### Also changed
- Newsletter label simplified: EN \"Subscribe to newsletter\", DE \"Newsletter erhalten\"
GHEOF
)"
```

---

## 5. Create new issue — Dark theme enforced globally on select/option elements

```bash
gh issue create --repo sovereignbrick/brickos \
  --title "fix: enforce dark theme on all select/option dropdown elements" \
  --label "ui,accessibility" \
  --body "$(cat <<'GHEOF'
## Problem

Browser-default \`<select>\` and \`<option>\` elements rendered with white backgrounds against the dark UI (e.g., country dropdown on signup page).

## Fix

- Added global CSS rule in \`globals.css\` forcing dark background on all \`select\` and \`select option\` elements
- Added explicit dark classes on the signup country select (\`bg-zinc-900\`, \`[&>option]:bg-zinc-900\`)

## Convention

All \`<select>\` elements in the project must use dark backgrounds. This is now enforced globally via CSS but explicit classes should still be added for clarity.
GHEOF
)"
```

---

## 6. Create new issue — Signup redirect fix

```bash
gh issue create --repo sovereignbrick/brickos \
  --title "fix: signup page stays on /signup after registration instead of redirecting to /dashboard" \
  --label "bug,ui" \
  --body "$(cat <<'GHEOF'
## Problem

After completing registration and email verification on the signup page, the URL stayed at \`/signup\` instead of navigating to \`/dashboard\`. This happened because \`router.push()\` added \`/dashboard\` to the history stack but the signup page component remained mounted.

## Fix

Changed \`router.push('/dashboard')\` to \`router.replace('/dashboard')\` in \`handleVerifiedLogin\` in \`signup/page.tsx\`. Also changed the checkout redirect to use \`router.replace\`.
GHEOF
)"
```

---

## 7. Create new issue — React hydration mismatch (low priority)

```bash
gh issue create --repo sovereignbrick/brickos \
  --title "fix: React hydration mismatch error #418 on page load" \
  --label "bug,low-priority" \
  --body "$(cat <<'GHEOF'
## Problem

Console error on every page load:
\`\`\`
Uncaught Error: Minified React error #418
https://react.dev/errors/418?args[]=HTML&args[]=
\`\`\`

This is a **hydration mismatch** — the server-rendered HTML doesn't match the client-rendered DOM.

## Root cause

The theme initialization script in \`app/layout.tsx\` runs before React hydrates:
\`\`\`tsx
<script dangerouslySetInnerHTML={{ __html: \`try{var t=localStorage.getItem('sh_theme');if(t==='light')document.documentElement.classList.remove('dark')}catch(e){}\` }} />
\`\`\`

The server always renders \`class=\"dark\"\` on \`<html>\`, but if the user's localStorage has \`sh_theme=light\`, the script removes the \`dark\` class before React hydrates. React then sees a mismatch between server HTML (\`class=\"dark\"\`) and client DOM (no \`dark\` class).

## Impact

- **Cosmetic only** — console error, no visual or functional impact
- The theme applies correctly in both cases
- React recovers gracefully after the mismatch

## Possible fixes

1. **Use \`suppressHydrationWarning\` on the \`<html>\` tag** (already present but may not suppress error #418 in React 19)
2. **Move theme detection to a cookie** so the server can render the correct class
3. **Delay theme application to \`useEffect\`** (causes flash of wrong theme — FOUC)
4. **Use Next.js \`cookies()\` in the server component** to read theme preference server-side

Option 2 (cookie-based) is the cleanest long-term fix.

## Priority

Low — no user-facing impact, purely a console error.
GHEOF
)"
```

---

## 8. Create new issue — Onboarding progress tracking fix

```bash
gh issue create --repo sovereignbrick/brickos \
  --title "fix: onboarding checklist steps not updating after visiting pages" \
  --label "bug,ui" \
  --body "$(cat <<'GHEOF'
## Problem

The Getting Started checklist on the dashboard did not reflect completed steps. Visiting \`/settings?tab=devices\`, \`/zones/*\`, \`/trends\`, or \`/doctor-chat\` had no effect on the progress bar — all steps stayed unchecked.

## Root cause

The manual step tracking logic lived inside the \`OnboardingChecklist\` component, which only mounts on \`/dashboard\`. When the user navigated to other pages, the component wasn't mounted, so visits were never recorded.

## Fix

- Created \`OnboardingTracker\` component (\`components/onboarding-tracker.tsx\`) that mounts in the root layout (\`layout.tsx\`)
- Uses Next.js \`usePathname()\` and \`useSearchParams()\` to detect page visits globally
- Records completions to \`localStorage\` on every relevant page visit
- Removed duplicate tracking logic from \`OnboardingChecklist\`
- Added \`focus\` event listener on the checklist so it re-reads localStorage when returning to dashboard

### Files changed
- \`components/onboarding-tracker.tsx\` — new global tracker
- \`app/layout.tsx\` — added \`<OnboardingTracker />\`
- \`components/onboarding-checklist.tsx\` — removed manual tracking, added focus listener, added step numbers and descriptions
- \`i18n/messages/en.json\` — added step description keys
- \`i18n/messages/de.json\` — added step description keys (German)
GHEOF
)"
```
