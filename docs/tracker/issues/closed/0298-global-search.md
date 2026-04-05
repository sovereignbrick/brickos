---
github_number: 298
title: "feat: Global search for markers, food, supplements"
milestone: health-intelligence
labels: [enhancement, sprint-023, app:health, frontend, backend]
points: 8
---

## Description
Google-style search across the entire Sovereign Health app. Indexes markers, calculated markers, zones, foods, supplements, medications, Dr. Alex chat history, scientific references, LOINC codes, and website content.

## Design Doc
`apps/health/sovereign-health/docs/project-files/design/035-sovereign-health-search.md`

## Sub-tasks
- [ ] Migration: create `search_index` and `user_search_index` tables
- [ ] Seed from ALL Tier 1 sources (markers, zones, 7 content_types, foods, supplements, tests, references, relations, aliases, protocols, medications, LOINC, website, i18n)
- [ ] `GET /api/v1/search` with tsvector/tsquery ranking (public + authenticated)
- [ ] `GET /api/v1/search/suggest` autocomplete
- [ ] `POST /api/v1/search/reindex` admin-only
- [ ] BM25 ranking with category weights from `app_settings`
- [ ] Blind spot detection + user context enrichment
- [ ] Dr. Alex chat indexing (360d) + measurement template indexing
- [ ] Frontend: navbar icon, Ctrl+K, overlay, results page, tab bar
- [ ] Mobile responsive + PWA
- [ ] i18n: EN + DE (zero hardcoded text)
- [ ] Structured logging + metrics + ntfy alerts
- [ ] Admin: search category weights in app_settings menu
