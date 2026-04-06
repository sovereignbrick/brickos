# EU Regulatory Matrix -- BrickOS

**Last updated:** 2026-04-05
**Next review:** 2026-07-01

This matrix provides a traffic-light overview of BrickOS compliance posture across all 14 evaluated EU regulatory regimes. See individual assessments in `regimes/` for full details.

## Traffic Light Definitions

| Color | Meaning | Action Required |
|---|---|---|
| GREEN | Fully compliant, evidence available | Quarterly review only |
| AMBER | Partially compliant, gaps identified, remediation planned | Fix within 1-2 sprints |
| RED | Non-compliant, critical gap | Fix immediately |
| GREY | Not applicable, with documented reasoning | Annual re-evaluation |

---

## Priority Regimes (Assessed)

| # | Regime | Status | Applicability | Key Gaps | Next Action | Assessment |
|---|---|---|---|---|---|---|
| 1 | **GDPR** (EU 2016/679) | AMBER | Direct -- processes EU health data | DPAs missing, cookie consent, Art. 30 register | Execute DPAs with Anthropic/Stripe/Contabo | [gdpr.md](regimes/gdpr.md) |
| 2 | **EU AI Act** (EU 2024/1689) | AMBER | Direct -- deploys AI system (Dr. Alex) | No "AI-generated" label, no AI system card | Add AI transparency label to Dr. Alex UI | [ai-act.md](regimes/ai-act.md) |
| 3 | **Cyber Resilience Act** (EU 2024/2847) | AMBER | Direct -- software product with digital elements | SBOM format, no CVD policy, no ENISA reporting | Publish SECURITY.md + vulnerability disclosure policy | [cra.md](regimes/cra.md) |
| 4 | **NIS 2** (EU 2022/2555) | AMBER | Indirect -- below size threshold, forward-looking | No risk register, no BCP/DRP, no CSIRT channel | Create risk management framework | [nis2.md](regimes/nis2.md) |
| 5 | **Data Act** (EU 2023/2854) | GREEN | Indirect -- cloud switching provisions | Minor: no FHIR format, no switching guide | Create user switching documentation | [data-act.md](regimes/data-act.md) |
| 6 | **Data Governance Act** (EU 2022/868) | GREY | Not applicable | None | Annual re-evaluation | [data-governance-act.md](regimes/data-governance-act.md) |

## Dismissed Regimes (Evaluated, Not Applicable)

| # | Regime | Status | Reasoning | Assessment |
|---|---|---|---|---|
| 7 | **ePrivacy Directive** (2002/58/EC) | AMBER | Cookie consent obligations apply; covered under GDPR assessment | Pending -- to be assessed |
| 8 | **KRITIS / IT-SiG 2.0** | GREY | German critical infrastructure -- BrickOS is not a KRITIS operator | [dismissed/kritis.md](regimes/dismissed/kritis.md) |
| 9 | **DORA** (EU 2022/2554) | GREY | Financial sector resilience -- BrickOS is not a financial entity | [dismissed/dora.md](regimes/dismissed/dora.md) |
| 10 | **FIDA** (proposed) | GREY | Financial data access -- not applicable to health data | [dismissed/fida.md](regimes/dismissed/fida.md) |
| 11 | **Digital Omnibus Directive** | GREY | Consumer protection amendments -- monitor for SaaS implications | [dismissed/digital-omnibus.md](regimes/dismissed/digital-omnibus.md) |
| 12 | **Digital Fairness Act** (proposed) | GREY | Consumer protection -- monitor for dark pattern rules | [dismissed/digital-fairness-act.md](regimes/dismissed/digital-fairness-act.md) |
| 13 | **European Innovation Act** | GREY | Research exemptions -- not currently applicable | [dismissed/european-innovation-act.md](regimes/dismissed/european-innovation-act.md) |
| 14 | **EU-US Data Privacy Framework** | AMBER | Relevant for Anthropic API calls (US transfer); covered under GDPR Art. 44-49 | Pending -- to be assessed |

---

## Compliance Summary

**Overall posture:** AMBER -- core security controls are strong (encryption, access control, audit logging), but governance documentation gaps remain.

### Strengths
- Field-level encryption (AES-256-GCM) for all health data
- Row-Level Security + pgAudit for access control
- Full data portability (JSON + CSV export)
- Right to erasure with hard purge
- AI interaction logging
- EU-hosted infrastructure (Germany)
- Self-hosted option eliminates vendor lock-in
- SBOM generated for both Rust and npm dependencies

### Priority Remediation (2026-Q2)

| Priority | Action | Regimes | Effort |
|---|---|---|---|
| 1 | Execute DPAs with Anthropic, Stripe, Contabo | GDPR | 5 pts |
| 2 | Publish SECURITY.md + vulnerability disclosure policy | CRA, NIS 2 | 2 pts |
| 3 | Add "AI-generated" transparency label to Dr. Alex | AI Act | 2 pts |
| 4 | Implement cookie consent banner | GDPR, ePrivacy | 3 pts |
| 5 | Complete newsletter consent (#188) | GDPR | 2 pts |
| 6 | Create Art. 30 processing records register | GDPR | 3 pts |
| 7 | Add medical disclaimer to Dr. Alex UI | AI Act | 1 pt |

**Total Q2 remediation:** 18 points (approx. 2-3 sprints)

### Deferred Remediation (2026-Q3+)

| Action | Regimes | Effort | Target |
|---|---|---|---|
| Generate CycloneDX SBOM | CRA | 3 pts | Q3 |
| Create risk management framework | NIS 2 | 5 pts | Q3 |
| Create BCP/DRP | NIS 2 | 5 pts | Q3 |
| AI system card + risk assessment | AI Act | 6 pts | Q3 |
| Establish ENISA/BSI reporting channel | CRA, NIS 2 | 2 pts | Q3 |
| Self-hosted update mechanism | CRA | 5 pts | Q4 |

---

## Review Schedule

| Quarter | Scope | Due Date |
|---|---|---|
| 2026-Q2 | Priority remediation execution | 2026-06-30 |
| 2026-Q3 | Full quarterly review + deferred items | 2026-09-30 |
| 2026-Q4 | Annual re-evaluation of dismissed regimes | 2026-12-31 |
| 2027-Q3 | CRA full enforcement preparation | 2027-09-30 |
