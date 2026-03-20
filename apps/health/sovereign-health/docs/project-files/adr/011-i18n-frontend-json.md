# ADR-011: Frontend JSON Files for i18n — Not Database-Driven

**Status:** Accepted
**Date:** 2026-03-08

## Context
The platform requires bilingual support (EN + DE minimum). Translation strings appear on every page — forms, labels, error messages, marker names, zone descriptions.

## Decision
All translations stored in **frontend JSON files** (`src/i18n/messages/{en,de}.json`) using **next-intl**. Translations are baked into the JavaScript bundle at build time. No runtime API calls for translation strings.

Marker names and zone descriptions use a separate `useContent()` hook that fetches translated content from the API (stored in `ui_strings` / `ui_string_translations` DB tables) — but only for dynamic content, not UI chrome.

## Alternatives Considered
- **Database-driven i18n:** Every string in DB, loaded per request. Flexible but adds latency to every page load.
- **Translation management platform (Crowdin, Lokalise):** Useful for large teams but overkill for 2 languages with a single developer.
- **Server-side only (getServerSideProps):** Adds server round-trip for static content.

## Consequences
- **Easier:** Zero latency for translations, works offline, simple to audit (grep JSON files), no DB dependency for UI strings.
- **Harder:** Translation changes require rebuild + redeploy, Docker/Turbopack can serve stale i18n (rename keys to bust cache).
- **Convention:** All user-facing text must go through i18n. No hardcoded strings. Marker names always via `useContent()`, never raw `marker_name` from API.
