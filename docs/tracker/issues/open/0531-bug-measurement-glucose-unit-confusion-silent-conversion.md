---
number: 531
title: "bug: [P1] glucose 4.7 (typed as mmol/L, form on mg/dL) silently converted to 0.26 mmol/L then rejected"
milestone: "BrickOS Platform Admin GUI"
labels: [bug, p1, sprint-041, shi, units, ux]
created: 2026-04-11
priority: P1
discovered_by: 526
---

## Summary

A user types `4.7` for glucose on `/measurements/new`. The form's unit
selector is on **mg/dL** (the US default). The frontend silently converts
`4.7 mg/dL` to canonical `0.26 mmol/L`. The backend then rejects with:

> glucose value 0.2608473654416091 is outside allowed range 1-30

The user has no idea what just happened. They typed a perfectly normal
fasting glucose value (4.7 mmol/L = ~85 mg/dL is dead-center normal), and
got back an opaque error message containing a number they never typed,
in a unit nobody explained, against a range they don't know the unit of.

This is the most common possible mistake at the most basic possible
SHI flow. It blocks the customer from doing the very thing the app exists for.

## Reproduction (staging, 2026-04-11)

1. Log in at `https://demo.sovereignhealth.io`
2. `/measurements/new`
3. Glucose row: unit selector shows `mg/dL`
4. Type `4.7` in the value field
5. Click Save Measurement
6. Result: red banner **"glucose value 0.2608473654416091 is outside allowed range 1-30"**

## Full bug chain

| Step | What happens | File |
|---|---|---|
| 1 | Form defaults the glucose unit selector to **mg/dL** | `apps/health/sovereign-health/frontend/src/app/measurements/new/page.tsx` (around the `getDisplayUnit` call) |
| 2 | User types `4.7` thinking mmol/L (the European default) | -- |
| 3 | On submit, frontend converts: `convertValue("glucose", 4.7, "mg/dL", "mmol/L") = 4.7 / 18.0182 = 0.2608` | `frontend/src/app/measurements/new/page.tsx:497` |
| 4 | Frontend POSTs `{marker_slug: "glucose", value: 0.2608}` (NO unit field -- the canonical conversion already happened) | -- |
| 5 | Backend `validate_marker_value("glucose", 0.2608)` checks against hardcoded range `(1.0, 30.0)` -- the mmol/L range | `apps/health/sovereign-health/api/src/services/measurement.rs:32-58` |
| 6 | 0.2608 < 1.0 -> error string assembled with the *converted* value, no unit, no reference to what the user actually typed | `services/measurement.rs:54` |

`brickos.markers` confirms `glucose.unit_canonical = mmol/L`. The conversion
math is correct in isolation; the bug is the *defaults* + the *error
message* + the lack of *bidirectional unit-confusion detection*.

## Root cause (four stacking issues)

### Issue A -- Form unit doesn't follow user locale

The frontend defaults glucose to mg/dL regardless of:
- User language preference (the dropdown shows `EN`, but the demo user is bilingual EN/DE -- the unit should follow the *country/measurement system*, not the UI language)
- User country setting (the demo user has Country = "Not set" in the screenshot)
- The marker's own canonical unit (mmol/L for glucose -- which the form *converts away from*, which is its own design smell)

The fix: pull the unit preference from `user_preferences` (memory `feedback_no_hardcoded_values.md` -- read from settings, never hardcode). Default to the canonical unit when no preference is set, *not* the US-style alternative.

### Issue B -- Backend validation is unit-blind

`validate_marker_value` takes only `(slug, value)`. It assumes the value
is already in the canonical unit. There's no way to tell the validator
"this came from a mg/dL form, the original input was X". So when the
range check fails, the error message is in mmol/L numbers that the user
never typed.

