# ADR 026: PostgreSQL full-text search with materialized index

**Status:** Accepted
**Date:** 2026-04-05
**Context:** Sprint 023 -- Global search feature (#298)

## Context
Users needed a way to search across the entire app: markers, foods, supplements, content tiles, medications, Dr. Alex chat history, scientific references, LOINC codes, zones, and website content. The search needed to be bilingual (EN + DE), fast (<200ms), and work for both authenticated and unauthenticated users.

## Decision
Use PostgreSQL's built-in full-text search (`tsvector`/`tsquery`) with a denormalized `search_index` table rather than an external search engine.

Key design choices:
- **Materialized index**: `search_index` table with pre-computed `tsvector` columns (GIN-indexed), seeded from 13 source tables
- **Bilingual**: separate rows for EN and DE, using `english` and `german` text search configurations with `::regconfig` cast
- **Cross-language queries**: search both locale configs simultaneously, deduplicate by entity_id, prefer user's locale for display (1.2x boost)
- **Weighted ranking**: `setweight()` with A (title), B (description), C (body) + `category_weight` multiplier per entity type (marker=1.5, zone=1.3, food=1.2, etc.)
- **Two-tier access**: `search_index` (public, shared knowledge) + `user_search_index` (per-user chat/medication data, requires auth)
- **Subquery pattern for DISTINCT ON + ORDER BY**: PostgreSQL requires ORDER BY to start with DISTINCT columns, so inner query deduplicates, outer query sorts by score

## Alternatives Considered
- **Elasticsearch/Meilisearch**: Rejected -- adds infrastructure dependency, increases hosting costs, violates sovereign architecture (data leaves PostgreSQL). Our index is ~1,500 rows, well within PostgreSQL FTS capacity (handles millions)
- **Application-level search (LIKE/ILIKE)**: Rejected -- existing `/knowledge/search` used this, too slow for cross-table search, no ranking, no stemming
- **Client-side search (Fuse.js)**: Rejected -- would require downloading all content to the browser, doesn't scale, can't search user-specific data

## Consequences
- No external dependencies -- search is pure SQL, runs in the same PostgreSQL instance
- Privacy-preserving -- user data never leaves the database
- Fast: <50ms for typical queries on a 1,500-row index with GIN
- Bilingual works but has a UX trade-off: searching "Glukose" with EN locale returns results but titles are in German (because only the DE tsvector matches)
- Index rebuild via admin endpoint or migration re-run; incremental updates for user content
- `::regconfig` cast required for all dynamic locale CASE expressions -- easy to forget, caught twice during RC
