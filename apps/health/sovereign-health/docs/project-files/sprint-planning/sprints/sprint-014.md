# Sprint 014 — Licensing SSoT, Deploy Hardening & Security

**Started:** 2026-03-25
**Duration:** 2 days (2026-03-25 to 2026-03-26)
**Goal:** Establish a single source of truth for licensing/pricing that enforces tier restrictions in code, design the multi-product/multi-org license model for BrickOS as a platform, harden the deployment process, and establish the security compliance framework.

## Context

Sprint 013 shipped go-live stability but exposed three structural gaps:

1. **Licensing drift** — `license_tiers` columns, `product_features`/`tier_features` tables, website locale JSON, and pricing cards are four separate sources of truth. The app enforces limits from `license_tiers` columns while the website reads from locale JSON. ADR 022 decided tier features should be database-driven, but enforcement hasn't caught up.

2. **Platform vs App** — BrickOS is designed as a multi-product platform (Health, Finance, Infrastructure) but licensing is health-specific. The org/role schema exists (Design 021, Migration 76) but isn't activated. Need to verify the license model supports multi-product + multi-org before building more on top.

3. **Deployment fragility** — Sprint 013 had multiple staging failures from env var issues, compose conflicts, and stale caches.

### Key Design References
- **ADR 022:** Tier features database-driven (Sprint 013)
- **Design 016:** Licensing strategy (AGPL + dual-license)
- **Design 019:** Website & tier consistency (3-phase fix plan)
- **Design 021:** Multi-tenant platform offering (org/role schema)

## Sprint Backlog

### Day 1 — Design-First: Licensing Architecture + Deploy

#### P0 — Licensing Single Source of Truth (design + implementation)

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #241 | design: multi-product/multi-org license model — BrickOS platform vs app | 5 | Design | Does `license_tiers` need `product_key`? Per-product vs platform billing? Org roles across products? |
| #237 | feat: consolidate license tier table as SSoT + AI pool counting | 8 | Backend | THE key issue. `tier_features` becomes source for both display AND enforcement. Replace 8 quota columns with pool |
| #235 | feat: unified AI credit pool instead of per-feature limits | 5 | Backend | Folds into #237. Single `ai_credits_monthly` replaces 8 `chat_*_monthly` columns |
| | **Licensing Design Subtotal** | **18** | | |

#### P0 — Deploy Hardening

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #233 | ops: fix staging compose env vars, CORS, deploy robustness | 3 | Ops | Tactical prerequisite — fixes immediate staging pain |
| #234 | ops: deployment process overhaul — root cause analysis + clean redesign | 5 | Ops | Strategic redesign based on Sprint 013 failures (design doc + key fixes) |
| | **Deploy Subtotal** | **8** | | |

### Day 2 — Pricing Content, Security & PWA

#### P0 — Pricing & Website Content (depends on Day 1 licensing work)

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #236 | fix: pricing page must sync with feature-details master table | 3 | Website | Now trivial: read from unified SSoT designed in #237. Update locale JSON EN+DE |
| #230 | fix: website license tiers reflect current state | 3 | Website | Audit all tiers against new SSoT. Sister issue to #236 |
| #243 | fix: markers directory must include all markers + calculated | 2 | Website | Content audit, same pattern as above |
| | **Content Subtotal** | **8** | | |

#### P0 — Security Hardening

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #245 | design: security hardening + continuous compliance framework | 5 | Security | Priority-high. Design doc: 6-layer model |
| #242 | fix: GDPR account deletion must cascade all user data | 3 | Security | Follows #245, Layer 4 compliance |
| #209 | fix: access log missing PDF + GDPR export entries | 2 | Security | Follows #245, Layer 3 audit logging |
| | **Security Subtotal** | **10** | | |

#### P1 — PWA Quick Fixes (bundle)

| # | Title | Points | Area | Notes |
|---|-------|--------|------|-------|
| #221 | fix: PWA icon missing on Linux (Flatpak Chrome) | 1 | PWA | Same manifest area |
| #222 | fix: PWA app name — show full product name everywhere | 1 | PWA | Bundle with #221 |
| #240 | fix: PWA splash screen — blank black page, add logo animation | 2 | PWA | Bundle with #221/#222 |
| | **PWA Subtotal** | **4** | | |

## Dependency Graph

```
Day 1 (design-first):
  #241 (license model design) ──► #237 (SSoT implementation)
                                    │
                               #235 (AI pool) ─┘ (folds into #237)
                                    │
  #233 (staging fix) ──► #234 (deploy redesign)

Day 2 (depends on Day 1):
  #237 (SSoT) ──► #236 (pricing sync) ──► website deploy
             ──► #230 (tier audit)    ──►
             ──► #243 (markers audit) ──►

  #245 (security design) ──► #242 (GDPR cascade)
                          ──► #209 (access log)

  #221 + #222 + #240 (PWA bundle, independent)
```

