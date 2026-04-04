# Issue #299: Import rollback button does not trigger rollback action

**Type:** bug
**Priority:** high
**Component:** frontend / import history
**Found during:** v0.31.0 production deploy (2026-03-28)

## Description

The rollback button on `/measurements/imports` (import history page) is rendered but does not trigger the `POST /import/sessions/:id/rollback` backend endpoint when clicked. The button appears interactive but no network request is made.

## Steps to Reproduce

1. Log in to https://app.sovereignhealth.io/
2. Navigate to Measurements > Imports (`/measurements/imports`)
3. Locate an import session in the list
4. Click the "Rollback" button
5. Observe: nothing happens, no network request in DevTools

## Expected Behavior

Clicking "Rollback" should call `POST /import/sessions/:id/rollback`, confirm the action, and remove the imported measurements from that session.

## Impact

- Users cannot undo a bad import from the UI
- Must manually delete measurements or use admin endpoints as workaround

## Location

- Frontend: `apps/health/sovereign-health/frontend/src/app/measurements/imports/page.tsx`
- Backend endpoint: `POST /import/sessions/:id/rollback` (in `apps/health/sovereign-health/api/src/handlers/import.rs`)

## Likely Cause

Frontend event handler not wired to the API call, or the onClick handler is missing/not bound to the rollback function.

## Workaround

Use admin API directly: `POST /import/sessions/:id/rollback` with auth token.
