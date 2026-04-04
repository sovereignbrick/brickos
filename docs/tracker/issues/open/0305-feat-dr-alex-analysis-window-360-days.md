# Issue #305: Extend Dr. Alex analysis window from 30 days to 360 days

**Type:** feature
**Priority:** medium
**Component:** backend / Dr. Alex chat
**Found during:** user feedback (2026-04-02)

## Description

Dr. Alex currently only analyses the last 30 days of measurements (`doctor_chat.rs:58`). This is too narrow for users who track biomarkers infrequently (e.g. quarterly lab results). A user with 4 lab imports per year would only ever see the most recent one in their Dr. Alex analysis.

## Current Behavior

```rust
// doctor_chat.rs:58
AND m.timestamp >= now() - INTERVAL '30 days'
// Line 60: LIMIT 200
```

Hardcoded 30-day window with a 200-row cap.

## Proposed Change

**Phase 1 (simple):** Change the window to 360 days, keep the 200 data point limit. This gives Dr. Alex a full year of context while the row limit prevents token overflow for heavy trackers.

```rust
AND m.timestamp >= now() - INTERVAL '360 days'
LIMIT 200
```

**Phase 2 (future, optional):** Make the window dynamic based on data density. If a user has fewer than N data points in 360 days, there's no reason to limit at all. Could also be tier-gated (Glimpse: 30 days, Insight: 360, Guardian: unlimited) via `app_settings`.

## Impact

- Users with quarterly labs get meaningful trend analysis
- Users who track daily (e.g. glucose) still capped at 200 most recent rows
- Token usage increases moderately -- 200 rows of measurement data is ~2-3K tokens regardless of time window

## Location

- `apps/health/sovereign-health/api/src/services/doctor_chat.rs:58` — the hardcoded interval
- Also update tier description in `dr_alex_public_prompt.txt:62` ("30 days history" for Glimpse tier)
