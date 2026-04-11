---
number: 532
title: "bug: [P1] /platform/ai/config is a static mockup -- Test Connection has no onClick, inputs have no onChange"
milestone: "BrickOS Platform Admin GUI"
labels: [bug, p1, platform-admin-gui, sprint-041, ai, mockup]
created: 2026-04-11
priority: P1
discovered_by: 526
related: [529, 525]
---

## Summary

The `/platform/ai/config` page in the platform admin GUI is a non-functional
static mockup. The "Test Connection" button does literally nothing when
clicked (no `onClick` handler). The Provider, Model, Temperature, Max Tokens,
and Base URL inputs have no `onChange` handlers either, so editing them
doesn't update any state -- and there's no Save button anywhere on the page.

This was discovered during the Sprint 041 manual walkthrough by clicking
"Test Connection" and getting no feedback (no toast, no success/fail
indicator, no network request, nothing).

## Reproduction (staging, 2026-04-11)

1. Log in at `https://demo.sovereignhealth.io`
2. Navigate to `/platform/ai/config`
3. Click "Test Connection"
4. Result: **nothing happens**. No request fires, no UI feedback.

Verify in browser DevTools -> Network tab: zero requests are issued.

## Source

`apps/health/sovereign-health/frontend/src/app/platform/ai/config/page.tsx:110-113`:

```tsx
<div className="mt-3 flex items-center gap-3">
  <button className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg">
    Test Connection
  </button>
  <span className="text-[10px] text-zinc-500">EU AI Act: Limited Risk (Art. 50)</span>
</div>
```

The whole component is a mockup. Provider select (line 80), Model select (line 90),
Temperature input (line 95), Max Tokens input (line 99), Base URL input (line 106)
all rendered as controlled inputs with `value={profile.foo}` but no `onChange={...}`,
which React will warn about in dev mode (read-only controlled inputs).

There's no API client method for AI config in `frontend/src/lib/api.ts` either.
There's no `/admin/ai/*` route registered in the backend.

## Why P1

This is the page that #529 (Dr. Alex pulls AI config from brickos system
defaults) needs to land into. We can't sensibly implement #529 against a
mockup. Either:

- Treat this as the placeholder for #529 (correct -- delete it and rebuild as part of #529)
- Or ship a minimal functional version now (Test Connection that actually
  hits Anthropic, plus a Save button that writes to `app_settings`) so the
  page isn't visibly broken to operators while #529 cooks

## Acceptance criteria

Choose path A or B:

**Path A -- delete the mockup, ship as part of #529:**
- [ ] Delete `frontend/src/app/platform/ai/config/page.tsx`
- [ ] Hide the AI Config nav entry in `platform/layout.tsx:61` until #529 lands
- [ ] Add a banner in #529 acceptance: "AI Config page is now functional"

**Path B -- ship a minimal functional version now:**
- [ ] `Test Connection` wires to a new `POST /admin/ai/test-connection` backend
      endpoint that does a real API ping with the current profile, returns
      latency + success/fail
- [ ] Toast on success ("Connected -- response time 240ms"), toast on
      failure with the actual error
- [ ] Provider / Model / Temperature / Max Tokens / Base URL get `onChange`
      handlers wired to local state
- [ ] Save button writes to `app_settings` (the `system.ai.*` keys defined
      in #529)
- [ ] Audit log entry on every save

Recommend **Path A** because:
1. Path B duplicates work that #529 will redo anyway
2. The mockup is actively misleading -- an operator might think they
   changed something when they didn't
3. #529 is already P1 and the right scope

## Related

- #529 (Dr. Alex consume brickos system AI defaults -- the proper fix)
- #525 (audit /platform/* admin pages -- this is exactly the kind of gap that audit will surface)
- design 014 BrickOS Platform GUI

## Out of scope

- Failover rules section (lines 120-137 of the same file -- also a mockup, will be addressed by the same #529 work)
