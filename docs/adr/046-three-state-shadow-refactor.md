# ADR-046: Three-state shadow mode for load-bearing refactors

**Status:** Accepted
**Date:** 2026-04-10
**Sprint:** 040

## Context

Sprint 040 #467 rewrote `tier::check_feature` -- the function that every paying SHI customer hits on every request that touches a gated feature. The legacy implementation read from SHI's own `public.tier_features` table; the new implementation reads from `brickos.tier_features` via the new `brickos-licensing` crate. The two paths had to return identical answers for the ~60-cell (tier × feature) matrix or paying customers would see random upgrade prompts.

Rewriting an always-on revenue-critical function is exactly the kind of change that tends to produce either (a) a week-long investigation after a production incident, or (b) a conservative code review stalemate where nothing ever ships. We needed a way to validate parity before the flip without blocking deployment or letting the old path and the new path drift.

## Decision

Every future rewrite of a load-bearing code path uses a **three-state rollout pattern** controlled by two environment flags:

1. **Default (neither flag set).** The old path runs unconditionally. The new path exists in the codebase but is not called. This is the pre-rewrite baseline.
2. **Shadow mode (`LICENSING_SHADOW_MODE=1`).** Both paths execute on every call. The old path's answer is returned to the caller. The new path's answer is compared to the old path's answer, and any divergence is logged with `tracing::error!` plus a stable "LICENSING DIVERGENCE" token so the log stream can be grep'd. Zero visible behavior change; the shadow path is a pure observer.
3. **Canonical (`LICENSING_USE_NEW_PATH=1`).** The new path runs unconditionally. The old path is dead code. This is the post-rewrite steady state.

The flip from shadow mode to canonical is a single env var change -- no code change, no deploy of new binaries, no migration. The flip back (if regression is detected) is also a single env var change.

Deletion of the old path happens in a **separate commit, in a later sprint**, only after:

- Shadow mode has run clean on staging for at least 2-4 hours of real traffic
- The regression matrix test (#470) shows zero divergence
- The shadow log stream shows zero "LICENSING DIVERGENCE" events over the same window

The matrix test is written once and exercises **both paths** against every (input, expected) pair. The test is the regression anchor: a divergence in CI is a real bug, never a flaky test.

## Alternatives Considered

- **Branch-based rewrite.** Do the rewrite on a feature branch, merge when "done". Problem: the branch grows stale, the review becomes monolithic, and the moment the branch lands the old path is gone with no way to roll back except revert-plus-refix. No parity validation.
- **Feature flag in code (`if cfg.use_new { new() } else { old() }`).** Equivalent to canonical mode but without the shadow observer. You find divergences by customer complaints, not by logs. No safety net.
- **Parallel universe (run both in production and A/B compare).** Too much production risk on a revenue-critical path. Customers might see inconsistent behavior if the A/B split is per-request.
- **Ship the rewrite behind a kill switch but don't shadow.** You can flip it off if it breaks, but you don't know it's broken until users complain. The shadow path catches divergence proactively.

## Consequences

**What becomes easier:**
- Big refactors of load-bearing code paths become configuration changes at the moment of the flip, not code changes. Rollback is instant and safe.
- The matrix test forces both paths to be exercised with the same inputs, which catches the "the old path had a subtle behavior nobody documented" class of bug before it hits production.
- Deletion of the old path is a separate commit reviewed on its own merits, not bundled with the rewrite. Easier to review and easier to revert.

**What becomes harder:**
- The codebase carries both paths for a transition window. This is technical debt with a timer on it: the cleanup issue (#490 for Sprint 040) MUST be scheduled into a subsequent sprint, or the old path stays forever. The gate (shadow clean + matrix green) is explicit in the cleanup issue body so it does not drift.
- Every change to the load-bearing function during the transition window has to be applied to both paths. This is a small tax.
- The shadow logging adds a small per-request overhead while the flag is on. This was ~1 ms per `check_feature` call in Sprint 040 -- negligible -- but could matter for very hot paths.

**What we learned in Sprint 040:**
- The pattern worked: the `tier::check_feature` flip happened with zero regressions, zero rollbacks, and zero customer complaints (no customers on prod during the sprint, but the internal tests were clean).
- The matrix test (#470) caught exactly one real bug on first run: `GLIMPSE_MARKERS` hardcoded const promised "8 specific markers" but the canonical seed said Glimpse = 10 markers. That bug would have silently shipped if the matrix had only tested the new path. See sprint-040-lessons.md for the full write-up.
- Memory: `feedback_three_state_refactor.md` captures the pattern in copy-pasteable form for future refactors.

## Applies to

- `tier::check_feature` (done, Sprint 040 #467)
- Future candidates: marker matcher rewrite, import parser v2, encryption layer swap, any auth flow change
