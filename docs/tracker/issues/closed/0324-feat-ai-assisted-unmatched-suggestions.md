# Issue #324: AI-assisted suggestions for unmatched markers

**Type:** feature
**Priority:** medium
**Component:** backend / import pipeline
**Sprint:** 020

## Description

When a marker is completely unmatched (no alias hit, no fuzzy match), currently it appears in the "unmatched" section with no guidance. Add a second AI call that suggests the best match from our marker catalog.

## Proposed Approach

For each unmatched marker after the deterministic matching phase:

```
AI prompt: "The marker '{ai_extracted_name}' with value {value} {unit} was not matched.
Our system has these markers: [glucose, hba1c, cholesterin, egfr, ...]
Which one is the best match? Or is this a marker we don't track (e.g., a culture test, pathogen screen)?
Respond with: { "suggested_slug": "egfr" | null, "confidence": 0.8, "reason": "GFR variants map to eGFR" }"
```

## Cost Control

- Only triggered for genuinely unmatched markers (typically 1-5 per import)
- ~$0.002 per suggestion (small context, short response)
- Batch all unmatched markers into one AI call per import session
- Skip if all markers matched (most common case)

## Frontend Display

Unmatched markers section shows AI suggestion:

```
| Extracted Name          | AI Suggestion    | Confidence |        |
|------------------------|------------------|------------|--------|
| GFR (CKD-EPI 2021)    | → eGFR           | 85%        | [Accept] [Reject] |
| Campylobacter Kultur   | — not tracked    | 95%        | [Skip]            |
```

User accepts or rejects each suggestion. Accepted suggestions feed into the correction learning loop (#323).

## Acceptance Criteria

- [ ] Unmatched markers trigger batched AI suggestion call
- [ ] Suggestions shown in review UI with accept/reject
- [ ] Accepted suggestions create measurements (same as regular matches)
- [ ] Accepted corrections feed into learning loop (#323)
- [ ] "Not tracked" suggestions clearly labeled as skip-able
- [ ] Total AI cost per import stays under $0.01

## Tests

- [ ] test_no_suggestion_when_all_matched: no AI call if no unmatched markers
- [ ] test_suggestion_for_unmatched: unmatched marker → suggestion returned
- [ ] test_batch_suggestions: 3 unmatched markers → single AI call
- [ ] test_accepted_suggestion_creates_measurement: user accepts → measurement created

## Location

- Backend: `apps/health/sovereign-health/api/src/handlers/import.rs`
- Backend: new function in `apps/health/sovereign-health/api/src/services/doctor_chat.rs`
- Frontend: import review component (unmatched section)
