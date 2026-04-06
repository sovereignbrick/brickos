# ADR-002: Raw SQL with SQLx — No ORM

**Status:** Accepted
**Date:** 2026-03-08

## Context
The platform stores sensitive health data across 100+ tables with complex queries (zone aggregations, marker correlations, trend calculations). We needed a data access strategy that prioritizes correctness and performance.

## Decision
Use **SQLx** with raw SQL queries. No ORM (Diesel, SeaORM, etc.). Migrations are embedded at compile time via `sqlx::migrate!()` and run automatically on backend startup.

## Alternatives Considered
- **Diesel:** Compile-time safety but heavy DSL, difficult for complex joins and CTEs. Schema changes require rebuilding the DSL layer.
- **SeaORM:** More ergonomic than Diesel but adds abstraction over queries we need to control precisely.
- **sqlx `query!` macro:** Validates SQL against a live database at compile time — catches typos, type mismatches, and missing columns before deployment.

## Consequences
- **Easier:** Full SQL control, compile-time query validation, no abstraction leaks, straightforward migration files.
- **Harder:** More boilerplate for CRUD operations, manual row mapping with `query_as`, no automatic schema generation.
- **Convention:** All migrations use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` for idempotency. Calculated markers use a separate table (`calculated_markers` + `calculated_marker_values`) with `UNION ALL` in search endpoints.
