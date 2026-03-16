# T-0710 — Automated E2E Testing Suite (Onboarding + Payments + Admin)

**Target:** Claude Code on VPS
**Priority:** HIGH
**Epic:** E-09 Pre-Launch Polish
**Scope:** Automated smoke, E2E, performance, and security tests for the full user onboarding + payment flow

---

## Test Framework

Use **Playwright** (TypeScript) for E2E browser tests. Place in:
```
/opt/sovereign-health/e2e/
  tests/
    onboarding.spec.ts    # Full onboarding flow
    payment.spec.ts       # Stripe checkout flow
    billing.spec.ts       # Upgrade/downgrade/cancel
    auth.spec.ts          # Registration, login, email verification, MFA
    admin.spec.ts         # Admin dashboard data verification
    smoke.spec.ts         # Quick health checks (all pages load)
    i18n.spec.ts          # Language switching across flows
  fixtures/
    test-users.ts         # Test user data
    stripe.ts             # Stripe test cards + helpers
  playwright.config.ts
  package.json
```

---

## Test Suite 1: Smoke Tests (`smoke.spec.ts`)

Quick pass/fail for all critical pages:

```typescript
const publicPages = [
  '/',
  '/pricing',
  '/features',
  '/markers',
  '/security',
  '/open-source',
  '/contact',
  '/terms',
  '/privacy',
  '/imprint',
];

const appPages = [
  '/login',
  '/signup',
  '/dashboard',     // requires auth
  '/billing',       // requires auth
  '/settings',      // requires auth
];

// For each page:
// - Response 200 (or 302 redirect to login for auth pages)
// - No console errors
// - No broken images
// - Page title exists
// - Key elements render (header, footer, main content)
```

---

## Test Suite 2: Onboarding E2E (`onboarding.spec.ts`)

### Test 2a: New user — Card payment (monthly)
```
1. Navigate to sovereignhealth.io/pricing/ (EN)
2. Select Focus tier, Monthly
3. Click Subscribe (Card)
4. → Assert redirect to app.sovereignhealth.io/signup?tier=focus&interval=monthly
5. Fill registration form (unique email, password, name, accept terms)
6. Click Register
7. → Assert "Check your email" / verification page
8. Verify email via API shortcut: POST /api/test/verify-email (test-only endpoint)
   OR read verification token from DB
9. → Assert redirect to checkout or user can proceed
10. → Assert Stripe Checkout page loads (or checkout URL is valid)
11. Fill Stripe test card: 4242 4242 4242 4242
12. Complete payment
13. → Assert redirect to app with success
14. → Assert user tier = Focus in DB
15. → Assert billing page shows Focus (Monthly)
```

### Test 2b: New user — Card payment (yearly)
Same as 2a but select Yearly. Assert correct price.

### Test 2c: New user — with promo code
Same as 2a but:
- Enter promo code before checkout
- Assert discount is displayed
- Assert Stripe checkout shows discounted price

### Test 2d: New user — BTC payment
Same as 2a steps 1-4, then:
- Select BTC payment method
- Assert "Coming Soon" message (for v1)
- No Stripe redirect

### Test 2e: Existing user — anonymous browser subscribe
```
1. Create test user via API (pre-registered, email verified)
2. Open incognito/anonymous browser
3. Navigate to sovereignhealth.io/pricing/
4. Click Subscribe
5. → Assert signup page shows "Already have an account?" link
6. Click "Log in"
7. → Assert login page with tier params preserved
8. Login with existing credentials
9. → Assert redirect to checkout or billing upgrade flow
10. Complete payment
11. → Assert tier upgraded
```

### Test 2f: Existing user — upgrade from billing
```
1. Login as Glimpse user
2. Navigate to /billing (or /settings?tab=license)
3. Click "Upgrade your plan"
4. Select Insight tier
5. → Assert Stripe checkout with Insight pricing
6. Complete payment
7. → Assert tier = Insight
8. → Assert billing page updated
```

### Test 2g: Declined card
```
1. Complete flow to Stripe checkout
2. Use declined card: 4000000000000002
3. → Assert error message on Stripe page
4. → Assert user tier NOT changed (still Glimpse)
5. → Assert no broken state in DB
```

---

## Test Suite 3: Admin Verification (`admin.spec.ts`)

After each payment test, verify admin data:

```
1. Login as admin
2. Navigate to /admin/users
3. → Assert new user appears with correct tier
4. → Assert subscription record exists
5. Navigate to /admin/dashboard (if metrics exist)
6. → Assert payment count incremented
7. → Assert revenue updated
```

---

## Test Suite 4: i18n (`i18n.spec.ts`)

