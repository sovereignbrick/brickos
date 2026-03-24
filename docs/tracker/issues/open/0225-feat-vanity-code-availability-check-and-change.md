---
number: 225
title: "feat: vanity code availability check + ability to change existing code"
labels: [enhancement, sovereign-link]
milestone: infrastructure
---

## Description

The custom short link (vanity code) feature on the affiliate page has two UX gaps:

### 1. No availability check
When a user types a vanity code, there's no feedback on whether it's already taken by another user. The user clicks "Save" and gets an error only after submission. Should show real-time availability (e.g., green check / red X as they type, or on blur).

### 2. Cannot change an existing vanity code
Once a vanity code is saved, the user cannot modify or replace it. The UI should allow updating to a different code (with availability check).

### 3. Tier gate error not helpful (screenshot)
User on Clarity tier gets "Vanity codes require Clarity or Horizon tier" error — but they ARE on Clarity. This is a bug in the tier check logic.

## Proposed UX

```
brickos.io/r/ [helmut        ] [Check] [Save]
              ✓ Available
```

- Debounced availability check on input (or explicit "Check" button)
- Show "Available" / "Already taken" feedback
- Allow changing: if user already has a vanity code, show current code with "Change" option
- Fix tier check: Clarity tier should be allowed

## Files

- `apps/health/sovereign-health/frontend/src/app/affiliate/page.tsx` — vanity code UI
- `apps/health/sovereign-health/api/src/handlers/affiliate.rs` — vanity code validation + tier check
- `apps/infrastructure/sovereign-link/src/handlers/api.rs` — link CRUD
