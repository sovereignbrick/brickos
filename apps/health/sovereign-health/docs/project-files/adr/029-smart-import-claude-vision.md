# ADR 029: Smart Import via Claude Vision API for document parsing

**Status:** Accepted
**Date:** 2026-03-18 (documented 2026-04-05)
**Context:** Sprint 018-019 -- import pipeline evolution

## Context
Users need to import health data from various sources: blood glucose meter displays (Fora 6), lab reports (PDF), medication prescriptions (images), and CSV exports. Manual entry is tedious and error-prone. The platform needed an automated extraction pipeline.

## Decision
Use Anthropic's Claude Vision API for document classification and structured data extraction:

- **Document classification** (`classify_document`): Claude categorizes uploaded files into: lab_report, body_composition, glucose_meter, blood_pressure, medication, general_health. Returns category + detected language.
- **Structured extraction** via tool-use: Claude extracts marker names, values, units, and reference ranges using a tool schema. Returns structured JSON, not free text.
- **Multi-page support**: `call_claude_vision_multi` handles multi-page PDFs (up to 10 pages)
- **Image compression**: `compress_image_if_needed` reduces large images before sending to Claude (Anthropic 5MB base64 limit = ~3.5MB raw)
- **CSV extraction**: Text-only Claude call for tabular data (no vision needed)
- **Two-phase flow**: Upload -> extract (AI) -> confirm (user reviews) -> import (create measurements). User always reviews before data is committed.
- **Credit cost**: 2 AI credits per import (vs 1 for chat) due to higher token usage

## Alternatives Considered
- **Tesseract OCR + regex**: Rejected -- too fragile for varied lab report formats, can't handle handwritten prescriptions, no semantic understanding
- **Custom ML model**: Rejected -- requires training data, maintenance, and expertise we don't have. Claude Vision works out-of-the-box with zero training
- **Manual entry only**: Rejected -- too tedious for users with regular blood work. Import is a key differentiator
- **Google Vision API**: Rejected -- privacy concern (health data to Google), less capable for structured extraction than Claude tool-use

## Consequences
- Works across document types and languages without custom training
- Two-phase confirm flow prevents AI extraction errors from silently creating bad data
- Anthropic API dependency -- if API is down, imports are blocked (chat and other features also depend on Anthropic)
- Cost: ~$0.03-0.05 per import (Sonnet 4). Tracked in `ai_usage_log` for admin visibility
- Base64 encoding doubles file size in transit -- the 5MB API limit means ~3.5MB max raw file size
- Rollback capability: confirmed imports can be rolled back (deletes all measurements from that session)
