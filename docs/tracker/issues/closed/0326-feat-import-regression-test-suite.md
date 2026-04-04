# Issue #326: Import pipeline regression test suite

**Type:** test
**Priority:** high
**Component:** backend / testing
**Sprint:** 020

## Description

Create a comprehensive automated test suite that validates the entire import pipeline. This must run before every release to catch regressions in marker matching, extraction prompt quality, and validation logic.

## Test Categories

### 1. Marker Matcher Regression Tests
- All 850+ aliases resolve correctly
- All kg/% disambiguation works
- No false positive cross-contamination
- Fuzzy matching catches typos but not false positives
- Learned aliases from correction log are picked up
- New language aliases don't break existing matches

### 2. Validation Tests
- Physiological range validation catches impossible values
- Unit confusion detection (mmol vs mg/dL)
- Negative values always flagged
- Temporal consistency for stable markers (weight)
- No false warnings for high-variability markers (glucose)

### 3. Extraction Parser Tests
- Valid JSON arrays parsed correctly
- Markdown-fenced JSON cleaned and parsed
- Truncated JSON salvaged (partial array recovery)
- tool_use structured output parsed correctly
- Empty responses handled gracefully

### 4. Lab Name Normalization Tests
- Title stripping (Dr., med., Prof., Dipl.)
- Case insensitivity
- Whitespace collapsing
- Same lab with different formatting matches

### 5. Import Flow Integration Tests
- Upload → extract → match → confirm → measurements created
- Rollback → measurements deleted
- Duplicate detection works (same marker + timestamp skipped)
- Calculated markers computed after import
- Lab dedup assigns correct lab_id

### 6. RC Smoke Tests (manual, documented)
- German lab PDF import end-to-end
- Renpho screenshot import end-to-end
- Rollback button works
- Lab dropdown pre-selects correctly
- Dr. Alex references 360-day data

## Implementation

Add test file: `tests/import_pipeline.rs`

```rust
#[cfg(test)]
mod marker_matcher_regression {
    // Test all 850+ aliases
    // Test fuzzy matching
    // Test learned aliases
}

mod validation_regression {
    // Test physiological ranges
    // Test temporal consistency
}

mod extraction_parser_regression {
    // Test JSON parsing edge cases
}

mod lab_normalization_regression {
    // Test normalize_lab_name
}
```

## Acceptance Criteria

- [ ] 100+ automated tests covering all import pipeline components
- [ ] Tests run in < 30 seconds (no DB needed for unit tests)
- [ ] Test suite added to pre-push checklist
- [ ] RC checklist updated with manual smoke tests
- [ ] No existing tests broken by Sprint 020 changes

## Location

- Unit tests: `src/services/marker_matcher.rs`, `src/services/validation.rs`, `src/handlers/import.rs`
- Integration tests: `tests/import_pipeline.rs`
- RC checklist: `docs/project-files/releases/v0.33.0/rc-test-checklist.md`
