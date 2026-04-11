---
number: 535
title: "bug: [P2] /platform/content/strings is a 'Coming soon' stub linked from the platform nav"
milestone: "BrickOS Platform Admin GUI"
labels: [bug, p2, platform-admin-gui, sprint-041, stub-page]
created: 2026-04-11
priority: P2
discovered_by: 526
related: [525, 532]
---

## Summary

`https://demo.sovereignhealth.io/platform/content/strings` renders a
literal "Coming soon" placeholder. The route is registered in the
platform navigation under the **CONTENT** section, so any operator
clicking it during onboarding hits a dead end with no explanation, no
ETA, and no link back.

## Reproduction (staging, 2026-04-11)

1. Log in at `https://demo.sovereignhealth.io`
2. Open the platform admin nav, CONTENT section
3. Click **Strings**
4. Result: page renders only:
   ```
   ContentStrings
   Coming soon.
   ```

## Source

`apps/health/sovereign-health/frontend/src/app/platform/content/strings/page.tsx`
is two lines long:

```tsx
export default function ContentStringsPage() {
  return <div><h1 className="text-2xl font-bold mb-4">ContentStrings</h1><p className="text-zinc-400 text-sm">Coming soon.</p></div>
}
```

The nav entry is registered in `apps/health/sovereign-health/frontend/src/app/platform/layout.tsx:56`:

```tsx
{ key: 'content-strings', label: t('strings'), href: '/platform/content/strings', icon: '\u2630', section: 'CONTENT', visible: p },
```

This is a sibling case of **#532** (`/platform/ai/config` as a static
mockup) -- multiple platform admin pages were scaffolded into the nav
ahead of having a real implementation, and they're now visibly broken
to anyone walking the GUI.

## Fix paths

**Path A (immediate) -- hide from nav until implemented.**
- Comment out or `visible: false` the `content-strings` entry in `layout.tsx:56`
- Delete the stub page file
- Add a TODO in design 014 (or wherever the platform GUI roadmap lives)
  noting that "i18n string editor" is a future feature

**Path B (implement minimum viable) -- a list view at least.**
- The backend already has content_strings infrastructure (per
  `apps/health/sovereign-health/api/src/handlers/content.rs` and the
  `public.content_strings` table seen during the schema audit)
- A simple read-only list of `(key, en, de, updated_at)` would be useful
  even before edit lands
- Save edit comes later

Recommend **Path A** because it's a 30-second fix and #525 (the audit
issue) will give us a complete punch list of every stub page so we can
prioritize which ones get Path B treatment.

## Companion stub-page audit

While we're at it, the same #525 audit should also verify these other
pages aren't stubs:

- `/platform/ai/config` (CONFIRMED stub, see #532)
- `/platform/ai/usage`
- `/platform/content/{app,web}` (the other CONTENT section entries)
- `/platform/promotions` (file: `0525-feat-platform-admin-crud-buttons-audit.md` already lists this)
- `/platform/services`
- `/platform/branding`

If any of these are also "Coming soon" stubs, file each as a sibling of
this issue or batch them into a single "stub page cleanup" PR.

## Acceptance criteria

- [ ] `/platform/content/strings` either disappears from the nav (Path A)
      or shows a minimal list view (Path B)
- [ ] Audit completed of every other `/platform/*` route for stub-page
      placeholders; companion issues filed for each finding
- [ ] If Path A: stub `page.tsx` files deleted, route 404s cleanly
- [ ] If Path B: backend endpoint exists, returns real data, frontend
      renders the table

## Related

- #532 (`/platform/ai/config` is a static mockup -- exact same bug class)
- #525 (audit `/platform/*` admin pages for missing CRUD buttons -- the
  parent audit that will surface the rest)
- design 014 BrickOS Platform GUI

## Out of scope

- Implementing the full i18n string editor (separate issue, separate scope)
- Renaming `content-strings` to `i18n-strings` or similar
