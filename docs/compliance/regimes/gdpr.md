# GDPR -- Compliance Assessment

**Regulation:** General Data Protection Regulation (EU) 2016/679
**Effective date:** 25 May 2018
**Last reviewed:** 2026-04-05
**Next review:** 2026-07-01
**Status:** Partially Compliant
**Reviewer:** Platform Lead

## 1. Applicability

BrickOS processes personal health data (special category data under Art. 9) of EU residents. GDPR applies directly.

- [x] Applies directly
- [ ] Applies indirectly (through supply chain, sector rules)
- [ ] Does not apply (with reasoning)

**Classification:** Data controller (for SaaS mode). Data processor provisions also relevant for organization features (ADR 031). Processing of special category data (Art. 9) -- health data -- requires explicit consent (Art. 9(2)(a)) or another lawful basis.

## 2. Requirements Mapping

| Requirement | Article/Section | Our Implementation | Status | Evidence |
|---|---|---|---|---|
| Lawful basis for processing | Art. 6 | User consent at registration; legitimate interest for account management | AMBER | Registration flow; no formal lawful basis register |
| Explicit consent for health data | Art. 9(2)(a) | Users actively upload their own health data; consent implied by action | AMBER | Upload handlers; consent not separately recorded per upload |
| Data protection by design | Art. 25 | Field-level AES-256-GCM encryption, PostgreSQL RLS, pgAudit | GREEN | ADR 003, ADR 004, `crates/brickos-crypto/src/lib.rs` |
| Security of processing | Art. 32 | AES-256-GCM at rest, TLS 1.3 in transit, RLS, JWT auth | GREEN | ADR 004, `middleware/auth.rs`, Cloudflare + nginx config |
| Data portability | Art. 20 | Full JSON + CSV export of all user data | GREEN | `api/src/handlers/export.rs` |
| Right to erasure | Art. 17 | Soft delete + 30-day grace period + hard purge (cascade) | GREEN | `api/src/services/purge.rs`, ADR 016 |
| Right of access | Art. 15 | Users can view all stored data via dashboard; full export available | GREEN | Dashboard UI, `handlers/export.rs` |
| Breach notification | Art. 33-34 | Incident response procedure documented; no automated notification to supervisory authority | AMBER | `docs/project-files/security/incident-response.md` |
| Processing records | Art. 30 | Audit logging via pgAudit + access_log service | AMBER | `api/src/services/access_log.rs`; no formalized Art. 30 register |
| Data Protection Officer | Art. 37 | Not appointed (pre-company stage) | RED | N/A -- pre-incorporation |
| Data processing agreements | Art. 28 | Anthropic (AI), Stripe (payments), Contabo (hosting) -- not documented | RED | No DPAs on file |
| Consent management | Art. 7 | Newsletter consent toggle exists but incomplete | AMBER | Issue #188 |
| Cookie consent | Art. 7 + ePrivacy | No cookie consent banner | RED | Not implemented |
| Data minimization | Art. 5(1)(c) | Only user-provided health data stored; no third-party data collection | GREEN | Architecture design |
| Storage limitation | Art. 5(1)(e) | 30-day purge after deletion; AI usage logs retained for compliance | GREEN | `services/purge.rs` |
| International transfers | Art. 44-49 | All infrastructure in EU (Contabo, Germany); Anthropic API calls to US | AMBER | Anthropic DPA needed; ADR 013 |

## 3. Gaps

| Gap | Severity | Remediation | Effort | Target Date |
|---|---|---|---|---|
| Art. 30 processing records not formalized | High | Create `data-processing-records.md` with all processing activities | 3 pts | 2026-Q2 |
| Art. 37 DPO not appointed | Medium | Appoint once company is incorporated; document interim contact | 1 pt | Post-incorporation |
| Art. 28 DPAs with Anthropic, Stripe, Contabo | High | Execute DPAs with all sub-processors; maintain processor register | 5 pts | 2026-Q2 |
| Cookie consent banner missing | High | Implement cookie consent (ePrivacy overlap); integrate with consent management | 3 pts | 2026-Q2 |
| Newsletter consent toggle incomplete | Medium | Complete #188 -- double opt-in, withdrawal mechanism, audit trail | 2 pts | 2026-Q2 |
| Art. 9 explicit consent not separately recorded | Medium | Add explicit consent capture for health data processing at first upload | 3 pts | 2026-Q2 |
| Anthropic international transfer safeguards | Medium | Verify Anthropic DPA covers SCCs or adequacy decision equivalent | 2 pts | 2026-Q2 |

## 4. Evidence Index

| Control | Evidence Type | Location | Last Verified |
|---|---|---|---|
| Encryption at rest (AES-256-GCM) | Code + ADR | `crates/brickos-crypto/src/lib.rs`, ADR 004 | 2026-04-05 |
| Encryption in transit (TLS 1.3) | Config | Cloudflare SSL, nginx TLS termination | 2026-04-05 |
| Row-Level Security | Code + ADR | ADR 003, PostgreSQL RLS policies | 2026-04-05 |
| Data export (portability) | Code | `api/src/handlers/export.rs` | 2026-04-05 |
| Data deletion (erasure) | Code | `api/src/services/purge.rs` | 2026-04-05 |
| Access logging | Code | `api/src/services/access_log.rs`, pgAudit | 2026-04-05 |
| Auth middleware (access control) | Code | `api/src/middleware/auth.rs` | 2026-04-05 |
| GDPR architecture | ADR | ADR 016 (`docs/project-files/adr/016-gdpr-privacy-architecture.md`) | 2026-04-05 |
| Incident response | Document | `docs/project-files/security/incident-response.md` | 2026-04-05 |

## 5. Review History

| Date | Reviewer | Changes | Next Review |
|---|---|---|---|
| 2026-04-05 | Platform Lead | Initial assessment | 2026-07-01 |
