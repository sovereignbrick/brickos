# ADR-003: PostgreSQL with pgaudit and Row-Level Security

**Status:** Accepted
**Date:** 2026-03-08

## Context
Health data is among the most sensitive personal data categories under GDPR. We need database-level protections that go beyond application-layer authorization — a defense-in-depth approach where even an API bug cannot expose another user's data.

## Decision
Use **PostgreSQL 16** with:
- **pgaudit** extension for SQL-level audit logging of all write and DDL operations
- **Row-Level Security (RLS)** on 16 core tables — users can only query their own rows at the database level
- **`data_access_log`** table tracking who accessed what health data and when (GDPR Art. 15)

## Alternatives Considered
- **MySQL/MariaDB:** No native RLS. Audit logging requires plugins with weaker guarantees.
- **MongoDB:** Document model doesn't enforce relational integrity needed for biomarker reference ranges and zone associations.
- **Application-only auth:** Relying solely on `WHERE user_id = $1` in queries is fragile — a missed clause leaks data.

## Consequences
- **Easier:** GDPR compliance (audit trail, right of access, data isolation), defense-in-depth against API authorization bugs.
- **Harder:** RLS adds operational complexity, pgaudit increases log volume, custom Postgres Docker image required.
- **Trade-off:** More complex DB setup for stronger data protection guarantees.
