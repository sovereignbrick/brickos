---
number: 466
github_number: 407
title: "feat: org license JWT generate/validate (RS256) + revocation list"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, feature, security]
created: 2026-04-10
priority: P0
sprint: 040
phase: B
design: 022
estimate: 0.5d
blocked_by: [462, 460]
---

Replaces the dead HS256 generator in `services/licensing.rs` with a real RS256 implementation that produces self-contained, offline-verifiable certificates.

## Scope

- [ ] `generate_org_license(input) -> JWT` using RS256 + private key
- [ ] Persist `org_licenses` row with the JWT (cache + audit trail)
- [ ] Mark previous active license `revoked_at = NOW()` when issuing a new one
- [ ] `validate_org_license(jwt) -> claims` with full validation chain:
  - Signature against public key
  - `exp > now`, `nbf <= now` with 60s clock skew
  - `aud` contains the requesting app
  - `jti` not in revocation list
  - `sub` matches request org context
- [ ] Revocation list: in-memory cache, 60s reload from `org_licenses_revoked`
- [ ] `revoke_org_license(jti, reason)` updates DB + revocation table
- [ ] Periodic cleanup: `DELETE FROM org_licenses_revoked WHERE original_exp < NOW() - INTERVAL '30 days'`
- [ ] Unit tests: roundtrip, expired, wrong audience, revoked jti

## Verification

- [ ] Generated JWT validates with public key
- [ ] Tampered JWT fails validation
- [ ] Revoked jti rejected within 60s of revocation
- [ ] Old (HS256) `services/licensing.rs` test removed

## References

- design 022 §6, §5.6
