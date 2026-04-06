# Cyber Resilience Act -- Compliance Assessment

**Regulation:** Regulation (EU) 2024/2847 on horizontal cybersecurity requirements for products with digital elements (Cyber Resilience Act)
**Effective date:** 11 December 2027 (full enforcement); vulnerability reporting obligations from 11 September 2026
**Last reviewed:** 2026-04-05
**Next review:** 2026-07-01
**Status:** Partially Compliant
**Reviewer:** Platform Lead

## 1. Applicability

BrickOS is a product with digital elements -- software distributed to users (self-hosted AGPL version) and offered as a SaaS. The CRA applies to products placed on the EU market. The self-hosted version (Core tier) is a product with digital elements; the SaaS version may fall under different treatment (pure SaaS is excluded, but downloadable components are in scope).

- [x] Applies directly
- [ ] Applies indirectly (through supply chain, sector rules)
- [ ] Does not apply (with reasoning)

**Classification:** Default category (not critical, not highly critical). Health software without medical device classification falls under default requirements.

**Open-source consideration:** BrickOS is AGPL-3.0. The CRA includes an exemption for open-source software not supplied in the course of a commercial activity (Recital 18). However, since BrickOS is also offered commercially (SaaS tiers), the exemption does not fully apply. The "open-source software steward" provisions (Art. 24) may apply.

## 2. Requirements Mapping

| Requirement | Article/Section | Our Implementation | Status | Evidence |
|---|---|---|---|---|
| Security by design | Art. 10 + Annex I | AES-256-GCM encryption, RLS, JWT auth, security headers | GREEN | ADR 003, ADR 004, `crates/brickos-crypto/` |
| Vulnerability handling | Art. 11 | `cargo audit`, `pnpm audit`, ZAP scans | AMBER | SBOM docs; no automated notification pipeline |
| SBOM provision | Art. 13(1) | SBOM generated for Rust (42 deps) and npm (37 deps) | AMBER | `docs/compliance/sbom/`; not in CycloneDX/SPDX format |
| Security updates | Art. 10(6) | Docker-based deployment with version-tagged images | AMBER | `ops/deploy.sh`; self-hosted update mechanism TBD |
| Reporting exploited vulnerabilities | Art. 14 | Incident response procedure exists | RED | No process for reporting to ENISA within 24h |
| CE marking / declaration of conformity | Art. 18-20 | Not started | RED | Pre-enforcement; not required until Dec 2027 |
| Technical documentation | Art. 13 | ADRs, architecture docs, SBOM | AMBER | `docs/project-files/adr/`; not in CRA-specified format |
| Coordinated vulnerability disclosure | Art. 11(4) | No formal CVD policy | RED | Not published |
| No known exploitable vulnerabilities | Art. 10(3) | Regular dependency audits; ZAP scanning | GREEN | `cargo audit`, `pnpm audit`, pentest scope doc |
| Secure default configuration | Art. 10(1) / Annex I | Docker-only deployment, env-based config, no default passwords | GREEN | ADR 009, docker-compose configs |

## 3. Gaps

| Gap | Severity | Remediation | Effort | Target Date |
|---|---|---|---|---|
| SBOM not in CycloneDX/SPDX format | Medium | Generate CycloneDX SBOM using `cargo-cyclonedx` and `@cyclonedx/bom` | 3 pts | 2026-Q3 |
| No automated vulnerability notification pipeline | Medium | Set up `cargo audit` + `pnpm audit` in CI with notifications to platform admin | 3 pts | 2026-Q3 |
| No coordinated vulnerability disclosure policy | High | Publish `SECURITY.md` in repo root + `security.txt` at well-known URL | 2 pts | 2026-Q2 |
| No ENISA vulnerability reporting process | Medium | Document 24h early warning + 72h notification process for actively exploited vulns | 2 pts | 2026-Q3 |
| Self-hosted security update mechanism | Medium | Implement update notification for Core tier users; document update procedure | 5 pts | 2026-Q4 |
| CE marking / conformity declaration | Low | Prepare when approaching Dec 2027 deadline | 5 pts | 2027-Q3 |

## 4. Evidence Index

| Control | Evidence Type | Location | Last Verified |
|---|---|---|---|
| SBOM (Rust) | Generated list | `docs/compliance/sbom/rust-dependencies.txt` | 2026-04-05 |
| SBOM (npm) | Generated list | `docs/compliance/sbom/npm-dependencies.txt` | 2026-04-05 |
| SBOM documentation | Document | `docs/compliance/sbom/SBOM-README.md` | 2026-04-05 |
| Encryption implementation | Code | `crates/brickos-crypto/src/lib.rs` | 2026-04-05 |
| Deployment security | Script + ADR | `ops/deploy.sh`, ADR 008, ADR 009 | 2026-04-05 |
| Pentest scope | Document | `docs/compliance/pentest-scope.md` | 2026-04-05 |
| Incident response | Document | `docs/project-files/security/incident-response.md` | 2026-04-05 |

## 5. Review History

| Date | Reviewer | Changes | Next Review |
|---|---|---|---|
| 2026-04-05 | Platform Lead | Initial assessment; vulnerability reporting deadline noted for Sep 2026 | 2026-07-01 |
