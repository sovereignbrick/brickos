# Sovereign Health — Testing Architecture

## Overview

Every test type mapped to: who runs it, what tool, when it runs, and who owns it.

---

## 🏗️ TESTING PYRAMID

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲          ← Few, slow, high confidence
                 ╱────────╲
                ╱Integration╲      ← Medium count, medium speed
               ╱──────────────╲
              ╱   Unit Tests    ╲  ← Many, fast, focused
             ╱────────────────────╲
```

---

## 📊 TEST TYPE MATRIX

### 1. Unit Tests
| Aspect | Detail |
|--------|--------|
| **What** | Test individual functions, handlers, utils in isolation |
| **Who writes** | Claude Code (generates alongside feature code) |
| **Who reviews** | swickDoctor (checks coverage, edge cases) |
| **Backend tool** | `cargo test` + `cargo-nextest` (already installed) |
| **Frontend tool** | `vitest` (faster than Jest for Next.js) |
| **When runs** | Every commit (local + CI/CD) |
| **Coverage target** | 80%+ for handlers, 90%+ for utils/calculations |

**Example:** Test that HOMA-IR calculation returns correct value for given inputs.

### 2. Integration Tests
| Aspect | Detail |
|--------|--------|
| **What** | Test API endpoints with real DB, test frontend API calls |
| **Who writes** | Claude Code |
| **Who reviews** | swickDoctor |
| **Backend tool** | `cargo test` with test DB + `sqlx::test` macro |
| **Frontend tool** | `vitest` + `msw` (Mock Service Worker for API mocking) |
| **When runs** | Every push to GitLab (CI/CD pipeline) |
| **Needs** | Test PostgreSQL container in CI |

**Example:** POST /api/v1/measurements creates record, GET returns it with correct zone assignment.

### 3. E2E Tests (End-to-End)
| Aspect | Detail |
|--------|--------|
| **What** | Full user journeys: browser → frontend → backend → DB |
| **Who writes** | Claude Code (with swickDoctor writing test scenarios) |
| **Who reviews** | swickDoctor |
| **Tool** | **Playwright** (best for Next.js, cross-browser) |
| **When runs** | Before merge to main (CI/CD), nightly |
| **Needs** | Full stack running (Docker Compose in CI) |

**Example:** User registers → verifies email → logs in → adds glucose measurement → sees it on dashboard.

### 4. Smoke Tests
| Aspect | Detail |
|--------|--------|
| **What** | Quick "is it alive?" checks after deployment |
| **Who writes** | Claude Code (in ops/infra) |
| **Who runs** | swickDoctor bot (automated after deploy) |
| **Tool** | Simple HTTP checks (curl / custom Rust binary) |
| **When runs** | After every deployment to staging/production |
| **Checks** | /health returns 200, DB connected, Redis connected, frontend loads |

**Example:** After deploy, hit /health → expect `{"status":"ok"}`.

### 5. Acceptance Tests
| Aspect | Detail |
|--------|--------|
| **What** | Verify features match spec requirements |
| **Who writes** | swickDoctor (writes acceptance criteria) → Claude Code (implements) |
| **Who reviews** | swickDoctor + Helmut |
| **Tool** | Playwright (same as E2E, but spec-driven scenarios) |
| **When runs** | Before feature sign-off |

**Example:** "As a user, when I add a glucose measurement of 5.8 mmol/L, it should show as 🟢 green in the Energy zone."

### 6. Snapshot Tests
| Aspect | Detail |
|--------|--------|
| **What** | Detect unintended UI changes |
| **Who writes** | Claude Code |
| **Who reviews** | swickDoctor (reviews snapshot diffs) |
| **Tool** | `vitest` inline snapshots (component output) + Playwright visual snapshots (screenshots) |
| **When runs** | Every push (CI/CD) |

**Example:** Dashboard component renders same HTML structure after refactor.

### 7. Performance Tests
| Aspect | Detail |
|--------|--------|
| **What** | Response times, throughput, resource usage |
| **Who writes** | Claude Code |
| **Who reviews** | swickDoctor (analyzes results) |
| **Tool** | **k6** (JavaScript-based, excellent for HTTP APIs) |
| **When runs** | Before major releases, weekly on staging |
| **Targets** | API p95 < 200ms, dashboard load < 2s |

**Example:** 100 concurrent users adding measurements for 5 minutes → p95 < 200ms.

### 8. Load Tests
| Aspect | Detail |
|--------|--------|
| **What** | System behavior under expected/peak load |
| **Who writes** | Claude Code |
| **Who reviews** | swickDoctor |
| **Tool** | **k6** (same tool, different scenarios) |
| **When runs** | Before production launch, monthly |
| **Scenarios** | Normal (50 users), Peak (200 users), Stress (500 users) |

**Example:** Ramp from 10 to 200 users over 10 minutes, sustain for 30 minutes.

### 9. Security Tests
| Aspect | Detail |
|--------|--------|
| **What** | Vulnerabilities, auth bypass, injection, data leaks |
| **Who writes** | Mixed (automated + manual review) |
| **Who reviews** | swickDoctor |
| **Tools** | |
| — Dependency audit | `cargo audit` (Rust) + `pnpm audit` (Node) |
| — SAST (static) | GitLab SAST (built-in, free) |
| — API security | **OWASP ZAP** (automated scan) |
| — Auth testing | Custom Playwright tests (token expiry, MFA bypass attempts) |
| **When runs** | Every push (audit), weekly (ZAP scan), before release (full) |

**Checks:**
- SQL injection on all inputs
- JWT token validation (expired, malformed, missing)
- MFA bypass attempts
- CORS misconfiguration
- Health data not leaked in error messages
- Rate limiting (Phase 2)

### 10. Property-Based Tests
| Aspect | Detail |
|--------|--------|
| **What** | Generate random inputs, verify properties always hold |
| **Who writes** | Claude Code |
| **Who reviews** | swickDoctor |
| **Backend tool** | `proptest` crate (Rust) |
| **Frontend tool** | `fast-check` (TypeScript) |
| **When runs** | CI/CD (subset), nightly (full) |

**Example:** For ANY valid glucose value (0.1–50.0 mmol/L), the zone assignment never panics and always returns a valid color.

### 11. Fuzz Tests
| Aspect | Detail |
|--------|--------|
| **What** | Throw garbage at parsers/endpoints, find crashes |
| **Who writes** | Claude Code |
| **Who reviews** | swickDoctor |
| **Backend tool** | `cargo-fuzz` (libFuzzer) |
| **When runs** | Nightly (CI/CD), continuous in background |
| **Targets** | JSON parsers, measurement input validation, CSV import (Phase 2) |

**Example:** Fuzz the measurement creation endpoint with random JSON → should never panic, always return proper error.

### 12. Regression Tests
| Aspect | Detail |
|--------|--------|
| **What** | Ensure fixed bugs don't come back |
| **Who writes** | Claude Code (for every bug fix: write test FIRST, then fix) |
| **Who reviews** | swickDoctor |
| **Tool** | Same as unit/integration (added to existing suites) |
| **When runs** | Every commit (CI/CD) |
| **Rule** | Every bug fix MUST include a regression test |

**Example:** Bug: duplicate measurements allowed at same timestamp. Test: verify UNIQUE constraint rejects duplicate.

---

## 🔧 TOOL SUMMARY

### Install on dev-comp (via Claude Code)
```
Backend (Rust):
  cargo-nextest     ✅ already installed
  cargo-audit       → cargo install cargo-audit
  cargo-fuzz        → cargo install cargo-fuzz
  proptest          → add to Cargo.toml [dev-dependencies]

