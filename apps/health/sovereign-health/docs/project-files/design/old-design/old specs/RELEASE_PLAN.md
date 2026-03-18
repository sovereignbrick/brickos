# RELEASE PLAN — Sovereign Health Intelligence v1.0.0

## Phase 0: Bug Fixes & Testing (Current — March 11-14)

### 0.1 Manual Testing (Helmut — March 12 morning)
- [ ] Full E2E user journey: register → verify email → login → subscribe → pay → use
- [ ] Stripe sandbox checkout (test card 4242...)
- [ ] Strike BTC payment flow
- [ ] Promo code application (create test code, apply, verify discount)
- [ ] Doctor Chat: all 3 upload types (Scan Lab, Upload PDF, Track Medication)
- [ ] Medication management (Settings → Medications tab)
- [ ] Mobile responsiveness (nav overlay, chat, settings, dashboard)
- [ ] Language switching (EN ↔ DE) across all pages
- [ ] Admin panel: all tabs (Content App, Content Web, Medications, AI Usage, Promotions, Users)
- [ ] Email delivery: verification, password reset (test with helmut@schindlwick.com)
- [ ] Early access signup → Mailgun list + welcome email

### 0.2 Bug Fixes (March 12 — after testing)
- [ ] Fix all bugs found during morning testing
- [ ] #4 — Upload & Analyze NetworkError (Track Medication + Upload Lab PDF)
- [ ] Verify tiers.json: Horizon = "Custom" not €99.99
- [ ] Verify marker translations populated (88 rows)
- [ ] Session timeout → redirect to /login (not error page)

### 0.3 Verify Existing Features (March 12)
- [ ] E2E client-side encryption — check if implemented (thought we did)
- [ ] Mobile app (React Native) — check if started
- [ ] Smart Import (Batch 28, lab photo/PDF AI extraction) — check if implemented

## Phase 1: Code Quality & Security (March 12-13)

### 1.1 Code Quality Audit (Claude Code)
- [ ] Remove all hardcoded text from app + website (must use i18n/content API)
- [ ] Remove all hardcoded URLs, API keys, config values (must use env vars)
- [ ] Remove obsolete/dead code and unused files
- [ ] Remove stale dependencies from Cargo.toml + package.json
- [ ] Add file header comments to every source file:
  ```
  // Sovereign Health Intelligence — sovereignhealth.io
  // [Brief description of what this file does]
  // Part of the [module name] module
  ```
- [ ] Add inline comments for complex logic
- [ ] Consistent error handling patterns (no unwrap in production paths)
- [ ] Consistent naming conventions (snake_case Rust, camelCase TS)
- [ ] No TODO/FIXME/HACK left without tracking issue

### 1.2 Code Review (swickDoctor / OpenClaw)
- [ ] Review backend architecture (handlers, services, models, config)
- [ ] Review frontend component structure
- [ ] Review website pages and components
- [ ] Check for common Rust pitfalls (unwrap, panic, race conditions)
- [ ] Check for common React pitfalls (missing keys, stale closures, memory leaks)
- [ ] Check API consistency (naming, response formats, error codes)
- [ ] Verify CORS configuration
- [ ] Review Docker configuration (security, resource limits)

### 1.3 Security Audit (Claude Code + swickDoctor)
- [ ] SQL injection: all queries use parameterized statements
- [ ] XSS: all user input sanitized before rendering
- [ ] CSRF: proper token handling
- [ ] Auth: JWT validation, token expiry, refresh flow
- [ ] Rate limiting: all public endpoints (login, register, forgot-password, early-access, public chat)
- [ ] File upload: size limits, type validation, no path traversal
- [ ] Stripe webhook signature verification
- [ ] Strike webhook signature verification
- [ ] Mailgun webhook signature verification
- [ ] No secrets in frontend bundles (check build output)
- [ ] No secrets in git history
- [ ] HTTPS enforced everywhere (no mixed content)
- [ ] Secure headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options)
- [ ] Cookie security (httpOnly, secure, sameSite)
- [ ] Password hashing (bcrypt/argon2, sufficient rounds)
- [ ] Email enumeration prevention (forgot-password always returns success)
- [ ] Admin endpoints require admin role
- [ ] Anthropic API key not exposed to frontend
- [ ] No PII in logs

### 1.4 Performance & Latency Audit
- [ ] API response times: all endpoints < 200ms (except AI calls)
- [ ] Database query optimization: indexes on all WHERE/JOIN columns
- [ ] Redis caching: content API (5-min TTL), rate limiting
- [ ] Frontend bundle size (target < 500KB gzipped)
- [ ] Image optimization (WebP, lazy loading)
- [ ] Lighthouse audit: Performance > 90, Accessibility > 95, SEO > 95
- [ ] Mobile performance (3G simulation)
- [ ] Docker resource limits (memory, CPU)
- [ ] Database connection pooling configured
- [ ] No N+1 queries

### 1.5 Best Practices Check
- [ ] All API responses have consistent shape: `{ data, error, message }`
- [ ] All forms have proper validation (client + server)
- [ ] All forms have accessible labels, aria attributes
- [ ] All interactive elements ≥ 44px touch targets
- [ ] All images have alt text
- [ ] All pages have proper meta tags (title < 60 chars, description < 160 chars)
- [ ] 404 page exists and is branded
- [ ] 500 error page exists and is user-friendly
- [ ] Loading states for all async operations
- [ ] Empty states for all list views
- [ ] Proper HTTP status codes (not 200 for everything)

## Phase 2: Pre-Release (March 13-14)

