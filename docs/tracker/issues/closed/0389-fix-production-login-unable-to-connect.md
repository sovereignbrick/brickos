---
github_number: 389
title: "fix: production login on app.brickos.io shows 'Unable to connect to server'"
milestone: platform-admin-gui
labels: [fix, P1]
---

## Problem

Login at app.brickos.io/login shows "Unable to connect to the server" when submitting credentials. The API at api.brickos.io responds correctly via curl (401 for wrong password, 200 for health check, CORS headers present).

## Investigation

- api.brickos.io/health returns 200 (v0.40.0)
- CORS preflight from app.brickos.io returns correct headers
- curl login with Origin header works
- No Cloudflare challenge detected
- Frontend JS bundle has correct runtime detection: app.brickos.io -> api.brickos.io

## Possible Causes

1. Brave browser shields blocking cross-origin fetch (api.brickos.io != app.brickos.io)
2. Cloudflare Bot Management on api.brickos.io blocking browser JS fetch
3. DNS resolution issue on specific client machine
4. MFA redirect not preserving return URL

## Workaround

Login at app.sovereignhealth.io first, then navigate to app.brickos.io/platform.
The .brickos.io cookie domain should share the session.

## Test Steps

1. Try Chrome (not Brave)
2. Try incognito mode
3. Open browser DevTools Network tab and check the actual failed request
4. Check if the request goes to api.brickos.io or somewhere else

## Update 2026-04-08

User confirmed: logged in as admin on SHI (app.sovereignhealth.io) in same browser,
but app.brickos.io/login shows "Unable to connect to server" on submit.
This rules out general network/DNS issues -- the browser CAN reach *.brickos.io.
The cross-origin fetch from app.brickos.io to api.brickos.io is being blocked by the browser.

Likely cause: Brave browser shields blocking third-party domain API calls.
api.brickos.io is a different origin than app.brickos.io.

Fix options:
1. Proxy API through same origin: app.brickos.io/api/* -> nginx proxy to backend
2. Add api.brickos.io to Brave shields allowlist
3. Use api.sovereignhealth.io as API URL on app.brickos.io (same backend, different domain)
