# BrickOS Compliance Framework

## Purpose

This framework structures our compliance posture for external auditors, investors, and internal governance. It covers 14 EU regulatory regimes and is designed to be:

1. **Auditor-friendly** -- every claim links to evidence (code, test, ADR, or document)
2. **Repeatable** -- automated checks where possible, manual checklists for the rest
3. **Living** -- quarterly review cadence with dated snapshots

---

## Directory Structure

```
docs/compliance/
  COMPLIANCE-FRAMEWORK.md          # This file -- master overview
  eu-regulatory-matrix.md          # Traffic-light status across all regimes
  data-processing-records.md       # GDPR Art. 30 -- processing activities
  audit-history.md                 # Log of all compliance reviews with dates
  
  regimes/                         # One file per regulatory regime
    gdpr.md
    ai-act.md
    cra.md                         # Cyber Resilience Act
    nis2.md
    data-act.md
    data-governance-act.md
    ePrivacy.md                    # Cookie/consent rules
    dismissed/                     # Regimes evaluated and deemed not applicable
      kritis.md
      dora.md
      fida.md
      digital-omnibus.md
      digital-fairness-act.md
      european-innovation-act.md
      vsa.md
      eu-us-data-privacy.md

  evidence/                        # Links to evidence, organized by control
    encryption.md                  # Points to: ADR 004, brickos-crypto, tests
    access-control.md              # Points to: ADR 003, RLS, auth middleware
    data-portability.md            # Points to: export handlers, GDPR test
    right-to-erasure.md            # Points to: purge service, cascade test
    ai-transparency.md             # Points to: disclaimer UI, ai_usage_log
    incident-response.md           # Points to: docs/security/incident-response.md
    vulnerability-management.md    # Points to: cargo audit, SBOM, ZAP reports

  sbom/                            # Software Bill of Materials (already exists)
    rust-dependencies.txt
    npm-dependencies.txt
    SBOM-README.md

  reports/                         # Point-in-time audit reports
    2026-Q2-initial-assessment/
      summary.md
      findings.md
      remediation-plan.md
    
  pentest-scope.md                 # Already exists
```

---

## Regime Assessment Template

Each file in `regimes/` follows this structure:

```markdown
# [Regime Name] -- Compliance Assessment

**Regulation:** [Full official name + reference number]
**Effective date:** [When it takes effect / enforcement deadline]
**Last reviewed:** [Date of this assessment]
**Next review:** [Date -- quarterly]
**Status:** Compliant | Partially Compliant | Non-Compliant | Not Applicable
**Reviewer:** [Name/role]

## 1. Applicability

Does this regime apply to BrickOS? Why/why not?

- [ ] Applies directly
- [ ] Applies indirectly (through supply chain, sector rules)
- [ ] Does not apply (with reasoning)

**Classification:** [Where BrickOS falls in the regime's taxonomy]

## 2. Requirements Mapping

| Requirement | Article/Section | Our Implementation | Status | Evidence |
|---|---|---|---|---|
| [Requirement 1] | Art. X | [How we meet it] | GREEN/AMBER/RED | [Link to code/doc/test] |
| [Requirement 2] | Art. Y | [How we meet it] | GREEN/AMBER/RED | [Link] |

## 3. Gaps

| Gap | Severity | Remediation | Effort | Target Date |
|---|---|---|---|---|
| [What's missing] | Critical/High/Medium/Low | [What to do] | [Points] | [When] |

## 4. Evidence Index

| Control | Evidence Type | Location | Last Verified |
|---|---|---|---|
| Encryption at rest | Code + Test | `crates/brickos-crypto/`, `tests/encryption.test.ts` | [Date] |
| Access control | Code + ADR | `ADR 003`, `middleware/auth.rs` | [Date] |

## 5. Review History

| Date | Reviewer | Changes | Next Review |
|---|---|---|---|
| 2026-04-06 | Initial | First assessment | 2026-07-01 |
```

---

## Evidence Template

