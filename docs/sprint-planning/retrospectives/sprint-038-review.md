# Sprint 038 Review -- Sovereign CRM Testing & Polish

**Date:** 2026-04-08
**Sprint:** 038
**Duration:** 1 day
**Focus:** Testing, bug fixes, infrastructure deployment

---

## What Was Delivered

### Testing Phase

- 11 bugs found during testing
- 10 bugs fixed (1 deferred -- audio recording needs Whisper)
- 48 tests passing (32 unit/integration + 16 E2E)

### Features Added

| Feature | Description |
|---------|-------------|
| Ctrl+K search | Global search overlay with keyboard shortcut |
| E2E encryption | Web Crypto API client-side per-field encryption |
| Audio recorder | MediaRecorder component for meeting capture |
| Queue worker | Background capture processing with status tracking |
| Cytoscape.js graph | Interactive relationship graph visualization |
| Improved AI prompt | Better business card extraction with ON CONFLICT dedup |

### Infrastructure

- Ollama installed and configured on VPS (qwen2.5:1.5b for text, moondream for vision)
- Anthropic Claude Vision verified (6s per business card photo)
- Staging deployed: crm-api.brickos.io + crm-demo.brickos.io
- Nginx subdomain routing configured

### Issues Closed

Issues #442 through #452 (10 issues closed).

### Remaining Backlog

| Issue | Description | Reason |
|-------|-------------|--------|
| #447 | Audio recording integration | Needs Whisper model on VPS |
| #453 | Audio transcription pipeline | Depends on #447 |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| API endpoints | 77 |
| Tests | 48 |
| Frontend pages | 12 |
| Bugs found | 11 |
| Bugs fixed | 10 |
| Environment | Deployed to staging |

---

## Lessons Learned

1. **Turbopack caching issues** -- Turbopack can serve stale content after i18n key changes. Renaming keys or clearing the `.next` cache directory is required to bust the cache.

2. **Next.js hydration with browser extensions** -- Browser extensions (password managers, ad blockers) inject DOM elements that cause hydration mismatches. Use `dynamic(() => import(...), { ssr: false })` for components that interact with browser APIs, and keep `suppressHydrationWarning` on `<html>` and `<body>`.

3. **Image media type detection** -- Camera capture returns different MIME types across browsers. Always detect media type from the actual bytes (magic number), not from the file extension or browser-reported type.

4. **ON CONFLICT for AI dedup** -- AI extraction can produce duplicate contacts from the same business card (retry, re-upload). Use `ON CONFLICT (email) DO UPDATE` in the insert to merge rather than reject.

---

## Velocity

| Sprint | Days | Bugs Found | Bugs Fixed | Features Added |
|--------|------|-----------|-----------|---------------|
| 038 | 1 | 11 | 10 | 6 |
