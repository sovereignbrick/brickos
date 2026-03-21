# ADR-019: marker_translations as Source of Truth for Localized Content

**Status:** Accepted
**Date:** 2026-03-21

## Context
Marker content (names, descriptions, why_it_matters, when_to_worry) was spread across multiple tables:
- `markers.marker_name` (English only)
- `marker_content` (rich content by content_type and language)
- `marker_translations` (name, description, tooltip, why_it_matters, when_to_worry per locale)

The marker detail API was returning `marker_name` from the `markers` table (always English) and only using `marker_translations` for descriptions as a fallback.

## Decision
`marker_translations` is THE source of truth for all localized marker content:
- Marker name: `fetch_translated_field(marker_id, locale, "name")` with English fallback
- Description: `fetch_description()` checks `marker_content` first, then `marker_translations.description`
- Why It Matters: `fetch_translated_field(marker_id, locale, "why_it_matters")`
- When to Worry: `fetch_translated_field(marker_id, locale, "when_to_worry")`

All fields fall back to English if the requested locale is not available.

## Alternatives Considered
- **marker_content only:** Would require migrating all translations there. More complex content_type-based queries.
- **Frontend-only translations:** Would bloat the i18n files with 92x2 marker descriptions. Not maintainable via admin panel.

## Consequences
- Admin panel can manage all marker content in one place (marker_translations table)
- Language switching on marker detail page works without page refresh (locale in useEffect deps)
- Zone detail queries also use marker_translations for localized names
- New fields (e.g. summary, clinical_note) can be added to marker_translations without schema changes elsewhere
