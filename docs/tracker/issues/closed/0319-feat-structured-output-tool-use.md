# Issue #319: Use Claude tool_use for structured extraction output

**Type:** feature
**Priority:** high
**Component:** backend / import pipeline
**Sprint:** 020

## Description

Current extraction returns free-form JSON in a text response. Claude sometimes wraps it in markdown fences, truncates arrays, or includes explanatory text. We have a `parse_extraction_response()` function with multiple fallback heuristics to handle this.

Replace with Claude's `tool_use` feature to force typed, structured output. No more JSON parsing edge cases.

## Current Problems

1. Markdown fences: `\`\`\`json [...] \`\`\`` needs stripping
2. Truncated arrays: max_tokens exceeded → partial JSON → salvage via `rfind("},")` heuristic
3. Mixed output: Claude adds "Here are the markers:" before JSON
4. Invalid JSON: occasionally returns malformed arrays

## Proposed Change

Define extraction as a tool schema:

```json
{
  "tools": [{
    "name": "report_extracted_markers",
    "description": "Report all health markers extracted from the document",
    "input_schema": {
      "type": "object",
      "properties": {
        "markers": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "marker_name": { "type": "string" },
              "value": { "type": "number" },
              "unit": { "type": "string" },
              "reference_range": { "type": "string" },
              "flag": { "enum": ["normal", "high", "low", "critical"] },
              "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
              "measured_at": { "type": "string" }
            },
            "required": ["marker_name", "value", "confidence"]
          }
        },
        "metadata": {
          "type": "object",
          "properties": {
            "lab_date": { "type": "string" },
            "lab_provider": { "type": "string" },
            "lab_address": { "type": "string" },
            "lab_city": { "type": "string" },
            "lab_country": { "type": "string" },
            "detected_language": { "type": "string" },
            "document_type": { "type": "string" }
          }
        }
      },
      "required": ["markers"]
    }
  }]
}
```

## Benefits

- Guaranteed valid JSON structure
- No markdown fence cleanup
- No truncation recovery heuristics
- Type enforcement (value is always a number, not a string)
- Can remove `parse_extraction_response()` entirely

## Acceptance Criteria

- [ ] All vision extraction calls use tool_use
- [ ] `parse_extraction_response()` removed or reduced to fallback only
- [ ] Extraction reliability improved (no more partial JSON salvaging)
- [ ] All existing import flows work unchanged

## Tests

- [ ] Remove/update parse_extraction_response tests
- [ ] Integration test: tool_use response correctly parsed
- [ ] Regression test: all import types still work

## Location

- Vision calls: `apps/health/sovereign-health/api/src/services/doctor_chat.rs`
- Response parsing: `apps/health/sovereign-health/api/src/handlers/import.rs`