Frontend (Node):
  vitest            → pnpm add -D vitest @testing-library/react
  msw               → pnpm add -D msw (API mocking)
  fast-check        → pnpm add -D fast-check
  playwright        → pnpm add -D @playwright/test

Both:
  k6                → sudo apt install k6 (load testing)
```

### Run in CI/CD (GitLab)
```
GitLab SAST         → Built-in, enable in .gitlab-ci.yml
OWASP ZAP           → Docker container in CI pipeline
PostgreSQL service  → services: [postgres:15-alpine] in CI
```

---

## 👥 RESPONSIBILITY SPLIT

```
┌─────────────────────────────────────────────────────┐
│              swickDoctor (Architect + Reviewer)       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ✅ Write test scenarios & acceptance criteria        │
│  ✅ Review test code pushed to GitLab                │
│  ✅ Analyze test results & coverage reports          │
│  ✅ Run smoke tests after deployment (bot)           │
│  ✅ Security review (check for data leaks, auth)     │
│  ✅ Performance analysis (interpret k6 results)      │
│  ✅ Regression tracking (maintain known issues list) │
│                                                      │
│  ❌ Cannot run tests locally (no access to Pop!_OS) │
│  ❌ Cannot execute Playwright (no browser access)    │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Claude Code (Builder + Executor)         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ✅ Write all test code (unit, integration, E2E)     │
│  ✅ Run tests locally (cargo test, pnpm test)        │
│  ✅ Fix failing tests                                │
│  ✅ Generate test data & fixtures                    │
│  ✅ Set up test infrastructure (vitest, playwright)  │
│  ✅ Write CI/CD pipeline test stages                 │
│                                                      │
│  ❌ Doesn't know the full spec (needs prompts)       │
│  ❌ Can't review against business requirements       │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              GitLab CI/CD (Automated)                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ✅ Run unit + integration tests on every push       │
│  ✅ Run E2E tests before merge to main               │
│  ✅ Run security scans (SAST, dependency audit)      │
│  ✅ Run snapshot comparison                          │
│  ✅ Generate coverage reports                        │
│  ✅ Nightly: fuzz tests, full property tests, k6     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔌 SKILLS / PLUGINS swickDoctor COULD USE

