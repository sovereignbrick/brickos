---
number: 252
github_number: 473
title: "design: EU regulatory compliance audit — structured evaluation across 14 regimes"
labels: [design, compliance, legal, priority-high]
milestone: privacy-and-security
---

## Description

Perform a structured evaluation of BrickOS/Sovereign Health compliance with EU regulatory frameworks. Document findings for continuous auditing and future reference.

## Regulatory Regimes to Evaluate

| # | Regime | Focus Area |
|---|--------|------------|
| 1 | **EU AI Act** | AI system classification, risk assessment, transparency for Dr. Alex |
| 2 | **KRITIS** (DE) | Critical infrastructure requirements for health data platforms |
| 3 | **DORA** | Digital Operational Resilience Act — ICT risk management |
| 4 | **European Innovation Act** | Innovation-friendly compliance, sandbox eligibility |
| 5 | **FIDA** (Financial Data Access) | Financial data sharing/access rights |
| 6 | **Digital Omnibus** | Consumer protection in digital services |
| 7 | **NIS 2** | Network and Information Security — incident reporting, supply chain |
| 8 | **Digital Fairness Act** | Fair practices in digital markets |
| 9 | **Data Act** | Data access, portability, B2B data sharing |
| 10 | **Cyber Resilience Act** | Security requirements for products with digital elements |
| 11 | **Verschlusssachenanweisung** (VSA) | Classified information handling (DE federal) |
| 12 | **EU-US Data Privacy Framework** | Transatlantic data transfers, adequacy |
| 13 | **Data Governance Act** | Data intermediaries, altruistic data sharing |
| 14 | **GDPR** | Already partially addressed — continuous compliance check |

## Structured Approach

For each regime, document:

1. **Applicability** — Does this regime apply to BrickOS? Why/why not?
2. **Classification** — What category does BrickOS fall into (e.g., AI Act risk level)?
3. **Current compliance** — What do we already satisfy?
4. **Gaps** — What's missing?
5. **Remediation** — What changes are needed? Effort estimate.
6. **Timeline** — When does the regime take effect / enforcement deadline?
7. **Evidence** — Where is compliance demonstrated (code, docs, tests)?

## Deliverables

- [ ] `docs/compliance/eu-regulatory-matrix.md` — master overview table
- [ ] One sub-document per regime: `docs/compliance/regimes/{regime-slug}.md`
- [ ] Traffic-light status dashboard (green/amber/red per regime)
- [ ] Link findings to existing issues (#245 security hardening, #242 GDPR cascade)
- [ ] Quarterly review cadence documented

## Notes

- Some regimes (FIDA, VSA) may not directly apply but should be evaluated and dismissed with reasoning
- AI Act classification is critical — Dr. Alex may qualify as high-risk health AI
- Cross-reference with issue #245 (security hardening framework)
