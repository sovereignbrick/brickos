---
number: 520
title: "test: [automated] staging 4-hour bake monitor -- log scrape + error rate"
milestone: "Sprint 041 -- Staging Quality Gate"
labels: [test, sprint-041, phase-g, automated]
created: 2026-04-11
priority: P1
sprint: 041
phase: G
estimate: 0.25d
blocked_by: [516]
---

After staging deploy and the Life Algorithm walkthrough, let staging bake for at least 4 hours while monitoring logs for errors. Required condition per the sprint gate (#491 deferred criterion).

## Scope

Claude runs this as a background task:

1. Every 15 minutes for 4 hours:
   - `ssh root@vps 'docker logs shi-backend --since 15m --tail 500' | grep -iE "error|panic|failed|unauthorized" | wc -l`
   - Record the count in the lessons doc
2. At the end of the 4 hours:
   - Total error count
   - Total panic count (must be 0)
   - Total LICENSING DIVERGENCE events (must be 0 per ADR-046)
3. If at any point the error rate exceeds 10/min sustained, page the user with "staging bake unhealthy" and halt the monitor
4. After 4 hours clean: mark this issue green

## Who

Claude (automated background task).

## Verification

- 4-hour window with error rate < 10/min sustained
- Zero panics
- Zero LICENSING DIVERGENCE events

This is the gate criterion for #490 (dead code cleanup) -- which can only proceed after shadow mode has baked clean.
