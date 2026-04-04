# Issue #328: Import pipeline error handling, monitoring, and i18n

**Type:** feature
**Priority:** high
**Component:** full-stack / import pipeline
**Sprint:** 021

## Description

The import pipeline needs proper error handling with user-friendly i18n messages, structured logging for debugging, and monitoring for performance analysis. Currently errors show technical messages ("Upstream AI service error") or hardcoded English strings.

## Requirements

### 1. User-facing error messages (i18n)
All error messages shown to users must be:
- Translated (EN + DE minimum)
- Non-technical (no API details, no stack traces)
- Actionable (tell user what to do)

Error scenarios to cover:
| Error | Current message | Required message |
|-------|----------------|-----------------|
| API credits exhausted | "Upstream AI service error" | "Import temporarily unavailable. Please try again later." |
| API timeout | "Upstream AI service error" | "Import is taking longer than expected. Please try again." |
| Invalid file type | Technical error | "This file type is not supported. Please upload a PDF or image." |
| File too large | Technical error | "File is too large. Maximum size is 10 MB." |
| No markers found | Shows empty review | "No health markers could be identified in this document." |
| Rate limited | "Upstream AI service error" | "Too many imports. Please wait a moment and try again." |
| API key missing | "Missing API key" | "Import service is not configured. Contact support." |
| Session expired | Various | "Your session has expired. Please log in again." |

### 2. Structured logging for debugging
Every import should log:
- Session ID, user ID, import type, file type, file size
- Classification result (category, language, confidence)
- Extraction method (tool_use vs text), token usage
- Match results: matched count, fuzzy count, unmatched count
- Validation warnings count
- Confirm result: measurements created, duplicates skipped
- Rollback: measurements deleted
- Errors: full error context with request ID

### 3. Performance monitoring
- Track import duration (upload → extraction → matching → confirm)
- Track AI API latency per call
- Track match rate per import
- Store in import_sessions for admin dashboard

### 4. No hardcoded strings
- All user-facing text in i18n files (EN + DE)
- Error codes returned from backend, frontend maps to translated message
- Backend returns structured error: `{ "error": { "code": "credits_exhausted", "message": "..." } }`

## Location
- Backend errors: `api/src/handlers/import.rs`, `api/src/services/doctor_chat.rs`
- Frontend error display: `components/doctor-chat/chat-layout.tsx`
- i18n: `frontend/src/i18n/messages/en.json`, `de.json`
- Logging: throughout import pipeline
