# Design: E2E Playwright Tests -- Full User Lifecycle

**Issue:** [#305](https://github.com/sovereignbrick/brickos/issues/305)
**Status:** Draft
**Date:** 2026-04-05

---

## Problem

The platform has 14 unit test files but zero end-to-end tests covering real user workflows. Individual functions are validated in isolation, but critical multi-step flows -- registration through account deletion -- have never been tested as a connected journey. Bugs that only surface from interaction between frontend, backend, database, and external services (Stripe, ntfy, Anthropic API) go undetected until production.

**Why now:** The feature set is mature enough (80+ markers, smart import, Dr. Alex, billing, GDPR) that regression risk grows with each sprint. A foundation of E2E tests now prevents compound bugs later.

---

## Approach

### Test Philosophy

1. **Lifecycle-driven, not feature-driven** -- Tests follow a user from signup to account deletion. This catches integration bugs that isolated feature tests miss.
2. **Create and destroy** -- Every test run creates fresh test users and verifies complete cleanup after deletion. No test data left behind.
3. **Test what the user does, not implementation details** -- Tests interact via the UI and verify via the API. No direct DB queries in tests (except final cleanup verification).
4. **Parallel-safe** -- Tests use unique emails/data per run. Multiple test runs can execute concurrently without conflicts.
5. **Environment-agnostic** -- Tests run against localhost Docker stack, staging, or production (read-only mode for prod).

### Existing Infrastructure

| Component | Status | Location |
|---|---|---|
| Playwright config | Exists | `frontend/playwright.config.ts` |
| E2E spec file | Exists (minimal) | `frontend/e2e/health.spec.ts` |
| Base URL | Configurable | `E2E_BASE_URL` env var, default `https://app.sovereignhealth.io` |
| Browser | Chromium headless | Configured in `playwright.config.ts` |
| Timeouts | 30s per test, 1 retry | Configured |
| Screenshots | On failure | Configured |
| Traces | On retry | Configured |
| Vitest unit tests | 14 files | `frontend/src/lib/*.test.ts` |
| Backend smoke/integration | Exists | `api/tests/smoke.rs`, `api/tests/integration.rs` |

### What We Add

| Component | Description |
|---|---|
| `e2e/helpers/auth.ts` | Test user factory: create, login, get token, cleanup |
| `e2e/helpers/api.ts` | Direct API client for setup/verification (bypass UI for speed) |
| `e2e/helpers/fixtures.ts` | Shared test data: marker values, device configs, lab data |
| `e2e/fixtures/` | Sample images for smart import testing |
| `e2e/suites/` | Organized by lifecycle phase (12 suites) |

---

## Test User Factory

```typescript
// e2e/helpers/auth.ts

interface TestUser {
  email: string;          // e2e-{uuid}@test.sovereignhealth.io
  password: string;       // Generated, meets strength requirements
  token: string;          // JWT after login
  userId: string;         // UUID from signup response
  cleanup: () => Promise<void>;  // Delete account + verify
}

async function createTestUser(options?: {
  tier?: string;          // default: 'insight' (full access for testing)
  locale?: string;        // default: 'en'
  dietProtocol?: string;  // default: 'standard'
  verified?: boolean;     // default: true (auto-verify email)
}): Promise<TestUser>;
```

Test users use the email domain `@test.sovereignhealth.io` which the backend accepts but skips actual email delivery. Each test run generates a UUID-based email to prevent conflicts.

---

## Test Suites

### Suite 1: Registration & Auth

**Sprint 023 scope.** Tests the account creation and authentication lifecycle.

```
1.1  Signup with valid email + password
     - POST /auth/signup returns 201
     - Verify user exists in system
     - Verify ntfy notification fires (mock or check via API)

1.2  Email verification
     - GET /auth/verify?token=... returns 200
     - User can now login

1.3  Login with verified account
     - POST /auth/login returns JWT
     - Token contains correct user_id, role, tier

1.4  Token refresh
     - POST /auth/refresh returns new JWT
     - Old token still works until expiry

1.5  Password validation
     - Reject password < 8 chars
     - Reject password without uppercase
     - Reject password without number
     - Accept strong password

1.6  Duplicate email rejection
     - Second signup with same email returns 409

1.7  Login with unverified email
     - Returns appropriate error

1.8  Login with wrong password
     - Returns 401, no token
     - Rate limiting kicks in after N attempts
```

### Suite 2: Onboarding & Profile

**Sprint 023 scope.** Tests initial user setup and profile configuration.

```
2.1  First login dashboard
     - After login, redirects to /dashboard
     - Dashboard renders without errors

2.2  Profile setup
     - PUT /settings/profile: set gender, age, height_cm, weight
     - Verify values persisted (GET /settings)

2.3  Diet protocol selection
     - For each protocol (carnivore, keto, vegan, standard, custom):
       Create a separate test user, set protocol, verify

2.4  Eating pattern (fasting) selection
     - Set eating pattern (16_8, omad, 36h, 48h, extended)
     - Verify protocol context affects reference ranges

2.5  Unit preferences
     - Switch glucose from mmol/L to mg/dL
     - Verify display values convert correctly
     - Switch weight from kg to lbs
     - Verify locale change (EN -> DE) updates all UI strings

2.6  Locale change
     - Switch locale to 'de'
     - Verify key UI strings appear in German
     - Switch back to 'en'

2.7  Extended lifestyle entry toggle
     - Enable extended_entry_enabled
     - Verify measurement form shows lifestyle fields
```

### Suite 3: Devices & Labs

```
3.1  Add device from catalog
     - Add Fora 6 Connect (blood_analyzer)
     - Add Qardio Arm (bp_monitor)
     - Add Qardio Base (scale)
     - Verify markers_measured arrays correct

3.2  Add custom device
     - Create device with custom name, type, markers
     - Verify appears in device list

3.3  Add lab
     - Create lab with name, address, city, country
     - Verify appears in lab list

3.4  Set default device
     - POST /devices/{id}/default
     - Verify default flag set

3.5  Archive device
     - Set status to 'archived'
     - Verify not shown in active devices
     - Verify measurements still linked

3.6  Delete device
     - Soft-delete device
     - Verify measurements retain device reference
```

### Suite 4: Measurements & Data Entry

```
4.1  Manual measurement entry
     - Add glucose measurement with Fora 6 device
     - Add ketones, total_cholesterol, uric_acid, hemoglobin, hematocrit
     - Add BP (systolic + diastolic + heart_rate) with Qardio Arm
     - Add weight with Qardio Base
     - Verify all measurements appear in dashboard

4.2  Extended lifestyle fields
     - Add measurement with exercise_activity, sleep_hours, stress_level
     - Verify lifestyle data saved and displayed

4.3  Meal timing tags
     - Add measurement with meal_timing_tag (before, 1h_after, 2h_after)
     - Verify tag displayed in measurement list

4.4  Protocol context
     - Add measurement with fasting_protocol (16_8), fasting_hours (18)
     - Verify protocol context saved

4.5  Calculated markers auto-compute
     - Add glucose + ketones -> verify GKI computed
     - Add weight (with height in profile) -> verify BMI computed
     - Add waist_circumference -> verify WHtR computed
     - Add triglycerides + hdl -> verify TG/HDL ratio computed
     - Verify zone status updates (green/orange/red)

4.6  Measurement templates
     - Save a template with multiple markers
     - Load template and verify fields pre-filled
     - Submit from template

4.7  Lab measurement entry
     - Add lab markers: HbA1c, TSH, FT4, vitamin_d, ferritin
     - Link to lab device
     - Verify values appear in lab markers section
```

### Suite 5: Smart Import

**Requires sample fixtures in `e2e/fixtures/`.**

```
fixtures/
  fora6-glucose-ketones.jpg     -- Fora 6 display showing glucose + ketones
  lab-report-basic.pdf          -- Lab report with 5-10 standard markers
  medication-prescription.jpg   -- Prescription image with 2-3 medications
  csv-measurements.csv          -- CSV with 20 rows of glucose/ketone data
```

```
5.1  Upload Fora 6 device photo
     - POST /import/upload with fora6-glucose-ketones.jpg
     - Verify AI extracts glucose + ketones values
     - Confirm import -> verify measurements created

5.2  Upload lab report PDF
     - POST /import/upload with lab-report-basic.pdf
     - Verify AI extracts lab marker values
     - Confirm import -> verify measurements created with lab device

5.3  Upload medication prescription
     - POST /import/upload-medication with medication-prescription.jpg
     - Verify AI extracts medication names, dosages
     - Confirm -> verify medications created

5.4  Upload CSV measurements
     - POST /import/upload-measurements with csv-measurements.csv
     - Verify rows parsed correctly
     - Confirm -> verify all measurements created

5.5  Rollback import
     - Confirm an import
     - Rollback: DELETE /import/sessions/{id}/rollback
     - Verify all measurements from that session deleted

5.6  AI credit deduction
     - Check credits before import
     - Run import
     - Check credits after (should decrease by cost)
```

### Suite 6: Dr. Alex

```
6.1  Start new conversation
     - POST /doctor-chat with question
     - Verify response received with content

6.2  Multi-turn conversation
     - Send 3 messages in same conversation
     - Verify context maintained (assistant references earlier messages)

6.3  Rate message
     - Rate a message as 'helpful'
     - Verify rating persisted

6.4  Rename conversation
     - PUT /doctor-chat/conversations/{id} with new title
     - Verify title updated

6.5  Delete conversation
     - DELETE /doctor-chat/conversations/{id}
     - Verify conversation no longer in list

6.6  AI credit deduction
     - Check credits before chat
     - Send message
     - Check credits after (should decrease by 1)

6.7  Quota enforcement
     - Exhaust credits (or mock low credit state)
     - Verify next request returns quota error
```

### Suite 7: Privacy & Data Export

```
7.1  CSV export
     - GET /export/csv?period=all
     - Verify CSV headers: timestamp, marker_name, value, unit, status, ...
     - Verify row count matches measurement count
     - Verify values match what was entered

7.2  JSON export
     - GET /export/json
     - Verify JSON structure contains all user data sections
     - Verify measurements, profile, preferences included

7.3  Health report PDF
     - POST /reports/health-pdf?period=30d
     - Verify PDF returned (check content-type, file size > 0)
     - Verify report appears in GET /reports/history

7.4  Anonymous data sharing toggle
     - PUT /settings/anonymous-data { share_anonymous_data: true }
     - Verify consent logged in audit
     - Toggle off, verify logged again

7.5  Consent management
     - PUT /settings/consent { consent_newsletter: true }
     - Verify newsletter_subscribers entry created
     - Toggle off, verify removed
```

### Suite 8: GDPR Compliance

```
8.1  Data access log
     - GET /settings/access-log
     - Verify recent access events listed (from earlier test actions)

8.2  GDPR data export
     - Trigger full data export
     - Verify ALL user data categories included:
       - [ ] User profile (email, display_name, gender, age, height)
       - [ ] Preferences (units, locale, date format)
       - [ ] Measurements (all markers, all values)
       - [ ] Calculated marker values
       - [ ] Devices
       - [ ] Labs
       - [ ] Medications
       - [ ] Dr. Alex conversations + messages
       - [ ] Import sessions
       - [ ] Measurement templates
       - [ ] Reference range customizations
       - [ ] Audit log entries
       - [ ] Newsletter consent
       - [ ] Subscription/license info

8.3  Account deletion
     - DELETE /settings/account
     - Verify is_deleted = true, deleted_at set
     - Verify auth token revoked (GET /settings returns 401)
     - Verify login with credentials fails

8.4  Data trace verification (the critical test)
     - After account deletion, query ALL related tables via API or direct DB:
       - [ ] measurements: 0 rows for user_id
       - [ ] calculated_marker_values: 0 rows
       - [ ] devices: 0 rows
       - [ ] labs: 0 rows
       - [ ] user_medications: 0 rows
       - [ ] doctor_chat_conversations: 0 rows
       - [ ] doctor_chat_messages: 0 rows (via CASCADE)
       - [ ] user_preferences: 0 rows
       - [ ] user_profile: 0 rows
       - [ ] import_sessions: 0 rows
       - [ ] measurement_templates: 0 rows
       - [ ] reference_ranges (user_id = this user): 0 rows
       - [ ] refresh_tokens: 0 rows
       - [ ] ai_usage_log: 0 rows
       - [ ] audit_log: user_id SET NULL (entries remain, anonymized)
       - [ ] email_sends: user_id SET NULL, email = '[purged]'
       - [ ] newsletter_subscribers: removed
       - [ ] user_licenses: 0 rows
       - [ ] org_members: 0 rows
       - [ ] data_shares: 0 rows (both directions)
```

### Suite 9: Billing & Subscription

```
9.1  Stripe checkout (test mode)
     - POST /billing/checkout with tier=focus, interval=monthly
     - Verify Stripe session URL returned
     - (In test mode, simulate successful payment via Stripe API)

9.2  Plan change
     - POST /billing/change-plan to upgrade tier
     - Verify tier updated in user license

9.3  Interval change
     - POST /billing/change-interval (monthly -> annual)
     - Verify interval updated

9.4  Cancel subscription
     - POST /billing/cancel
     - Verify subscription marked for cancellation

9.5  BTC payment flow
     - POST /billing/btc/invoice
     - Verify invoice created

9.6  Tier feature gating
     - Create free-tier user
     - Attempt premium feature (e.g., CSV export)
     - Verify 403 with upgrade CTA
     - Upgrade tier
     - Verify feature now accessible
```

### Suite 10: Admin Panel

```
10.1  Admin login
      - Login with admin credentials
      - Verify admin routes accessible

10.2  Users tab
      - GET /admin/users -- verify user list loads
      - Search for test user by email
      - Verify user details (tier, payment method, joined, last active)
      - Verify referred_by and affiliate_code visible (post #300)

10.3  License management
      - Override user tier (admin override)
      - Verify override note and timestamp saved
      - Remove override, verify tier reverts

10.4  Audit logs
      - GET /admin/audit/access-logs -- verify entries
      - GET /admin/audit/events -- verify events
      - GET /admin/audit/stats -- verify stats load

10.5  AI usage dashboard
      - GET /admin/ai-usage -- verify data loads
      - Verify per-user and per-feature breakdown
```

### Suite 11: Infrastructure & Integration

```
11.1  Health endpoint
      - GET /health returns 200 with status, service, version, timestamp

11.2  Metrics endpoint
      - GET /api/v1/health/metrics returns valid metric data

11.3  Rate limiting
      - Send 20 rapid requests to a rate-limited endpoint
      - Verify 429 response after threshold

11.4  CORS headers
      - Verify Access-Control-Allow-Origin correct for app domain
      - Verify preflight OPTIONS request handled

11.5  Auth token lifecycle
      - Login -> get token
      - Wait for near-expiry (or set short TTL in test env)
      - Refresh token
      - Verify old token rejected after refresh

11.6  Stripe webhook handling (mock)
      - POST /billing/webhook with test event payload
      - Verify event processed (payment_intent.succeeded, etc.)

11.7  ntfy notification (mock/verify)
      - Trigger an action that sends ntfy (e.g., signup)
      - Verify notification sent (check ntfy API or mock)

11.8  Database audit triggers
      - Perform a data modification
      - Verify audit_log entry created with correct action, resource_type
```

### Suite 12: Cleanup & Data Integrity

**Sprint 023 scope (partial).**

```
12.1  Delete all test user accounts
      - For each test user created during the test run:
        DELETE /settings/account
      - Verify deletion success

12.2  Verify CASCADE deletion
      - For each deleted user, verify zero rows in ALL related tables
      - Use the same checklist as Suite 8.4

12.3  Orphan detection
      - Query for orphaned records (measurements without valid user_id, etc.)
      - Verify zero orphans

12.4  Test data isolation
      - Verify no test data leaked into production data
      - Verify no @test.sovereignhealth.io users remain
```

---

## Test Execution Strategy

### Local Development
```bash
# Start Docker stack
docker compose up -d

# Run all E2E tests
E2E_BASE_URL=http://localhost:3000 pnpm test:e2e

# Run specific suite
E2E_BASE_URL=http://localhost:3000 pnpm test:e2e --grep "Suite 1"

# Run with UI
E2E_BASE_URL=http://localhost:3000 pnpm test:e2e:ui
```

### Staging
```bash
E2E_BASE_URL=https://app.staging.sovereignhealth.io pnpm test:e2e
```

### Production (read-only)
```bash
# Only Suites 11 (infrastructure) and health checks
E2E_BASE_URL=https://app.sovereignhealth.io E2E_READONLY=true pnpm test:e2e --grep "Suite 11"
```

### CI Integration (future)
- Run Suites 1, 2, 12 on every PR (fast, no external deps)
- Run full suite nightly on staging
- Run Suite 11 on production after deploy

---

## Sample Fixtures

### `e2e/fixtures/sample-measurements.json`
```json
{
  "glucose": { "value": 5.2, "unit": "mmol/L", "device": "fora6" },
  "ketones": { "value": 1.8, "unit": "mmol/L", "device": "fora6" },
  "total_cholesterol": { "value": 4.5, "unit": "mmol/L", "device": "fora6" },
  "bp_systolic": { "value": 120, "unit": "mmHg", "device": "qardio_arm" },
  "bp_diastolic": { "value": 80, "unit": "mmHg", "device": "qardio_arm" },
  "heart_rate": { "value": 65, "unit": "bpm", "device": "qardio_arm" },
  "weight": { "value": 73.5, "unit": "kg", "device": "qardio_base" }
}
```

### `e2e/fixtures/sample-profile.json`
```json
{
  "standard": { "gender": "male", "age": 35, "height_cm": 180, "diet_protocol": "standard", "eating_pattern": null },
  "keto_faster": { "gender": "female", "age": 42, "height_cm": 165, "diet_protocol": "keto", "eating_pattern": "16_8" },
  "carnivore": { "gender": "male", "age": 50, "height_cm": 175, "diet_protocol": "carnivore", "eating_pattern": "omad" },
  "vegan": { "gender": "female", "age": 28, "height_cm": 170, "diet_protocol": "vegan", "eating_pattern": null }
}
```

### Image Fixtures (to be created)
```
e2e/fixtures/
  fora6-glucose-ketones.jpg       -- Photo of Fora 6 display (glucose 5.2, ketones 1.8)
  lab-report-basic.pdf            -- Sample lab report (HbA1c, TSH, FT4, vitamin D, ferritin)
  medication-prescription.jpg     -- Prescription (metformin 500mg, vitamin D 4000IU)
  csv-measurements.csv            -- 20 rows: date, glucose, ketones, weight
```

---

## Sprint 023 Foundation Scope (5 pts)

What gets built this sprint:

1. **Test infrastructure** (`e2e/helpers/`)
   - `auth.ts` -- test user factory with create/login/cleanup
   - `api.ts` -- direct API client for setup and verification
   - `fixtures.ts` -- shared test data loaders
   - `config.ts` -- environment detection (local/staging/prod)

2. **Suite 1: Registration & Auth** (8 tests)

3. **Suite 2: Onboarding & Profile** (7 tests)

4. **Suite 12 partial: Cleanup** (4 tests)
   - Delete test users, verify CASCADE, check orphans

5. **Sample fixture files** (JSON configs, placeholder for images)

Total: ~19 tests covering the user lifecycle start + end.

---

## Future Sprint Roadmap

| Sprint | Suites | Focus | Est. Points |
|---|---|---|---|
| 023 | 1, 2, 12 (partial) | Foundation + auth + profile | 5 |
| 024 | 3, 4 | Devices, labs, measurements | 5 |
| 025 | 5, 6 | Smart import, Dr. Alex | 5 |
| 026 | 7, 8 | Privacy, GDPR | 5 |
| 027 | 9, 10, 11 | Billing, admin, infrastructure | 5 |

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Smart import tests depend on AI (cost + flakiness) | Use mock/fixture responses for CI; real AI only in nightly staging runs |
| Stripe tests require test mode keys | Use Stripe test mode; never touch live payment methods |
| Test emails could leak to real inboxes | Use `@test.sovereignhealth.io` domain which backend skips delivery for |
| Parallel test runs conflict on shared state | UUID-based test user emails; no shared test data |
| E2E tests slow (30s timeout per test) | Run fast suites (1, 2, 12) on PR; full suite nightly |
| Image fixtures add repo size | Use small, compressed images (<100KB each); .gitignore large files |

---

## References

- Existing Playwright config: `frontend/playwright.config.ts`
- Existing E2E spec: `frontend/e2e/health.spec.ts`
- Backend test patterns: `api/tests/smoke.rs`, `api/tests/integration.rs`
- Account deletion flow: `api/src/handlers/settings.rs:1218-1253`
- Hard purge service: `api/src/services/purge.rs:18-54`
- Auth endpoints: `api/src/handlers/auth.rs`
- Demo seed data: `api/migrations/20260308000012_seed_demo_data.sql`
