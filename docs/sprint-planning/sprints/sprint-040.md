# Sprint 040 -- Licensing Foundation

**Started:** 2026-04-10
**Goal:** Ship the brickos-licensing platform service as the single source of truth across all BrickOS apps. Refactor SHI from per-app feature gating to a shared crate. Land active/preserved markers, role consolidation (5→3), org_licenses with RS256 JWT, Stripe-synced manual invoicing, brickos.io-branded billing emails, multi-org switcher, dormant accounts review, and four Playwright E2E journeys.
**Design doc:** [022-licensing-model.md](../../../docs/design/022-licensing-model.md)
**Previous:** Sprint 039 (SHI Production Quality, white-label design 021)
**Mode:** **One-week focused push.** Claude Code drives, owner reviews daily (~30-60 min/day).

---

## CRITICAL CONSTRAINTS

### 🚫 No production deployments during this sprint

**This sprint never touches production.** All work happens on:

1. **localhost** (`docker compose up` for dev + test cycles)
2. **staging** (`bash apps/health/sovereign-health/ops/deploy.sh staging` after each phase)

The production deploy script (`deploy.sh production --confirm`) **must not be run** during this sprint. The licensing refactor changes the feature gate path on which all paying customers depend, so it ships only after all phase gates pass and a follow-up validation sprint signs off.

If a production hotfix is required for an unrelated issue, branch off `main` from before Sprint 040 began, fix, deploy, and merge back.

### 🟢 Rollback safety

Before each Phase A migration, take a `pg_dump` of staging brickos DB to `~/brickos-backups/sprint-040/<phase-id>.sql`. Section 13.6 of design 022 documents the per-phase rollback plan and RTO.

### 📜 Lessons learned -- save as we go

After every phase (A → B → C → D → E), run a brief retro and write lessons to `docs/sprint-planning/sprints/sprint-040-lessons.md`. At sprint end, promote stable lessons to `~/.claude/projects/-home-dev-comp-Projects-brickos/memory/` per the auto-memory protocol.

---

## Sprint plan (5 phases by dependency)

```
A (Foundation) → B (Service) → { C (Lifecycle) || D (Admin GUI) || E (Cross-app) }
```

Phase A blocks B. Phase B blocks C, D, E. C/D/E run in parallel after B.

### Phase A -- Foundation (Day 1)

Establishes the schema, the new crate skeleton, and the seed data. **Sequential.**

