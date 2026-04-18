# Sovereign Voice v0.2.0

**Date:** 2026-04-18
**Tag:** `sovereign-voice/v0.2.0`
**Previous:** v0.1.0

## Summary

Fixes a bug where images attached to scheduled NOSTR posts were not rendering in clients (Primal, Damus, Amethyst). Adds first-class image support with NIP-92 `imeta` metadata, a runtime guard against the regression, and test coverage.

## Key Changes

### Bug fix: media URLs no longer clobbered by URL shortener

- `shortener.ts` previously ran a catch-all `https?://...` regex and forwarded every URL to Sovereign Link, replacing direct image URLs (`.../chart.png`) with short links (`brickos.io/r/abc123`). NOSTR clients decide whether to inline-render based on the file extension; after shortening, that extension is gone, so clients rendered a link card (or nothing) instead of the image.
- Added `MEDIA_EXT_REGEX` matching common image/video/audio extensions (jpg, jpeg, png, gif, webp, avif, svg, bmp, ico, mp4, webm, mov, mp3, wav, m4a, ogg, opus, flac) with optional query-string suffix. Matching URLs skip shortening entirely.

### New feature: first-class image field on scheduled notes

- `ScheduledNote` and `CompanionNote` gain an optional `image` field of type `NoteImage` (`url`, `alt?`, `dim?`, `mimeType?`, `sha256?`).
- When present, the publisher appends the URL to the event content (so plain-URL-detecting clients inline-render) AND emits a NIP-92 `imeta` tag (so metadata-aware clients get alt text, dimensions, mime type, hash).
- `buildImetaTag()` is exported from `publisher.ts` for direct reuse.

### Regression guard: pre-publish warning

- Before emitting the event, the publisher scans the content for bare image URLs. If an image URL is present but no corresponding `imeta` tag was built, a `WARN` line is written to the log pointing at the URL. This catches the "user embedded a URL in content without declaring an image field" case before it hits a relay.

### Test coverage

- New `tests/shortener.test.ts` (5 cases): media-URL preservation across extensions, case variations, query strings, already-shortened URLs, and the disabled-shortener path.
- Two new cases in `tests/publisher.test.ts` covering `buildImetaTag` output shape.

Total test suite: 29 passing (22 existing + 7 new).

## Migration

- `schedule.example.json` gains an `image` field on the first note + its companion as documentation-by-example.
- Existing schedules continue to work unchanged. The `image` field is optional; notes without it behave as before (modulo the media-URL fix, which is always active).

## Files Changed

| File | Type |
|---|---|
| `src/config.ts` | feature (`NoteImage`, `ScheduledNote.image`, `CompanionNote.image`) |
| `src/publisher.ts` | feature (imeta construction, pre-publish warning) |
| `src/scheduler.ts` | feature (forward `image` to publisher) |
| `src/shortener.ts` | fix (media-URL skip) |
| `tests/shortener.test.ts` | new, 5 cases |
| `tests/publisher.test.ts` | +2 cases for `buildImetaTag` |
| `schedule.example.json` | docs (example `image` usage) |
| `package.json` | version bump 0.1.0 → 0.2.0 |

## Known Issues

None related to this release.

## Contributors

- Helmut Schindlwick -- reported the bug, guided the fix scope
- Claude Code (Anthropic) -- implementation