## Licensing Architecture Decisions (to resolve in #241/#237)

These questions must be answered during Day 1 design work:

1. **Is `license_tiers` product-scoped?**
   - Current: tiers are global (Glimpse/Focus/Insight/Clarity/Horizon)
   - Needed: user could be Clarity for Health but Free for Finance
   - Proposal: add `product_key` column to `license_tiers`

2. **Where does enforcement read from?**
   - Current: `license_tiers` columns (`chat_general_monthly`, etc.)
   - Target: `tier_features` table (same source as website feature-details)
   - Migration: new `check_tier_feature(user, feature_key)` replaces hardcoded column reads

3. **AI credit pool model**
   - Replace 8 per-chat counters with single `ai_credits_monthly` per tier
   - Credit costs: chat=1, smart import=2, trend analysis=1
   - Reset: monthly cron or lazy reset

4. **Org billing model**
   - Per-user (current) vs per-org subscription
   - Can orgs span products? (clinic: Health for patients + Finance for billing)
   - Org roles need product scope (admin of Health, viewer of Finance)

5. **Self-hosted implications**
   - Core tier = self-hosted. Does Core cover all products or per-product?
   - `SHI_MODE=oss` bypass: keep for development, remove for production

## Execution Order

```
Day 1 (2026-03-25):
  1. cargo fmt (separate commit)                               ~5 min
  2. #241 license model design doc                             ~2 hrs
     → Resolve: product_key, org billing, enforcement source
  3. #237 SSoT implementation (design + migration + tier.rs)   ~3 hrs
     → tier_features becomes enforcement source
     → #235 AI pool folds in here
  4. #233 staging compose fix                                  ~1 hr
  5. #234 deploy process redesign (design doc + key fixes)     ~2 hrs

Day 2 (2026-03-26):
  1. #236 pricing page sync (EN + DE locale JSON)              ~1.5 hrs
  2. #230 website tier audit against new SSoT                  ~1.5 hrs
  3. #243 markers directory audit                              ~1 hr
  4. #245 security hardening design doc                        ~2 hrs
  5. #242 GDPR delete cascade                                  ~1 hr
  6. #209 access log fix                                       ~30 min
  7. #221 + #222 + #240 PWA fix bundle                         ~1 hr
  8. RC check + deploy                                         ~30 min
```

## Velocity Budget

| Priority | Points |
|----------|--------|
| P0 — Licensing SSoT (#241, #237, #235) | 18 pts |
| P0 — Deploy Hardening (#233, #234) | 8 pts |
| P0 — Pricing & Content (#236, #230, #243) | 8 pts |
| P0 — Security (#245, #242, #209) | 10 pts |
| P1 — PWA Fixes (#221, #222, #240) | 4 pts |
| **Total Planned** | **48 pts** |

## Issues Deferred (Conscious Scope Cuts)

| # | Title | Why Deferred |
|---|-------|-------------|
| #019 | feat: onboarding flow (8pt) | Needs stable licensing/tier model first. Next sprint |
| #238 | feat: AI usage cost tracking | Depends on #237 pool model. Next sprint after pool ships |
| #239 | feat: AI model agnostic | Infrastructure work, not blocking licensing |
| #229 | ops: fresh clone setup test | Follow-up after #234 |
| #232 | ops: Lighthouse audit | After PWA fixes land |

## Local ↔ GitHub Issue Mapping

Local tracker numbers diverged from GitHub during bulk sync. Reference table:

| Local # | GitHub # | Title |
|---------|----------|-------|
| #241 | GH-227 | design: multi-product/multi-org license model |
| #237 | GH-231 | feat: license tier SSoT + AI pool counting |
| #235 | GH-233 | feat: unified AI credit pool |
| #233 | GH-235 | ops: staging compose fix |
| #234 | GH-234 | ops: deployment process overhaul |
| #236 | GH-232 | fix: pricing page sync |
| #230 | GH-238 | fix: website license tiers |
| #243 | GH-225 | fix: markers directory |
| #245 | GH-223 | design: security hardening |
| #242 | GH-226 | fix: GDPR delete cascade |
| #209 | GH-209 | fix: access log missing entries |
| #221 | GH-246 | fix: PWA icon missing |
| #222 | GH-245 | fix: PWA app name |
| #240 | GH-228 | fix: PWA splash screen |

## Success Criteria

After this sprint:

1. **Licensing SSoT exists** — `tier_features` is THE source for both website display AND app enforcement
2. **AI credit pool designed + migrated** — single pool replaces 8 per-chat quotas
3. **Multi-product license model documented** — clear answer on product_key, org billing, role scoping
4. **Pricing page accurate** — EN + DE match the SSoT, with "View full comparison" link
5. **Deploy process redesigned** — documented root cause analysis, staging env vars fixed
6. **Security framework designed** — 6-layer model with 2 items implemented (#242, #209)
7. **PWA polished** — icon, name, and splash screen fixed on Linux
