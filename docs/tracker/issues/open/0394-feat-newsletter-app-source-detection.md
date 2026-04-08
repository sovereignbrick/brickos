# 0394 - Newsletter app_source auto-detection

**Type:** feat
**Priority:** low
**Sprint:** 034
**Related:** ADR 018 (Phase 2 remaining)

## Description

Auto-detect which app a newsletter subscriber came from based on their activity.
Currently the `source` column is set to "website" for all subscribers. Enrich this
with app context: if a user has measurements they came from SHI, if they have
short_links they came from Sovereign Link, etc.

## Acceptance Criteria

- [ ] Migration adds `app_source` column to `newsletter_subscribers` (nullable TEXT)
- [ ] Backfill script: detect app_source from user activity
- [ ] Subscribe endpoint sets app_source from request context (Referer header or explicit param)
- [ ] Admin newsletter filter uses app_source when filtering (not just source)
- [ ] Newsletter export includes app_source column
