# EU Data Act -- Compliance Assessment

**Regulation:** Regulation (EU) 2023/2854 on harmonised rules on fair access to and use of data (Data Act)
**Effective date:** 12 September 2025
**Last reviewed:** 2026-04-05
**Next review:** 2026-07-01
**Status:** Mostly Compliant
**Reviewer:** Platform Lead

## 1. Applicability

The Data Act primarily addresses IoT data access rights (Chapter II-III), B2B data sharing (Chapter IV), cloud switching (Chapter VI), and international data access safeguards (Chapter VII). BrickOS is a health data platform where users manually upload their own data -- it does not generate data through connected products (IoT).

- [ ] Applies directly
- [x] Applies indirectly (through supply chain, sector rules)
- [ ] Does not apply (with reasoning)

**Classification:**

- **Chapter II-III (IoT data access):** Not applicable -- BrickOS does not collect data from connected products or IoT devices. Users manually upload lab results and biomarker data.
- **Chapter IV (B2B data sharing):** Not applicable -- BrickOS does not facilitate B2B data sharing. Personal health data is stored for individual user access only.
- **Chapter VI (Cloud switching):** Applicable -- BrickOS is a SaaS data processing service. Users must be able to switch away and export their data. Also applicable to self-hosted users transitioning between hosting providers.
- **Chapter VII (International transfers):** Partially applicable -- relates to government access requests for non-personal data. BrickOS primarily holds personal data (covered by GDPR).

## 2. Requirements Mapping

| Requirement | Article/Section | Our Implementation | Status | Evidence |
|---|---|---|---|---|
| Data portability (user data export) | Art. 4-5 | Full JSON + CSV export of all user health data | GREEN | `api/src/handlers/export.rs` |
| Machine-readable format | Art. 5(1) | JSON export is machine-readable; CSV widely parseable | GREEN | Export handler outputs structured JSON |
| No vendor lock-in | Art. 23-25 (switching) | AGPL source code available; standard PostgreSQL; data fully exportable | GREEN | AGPL-3.0 license, ADR 007 |
| Switching assistance | Art. 24 | Self-hosted option available; export covers all user data | GREEN | ADR 007, Core tier |
| Transition period for switching | Art. 25 | 30-day account deletion grace period allows data retrieval | GREEN | `api/src/services/purge.rs` |
| No switching charges | Art. 25(2) | No charges for data export or account closure | GREEN | Export is available on all tiers including free |
| Interoperability (open standards) | Art. 28-30 | JSON/CSV export; no proprietary formats | GREEN | Standard formats used |
| Protection against unlawful government access | Art. 32 | EU-hosted (Germany); AGPL allows self-hosting for full control | GREEN | Contabo Germany hosting; self-hosted option |

## 3. Gaps

| Gap | Severity | Remediation | Effort | Target Date |
|---|---|---|---|---|
| No FHIR or HL7 health data export format | Low | Consider adding FHIR R4 export for healthcare interoperability; not required by Data Act but adds value | 8 pts | 2026-Q4 |
| No formal switching documentation for users | Low | Create user-facing guide on how to export data and migrate to another provider or self-hosted | 2 pts | 2026-Q3 |

## 4. Evidence Index

| Control | Evidence Type | Location | Last Verified |
|---|---|---|---|
| Data export (JSON + CSV) | Code | `api/src/handlers/export.rs` | 2026-04-05 |
| Data deletion (with grace period) | Code | `api/src/services/purge.rs` | 2026-04-05 |
| Self-hosted option | ADR | ADR 007 (`adr/007-dual-mode-saas-selfhosted.md`) | 2026-04-05 |
| Open-source license | License file | `LICENSE` (AGPL-3.0) | 2026-04-05 |
| No proprietary data formats | Architecture | JSON/CSV standard formats; PostgreSQL standard schema | 2026-04-05 |

## 5. Review History

| Date | Reviewer | Changes | Next Review |
|---|---|---|---|
| 2026-04-05 | Platform Lead | Initial assessment; mostly compliant, minor gaps only | 2026-07-01 |
