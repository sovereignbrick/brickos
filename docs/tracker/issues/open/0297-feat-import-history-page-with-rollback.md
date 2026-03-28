# Issue #297: Import history page with rollback option not accessible

**Type:** bug / UX
**Priority:** medium
**Component:** frontend / import
**Found during:** v0.30.0-rc1 manual testing (2026-03-28)

## Description

The RC checklist specifies "Import history shows all sessions with rollback option" but there is no dedicated import history page or clear navigation path to view past import sessions and trigger rollbacks.

Currently import review is inline within the Dr. Alex chat flow, but there is no way to:
1. View all past import sessions
2. See what was imported in each session
3. Roll back a specific import session

## Expected Behavior

Users should be able to access a list of all import sessions (lab PDF, medication, CSV) with the ability to view details and roll back any session.

## Suggested Location

Settings > Import History tab, or a dedicated /import/history route accessible from the measurements page.
