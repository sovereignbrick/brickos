---
number: 534
title: "bug: [P1] /platform/newsletter Export CSV throws NetworkError -- CORS preflight on cross-origin Authorization"
milestone: "BrickOS Platform Admin GUI"
labels: [bug, p1, platform-admin-gui, sprint-041, cors, newsletter]
created: 2026-04-11
priority: P1
discovered_by: 526
related: [526]
---

## Summary

Clicking **Export CSV** on `/platform/newsletter` throws a browser-side
**"NetworkError when attempting to fetch resource"**. The request never
reaches the backend (verified: `sh-staging-backend` logs show zero
`/admin/newsletter/export` entries during the failed click).

The fetch is rejected by the browser **before** it goes out -- which
points to a CORS preflight failure. Every other admin call on this page
works (Total/Confirmed/Pending/Unsubscribed counts load, the subscriber
list renders, "Sync to Mailgun" button is wired). The export is the
*only* admin call that fails, and the only one that uses raw `fetch()`
with an `Authorization: Bearer` header instead of going through the
shared `request()` wrapper.

## Reproduction (staging, 2026-04-11)

1. Log in at `https://demo.sovereignhealth.io`
2. Navigate to `/platform/newsletter`
3. Click **Export CSV**
4. Result: red banner **"NetworkError when attempting to fetch resource."**
5. Browser DevTools -> Network: a `OPTIONS /admin/newsletter/export` request
   appears, **fails the CORS preflight check, no body**
6. The actual `GET /admin/newsletter/export` is never sent
7. Backend logs: zero corresponding entries (request never arrived)

## Root cause

`apps/health/sovereign-health/frontend/src/lib/api.ts:1079-1089`:

```ts
newsletterExport: async () => {
  const token = document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1]
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const r = await fetch(`${API_BASE}/admin/newsletter/export`, {
    credentials: 'include',
    headers,
  })
  if (!r.ok) throw new Error('Export failed')
  return r.text()
},
```

Three things stack:

1. **Cross-origin**: page is at `demo.sovereignhealth.io`, API at
   `api-demo.sovereignhealth.io`
2. **Authorization header**: triggers a CORS *preflight* (`OPTIONS` request)
   because `Authorization` is not in the CORS-safelisted-request-header set
3. **Backend CORS allow-list does not advertise `Authorization` for
   `/admin/newsletter/export`**: the preflight `Access-Control-Allow-Headers`
   response header doesn't include `Authorization`, so the browser refuses
   to send the actual request

Every other admin call on the page goes through the `request()` wrapper at
`api.ts:~50` which uses **cookie auth only** (`credentials: 'include'`,
no `Authorization` header), so it doesn't trigger a preflight at all
(simple request, GET + Cookie + no custom headers). That's why nothing
else on the page is broken.

## Fix paths

**Path A (smallest, ship today) -- match the rest of the codebase.**
Drop the `Authorization` header from `newsletterExport`, rely on the
auth cookie like every other admin call:

```ts
newsletterExport: async () => {
  const r = await fetch(`${API_BASE}/admin/newsletter/export`, {
    credentials: 'include',
  })
  if (!r.ok) throw new Error('Export failed')
  return r.text()
},
```

**Path B (proper) -- backend CORS extended to allow `Authorization` on
`/admin/*` everywhere.** This is the right long-term fix because mobile
clients and curl users will always send the header. But it touches the
CORS middleware setup and needs a follow-up audit on every admin route.

**Path C (architectural) -- collapse to one origin.** Per **#526** (URL
namespace consolidation), if `app` and `api` lived under one origin
(`app.brickos.io/api/...` instead of `api.brickos.io`), there'd be no
CORS at all. The newsletter export bug is one of the first concrete data
points showing why #526 matters operationally, not just aesthetically.

Recommend **Path A** today (one-line fix, ships immediately) **plus** the
follow-up Path C planning in #526.

## Acceptance criteria

- [ ] `newsletterExport` updated to remove the `Authorization` header
- [ ] Click **Export CSV** on staging -> CSV download starts, no error
- [ ] Backend `sh-staging-backend` logs show one `/admin/newsletter/export`
      entry per click
- [ ] Audit grep: every other `fetch(API_BASE...)` in `lib/api.ts` -- there
      should be zero. All admin calls should go through the `request()`
      wrapper. If any other raw `fetch` exists with `Authorization`, fix
      them too.
- [ ] **Reference in #526**: this bug becomes evidence in the URL
      namespace decision

## Related

- #526 (brickos.io URL namespace consolidation -- the architectural fix
  that would prevent this entire class of bug)
- #525 (audit /platform/* admin pages -- this is exactly the kind of
  silent breakage that audit will surface)
- memory `feedback_admin_panel_testing.md` ("admin panel has own fetch/auth;
  test independently") -- this is exactly that pattern biting us

## Out of scope

- The full backend CORS audit (Path B). Filed separately if Path A doesn't
  cover the long tail.
