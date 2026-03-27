# Design 033: Compliance Audit Framework

**Status:** Draft
**Date:** 2026-03-27
**Issue:** #252

---

## Problem

We need to track compliance across 14 EU regulatory frameworks plus technical security standards. This requires:
1. A structured evaluation of each regime
2. Evidence collection (code, configs, test results, docs)
3. Continuous auditing (not one-time checks)
4. Remediation tracking when gaps are found

---

## Two-Layer Compliance Model

### Layer 1: Technical Security (automated via OpenVAS)

Scans against server/infrastructure policies:

| Policy | What It Checks | Frequency |
|--------|---------------|-----------|
| **CIS Ubuntu** | OS hardening, SSH config, firewall, users | Monthly |
| **IT-Grundschutz** | German BSI baseline security | Monthly |
| **PCI-DSS** | Payment data security (relevant for Stripe) | Quarterly |
| **Custom: SHI Policy** | Our specific controls (TLS, RLS, encryption) | Monthly |

These run in OpenVAS under Resilience > Compliance Audits.

### Layer 2: Regulatory Compliance (structured manual + code-verified)

For each of the 14 EU regimes, evaluate using this template:

```
docs/compliance/regimes/{regime-slug}.md

1. Applicability: Does this regime apply? (yes/no/partial + reasoning)
2. Classification: What category does SHI fall into?
3. Controls: List of specific requirements
4. Current Status: For each control: implemented / partial / gap
5. Evidence: Link to code, migration, test, or design doc
6. Remediation: What's needed for gaps? Effort estimate.
7. Timeline: When does enforcement begin?
8. Review Date: Last reviewed, next review scheduled
```

---

## Regime Prioritization

| Priority | Regime | Why | Enforcement |
|----------|--------|-----|-------------|
| **P0 (active)** | GDPR | Already processing EU health data | Active now |
| **P1 (2025-2026)** | NIS 2 | Network security for digital services | Oct 2024 (transposed) |
| **P1** | Cyber Resilience Act | Products with digital elements | 2027 |
| **P1** | EU AI Act | Dr. Alex AI classification | Aug 2025 (phased) |
| **P2** | DORA | Digital operational resilience (if financial) | Jan 2025 |
| **P2** | Data Act | Data access and portability | Sep 2025 |
| **P2** | Data Governance Act | Data intermediary rules | Sep 2023 |
| **P3** | KRITIS (DE) | Only if classified as critical infra | Ongoing |
| **P3** | EU-US Data Privacy Framework | Only if US data transfers | Active |
| **P3** | Digital Fairness Act | Consumer protection | TBD |
| **P3** | Digital Omnibus | Consumer protection | TBD |
| **P3** | FIDA | Financial data (not primary) | TBD |
| **P3** | European Innovation Act | Sandbox eligibility | TBD |
| **P3** | Verschlusssachenanweisung | Only if classified data | N/A likely |

---

## Implementation Plan

### Phase 1: GDPR Completion (current sprint)

Already implemented:
- [x] Encryption at rest (Art. 32)
- [x] Encryption in transit (Art. 32)
- [x] Access control / RLS (Art. 25)
- [x] Audit logging (Art. 30)
- [x] Right to erasure (Art. 17)
- [x] Data portability (Art. 20)
- [x] Consent management (Art. 7)
- [x] Data minimization (Art. 5)

Still needed:
- [ ] Data Protection Impact Assessment (DPIA) document
- [ ] Privacy policy review (lawyer)
- [ ] Data processing register (Art. 30 written record)
- [ ] Breach notification procedure (Art. 33, 72h to DPA)
- [ ] DPO appointment (if required by scale)

### Phase 2: NIS 2 + Cyber Resilience (next 2 sprints)

NIS 2 requirements:
- [ ] Risk management policies
- [ ] Incident handling procedures
- [ ] Business continuity / backup verification
- [ ] Supply chain security assessment
- [ ] Vulnerability disclosure policy
- [ ] Security awareness (documented)
- [ ] Encryption policies (documented)

Cyber Resilience Act:
- [ ] Vulnerability handling process
- [ ] SBOM (Software Bill of Materials)
- [ ] Security update mechanism
- [ ] Coordinated vulnerability disclosure

### Phase 3: EU AI Act (Dr. Alex classification)

Dr. Alex health AI needs classification:
- [ ] Determine risk level (likely "high-risk" for health)
- [ ] If high-risk: conformity assessment, CE marking
- [ ] Transparency requirements (disclose AI use)
- [ ] Human oversight mechanism
- [ ] Technical documentation of AI system
- [ ] Risk management system for AI

### Phase 4: Quarterly Audit Cycle

| Activity | Frequency | Owner |
|----------|-----------|-------|
| OpenVAS technical scan | Monthly | Automated |
| GDPR control verification | Quarterly | App owner |
| NIS 2 policy review | Quarterly | App owner |
| AI Act compliance check | Quarterly | App owner |
| Penetration test | Annually | External firm |
| Full regime re-assessment | Annually | App owner + legal |

---

## Evidence Collection

For each compliance control, evidence is one of:

| Type | Example |
|------|---------|
| **Code** | `services/tier.rs:check_tier_feature()` - enforcement logic |
| **Migration** | `20260317000084_row_level_security.sql` - RLS policies |
| **Test** | `reference_range_test.rs` - 8 tests verify range completeness |
| **Config** | `gatus-config.yaml` - uptime monitoring |
| **Design Doc** | `Design 032` - reference range protocol impact |
| **Scan Report** | OpenVAS PDF report - network security |
| **Process Doc** | `deployment/README.md` - release workflow |

---

## Tools

| Tool | Purpose | Status |
|------|---------|--------|
| **OpenVAS** | Technical vulnerability + compliance scanning | Installed locally |
| **GitHub Security** | Secret scanning, Dependabot, Semgrep SAST | Enabled |
| **cargo audit** | Rust dependency advisories | CI pipeline |
| **pnpm audit** | npm dependency advisories | CI pipeline |
| **Trivy** | Container image CVE scanning | CI pipeline |
| **pgAudit** | Database operation audit trail | Production |
| **Gatus** | Uptime monitoring + alerting | Production |

---

## Tracking

Each regime gets:
1. A file in `docs/compliance/regimes/{slug}.md`
2. An issue in the tracker (milestone: privacy-and-security)
3. A quarterly review date
4. A traffic-light status (green/amber/red) on the compliance dashboard

The admin panel's Compliance tab (tier_features) already shows GDPR, HIPAA, NIS2, ISO 27001, SOC 2 as feature flags. These can be linked to the actual compliance status.