### 2.1 Stripe Live Mode
- [ ] Create live Stripe products + prices (Focus €9.99, Insight €24.99, Clarity €49.99)
- [ ] Switch .env: sk_test_ → sk_live_, pk_test_ → pk_live_
- [ ] Create live webhook endpoint in Stripe Dashboard
- [ ] Update STRIPE_WEBHOOK_SECRET in .env
- [ ] Test real payment (€9.99 Focus, refund after)
- [ ] Verify webhook fires + tier activates

### 2.2 Strike Live Mode
- [ ] Configure Strike webhook URL in Strike Dashboard
- [ ] Test real Lightning payment (small amount)
- [ ] Verify tier activation

### 2.3 Enable Registration
- [ ] Set REGISTRATION_ENABLED=true
- [ ] Set REQUIRE_EMAIL_VERIFICATION=true
- [ ] Test full registration flow with real email

### 2.4 Pre-seed Data
- [ ] Create BTCPRAGUE50 promo code (50% off, 12 months, Jun 1-30, 200 max)
- [ ] Verify all tier descriptions populated (EN + DE)
- [ ] Verify all health zone descriptions populated (EN + DE)
- [ ] Verify all marker translations populated (EN + DE)

### 2.5 Release Candidate (RC1)
- [ ] Version bump to v1.0.0-rc1
- [ ] Full deploy: backend + frontend + website
- [ ] Helmut: full manual test pass
- [ ] Fix any RC1 issues found

### 2.6 Release Candidate (RC2/RC3 if needed)
- [ ] Fix issues from RC1 testing
- [ ] Re-deploy + re-test
- [ ] Helmut: approval for production release

## Phase 3: Production Release (March 14-15)

### 3.1 GitLab Sync
- [ ] Push all code to GitLab (sovereign-health/*)
- [ ] Update README.md (project description, setup instructions, architecture)
- [ ] Update CHANGELOG.md (all changes since v0.18.0)
- [ ] Update LICENSE files
- [ ] Tag v1.0.0
- [ ] Verify GitLab CI/CD pipeline (even if not using for deploy)

### 3.2 VPS Snapshot
- [ ] Helmut: create VPS snapshot in Hostinger (pre-release backup)
- [ ] Document snapshot date + label

### 3.3 Production Deploy
- [ ] Final docker compose build + up
- [ ] Verify all services healthy
- [ ] Verify all domains resolving (sovereignhealth.io, app., api., claw.)
- [ ] Verify SSL certs valid
- [ ] Verify Cloudflare rules active
- [ ] Monitor logs for 30 minutes post-deploy

### 3.4 Post-Deploy Verification
- [ ] Register a real test account (new email)
- [ ] Complete real payment flow
- [ ] Verify Doctor Chat works
- [ ] Verify public Dr. Alex chatbot works
- [ ] Check all pages render correctly (desktop + mobile)
- [ ] Check German locale works
- [ ] Submit updated sitemaps to Google Search Console

### 3.5 Announce
- [ ] Update early-access@sovereignhealth.io list: "We're live!"
- [ ] Update any social media / landing pages

---

## POST-LAUNCH ROADMAP

### Phase 1: Polish & Growth (April 2026)
- [ ] #27 — Symptom tracking
- [ ] #31 — Anti-nutrients / Food Intelligence database
- [ ] Group A — Diet protocol two-axis model (what you eat × when you eat)
- [ ] Batch 28 — Smart Import improvements (lab photo/PDF AI extraction)
- [ ] #21b — Admin dashboard metrics (Stripe revenue, DAU/MAU)
- [ ] Mailgun bounce/complaint webhook handling
- [ ] Newsletter mailing list (opt-in, separate from transactional)
- [ ] Quota warning emails (80%+ Doctor Chat used)

### Phase 2: Expansion (May 2026)
- [ ] #30 — Allergy tracking
- [ ] #28 — Food photo / Meal Analysis AI
- [ ] #22b — Additional promo codes for marketing campaigns
- [ ] Content Web admin tab — full website CMS
- [ ] Video tutorial pipeline (HeyGen AI + Playwright + Rumble)
- [ ] E2E client-side encryption toggle (if not already done)
- [ ] Wearable sync research (Apple Health, Google Fit APIs)

### Phase 3: BTC Prague Launch (June 1-10, 2026)
- [ ] BTCPRAGUE50 promo code active
- [ ] Marketing materials ready (QR codes, flyers, demo)
- [ ] Demo mode polished for live presentations
- [ ] Landing page updated with BTC Prague branding
- [ ] Stress test: handle 100+ signups in a day

### Phase 4: Post-BTC Prague (July+ 2026)
- [ ] BTCPay Server (dedicated Bitcoin node, full sovereignty)
- [ ] Mobile app (React Native iOS + Android)
- [ ] Coach/Trainer multi-client dashboard
- [ ] Population benchmarking / percentiles (Insight tier)
- [ ] API for third-party integrations
- [ ] SOC 2 compliance preparation (if enterprise interest)

---

## KEY DATES

| Date | Milestone |
|------|-----------|
| Mar 12 | Testing + bug fixes |
| Mar 13-14 | Code audit + security + RC1 |
| Mar 14-15 | RC2/3 + production release v1.0.0 |
| Mar 31 | Phase 0 complete |
| Apr 30 | Phase 1 complete (Symptom, Diet, Smart Import) |
| May 31 | Phase 2 complete (Allergy, Food AI, Encryption) |
| Jun 1-10 | Phase 3: BTC Prague prep |
| Jun 11-13 | 🎯 BTC Prague conference |
| Jul+ | Phase 4: Mobile, BTCPay, Enterprise |
