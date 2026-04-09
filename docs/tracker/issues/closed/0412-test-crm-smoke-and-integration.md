---
number: 412
title: "test: CRM smoke tests + integration tests"
milestone: "Sovereign CRM MVP"
labels: [platform-elevation, testing]
created: 2026-04-08
sprint: 036
points: 3
blocked_by: [409, 410]
---

Create test suite for Sovereign CRM API following SHI testing patterns.

## Smoke Tests (`tests/smoke.rs`)

- Health endpoint returns 200
- All route groups exist (/contacts, /companies, /projects, /tags, /i18n)
- Unauthenticated request returns 401
- Invalid JWT returns 401

## Integration Tests (`tests/integration.rs`)

- Contact CRUD full cycle: create -> read -> update -> delete
- Company CRUD full cycle with domain uniqueness
- Project CRUD with contact assignment/unassignment
- Tag CRUD: create, assign to contact, filter contacts by tag, delete tag
- Org-scoping: user from org A gets empty list querying org B's data
- Encryption: verify DB stores encrypted values, API returns decrypted
- Search index: create contact -> search returns it

## Test Infrastructure

- Use `actix_web::test` framework
- Snapshot responses with `insta` (JSON snapshots)
- Test helpers: `create_test_app()`, `auth_token_for_user()`
- Separate test database or transaction rollback pattern

## Acceptance Criteria

- `cargo test -p sovereign-crm-api` passes all tests
- `cargo clippy -p sovereign-crm-api -- -D warnings` clean
- Snapshot files committed in `tests/snapshots/`
