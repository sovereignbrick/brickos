# Sprint 026 - EU Compliance Frameworks & Launch Readiness

**Started:** TBD
**Duration:** 2-3 days
**Status:** PLANNED
**Goal:** Map BrickOS against EU regulatory frameworks, implement compliance gaps, and prepare the platform for confident public launch with documented compliance posture.

## Why Now

BrickOS stores sensitive health data (biomarkers, lab results, medications, AI conversations) and uses AI for health analysis (Dr. Alex). Before public launch, we need to:
1. Know which EU regulations apply and which don't
2. Document our compliance posture for each
3. Fix any critical gaps
4. Have evidence ready for investors, partners, and auditors

## Sprint Backlog

### Phase 1: Regulatory Assessment (documentation - no code)

| # | Title | Pts |
|---|-------|-----|
| #252 | EU regulatory compliance audit (14 regimes) | 8 |

This is the largest item. For each of the 14 regimes, assess applicability and current compliance.

**Priority regimes (directly applicable):**

| Regime | Why It Matters to BrickOS |
|---|---|
| **GDPR** | We process health data (Art. 9 special categories). Already mostly compliant - need gap check. |
| **EU AI Act** | Dr. Alex is an AI system analyzing health data. Risk classification determines obligations. May be high-risk (health domain). |
| **Cyber Resilience Act (CRA)** | Software product with digital elements. SBOM already generated (#293). Need vulnerability handling process. |
| **NIS 2** | Network security for essential/important entities. Incident reporting, supply chain security. |
| **Data Act** | Data portability rights for users. We already support JSON/CSV export. |
| **Data Governance Act** | Data intermediaries - may not apply (we're not an intermediary). |

**Lower priority (evaluate and dismiss/defer):**

| Regime | Likely Applicability |
|---|---|
| KRITIS (DE) | Likely not applicable (threshold: 500K users/significant market share) |
| DORA | Financial sector only - not directly applicable unless BTC payments trigger it |
| FIDA | Financial data access - not applicable (health, not finance) |
| Digital Omnibus | Consumer protection - general compliance, nothing specific |
| Digital Fairness Act | Fair practices - general, no specific gap expected |
| European Innovation Act | Sandbox eligibility - opportunity, not obligation |
| VSA | Classified info - not applicable (no government contracts) |
| EU-US Data Privacy Framework | Only if US data transfers - currently EU-only hosting |

**Sub-tasks:**
- [ ] Create master matrix: `docs/compliance/eu-regulatory-matrix.md`
- [ ] For each of the 6 priority regimes, write: `docs/compliance/regimes/{slug}.md`
  - Applicability assessment
  - Current compliance status (green/amber/red)
  - Gaps identified
  - Remediation needed + effort estimate
  - Evidence pointers (code, docs, tests, ADRs)
- [ ] For each of the 8 lower-priority regimes, write 1-paragraph dismissal with reasoning
- [ ] AI Act risk classification for Dr. Alex (critical - determines if we need conformity assessment)

### Phase 2: Critical Compliance Gaps (code changes)

| # | Title | Pts | Regime |
|---|-------|-----|--------|
| -- | AI Act: Dr. Alex risk classification + transparency | 5 | EU AI Act |
| #188 | Newsletter consent toggle in settings | 2 | GDPR |
| -- | Data processing records (Art. 30 GDPR) | 3 | GDPR |
| -- | Cookie consent / privacy banner | 2 | ePrivacy / GDPR |
| #260 | GitHub security tools (Semgrep in CI) | 3 | CRA / NIS 2 |

**AI Act transparency sub-tasks:**
- [ ] Classify Dr. Alex: high-risk health AI or limited-risk?
  - High-risk if: "intended to be used as safety components in the management and operation of critical digital infrastructure, road traffic, or in the supply of water, gas, heating and electricity" OR health domain assistants
  - Limited-risk if: AI system that interacts with users (chatbot) but doesn't make autonomous decisions
- [ ] Add transparency notice: "This analysis is AI-generated and not medical advice"
- [ ] Add AI system card: model used, training data scope, limitations
- [ ] Log all AI decisions with input/output for auditability (already in `ai_usage_log`)
- [ ] User opt-out mechanism for AI analysis

**Data processing records (Art. 30):**
- [ ] Create `docs/compliance/data-processing-records.md`
- [ ] Document each processing activity:
  - Purpose, legal basis, categories of data subjects
  - Categories of personal data processed
  - Recipients, transfers, retention periods
  - Technical/organizational security measures
- [ ] Categories: measurements, user profiles, AI conversations, billing, affiliates, audit logs

**Newsletter consent (#188):**
- [ ] Settings > Privacy: toggle for newsletter consent
- [ ] Separate from product updates consent
- [ ] Record consent timestamp in DB
- [ ] Unsubscribe link in every email

**Cookie consent:**
- [ ] Audit current cookies: auth_token, locale, sh_ref, sh_theme, sh_recent_searches
- [ ] Classify: strictly necessary (auth, locale) vs functional (theme, recent searches) vs marketing (sh_ref)
- [ ] Add cookie banner for non-essential cookies (or document that all are strictly necessary)

**GitHub security tools (#260):**
- [ ] Add Semgrep SAST to GitHub Actions (or document why Actions are disabled)
- [ ] Alternative: run Semgrep locally as pre-push hook
- [ ] Configure rules: OWASP Top 10, Rust-specific, TypeScript-specific

### Phase 3: Compliance Testing

| # | Title | Pts |
|---|-------|-----|
| -- | Compliance test suite | 5 |
| #271 | OpenVAS network security scan | 2 |

**Compliance test suite sub-tasks:**
Map tests to specific regulatory requirements:
- [ ] GDPR Art. 17 (Right to erasure): verify delete cascade removes all data
- [ ] GDPR Art. 20 (Data portability): verify JSON/CSV export includes all data
- [ ] GDPR Art. 25 (Data protection by design): verify encryption at rest
- [ ] GDPR Art. 32 (Security): verify TLS, RLS, access controls
- [ ] AI Act (Transparency): verify AI disclaimer shown to users
- [ ] CRA (Vulnerability handling): verify cargo audit + pnpm audit clean
- [ ] NIS 2 (Incident reporting): verify incident response procedure exists
- [ ] Add to E2E suite or create dedicated `e2e/suite-compliance.spec.ts`

**OpenVAS scan (#271):**
- [ ] Run OpenVAS against staging VPS
- [ ] Document findings
- [ ] Fix critical/high findings
- [ ] Accept/document medium/low findings

## Dependency Graph

```
Phase 1 (no dependencies, start immediately):
═══════════════════════════════════════════════
  #252 Regulatory assessment (largest item)
    |
    +--> Determines which Phase 2 items are critical
    +--> AI Act classification drives transparency requirements

Phase 2 (after Phase 1 assessment):
════════════════════════════════════
  AI Act transparency ─── depends on risk classification from Phase 1
  #188 Newsletter consent ─── independent
  Data processing records ─── independent (documentation)
  Cookie consent ─── independent
  #260 Security tools ─── independent

Phase 3 (after Phase 2 fixes):
══════════════════════════════
  Compliance test suite ─── needs Phase 2 code changes to test
  #271 OpenVAS scan ─── independent (infrastructure)
```

## Execution Order

```
DAY 1 MORNING
══════════════
  Track A: #252 Priority regimes assessment (GDPR, AI Act, CRA, NIS 2)
  Track B: Data processing records (Art. 30) -- documentation
  Track C: Cookie audit + #188 newsletter consent

DAY 1 AFTERNOON
════════════════
  #252 Lower-priority regime dismissals (8 regimes)
  AI Act: Dr. Alex risk classification
  #260 Security tools (Semgrep setup)

DAY 2 MORNING
══════════════
  AI Act transparency implementation (disclaimer, system card)
  Cookie consent banner (if needed)
  Compliance test suite

DAY 2 AFTERNOON
════════════════
  #271 OpenVAS scan against staging
  Final compliance matrix review
  RC testing + deploy

DAY 3 (if needed)
═══════════════════
  Fix OpenVAS findings
  Documentation polish
  Production deploy
```

## Total Points: 30

## Risk Assessment

- **AI Act classification** is the highest-risk item. If Dr. Alex is classified as high-risk health AI, we may need: conformity assessment, quality management system, post-market monitoring. This is a significant effort beyond this sprint. If high-risk, we document what's needed and plan a dedicated compliance sprint.
- **GDPR** should be mostly green -- we have encryption, access controls, export, deletion, consent. The gap check may reveal minor issues.
- **Cookie consent** may be unnecessary if all our cookies are strictly necessary (auth, locale). Need to audit first.
- **OpenVAS** may find infrastructure issues that require VPS hardening beyond this sprint.

## Expected Deliverables

1. `docs/compliance/eu-regulatory-matrix.md` -- master status table
2. `docs/compliance/regimes/gdpr.md` -- detailed GDPR assessment
3. `docs/compliance/regimes/ai-act.md` -- AI Act classification + gap analysis
4. `docs/compliance/regimes/cra.md` -- Cyber Resilience Act assessment
5. `docs/compliance/regimes/nis2.md` -- NIS 2 assessment
6. `docs/compliance/regimes/data-act.md` -- Data Act assessment
7. `docs/compliance/regimes/data-governance-act.md` -- assessment
8. `docs/compliance/data-processing-records.md` -- Art. 30 records
9. AI transparency notice in Dr. Alex UI
10. Newsletter consent toggle (#188)
11. Compliance test suite
12. OpenVAS scan report
