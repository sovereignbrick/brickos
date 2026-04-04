# Issue #320: Fuzzy marker matching with Levenshtein distance

**Type:** feature
**Priority:** medium
**Component:** backend / marker matcher
**Sprint:** 020

## Description

Add a 4th matching tier to `match_marker()` using Levenshtein distance for inputs that fail exact, contains, and reverse-contains matching. Catches OCR typos and minor spelling variations.

## Current Matching Algorithm

```
1. Exact match (after lowercase)
2. Contains match (input contains alias, prefer longest, min 4 chars)
3. Reverse contains (alias contains input, only if input >= 4 chars)
→ None (unmatched)
```

## Proposed Addition

```
4. Fuzzy match (Levenshtein distance <= 2, only if input >= 6 chars)
→ Return slug with match_confidence: "fuzzy"
```

## Implementation

Use `strsim` crate (MIT, zero deps):

```rust
// In Cargo.toml:
strsim = "0.11"

// In marker_matcher.rs, after tier 3:
if normalized.len() >= 6 {
    let mut best: Option<(&str, usize)> = None;
    for (alias, slug) in map.iter() {
        if alias.len() >= 4 {
            let dist = strsim::levenshtein(&normalized, alias);
            if dist <= 2 && dist < normalized.len() / 3
                && (best.is_none() || dist < best.unwrap().1)
            {
                best = Some((slug, dist));
            }
        }
    }
    if let Some((slug, _)) = best {
        return Some(slug);
    }
}
```

## Safety Constraints

- Only for inputs >= 6 chars (short strings have too many false neighbors)
- Max distance 2 (strict — "glucose" → "glucos" ok, "glucose" → "gluco" ok, "glucose" → "glu" too short)
- Distance must be < input_len / 3 (prevents "calcium" matching "potassium")
- Fuzzy matches flagged as `match_confidence: "fuzzy"` in review UI
- User must explicitly confirm fuzzy matches (not auto-imported)

## Expected Impact

~5% of currently-unmatched markers recovered. Examples:
- "Glucos" → glucose (distance 1)
- "Cholestrin" → cholesterin (distance 1)
- "Haemoglobn" → haemoglobin (distance 1)
- "Triglcerides" → triglycerides (distance 1)

## Tests

- [ ] test_fuzzy_match_typos: "Glucos" → glucose, "Cholestrin" → cholesterin
- [ ] test_fuzzy_no_false_positive: "calcium" does NOT match "potassium"
- [ ] test_fuzzy_min_length: "glu" (3 chars) does NOT trigger fuzzy
- [ ] test_fuzzy_max_distance: "gl" does NOT match "glucose" (too short)
- [ ] test_fuzzy_confidence_flag: fuzzy matches return different confidence level

## Location

- `apps/health/sovereign-health/api/src/services/marker_matcher.rs`
- `Cargo.toml` (add strsim dependency)
