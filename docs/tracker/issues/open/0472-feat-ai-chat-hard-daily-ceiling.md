---
number: 472
github_number: 413
title: "feat: AI chat hard daily ceiling (M5) -- per-user 24h Redis counter"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-b, feature, security, defense-in-depth]
created: 2026-04-10
priority: P0
sprint: 040
phase: B
design: 022
estimate: 0.5d
---

**Defense-in-depth, independent of the licensing refactor.** Even if the tier gate fails open, no user can exceed the daily ceiling. Cheap insurance against runaway Anthropic API costs.

## Scope

- [ ] Per-user counter keyed on `(user_id, date_utc)`
- [ ] Redis backend (preferred) or DB row fallback
- [ ] Increment + check before every AI chat call in `services/doctor_chat.rs`
- [ ] Ceilings (deliberately 5-10× tier limit so legitimate users never hit them):

| Tier | Daily ceiling | Tier limit (for reference) |
|---|---|---|
| Glimpse | 20 | 3/month |
| Focus | 50 | 5/month |
| Insight | 100 | 15/month |
| Clarity | 500 | unlimited |
| Horizon | 1000 | unlimited |

- [ ] Above ceiling: hard 429 response with `{"error": "daily_limit_exceeded", "reset_at": "<midnight UTC>"}`
- [ ] Counter resets at midnight UTC
- [ ] Metric: `ai_chat_daily_ceiling_hit{tier=...}` for alerting on near-ceiling usage
- [ ] Tests: synthetic over-limit traffic returns 429
- [ ] Document the ceiling in customer-facing docs (#487)

## Why it's in scope this sprint

Phase B refactors the licensing gates -- the highest-risk time for gate failures. Even on staging without live customers, test users running validation scenarios hit the real Anthropic API. This ceiling is a permanent safety net independent of any future licensing changes.

## Verification

- [ ] Test with synthetic 1000 calls in 1 hour for a Glimpse user → 980 get 429
- [ ] Counter resets at midnight UTC (verify with time-mocked test)
- [ ] Metric published to /metrics endpoint
- [ ] **Survives a full failure of the tier check** (manually break the gate and verify ceiling still kicks in)

## References

- design 022 §13.5 M5, §13.2 F2