### Currently Available — Sufficient
| Capability | How |
|---|---|
| Fetch & review code | `web_fetch` GitLab raw URLs ✅ |
| Analyze screenshots | `image` tool ✅ |
| Search for best practices | `web_search` ✅ |
| Write test specs | Built-in (no tool needed) ✅ |

### Would Be Useful — Skills to Build or Install
| Skill | What It Would Do | Priority |
|---|---|---|
| **gitlab-reviewer** | Auto-fetch changed files on push, run checklist, post review comments via GitLab API | 🔴 HIGH |
| **test-reporter** | Parse cargo-nextest / vitest / playwright JSON output, generate summary dashboard | 🟡 MEDIUM |
| **coverage-tracker** | Track test coverage % over time, alert on drops | 🟡 MEDIUM |
| **security-scanner** | Run `cargo audit` + `pnpm audit` results analysis, CVE lookup | 🟡 MEDIUM |
| **k6-analyzer** | Parse k6 JSON results, compare against performance budgets | 🟢 LOW (Phase 2) |

### NOT Needed as Skills (Claude Code handles these)
| Capability | Why Claude Code |
|---|---|
| Writing test code | Claude Code writes + runs tests locally |
| Running tests | Claude Code executes on Pop!_OS |
| Fixing test failures | Claude Code iterates until green |
| Setting up test infra | Claude Code installs packages, configures |
| Writing CI/CD pipelines | Claude Code creates .gitlab-ci.yml |

---

## 📅 TESTING PHASES

### Phase 1 (During Hello World → MVP)
- [x] cargo-nextest installed
- [ ] Add `vitest` to frontend
- [ ] Add `playwright` for E2E
- [ ] Unit tests for every handler
- [ ] Integration tests for every API endpoint
- [ ] Smoke test script in ops/infra
- [ ] `cargo audit` + `pnpm audit` in CI
- [ ] GitLab SAST enabled

### Phase 2 (Post-MVP)
- [ ] Property-based tests (proptest + fast-check)
- [ ] Fuzz testing (cargo-fuzz on parsers)
- [ ] k6 load tests
- [ ] OWASP ZAP security scan
- [ ] Coverage tracking dashboard
- [ ] Nightly test runs

### Phase 3 (Scale)
- [ ] Visual regression (Playwright screenshots)
- [ ] Performance budgets in CI (fail if p95 > 200ms)
- [ ] Chaos testing (kill containers, verify recovery)
- [ ] Penetration testing (manual or contracted)

---

## 🎯 GOLDEN RULE

> **Every Claude Code task prompt includes:** "Write tests for this feature. Unit tests for logic, integration test for the API endpoint. Tests must pass before committing."

This ensures tests are never an afterthought — they're built with every feature.
