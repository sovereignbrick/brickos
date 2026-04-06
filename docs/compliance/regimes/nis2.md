# NIS 2 -- Compliance Assessment

**Regulation:** Directive (EU) 2022/2555 on measures for a high common level of cybersecurity across the Union (NIS 2 Directive)
**Effective date:** Member states required to transpose by 17 October 2024; German implementation (NIS2UmsuCG) pending
**Last reviewed:** 2026-04-05
**Next review:** 2026-07-01
**Status:** Partially Compliant
**Reviewer:** Platform Lead

## 1. Applicability

NIS 2 applies to entities in critical sectors. The health sector (Annex I, point 5) is classified as a "sector of high criticality." Entities include healthcare providers and entities manufacturing pharmaceutical or medical products. BrickOS is a health data platform, not a healthcare provider or medical device manufacturer.

- [ ] Applies directly
- [x] Applies indirectly (through supply chain, sector rules)
- [ ] Does not apply (with reasoning)

**Classification:** Forward-looking assessment. BrickOS is currently pre-launch with limited users. NIS 2 applicability depends on:

1. **Size threshold:** NIS 2 generally applies to medium and large enterprises (50+ employees, EUR 10M+ turnover). BrickOS is below this threshold.
2. **Sector classification:** Health data platforms are not explicitly listed, but if BrickOS serves healthcare providers, it may fall under supply chain obligations.
3. **German implementation:** The NIS2UmsuCG (German transposition) may expand scope. Monitor for final text.

**Current assessment:** NIS 2 does not directly apply today due to size, but obligations are relevant as best-practice security baseline and for future growth.

## 2. Requirements Mapping

| Requirement | Article/Section | Our Implementation | Status | Evidence |
|---|---|---|---|---|
| Risk management measures | Art. 21(1) | Security-by-design architecture; no formal risk management framework | AMBER | ADR 003, ADR 004; no risk register |
| Incident handling | Art. 21(2)(b) | Incident response procedure documented | GREEN | `docs/project-files/security/incident-response.md` |
| Business continuity | Art. 21(2)(c) | Backups exist; no formal BCP/DRP | AMBER | Backup procedures; no documented BCP |
| Supply chain security | Art. 21(2)(d) | SBOM, dependency scanning (`cargo audit`, `pnpm audit`) | AMBER | `docs/compliance/sbom/`; no formal supply chain policy |
| Network and information systems security | Art. 21(2)(e) | TLS 1.3, security headers, firewall, Docker isolation | GREEN | nginx config, Cloudflare, ADR 009 |
| Vulnerability handling and disclosure | Art. 21(2)(e) | Dependency audits; no formal disclosure policy | AMBER | `cargo audit`; no `SECURITY.md` |
| Cybersecurity training | Art. 21(2)(g) | Solo developer; no formal training program | AMBER | N/A at current scale |
| Cryptography and encryption | Art. 21(2)(h) | AES-256-GCM at rest, TLS 1.3 in transit, rustls (no OpenSSL) | GREEN | ADR 004, ADR 005, `crates/brickos-crypto/` |
| Access control | Art. 21(2)(i) | JWT auth, RLS, role-based access, MFA | GREEN | `middleware/auth.rs`, ADR 003 |
| Multi-factor authentication | Art. 21(2)(j) | MFA supported for user accounts | GREEN | Auth implementation |
| Incident reporting (early warning 24h) | Art. 23(4)(a) | Procedure exists; no established channel to national CSIRT | RED | No reporting relationship established |
| Incident reporting (notification 72h) | Art. 23(4)(b) | Same as above | RED | No reporting relationship established |

## 3. Gaps

| Gap | Severity | Remediation | Effort | Target Date |
|---|---|---|---|---|
| No formal risk management framework | High | Create risk register with identified threats, likelihood, impact, and mitigations | 5 pts | 2026-Q3 |
| No supply chain security policy | Medium | Document supply chain security policy covering sub-processors, dependency management | 3 pts | 2026-Q3 |
| No incident reporting channel to BSI/CSIRT | Medium | Identify relevant national authority (BSI for Germany); document reporting process | 2 pts | 2026-Q3 |
| No business continuity / disaster recovery plan | High | Create BCP/DRP covering: data center loss, database corruption, key compromise | 5 pts | 2026-Q3 |
| No formal vulnerability disclosure policy | Medium | Publish `SECURITY.md` + `security.txt` (overlaps with CRA gap) | 2 pts | 2026-Q2 |
| Monitor German NIS2UmsuCG transposition | Low | Track legislative status; reassess applicability when enacted | 1 pt | Ongoing |

## 4. Evidence Index

| Control | Evidence Type | Location | Last Verified |
|---|---|---|---|
| Encryption (at rest + in transit) | Code + ADR | `crates/brickos-crypto/src/lib.rs`, ADR 004, ADR 005 | 2026-04-05 |
| Access control | Code + ADR | `api/src/middleware/auth.rs`, ADR 003 | 2026-04-05 |
| Incident response | Document | `docs/project-files/security/incident-response.md` | 2026-04-05 |
| SBOM / dependency management | Generated lists | `docs/compliance/sbom/` | 2026-04-05 |
| Docker isolation | ADR | ADR 009 (`adr/009-docker-only-development.md`) | 2026-04-05 |
| Backup procedures | Script | `ops/deploy.sh` backup functionality | 2026-04-05 |
| GitLab backup mirror | ADR | ADR 032 (`adr/032-gitlab-backup-mirror.md`) | 2026-04-05 |

## 5. Review History

| Date | Reviewer | Changes | Next Review |
|---|---|---|---|
| 2026-04-05 | Platform Lead | Initial assessment; classified as forward-looking, below size threshold | 2026-07-01 |
