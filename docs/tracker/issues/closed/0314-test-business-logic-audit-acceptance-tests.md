# Issue #314: Audit all business logic and create acceptance test documentation

**Type:** test / documentation
**Priority:** high
**Component:** full-stack / all modules
**Found during:** planning (2026-04-02)

## Description

We need a comprehensive audit of all implemented business logic across the platform, documented as user-facing acceptance tests in plain language ("As a user, when I do X, I expect Y"). This validates that our code actually behaves as intended and catches hidden assumptions or broken flows.

## Format

Each business rule should be documented as:

```
Feature: [Feature Name]
  Scenario: [Short description]
    Given [precondition]
    When [action]
    Then [expected outcome]
```

## Areas to Audit

### 1. Measurements
- As a user, when I add a glucose value of 95 mg/dL, I expect it stored in canonical units
- As a user, when I add a measurement, I expect calculated markers (GKI, BMI, HOMA-IR) to auto-compute if inputs are available
- As a user, when I delete a measurement, I expect calculated markers to recompute without it
- As a user, when I add a measurement with influence factors (fasting, exercise, sleep), I expect them stored and shown
- Threshold/status coloring: value in green/orange/red range based on reference ranges

### 2. Import Pipeline
- As a user, when I import a lab PDF, I expect markers matched by name/alias
- As a user, when I import a CSV with multiple dates, I expect calculated markers computed per-date
- As a user, when I import duplicate values, I expect ON CONFLICT handling (no duplicates)
- As a user, when I import, I expect the import session recorded with lab metadata
- As a user, when I rollback an import, I expect all measurements from that session deleted

### 3. Calculated Markers
- As a user with glucose + ketones, I expect GKI auto-calculated
- As a user with weight + height, I expect BMI auto-calculated
- As a user with waist + height, I expect WHtR auto-calculated
- As a user with glucose + insulin, I expect HOMA-IR auto-calculated
- Calculated markers use values-at-same-date, not latest-only
- Tier gating: free tier limited to N calculated markers

### 4. User Tiers / Subscriptions
- Glimpse (free): 8 markers, 30-day history, 1 calculated marker, 100 measurements, 2 chats
- Insight: 50 markers, unlimited history, 8 calc markers, 500 measurements, 30 chats
- Guardian: unlimited everything
- Tier limits enforced on measurement creation, marker addition, chat initiation
- Upgrade/downgrade behavior: what happens to data exceeding new tier limits?

### 5. Dr. Alex Chat
- As a user, I expect Dr. Alex to have context of my recent measurements
- Chat quota enforced per tier
- AI credit usage tracked
- Public chat (unauthenticated) vs authenticated chat behavior
- Conversation history persisted and retrievable

### 6. Authentication & Sessions
- Login with email/password → JWT issued
- Refresh token rotation
- Password reset flow
- Session expiry behavior
- Rate limiting on login attempts

### 7. Reference Ranges
- Default reference ranges per marker
- User can override with custom ranges
- Custom ranges affect threshold status coloring
- Reset to defaults works

### 8. Devices & Labs
- CRUD operations for devices
- CRUD operations for labs
- Measurements linked to devices/labs
- Archive (soft delete) behavior

### 9. GDPR / Privacy
- Data export includes all user data (measurements, chats, medications, etc.)
- Account deletion: soft delete → 30-day grace → hard purge
- Consent tracking
- Audit log of data access

### 10. Admin Panel
- User management (list, detail, refund, delete)
- Audit log browsing
- Settings management
- Admin-only endpoints protected

### 11. Notifications
- ntfy alerts for: new signup, account deletion, errors, deploy events
- Email: welcome, password reset, deletion confirmation

### 12. Medications / Influence Factors
- CRUD for medications and supplements
- Linked to measurements as influence factors
- Dr. Alex aware of active medications

## Deliverable

- Document: `docs/testing/business-logic-acceptance-tests.md`
- One section per feature area
- Each scenario testable manually or automatable
- Mark each as PASS / FAIL / UNTESTED after verification
- Identify gaps where business logic is unclear or undocumented

## Location

- All backend handlers: `apps/health/sovereign-health/api/src/handlers/`
- All services: `apps/health/sovereign-health/api/src/services/`
- Frontend: `apps/health/sovereign-health/frontend/src/`
- Tier matrix: `frontend/src/lib/tiers.ts` + `tier-matrix.test.ts`