The fix: pass the original `(value, unit)` pair through, so the validator
can:
- Range-check in the user's input unit (`4.7 mg/dL` → fails range `54-540 mg/dL` for glucose)
- Build an error message that references the *user's* numbers
- Optionally: compute "if you swap units, this would be perfectly normal"

### Issue C -- Unit-confusion detection is one-directional

`validate_marker_comprehensive` at `services/measurement.rs:80-99` already
catches the **inverse** case (glucose > 40 mmol/L -> "likely mg/dL?"). It
does *not* catch this case (glucose < 1 mmol/L when the user typed in mg/dL).
Add the symmetric warning: glucose entered in mg/dL with a value in 0-15
range almost certainly meant mmol/L. Same for cholesterol, HbA1c, ketones.

### Issue D -- Validation happens *after* canonical conversion

Because the frontend converts to canonical before sending, the backend has
no way to know the user's input unit. The validation runs on the *converted*
value with no unit context, so even a perfect backend can't produce a
human-friendly error.

Two fix paths:
- **Send `(value, unit)` to the backend**, let the backend convert. Backend has full validation context. Symmetric with the API design every other client (mobile, lab import) already uses.
- **Frontend-side validation before submit**. Check the value against the *displayed* unit's plausible range, warn before converting + sending.

Recommend **both**: send (value, unit) for the canonical fix, plus frontend pre-flight to catch the obvious cases without a roundtrip.

## Fix paths (in priority order)

1. **P1, immediate**: Frontend pre-flight validation. If user types a glucose value in mg/dL between 0 and 30, show inline warning before submit: *"4.7 mg/dL is far below normal (54-540 mg/dL). Did you mean 4.7 mmol/L? [Switch unit]"*
2. **P1, immediate**: Backend `validate_marker_value` extended to take `(value, unit)`. Range check in user's unit. Error message uses user's numbers.
3. **P1, soon**: Form unit selector defaults from `user_preferences` (with country fallback to "Not set" -> canonical mmol/L for glucose, not mg/dL).
4. **P1, soon**: Symmetric unit-confusion detection in `validate_marker_comprehensive` (low-glucose-in-mg/dL, low-cholesterol-in-mg/dL, etc.).
5. **P2, design**: Send `(value, unit)` to the API instead of converting client-side. Move all unit conversion to one place (the backend) so the validation has full context.

## Acceptance criteria

- [ ] Typing `4.7` in the glucose field with unit `mg/dL` shows an inline warning *before* submit, with a one-click "Switch to mmol/L" button
- [ ] If the user submits anyway, the backend error message references the user's input (`4.7 mg/dL`), not the converted canonical (`0.26 mmol/L`)
- [ ] `validate_marker_comprehensive` catches both directions (low value in mg/dL + high value in mmol/L) for glucose, total cholesterol, ketones
- [ ] Form unit selector defaults to `user_preferences.glucose_unit` when present, then country default (DE/EU -> mmol/L, US -> mg/dL), then canonical (mmol/L for glucose)
- [ ] Unit tests for the new validator with `(value, unit)` signature covering: glucose mg/dL low, glucose mmol/L high, cholesterol mg/dL low, HbA1c % vs mmol/mol confusion
- [ ] Memory `feedback_no_hardcoded_values.md` updated with the "form units must come from settings, never the marker canonical" lesson

## Related

- #527 (Sprint 040 dead code in tier handlers -- sibling lesson about validation/conversion architecture left half-finished)
- #528 (settings page brickos master + per-app tabs -- the unit preferences live in the SHI tab)
- memory `feedback_no_hardcoded_values.md`
- memory `feedback_i18n_content_markers.md` (the same "always read from settings, never hardcode" rule applied to marker names)
- the existing one-directional unit confusion check in `services/measurement.rs:80-99` (the partial implementation that needs to be made symmetric)

## Out of scope

- A full unit-conversion library refactor (the current ad-hoc divisor approach is fine; just put it in one place)
- Per-marker unit preferences. One global glucose unit per user is sufficient.
