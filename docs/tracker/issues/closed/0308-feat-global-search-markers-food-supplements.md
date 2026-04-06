# Issue #308: Global search for markers, food, supplements with search results page

**Type:** feature
**Priority:** medium
**Component:** frontend + backend / search
**Found during:** feature request (2026-04-02)

## Description

Users need a way to search across markers, food, supplements, and related content from anywhere in the app. The search should be accessible via an icon in the top menu bar and return results on a dedicated results page, similar to a search engine layout.

## Search Scope

The search should query across multiple content types:

| Content type | Searchable fields |
|-------------|-------------------|
| **Markers / Biomarkers** | Name, aliases, description, tooltip, unit, category |
| **Calculated markers** | Name, formula description, base markers (e.g. searching "glucose" should surface GKI) |
| **Food** | Name, nutrient content, health associations |
| **Supplements** | Name, active ingredients, related markers |
| **Content / Learn** | Article titles, body text, health topics |

### Relationship search
Searching for a marker should also surface related items:
- Calculated markers that use it as input (e.g. "glucose" → GKI, HOMA-IR)
- Supplements that affect it (e.g. "vitamin D" → Vitamin D3 supplement)
- Food that contains it or influences it
- Other markers in the same panel (e.g. "HDL" → lipid panel siblings)

## UI Design

### Search trigger
- Search icon (magnifying glass) in the top navigation bar
- Click opens a search input (either inline expanding or overlay/modal)
- Keyboard shortcut: Ctrl+K / Cmd+K

### Search results page
- Dedicated route: `/search?q=...`
- Results grouped by content type with type icons/badges
- Each result shows:
  - **Title** (marker name, food name, etc.)
  - **Type badge** (Marker, Calculated, Supplement, Food, Article)
  - **Snippet** — matching text from description/tooltip with search term highlighted
  - **Action link** — navigate to the marker detail, article, etc.
- "No results" state with suggestions
- Recent searches (stored locally)

### Result ranking
1. Exact name match (highest)
2. Alias match
3. Description/tooltip match
4. Relationship match (lowest, shown in a "Related" section)

## Implementation Notes

### Backend
- `GET /api/v1/search?q=...&type=all|markers|food|supplements` endpoint
- Query across: markers table (name, description via marker_translations), calculated_markers, marker_aliases, content/learn articles
- Return ranked, grouped results with matched field info for snippet generation
- Consider full-text search with `ts_vector` / `ts_query` in PostgreSQL for relevance ranking
- i18n: search in both EN and DE translations

### Frontend
- New `/search` route with results page component
- Search input component in top nav (reusable)
- Debounced input (300ms) with loading state
- Mobile: search icon expands to full-width input

## Location

- New backend endpoint in handlers
- New frontend route + components
- Top navigation: add search icon
