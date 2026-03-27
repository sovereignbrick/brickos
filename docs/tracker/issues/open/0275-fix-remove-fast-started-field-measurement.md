---
number: 275
title: "fix: remove 'Fast started' datetime field from measurement form"
labels: [fix, frontend, measurements, ux, sprint-016]
milestone: ux-and-onboarding
---

## Description

The "Fast started" datetime field on the New Measurement screen should be removed. It is redundant because:

1. **Diet Protocol** (e.g., Carnivore) is already stored per user in Health Profile settings
2. **Fasting Protocol** (e.g., OMAD) is already stored per user in Health Profile settings
3. **Measurement timestamp** is saved with every measurement session
4. The timeseries of measurements with `protocol_tag: "fasting"` and `fasting_protocol: "omad"` already shows WHEN fasting periods occur -- the system can derive fasting duration from the gap between measurements

The "Fast started" field adds manual data entry burden without providing information the system cannot already derive from existing data.

## Current Layout (5 fields, cramped)

```
Meal Timing | Sleep Hours | Sleep Quality | Stress Level | Fast started
```

## Target Layout (4 fields, evenly distributed)

```
Meal Timing    |    Sleep Hours    |    Sleep Quality    |    Stress Level
```

## Validation

Before removing, verify:
- [ ] `fast_start_datetime` column in measurements table -- is it used in any calculation?
- [ ] Is it passed to Dr. Alex context? If so, can we derive it from measurement timestamps?
- [ ] Is it used in protocol_context resolution? (check `resolve_protocol_context()`)
- [ ] Is it displayed in measurement history or trend views?
- [ ] Is it included in CSV/JSON/PDF exports?

If it's only stored but never used for business logic, safe to remove from the form (keep the DB column for backward compatibility).

## Requirements

- [ ] Remove "Fast started" datetime input from measurement form
- [ ] Distribute remaining 4 fields evenly across the row (grid-cols-4)
- [ ] Keep `fast_start_datetime` column in DB (don't break existing data)
- [ ] Backend: make `fast_start_datetime` optional in the API (if not already)
- [ ] Test: measurement submission still works without fast_start_datetime
