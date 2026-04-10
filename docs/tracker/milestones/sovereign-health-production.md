---
name: Sovereign Health Intelligence -- Production Quality
github_number: 36
description: Production hardening, quality assurance, fresh data import, website consistency, white-label readiness, security audit
status: active
sprint: 039
---

# Sovereign Health Intelligence -- Production Quality

Production quality sprint after platform elevation (two-pool, shared crates, brickos-ai). Verify SHI works correctly end-to-end with real health data, ensure website consistency, prepare white-label architecture, and run security audit.

## Sprint 039 Issues

### Phase 1: Test Enhancement + Security (Days 1-3)
- [x] #398 Two-pool regression test suite
- [ ] #455 Enhance shared service tests (brickos/org/consumer layers)
- [ ] #459 Security audit (dependency, code, config, OWASP -- no cost)

### Phase 2: Fresh Data Import (Days 4-5)
- [ ] #186 Import history page
- [ ] Fresh health data import + verification (part of #454)

### Phase 3: Bug Fixes (Days 6-8)
- [ ] #454 SHI testing findings (bugs from manual testing)
- [ ] #399 Production database creation
- [ ] #400 Production deployment (SHI + SLI)

### Phase 4: Website + Docs Audit (Days 9-10)
- [ ] #456 Website marker consistency audit (117 markers)
- [ ] #458 Review GitHub, GitLab pages + all README docs

### Phase 5: White-Label Design (Days 11-12)
- [ ] #457 Design: SHI white-label architecture (doc 021)

## Related (backlog)
- #386 SHI content_strings in own database
- #324 Professional penetration testing (2-5K EUR budget)