| Issue | Title |
|---|---|
| [#460](../../tracker/issues/open/0460-chore-licensing-schema-migrations.md) | chore: licensing schema migrations (feature_registry, tier_definitions, tier_features, org_licenses, revocation, audit log) |
| [#461](../../tracker/issues/open/0461-chore-individual-pseudo-org-migration.md) | chore: migrate personal orgs to Individual pseudo-org + lifecycle/admin_override columns |
| [#462](../../tracker/issues/open/0462-feat-brickos-licensing-crate-skeleton.md) | feat: brickos-licensing crate skeleton + RS256 keypair |
| [#463](../../tracker/issues/open/0463-chore-roles-consolidation-tier-seed.md) | chore: roles 5→3 migration + seed canonical tier data (Glimpse=10, calc unlimited) |

**Phase A gate:** see design 022 §13.6.

### Phase B -- Service Logic (Days 2-4) -- the critical path

| Issue | Title |
|---|---|
| [#464](../../tracker/issues/open/0464-feat-brickos-licensing-crate-runtime.md) | feat: brickos-licensing crate runtime (embedded + client modes, local cache, 370d offline grace) |
| [#465](../../tracker/issues/open/0465-feat-effective-tier-resolver.md) | feat: effective tier resolver + has_feature API |
| [#466](../../tracker/issues/open/0466-feat-org-license-jwt-rs256.md) | feat: org license JWT generate/validate (RS256) + revocation list |
| [#467](../../tracker/issues/open/0467-refactor-shi-tier-to-facade.md) | refactor: SHI tier.rs → brickos-licensing facade + drop hardcoded const + delete dead licensing.rs |
| [#468](../../tracker/issues/open/0468-feat-active-vs-preserved-markers.md) | feat: active vs preserved markers (schema + read path + UI picker) |
| [#469](../../tracker/issues/open/0469-feat-seat-enforcement-admin-override.md) | feat: seat enforcement + admin override enforced + audit log writes |
| [#470](../../tracker/issues/open/0470-test-tier-feature-regression-matrix.md) | test: tier × feature regression matrix (~60 tests) + Stripe webhook contract tests |
| [#471](../../tracker/issues/open/0471-test-playwright-e2e-licensing-journeys.md) | test: Playwright E2E -- 4 licensing journeys |
| [#472](../../tracker/issues/open/0472-feat-ai-chat-hard-daily-ceiling.md) | feat: AI chat hard daily ceiling (M5) -- per-user 24h Redis counter |

**Phase B gate (the critical one):** see design 022 §13.6 -- regression matrix green, shadow mode clean, all 4 E2E journeys green, AI ceiling tested with synthetic over-limit traffic, dead code deleted, staging smoke green.

### Phase C -- Lifecycle, Notifications, Email Branding (Days 5-6, parallel with D and E)

| Issue | Title |
|---|---|
| [#473](../../tracker/issues/open/0473-feat-brickos-email-branding-payment-failure.md) | feat: brickos.io email branding + payment failure templates (day 0/7/13, DE+EN) |
| [#474](../../tracker/issues/open/0474-feat-org-termination-downgrade-renewal-emails.md) | feat: org termination + downgrade + license renewed email templates (DE+EN) |
| [#475](../../tracker/issues/open/0475-feat-scheduled-jobs-lifecycle.md) | feat: scheduled jobs (payment failure cadence, dormant flag, org termination grace) |
| [#476](../../tracker/issues/open/0476-feat-in-app-banner-manual-send.md) | feat: in-app subscription banner + manual send flow for templates |

### Phase D -- BrickOS Admin GUI (Days 5-7, parallel with C and E)

| Issue | Title |
|---|---|
| [#477](../../tracker/issues/open/0477-feat-platform-admin-orgs-list.md) | feat: platform admin Orgs list view + filters + bulk actions |
| [#478](../../tracker/issues/open/0478-feat-platform-admin-org-detail.md) | feat: platform admin Org detail (Overview + Members tabs) |
| [#479](../../tracker/issues/open/0479-feat-org-license-tab-feature-picker.md) | feat: Org License tab + multi-app feature picker + JWT generation form |
| [#480](../../tracker/issues/open/0480-feat-org-branding-tab.md) | feat: Org Branding tab + role label overrides + custom domain |
| [#481](../../tracker/issues/open/0481-feat-stripe-sync-invoices.md) | feat: Stripe sync (Invoices tab + brickos-billing Stripe API + webhook handler) |
| [#482](../../tracker/issues/open/0482-feat-platform-admin-users-dormant.md) | feat: platform admin Users list + detail + admin override + dormant accounts review |
| [#483](../../tracker/issues/open/0483-feat-tier-config-feature-revocation-screens.md) | feat: tier config / feature registry / revocation list screens (read-only) |
| [#484](../../tracker/issues/open/0484-feat-multi-org-switcher-profile.md) | feat: multi-org switcher in user profile dropdown |

### Phase E -- Cross-app, Documentation, T&C (Day 7, parallel with C and D)

| Issue | Title |
|---|---|
| [#485](../../tracker/issues/open/0485-docs-tc-retention-tier-clauses.md) | docs: update T&C with retention + tier change + dormant clauses (sovereignhealth.io + brickos.io) |
| [#486](../../tracker/issues/open/0486-chore-register-crm-link-features.md) | chore: register CRM + Link features in feature_registry namespaces |
| [#487](../../tracker/issues/open/0487-docs-developer-guide-runbook-licensing.md) | docs: developer guide + brickos admin runbook + customer-facing licensing page |
| [#488](../../tracker/issues/open/0488-chore-sprint-040-retrospective.md) | chore: Sprint 040 retrospective + design 022 final review |

### Tracking epic

| Issue | Title |
|---|---|
| [#489](../../tracker/issues/open/0489-epic-sprint-040-licensing-foundation.md) | epic: Sprint 040 -- Licensing Foundation (tracks all phases) |

---

## Phase gates (must all be green to advance)

### Phase A → B
- [ ] DB migrations apply cleanly on a fresh DB
- [ ] DB migrations apply cleanly on a copy of staging DB
- [ ] All existing SHI tests still pass (no SHI code changed yet)
- [ ] `brickos-licensing` crate compiles + unit tests pass
- [ ] Backups taken before each migration
- [ ] Staging deploy + manual smoke checklist green
- [ ] Phase A retro written to `sprint-040-lessons.md`

### Phase B → C/D/E
- [ ] Tier × feature regression matrix (~60 tests) all green
- [ ] Stripe webhook contract tests all green
- [ ] Snapshot tests reviewed and committed
- [ ] Shadow mode runs clean for one full smoke checklist cycle (~2-4 hours; **48-hour wait waived because no live customers**)
- [ ] All 14 tier-consuming files compile and pass tests
- [ ] All 7 role-consuming files updated and pass tests
- [ ] Dead code (`tier.rs`, `services/licensing.rs`) deleted only after shadow clean
- [ ] AI chat hard ceiling deployed and tested with synthetic over-limit traffic
- [ ] All 4 Playwright E2E journeys green
- [ ] Staging deploy + manual smoke checklist green
- [ ] Phase B retro written to `sprint-040-lessons.md`

### Phase C done
- [ ] Email templates render in DE + EN with no missing strings
- [ ] Scheduled jobs run on staging without errors for one cycle
- [ ] Manual send flow tested with a real test email
- [ ] Payment failure cadence verified with a Stripe test customer
- [ ] Phase C retro written

### Phase D done
- [ ] All 8 admin GUI screens load on staging
- [ ] Stripe test invoice can be created, sent, paid, webhook fires, JWT updates
- [ ] Multi-org switcher works on a test user with 2 org memberships
- [ ] Dormant accounts list populates with at least one test user
- [ ] Admin override panel updates a test user's tier
- [ ] Phase D retro written

### Phase E done (sprint complete)
- [ ] CRM and Link feature registrations applied
- [ ] T&C pages updated and reviewed
- [ ] Developer guide reviewed
- [ ] Final sprint retro complete + design 022 final pass
- [ ] Lessons promoted to `~/.claude/projects/.../memory/`

---

## Manual smoke checklist (run after each staging deploy)

1. Sign up new account
2. Log in
3. Add 3 markers, enter measurements
4. Check dashboard renders
5. Try CSV export (fail on Glimpse, succeed on Focus)
6. Try PDF export
7. Open AI chat, send 1 message
8. Open settings, verify tier display
9. Open admin panel, verify license tab
10. Trigger Stripe test webhook, verify subscription update

If any step fails, stop and fix before advancing.

---

## Risk register & counter-measures

See design 022 Section 13. Top three risks:

| Risk | Mitigation |
|---|---|
| F1 Stripe webhook desync (silent revenue loss) | M4 Stripe webhook contract tests |
| F2 AI chat fail-open (cash burn) | M5 hard daily ceiling (#472) |
| F6 Marker access flips | M1 facade pattern + M2 shadow mode + M7 migration safety |

---

## Deploy workflow during this sprint

Per saved memories (`feedback_production_deploy_workflow.md`, `feedback_local_preview_before_deploy.md`, `feedback_rc_before_first_deploy.md`):

1. **Local first.** `docker compose up` + manual verification before any push.
2. **Pre-flight RC checks** (lint + clippy + tests) **before** staging deploy. Save state to `sprint-040-lessons.md` after each layer per `feedback_save_rc_state_incrementally.md`.
3. **Stash untracked files** before any `deploy.sh` run per `feedback_stash_before_promote.md` (NB: applies to promote; we are not promoting in this sprint, but the stash habit still avoids accidents).
4. **Lockfile sync** for any frontend work per `feedback_frontend_lockfile.md`. Run `pnpm build` locally before commit per `feedback_pnpm_build_before_commit.md`.
5. **Backup before commit** -- full audit of uncommitted/unpushed changes per `feedback_backup_before_commit.md`.
6. **Verify container creation time** after each staging deploy per `feedback_deploy_container_recreation.md`.
7. **Deploy script only** -- never raw `docker compose` on the VPS per `feedback_compose_isolation.md`.
8. **NEVER `--no-cache` shortcut** -- backend deploys go through the full deploy script.
9. **`deploy.sh production` is forbidden this sprint.** See top of doc.

---

## Git workflow

- Branch per phase: `sprint-040/phase-a`, `sprint-040/phase-b`, etc.
- Merge to `develop` after each phase gate passes (not directly to `main`)
- After Phase E gate green, merge `develop` → `main`
- Tag: `v0.40.0-rc1` after merge to main; promote to `v0.40.0` only in the **next sprint** after validation

## Communication

- Daily standup-style note in `sprint-040-lessons.md` (date + what shipped + blockers)
- Each new lesson learned saved immediately to that file
- Owner reviews 1x/day (~30-60 min) for risky-action approvals and decisions

---

## Out of scope (deferred to later sprints)

- Self-hosted Core Commercial enforcement (design 022 §5.3, deferred Phase 4)
- Org-level Stripe subscription metering (design 021 Phase 2)
- CLA / dual-licensing decision (design 016, design 022 §10.4)
- Automated dormant-account deletion (manual review only this sprint)
- Visual white-label branding (design 021 §13 Phase 1 -- separate 1-week sprint after Sprint 040)
