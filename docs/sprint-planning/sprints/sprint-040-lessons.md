# Sprint 040 -- Lessons Learned (Live Document)

This file is updated **continuously** during the sprint. After each phase, write a brief retro entry. At sprint end, stable lessons get promoted to `~/.claude/projects/-home-dev-comp-Projects-brickos/memory/` per the auto-memory protocol.

**Format:** newest entries at the top. Each entry has a date, phase, and one of: `lesson`, `decision`, `blocker`, `daily-note`.

---

## Sprint kickoff -- 2026-04-10

**Type:** daily-note
**Phase:** pre-A

Sprint kicked off after design 022 v2 finalized. 30 issues created locally (#460-#489) covering all 5 phases. Critical constraints documented:
- No production deployments this sprint
- One-week focused push, owner reviews daily
- Phase B (the refactor) is the critical path; everything else builds on it
- AI chat hard ceiling (#472) is the safety net regardless of refactor outcome

Next: Phase A starts after issue files synced to GitHub. Target Day 1 complete = 2026-04-11.

---

## 2026-04-10 -- A -- #460 schema landscape discovery + scope reduction

**Type:** lesson + decision
**Phase:** A

When auditing the existing schema before writing migration 009, found that **a lot of design 022's "new" infrastructure already exists** in some form:

- `product_features` and `tier_features` tables already exist (sprint 011, in SHI database, with `app_key` columns added in sprint 035 for multi-app awareness)
- `app_tier_names` already exists with seeded rows for SHI, Sovereign Link, Sovereign Voice
- `check_tier_limit(app_key, tier_slug, feature_key)` SQL function already exists
- `brickos.license_tiers` already in brickos schema (moved in migration 003)

**Decision:** make migration 009 **purely additive in brickos schema**. Only create the genuinely-new tables: `feature_registry`, `tier_features` (in brickos schema, alongside the older SHI public.tier_features), `org_licenses`, `org_licenses_revoked`, `admin_audit_log`. Leave existing SHI tables completely untouched. They get deprecated and dropped by a later cleanup migration after #467 (SHI tier.rs facade refactor) ships and shadow mode confirms parity.

**Why it matters:** the original design 022 §4.7 implied creating `feature_registry` from scratch and dropping `license_tiers`. Doing that would have been a breaking change to a working SHI codebase. The conservative additive approach preserves all current behavior while building the new platform-level catalog alongside.

**How to apply:** **always grep the existing schema before writing a "new" migration**. The codebase has 50+ migrations spanning 9 sprints; assume any "obviously needed" table probably already exists somewhere. Use `grep "CREATE TABLE.*name"` across both `crates/brickos-db/migrations/` and `apps/*/api/migrations/` before writing.

**Follow-up:** memory `feedback_grep_schema_before_migration.md`. Update design 022 §4.7 to clarify that `feature_registry` is a NEW brickos schema table that coexists with SHI's `product_features` until cleanup.

---

## 2026-04-10 -- A -- #460 migration test pattern

**Type:** lesson
**Phase:** A

The brickos-db migrations 001-007 are designed to migrate FROM SHI's `public` schema TO `brickos` schema (`ALTER TABLE public.X SET SCHEMA brickos`). They cannot be applied to a fresh empty database -- the source tables don't exist.

To test a new migration in isolation:

1. `docker run -d --name s40-test-pg --rm -e POSTGRES_USER=brickos -e POSTGRES_PASSWORD=test -e POSTGRES_DB=brickos_test -p 5499:5432 postgres:16`
2. Create a minimal stub: `CREATE SCHEMA brickos; CREATE TABLE brickos.users (id UUID PRIMARY KEY); CREATE TABLE brickos.organizations (id UUID PRIMARY KEY);`
3. Apply only the new migration: `docker exec -i s40-test-pg psql -U brickos -d brickos_test < crates/brickos-db/migrations/00X_new.sql`
4. Verify with `\dt brickos.*` and constraint tests
5. `docker stop s40-test-pg` (auto-removes due to `--rm`)

This bypasses the 50+ historical migrations and lets you test the new SQL in 30 seconds.

**Why it matters:** previous sprints applied untested migrations to staging and discovered issues only after deploy. A 30-second pre-flight catches schema typos, FK errors, constraint conflicts.

**How to apply:** for any future migration that creates new tables (vs. altering existing), use the stub-and-apply pattern. Keep the test artifacts ephemeral.

**Follow-up:** memory `feedback_migration_test_pattern.md`. Add the stub script as `docs/tracker/sync/test-migration.sh` later.

---

## 2026-04-10 -- pre-A -- GitHub sync rate limit gotcha

**Type:** lesson
**Phase:** pre-A

Pushed 30 sprint issues to GitHub. Hit two issues:

1. **`gh api -f labels=...` cannot send arrays.** First batch of 30 issues all failed with `"is not an array"` because `-f labels="..."` always sends a string. **Fix:** build the full payload via `jq -n` and pipe to `gh api --input -`. Working example in `docs/tracker/sync/sprint-040-pending.sh`.

2. **brickos-apps user has 60 calls/hour and `gh api rate_limit` itself counts.** Burned 33 calls on the failed first batch (label format error), then re-tried with the working format. Got 26 issues through (#401-#426 = local #460-#485) before hitting the wall on #486-#489. Reset is 1h after first call.

3. **Script bug:** the success check `[ -n "$ghnum" ]` returns true even when `$ghnum` contains the JSON error response from a rate-limited call. So the script logged "OK" for failures #486-#489. **Fix in pending script:** check with `[[ "$ghnum" =~ ^[0-9]+$ ]]` instead.

**Why it matters:** every sprint that creates new issues will hit this. Need a battle-tested script.
**How to apply:** use `docs/tracker/sync/sprint-040-pending.sh` as the template for all future bulk issue sync. Always validate ghnum is numeric before logging success. Always check rate_limit at script start.
**Follow-up:** save as memory `feedback_gh_bulk_issue_sync.md`. Pending issues #486-#489 will sync after rate limit reset (~09:33 CEST 2026-04-10) by running `bash docs/tracker/sync/sprint-040-pending.sh`.

---

## Lessons template (use this format for new entries)

```
## YYYY-MM-DD -- Phase X -- short title

**Type:** lesson | decision | blocker | daily-note
**Phase:** A | B | C | D | E

What happened.

**Why it matters:** ...
**How to apply:** ...
**Follow-up:** memory file to update / new memory to create / sprint doc edit / nothing
```

---

## Promoted to memory at sprint end

(populated during Phase E retro -- list of memory files created or updated)

---

## Pre-sprint baseline (for reference)

- SHI tests: 107 unit + 38 two-pool + 21 shared service + smoke + integration + snapshot + property
- SHI tier-consuming files: 14 (verified by grep)
- SHI role-string-literal files: 7 (20 occurrences total)
- Latest local issue: #459
- Latest GitHub issue: #337 (gap of 122; this sprint adds 30 more local)
- GitHub rate limit (brickos-apps): 60/hour core, 0 graphql
- Sprint 039 in flight (Production Quality milestone)
- No live customers on production yet
