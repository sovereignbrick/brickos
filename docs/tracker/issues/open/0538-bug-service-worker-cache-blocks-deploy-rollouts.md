---
number: 538
title: "bug: [P1] service worker caches old JS for 4 hours, blocks deploys from rolling out to existing browser sessions"
milestone: "Sprint 042 -- SHI Production Readiness"
labels: [bug, p1, sprint-041, frontend, deploy, service-worker, ops]
created: 2026-04-11
priority: P1
discovered_by: 534
related: [534]
---

## Summary

The SHI frontend ships a service worker (`/sw.js`, built from serwist +
workbox). On every deploy, the new JS bundle is correctly built and
shipped to the server, but **browsers that already have the service
worker installed continue to serve the OLD bundle from cache** until
the SW detects the update.

This was discovered when the #534 fix (drop the `Authorization` header
from `newsletterExport`) was deployed correctly to staging
(`/app/.next/server/chunks/7021.js` confirmed has the new code), the
backend smoke test passed, but the user retried in their existing browser
session and **still hit the same NetworkError**.

The browser was running the old bundle, served by the old SW from cache,
sending the old `Authorization` header, triggering a CORS preflight, and
failing.

## Operational impact

Every deploy from this point forward has this problem:

- New users (no SW installed yet) get the new code immediately
- Returning users with the SW installed get the OLD code until: (a)
  they clear site data, (b) they unregister the SW manually, or (c)
  the SW update mechanism kicks in (which can be hours)
- Bug fixes that "ship to staging" don't actually fix anything for the
  one person who needs to test them, until they manually clear the SW

This is a much bigger problem on production than on staging:

- A production hotfix for a payment bug could be running on the server
  but every active customer session is still hitting the bug
- Customer support has no way to diagnose: the deploy looks fine, the
  bug "is fixed" per the server logs, but the customer keeps reporting
  it
- The fix appears to "stop working" on a per-user basis, depending on
  whether their browser updated the SW or not

## Cloudflare amplifies the problem

`/sw.js` itself is served with `Cache-Control: public, max-age=14400`
(4 hours). Cloudflare honors this aggressively. Verified on staging:

```
$ curl -sI https://demo.sovereignhealth.io/sw.js | grep -i cache
cache-control: public, max-age=14400
last-modified: Sat, 11 Apr 2026 15:27:36 GMT
```

So even **new** users hitting the page within 4 hours of a deploy may
get a cached `sw.js` from Cloudflare's edge, which then registers with
their browser pointing at the *previous* version's chunk hashes.

## Browser side: Workaround for current session

DevTools -> Application -> Service Workers -> click Unregister -> close
the tab -> reopen. Or DevTools -> Application -> Storage -> Clear site
data -> Reload.

This is **not a fix**. It's a manual ritual every user has to perform
after every deploy, which means in practice it doesn't happen.

## Proper fix paths

### Path A -- `Cache-Control: no-cache` on `sw.js`

Service workers have a **special browser rule**: by default browsers check
for an updated `sw.js` on every navigation, EVEN IF the response has
a long max-age. But Cloudflare's edge may still cache it. Fix:

1. **Set `Cache-Control: no-cache, no-store, must-revalidate` on
   `/sw.js`** in the nginx site config (or in the Next.js headers).
   This is the standard pattern for SW files. Reference:
   https://web.dev/learn/pwa/service-workers/#service-worker-update-cycle
2. The nginx config lives at `apps/health/sovereign-health/ops/nginx-sovereignhealth.conf`
   on the staging side and at the parallel production config.
3. Verify with `curl -sI https://demo.sovereignhealth.io/sw.js` that the
   header is now `cache-control: no-cache, no-store, must-revalidate`.

### Path B -- skipWaiting + clientsClaim in serwist config

By default a new SW waits in "installing" state until all old tabs are
closed. With `self.skipWaiting()` + `self.clients.claim()`, the new SW
takes over immediately on update. Trade-off: a tab that was mid-flight
may see a mix of old and new code, which is rarely an issue for client-
side React.

Configure in `frontend/src/app/sw.ts` (the serwist entry point) -- add:

```ts
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil((self as any).clients.claim()))
```

Or, if serwist exposes a config flag, set `skipWaiting: true`.

### Path C -- runtime version banner (defense in depth)

The frontend reads `/api/v1/version` (or wherever the API exposes its
version) on every page load. If it doesn't match what was bundled,
show a banner: *"A new version is available. Reload to update."* with
a button that calls `navigator.serviceWorker.getRegistrations()` and
unregisters them, then `window.location.reload(true)`.

### Path D -- cache versioning by file content hash (already in place?)

Next.js by default suffixes JS chunks with content hashes (e.g.
`7021-abc123.js`). When code changes, the hash changes, the URL
changes, the browser fetches the new file. The SW intercepts these
fetches based on the URL, not the content -- so if the SW's runtime
cache is keyed by URL, hash changes should naturally bypass it.

This means the issue is specifically:

- The SW itself doesn't update (Path A fixes this)
- And/or the SW intercepts navigation requests and serves a cached
  HTML response that references the OLD chunk URLs (workbox's
  precaching of HTML pages)

## Verification

Apply Path A + B in one PR. Verify:

- [ ] `curl -sI` on `/sw.js` returns `cache-control: no-cache, ...`
- [ ] After deploy, opening DevTools -> Application -> Service Workers
      shows the new SW activates within seconds (not waiting)
- [ ] After deploy, hard refresh of an existing tab serves the new
      JS bundle without manual SW unregistration
- [ ] Newsletter Export CSV (#534) actually works for the user without
      clearing site data first
- [ ] Smoke test: deploy a no-op change (bump a version constant),
      verify a returning user with an existing session sees the change
      within one navigation

## Acceptance criteria

- [ ] **Path A applied**: nginx serves `/sw.js` with `Cache-Control:
      no-cache, no-store, must-revalidate`
- [ ] **Path A applied** to both staging and production nginx configs
- [ ] **Path B applied**: serwist config sets `skipWaiting: true` and
      `clientsClaim: true` (or the equivalent SW lifecycle handlers)
- [ ] **Cloudflare cache purged** for `/sw.js` after the change lands,
      so the existing 4h-cached copies expire
- [ ] **Verification step** in the deploy.sh: after the frontend
      restart, curl `/sw.js` and assert the no-cache header is set;
      fail the deploy if it isn't
- [ ] **Memory** updated: add a `feedback_service_worker_no_cache.md`
      lesson with the rule "SW JS files MUST be served no-cache" and
      a link to this issue

## Why P1

This silently breaks every deploy from now on. Every fix we ship looks
deployed but isn't, for any returning user. The user-visible failure
mode is exactly the one we hit just now: a fix is shipped to staging,
verified server-side, but the user keeps hitting the old bug because
their SW hasn't updated. This is a permanent operational tax.

Lower than P0 only because there's a manual workaround (clear site
data) and because new users / fresh sessions don't experience it.

## Related

- #534 (newsletter export NetworkError -- the bug whose fix this
  blocked from rolling out)
- #526 (URL namespace consolidation -- if app and api lived under one
  origin we wouldn't have CORS preflight issues at all, which would
  also reduce the surface area of this bug)
- memory `feedback_docker_cache_i18n.md` (sibling pattern: docker /
  turbopack stale serving of i18n; the lesson is the same -- caches
  cascade and you have to bust them at every layer)
