---
title: "fix: React hydration error #418 in production console"
milestone: "Infrastructure & Chores"
milestone_number: 20
status: pending
issue_number: null
---

## Context

React error #418 (hydration mismatch) appears in the browser console. This means server-rendered HTML doesn't match client-rendered output.

The `<html>` tag has `suppressHydrationWarning` but this only suppresses on that element, not children.

## Likely Causes

1. **Theme script** (`layout.tsx:92`): Inline script reads `localStorage` and removes `dark` class before React hydrates — this can cause class mismatch
2. **Date rendering** (`footer.tsx:20`): `new Date().getFullYear()` during SSR vs client
3. **Locale-dependent formatting**: Date/time formatting differs between server (UTC) and client (user timezone)
4. **Browser extensions**: Can inject elements that cause mismatch (not actionable)

## Investigation Needed

- [ ] Identify which page/component triggers the error
- [ ] Check if it's consistent or intermittent
- [ ] Add `suppressHydrationWarning` to the `<body>` tag if theme-related
- [ ] Wrap date-dependent renders in `useEffect` + mounted guard

## Files

- `frontend/src/app/layout.tsx` (theme script, line 92)
- `frontend/src/components/layout/footer.tsx` (year, line 20)
- `frontend/src/components/date-time-picker.tsx` (new Date(), line 41)
