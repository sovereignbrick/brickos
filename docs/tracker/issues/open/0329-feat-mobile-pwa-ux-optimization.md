# Issue #329: Mobile / PWA UX optimization

**Type:** feature
**Priority:** high
**Component:** frontend / mobile UX + PWA
**Sprint:** 021

## Description

The app is used primarily on mobile devices (PWA). The current UX has friction points on small screens that need optimization. Additionally, the PWA can be extended with more capabilities.

## Mobile UX Issues (from screenshots + audit)

### 1. Sticky header wastes vertical space
- **Problem:** The header (`h-14` = 56px) with logo + "Sovereign Health Intelligence" + DE + hamburger is `sticky top-0` and always visible. Combined with breadcrumbs below (~40px), ~100px of screen space is permanently consumed on a ~844px viewport.
- **Fix:** Auto-hide header on scroll down, show on scroll up. Keep a minimal top bar (just hamburger + back) when hidden. Breadcrumbs should collapse into the header or be removed on mobile.
- **File:** `frontend/src/components/layout/navbar.tsx`

### 2. Title + action buttons overflow horizontally
- **Problem:** "Messungsverlauf" title + "Import-Verlauf" button + "+ Hinzufügen" button compete for horizontal space. On narrow screens, the title gets truncated and buttons wrap awkwardly.
- **Fix:** Stack title above action buttons on mobile (`flex-col` below `sm:`). Use icon-only buttons on very small screens with tooltips.
- **File:** `frontend/src/app/measurements/page.tsx`

### 3. Add measurement form — truncated dropdowns and overflow
- **Problem:** (Screenshot 3) Dropdowns show truncated labels ("a 6 (Sta...", "Keine Vorla..."). Context tags (Fastenprotokoll, Bewegung) overflow left. Sleep quality / stress level dropdowns are cramped.
- **Fix:** Full-width dropdowns on mobile. Stack context fields vertically. Use bottom sheet for selects on mobile instead of inline dropdowns.
- **File:** `frontend/src/app/measurements/add/page.tsx` or equivalent add measurement component

### 4. Touch targets too small
- **Problem:** Marker input rows (value field + unit + x button) have small touch targets. The "x" dismiss button is < 44px.
- **Fix:** Enforce minimum 44px touch targets per WCAG 2.1 (Success Criterion 2.5.5). Increase row height for marker inputs on mobile.

### 5. Health profile fields cramped (#301 — merged)
- **Problem:** On the health profile page, input fields for age, weight, and other metrics are spaced too closely on mobile (< 430px). Accidental taps on adjacent fields.
- **Fix:** Increase vertical spacing (`gap-4` → `gap-6` on mobile), ensure 44px minimum touch targets on all form inputs.
- **File:** `frontend/src/app/profile/` (health profile form)

## PWA Enhancements

### 1. Theme switching in PWA
- **Problem:** Theme toggle exists in user menu dropdown but PWA caches the initial dark state. Root layout hardcodes `className="dark"`. In standalone PWA mode, theme may not persist correctly across sessions.
- **Fix:** Ensure `ThemeProvider` reads from `localStorage` on mount (before render). Dynamically update `<meta name="theme-color">` when theme changes. Test theme persistence after PWA reinstall.
- **File:** `frontend/src/lib/theme-context.tsx`, `frontend/src/app/layout.tsx`

### 2. Manifest shortcuts
- Add quick action shortcuts to `manifest.json`:
  - "Add Measurement" → `/measurements/add`
  - "Dr. Alex Chat" → `/chat`
  - "Dashboard" → `/dashboard`
- **File:** `frontend/public/manifest.json`

### 3. Share target registration
- Register the app as a share target so users can share health data files (PDFs, images) directly to the app for import.
- Add `share_target` to `manifest.json` with file accept types (image/*, application/pdf)
- **File:** `frontend/public/manifest.json`, new share handler route

### 4. App badge API
- Use the Badging API (`navigator.setAppBadge()`) to show count of unreviewed/pending imports.
- Clear badge when user visits import history.
- **File:** Service worker or relevant context provider

### 5. Extended caching for offline use
- Cache marker definitions and reference ranges more aggressively (currently network-first with 600s TTL for measurements)
- Cache user's last 30 days of measurements for offline browsing
- Pre-cache Dr. Alex conversation history for offline reading
- **File:** `frontend/src/sw.ts`

### Out of scope (future)
- Health Connect / Apple HealthKit integration (requires native bridge)
- Screen time / blue light tracking (no Web API available)
- Background sync for measurements (already implemented via SyncProvider)

## Location
- Header: `frontend/src/components/layout/navbar.tsx`
- PWA manifest: `frontend/public/manifest.json`
- Service worker: `frontend/src/sw.ts`
- Theme: `frontend/src/lib/theme-context.tsx`
- Root layout: `frontend/src/app/layout.tsx`
- Measurement pages: `frontend/src/app/measurements/`
- Profile form: `frontend/src/app/profile/`
- Install/offline: `frontend/src/lib/install-context.tsx`, `frontend/src/lib/offline-context.tsx`

## Acceptance Criteria
1. Header auto-hides on scroll down, reappears on scroll up on mobile
2. No horizontal overflow on measurement history page at 430px
3. All dropdowns full-width on mobile, no truncated labels
4. All interactive elements meet 44px minimum touch target
5. Health profile form has comfortable spacing on mobile
6. Theme toggle works correctly in PWA standalone mode and persists
7. Manifest shortcuts appear in PWA long-press menu
8. Share target allows sharing images/PDFs to the app
9. App badge shows pending import count
