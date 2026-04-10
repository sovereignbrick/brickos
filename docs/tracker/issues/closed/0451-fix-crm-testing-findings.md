---
number: 451
github_number: 546
title: "fix: CRM testing findings -- bugs and issues found during manual testing"
milestone: "Sovereign CRM MVP"
labels: [bug, testing]
created: 2026-04-09
closed: 2026-04-09
priority: P1
sprint: 038
---

## Findings (11 issues found, 10 fixed, 1 deferred)

- [x] Capture page infinite render loop (setState during render -> useEffect)
- [x] Detail/create pages missing -- 404 on /contacts/new, /projects/[id], etc. (8 pages created)
- [x] "Loading..." stuck on all list pages when no auth token (added setLoading(false))
- [x] Navbar hydration errors from browser extensions (re-export pattern)
- [x] Capture page hydration errors (dynamic import with ssr:false)
- [x] JSON payload too large for photo uploads (35MB limit + client-side image resize to 1280px JPEG)
- [x] Base64 data URL prefix not stripped before Anthropic API (strip data:image/...;base64,)
- [x] Image media type hardcoded as PNG (auto-detect JPEG/PNG/WebP from base64 header)
- [x] Company duplicate key on AI extraction (ON CONFLICT DO NOTHING)
- [x] Capture didn't auto-process with AI (added auto-process after upload)
- [ ] AI extraction prompt quality -- only extracts subject person, misses sender details (deferred to backlog)

## Commits (10)

- `3ac58c5` fix: resize captured images to max 1920px
- `ac4d6b4` fix: image resize, better error handling, Ollama config
- `3f69e61` fix: strip data URL prefix from base64 before Anthropic vision
- `c2fc6f6` fix: capture page hydration -- dynamic import ssr:false
- `e53bbdf` feat: auto-process captures with AI after upload
- `b893d4a` fix: navbar hydration errors
- `41e761c` fix: navbar re-export pattern
- `1e8fa93` fix: detect image media type from base64 header
- `7487287` fix: company INSERT ON CONFLICT DO NOTHING
- `6bd3ecc` fix: capture page infinite render loop
- `9c52983` fix: add detail + create pages for all entities
- `662af31` fix: capture page hydration -- wrap form elements
- `08cbcec` fix: increase JSON payload limit to 35MB
