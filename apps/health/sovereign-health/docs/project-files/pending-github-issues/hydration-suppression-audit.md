---
title: "fix: Audit and resolve React hydration suppressions instead of masking them"
milestone: "Infrastructure & Chores"
milestone_number: 20
status: pending
issue_number: null
---

## Context

We added `suppressHydrationWarning` to both `<html>` and `<body>` in `layout.tsx` to silence React error #418. This masks the symptom but doesn't fix the root cause — server/client HTML mismatch during hydration.

Suppression is acceptable as a short-term fix for theme scripts (next-themes uses the same pattern), but we should not accumulate suppressions without understanding what they hide.

## Current Suppressions

- `<html>` — `suppressHydrationWarning` (theme class mismatch from localStorage script)
- `<body>` — `suppressHydrationWarning` (added 2026-03-22 to silence #418)

## Root Causes to Investigate

1. **Theme script** (`layout.tsx:92`): Inline `<script>` reads `localStorage('sh_theme')` and removes `dark` class before React hydrates. Server always renders `className="dark"`, client may differ.
2. **Date-dependent renders**: `new Date()` in `footer.tsx`, `date-time-picker.tsx`, `agent-grid.tsx` — server time (UTC) vs client time (local) can produce different output.
3. **Locale-dependent formatting**: Date/number formatting may differ between server and client.
4. **Browser extensions**: Can inject DOM elements causing mismatch (not actionable but should be excluded from investigation).

## Requirements

- [ ] Reproduce the #418 error in dev mode to get the full component stack trace
- [ ] Fix the actual mismatch (wrap client-only renders in `useEffect` + mounted guard)
- [ ] Remove `suppressHydrationWarning` from `<body>` once root cause is fixed
- [ ] Keep `suppressHydrationWarning` on `<html>` only if theme script pattern requires it (document why)
- [ ] Add a comment in `layout.tsx` explaining why each suppression exists

## Files

- `frontend/src/app/layout.tsx:87,94` — both suppressions
- `frontend/src/components/layout/footer.tsx:20` — `new Date().getFullYear()`
- `frontend/src/components/date-time-picker.tsx:41` — `new Date()`
- `frontend/src/components/doctor-chat/agent-grid.tsx:60` — `new Date()`
