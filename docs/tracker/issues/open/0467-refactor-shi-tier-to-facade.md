---
number: 467
github_number: 408
title: "refactor: SHI tier.rs → brickos-licensing facade + drop GLIMPSE_MARKERS const + delete dead services/licensing.rs"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, refactor, breaking-change, critical-path]
created: 2026-04-10
priority: P0
sprint: 040
phase: B
design: 022
estimate: 2d
blocked_by: [465, 466]
---

**The single most critical issue in the sprint** (per design 022 §12). Refactor SHI's `services/tier.rs` from inlined SQL feature gating to a thin facade over `brickos-licensing`. Drop the hardcoded `GLIMPSE_MARKERS` const. Delete the dead `services/licensing.rs`.

## Counter-measures (mandatory)

- **M1 Facade pattern.** The 14 tier-consuming files keep calling `tier::check_feature(pool, user_id, "csv_export")` unchanged. Internally `tier.rs` becomes a thin facade that delegates to `brickos_licensing::has_feature(ctx, "shi.csv_export")`. The string mapping lives in ONE place. **Zero handler edits in this issue.**
- **M2 Shadow mode.** Add `LICENSING_SHADOW_MODE` env var. When set, every `check_feature` call runs both old and new paths, compares, logs divergences, returns OLD result. Run on staging until one full smoke checklist cycle passes with zero divergences (~2-4h, no live customers).
- **M6 Snapshot baseline.** Run `cargo insta test` and commit before this issue starts.

## Scope

- [ ] Add `brickos-licensing` as dependency in SHI's Cargo.toml
- [ ] Add `services/licensing_facade.rs` with shim functions matching the old `tier.rs` API
- [ ] Map old feature names to new prefixed slugs: `csv_export` → `shi.csv_export`, etc.
- [ ] Old `tier.rs` becomes a thin re-export of the facade
- [ ] **Drop `GLIMPSE_MARKERS` const** -- marker check now reads `tier_features` for `shi.markers` with `limit_value`
- [ ] **Delete `services/licensing.rs`** (the dead JWT generator) -- only after #466 lands
- [ ] Implement `LICENSING_SHADOW_MODE` toggle in `check_feature`
- [ ] Add divergence metrics counter (`metrics::counter!("licensing_divergence")`)
- [ ] Run shadow mode on staging for one full smoke cycle
- [ ] After zero divergences confirmed: remove the legacy code path from the facade

## Verification

- [ ] All 14 tier-consuming files compile without changes
- [ ] All existing SHI tests pass
- [ ] Shadow mode logs zero divergences across one full smoke checklist cycle
- [ ] `cargo clippy --all-targets -- -D warnings` clean
- [ ] No more `GLIMPSE_MARKERS` const anywhere in the codebase
- [ ] No more `services/licensing.rs` (and its 4 dead unit tests)

## References

- design 022 §1.1, §1.2, §13.5 M1, §13.5 M2
- Memory: `feedback_no_hardcoded_values.md`