```
1. Run onboarding flow 2a in German:
   - Start at sovereignhealth.io/de/pricing/ (or ?lang=de)
   - Assert signup page in German
   - Assert email content in German (if testable)
   - Assert checkout page in German
   - Assert success message in German
2. Switch language mid-flow:
   - Start in EN, switch to DE on signup page
   - Assert all subsequent pages in DE
```

---

## Test Suite 5: Performance (`performance.spec.ts`)

```typescript
// For critical pages, assert load times:
const thresholds = {
  '/': 3000,           // Homepage < 3s
  '/pricing': 3000,    // Pricing < 3s
  '/login': 2000,      // Login < 2s
  '/dashboard': 4000,  // Dashboard < 4s (has API calls)
  '/billing': 3000,    // Billing < 3s
};

// Measure:
// - Time to first contentful paint
// - Time to interactive
// - Total page weight (warn if > 2MB)
// - Number of network requests (warn if > 50)
```

---

## Test Suite 6: Security (`security.spec.ts`)

```typescript
// 1. CSRF: POST endpoints reject requests without proper headers
// 2. Auth: protected pages redirect to login when no token
// 3. Auth: expired JWT returns 401
// 4. Rate limiting: registration endpoint rate-limited (5 per minute)
// 5. Rate limiting: login endpoint rate-limited (10 per minute)
// 6. XSS: promo code field rejects <script> tags
// 7. SQL injection: login/register fields handle ' OR 1=1 gracefully
// 8. Stripe webhook: rejects unsigned requests (return 400)
// 9. CORS: API rejects requests from unauthorized origins
// 10. Registration whitelist: non-whitelisted IP gets blocked (when enabled)
```

---

## Backend Test Update (`core-backend/tests/`)

### Check existing tests:
```bash
find /opt/sovereign-health/core-backend/tests/ -name "*.rs" -exec echo {} \; -exec head -5 {} \;
ls /opt/sovereign-health/core-backend/tests/
```

### Tests to add/update:

**`auth_test.rs`** — add:
- Registration with tier params (stores tier for post-verification redirect)
- Email verification generates valid session
- Login preserves redirect params

**`integration.rs`** — add:
- Stripe checkout session creation (mock Stripe or use test key)
- Promo code validation + discount calculation
- Webhook signature verification
- Webhook checkout.session.completed → tier update

**`smoke.rs`** — add:
- `/api/subscriptions/checkout` returns 401 without auth
- `/api/subscriptions/checkout` returns 400 with invalid tier
- `/api/payments/status` returns correct whitelist response
- `/api/promo/validate` returns correct responses

**`e2e.rs`** — add:
- Full registration → verification → checkout → webhook → tier update flow
- Existing user upgrade flow
- Declined payment doesn't change tier

**`measurement_test.rs`** — verify still passes with new schema changes

### Best Practice: Add to `BEST_PRACTICES.md`:
```markdown
## Testing Standard
- All new endpoints must have at least: 1 happy path test, 1 auth test, 1 validation test
- Run `cargo test` before every deploy
- Playwright E2E suite runs nightly or before releases
- Backend tests: `/opt/sovereign-health/core-backend/tests/`
- E2E tests: `/opt/sovereign-health/e2e/`
- Update test files when adding new features or changing API contracts
```

---

## Setup

```bash
# Install Playwright in e2e directory
cd /opt/sovereign-health
mkdir -p e2e && cd e2e
npm init -y
npm install -D @playwright/test
npx playwright install chromium

# Run tests
npx playwright test

# Run specific suite
npx playwright test tests/smoke.spec.ts
npx playwright test tests/onboarding.spec.ts

# Run with UI (for debugging)
npx playwright test --ui
```

---

## CI Integration (future)

When GitLab CI minutes are available:
```yaml
e2e:
  stage: test
  script:
    - cd e2e && npm ci
    - npx playwright install chromium
    - npx playwright test
  artifacts:
    paths:
      - e2e/test-results/
    when: always
```

---

## Test Data Cleanup

After E2E runs, clean up test users:
```sql
DELETE FROM users WHERE email LIKE 'e2e-test-%@test.sovereignhealth.io';
```

Or use a test-only API endpoint: `DELETE /api/test/cleanup` (only available when `APP_ENV=test`).

---

## Verification

- [ ] `npx playwright test tests/smoke.spec.ts` — all pages load
- [ ] `npx playwright test tests/onboarding.spec.ts` — full flow passes
- [ ] `npx playwright test tests/payment.spec.ts` — Stripe sandbox works
- [ ] `npx playwright test tests/security.spec.ts` — no vulnerabilities
- [ ] `cargo test` in core-backend — all existing + new tests pass
- [ ] Test results exportable as report