Each file in `evidence/` follows this structure:

```markdown
# [Control Name] -- Evidence Package

**Control:** [What security/compliance control this covers]
**Regimes:** [Which regimes require this: GDPR Art. X, AI Act Art. Y, ...]
**Last verified:** [Date]
**Verification method:** [Automated test / Manual review / Code audit]

## Implementation

[Brief description of how we implement this control]

## Code References

| Component | File | Lines | Purpose |
|---|---|---|---|
| [Name] | [path/to/file.rs] | [L100-150] | [What it does] |

## Test References

| Test | File | Assertion |
|---|---|---|
| [Test name] | [path/to/test.ts] | [What it verifies] |

## ADR References

| ADR | Title | Relevance |
|---|---|---|
| ADR-NNN | [Title] | [Why this ADR is evidence] |

## Automated Verification

```bash
# Command to verify this control
cargo test --test integration -- test_encryption
pnpm test -- src/lib/gdpr-export-completeness.test.ts
```

## Manual Verification Steps

1. [Step 1]
2. [Step 2]
```

---

## Traffic Light Definitions

| Color | Meaning | Action Required |
|---|---|---|
| GREEN | Fully compliant, evidence available, tests passing | Quarterly review only |
| AMBER | Partially compliant, gaps identified, remediation planned | Fix within 1-2 sprints |
| RED | Non-compliant, critical gap, no remediation in place | Fix immediately |
| GREY | Not applicable, with documented reasoning | Annual re-evaluation |

---

## Quarterly Review Process

1. **Review each regime** -- has anything changed in the regulation or our implementation?
2. **Re-run automated checks** -- `cargo audit`, `pnpm audit`, compliance test suite
3. **Update evidence dates** -- verify code references are still valid
4. **Update matrix** -- refresh traffic-light status
5. **Document in audit-history.md** -- what was reviewed, what changed
6. **Create snapshot** -- copy current state to `reports/YYYY-QN-review/`

### Automated Review Script

```bash
# Run all compliance-relevant checks
cargo audit                                    # Rust dependency vulnerabilities
pnpm audit                                     # npm dependency vulnerabilities
cargo clippy -- -D warnings                    # Code quality
pnpm test -- gdpr                              # GDPR-specific tests
pnpm test -- compliance                        # Compliance test suite
curl -s https://api.sovereignhealth.io/health  # Service availability
# Generate fresh SBOM
cargo tree -p sovereign-health-backend --depth 1 > docs/compliance/sbom/rust-dependencies.txt
pnpm list --depth 0 > docs/compliance/sbom/npm-dependencies.txt
```

---

## Mapping: Controls to Regimes

| Control | GDPR | AI Act | CRA | NIS 2 | Data Act |
|---|---|---|---|---|---|
| Encryption at rest | Art. 32 | -- | Annex I | Art. 21 | -- |
| Encryption in transit | Art. 32 | -- | Annex I | Art. 21 | -- |
| Access control (RLS) | Art. 25 | -- | -- | Art. 21 | -- |
| Data portability | Art. 20 | -- | -- | -- | Art. 4-5 |
| Right to erasure | Art. 17 | -- | -- | -- | -- |
| Consent management | Art. 7 | -- | -- | -- | -- |
| AI transparency | -- | Art. 52 | -- | -- | -- |
| AI risk assessment | -- | Art. 9 | -- | -- | -- |
| Vulnerability handling | -- | -- | Art. 11 | Art. 21 | -- |
| SBOM | -- | -- | Art. 13 | -- | -- |
| Incident response | Art. 33 | -- | Art. 11 | Art. 23 | -- |
| Audit logging | Art. 30 | Art. 12 | -- | Art. 21 | -- |
| Data processing records | Art. 30 | -- | -- | -- | -- |

---

## Contact

- **Data Protection Officer:** [TBD -- required once company is founded]
- **Platform Admin:** [Your email]
- **Security Contact:** [security@sovereignhealth.io -- to be set up]
