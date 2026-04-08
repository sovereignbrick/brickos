---
github_number: 339
title: "feat: Sovereign Voice auto-shortens URLs via Sovereign Link service account"
milestone: infrastructure
labels: [feat, P2]
---

## Overview

Sovereign Voice should automatically shorten all URLs in NOSTR notes before publishing, using Sovereign Link's service account API. This enables click tracking on social media posts.

## Architecture

```
Voice (Node.js)
  -> Authenticate via service account API key
  -> POST /api/v1/service/links { target_url, code? }
  -> Replace URL in note text with brickos.io/r/{code}
  -> Publish note to NOSTR relays
  -> (Later) Query GET /api/v1/service/links/{code}/stats
```

## Requirements

1. **Service account setup**: Create a Sovereign Voice service account in brickos.service_accounts table
2. **Voice config**: Add `SOVEREIGN_LINK_API_URL` and `SOVEREIGN_LINK_API_KEY` to Voice config
3. **URL detection**: Parse note text for URLs (https?://...) before publishing
4. **Shortening**: Call SL service API to create short links, replace URLs in note
5. **Fallback**: If SL is unreachable, publish with original URLs (don't block publishing)
6. **Idempotency**: Same URL in multiple notes should reuse existing short link (use target_url lookup)

## Files

- `apps/attention/sovereign-voice/src/publisher.ts` -- add URL shortening before relay publish
- `apps/attention/sovereign-voice/src/config.ts` -- add SL connection config
- Reference: `apps/technology/sovereign-link/src/handlers/service_api.rs` -- existing service endpoints

## Blocked By

None (service account API already exists)

## Spec Reference

docs/design/007-sovereign-voice.md (Phase 2: Analytics)
