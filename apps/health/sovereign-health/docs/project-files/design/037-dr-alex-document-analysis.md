# Design: Dr. Alex Document Analysis

**Issue:** [#303](https://github.com/sovereignbrick/brickos/issues/303)
**Status:** Draft
**Date:** 2026-04-05
**Scope:** Design doc only -- implementation in a future sprint

---

## Problem

Users receive health documents (prescriptions, lab reports, medical articles, practitioner advice letters) that contain actionable health information. Currently, they can only import structured lab results and medications via the smart import pipeline. There is no way to upload a general health document and have Dr. Alex analyze it in the context of the user's full health profile.

Users want to:
1. Upload a prescription and understand how it affects their markers
2. Upload a medical article and get Dr. Alex's take on its relevance to their data
3. Upload a practitioner's advice letter and cross-reference it with their measurements
4. Keep a history of analyzed documents for future reference

**Why now:** The import pipeline (`call_claude_vision`, `classify_document`) and Dr. Alex context injection (`build_health_context`) already exist. Document analysis combines both capabilities into a user-facing feature.

---

## Approach

Extend Dr. Alex with a "Document Analysis" mode that:
1. Accepts document uploads (PDF, images)
2. Classifies the document type
3. Extracts key information using Claude Vision
4. Analyzes the content in the context of the user's health profile
5. Stores the document + analysis as a consultation record
6. Deducts AI credits from the unified pool

This builds on three existing systems:
- **Import pipeline**: File upload, base64 encoding, Claude Vision calls, `classify_document()`
- **Dr. Alex chat**: `build_health_context()`, multi-turn conversation, credit enforcement
- **Encryption**: `Encryptor` for data at rest (AES-256-GCM)

---

## Document Types

| Type | Slug | Example | AI Analysis Focus |
|---|---|---|---|
| Prescription | `prescription` | Doctor's medication prescription | Drug interactions with current meds, marker impacts, dosing schedule |
| Lab Report | `lab_report` | Blood work results from external lab | Compare with existing measurements, flag discrepancies, trend context |
| Medical Article | `article` | Research paper, health blog post | Relevance to user's markers, evidence quality, actionable takeaways |
| Practitioner Advice | `advice` | Doctor's letter, nutritionist plan | Cross-reference with measurements, protocol compatibility |
| Supplement Label | `supplement` | Product packaging, ingredient list | Nutrient content vs user's deficiencies, interaction risks |
| Other | `other` | Any unclassified health document | General analysis in health context |

---

## Data Model

### New Table: `consultation_documents`

```sql
CREATE TABLE IF NOT EXISTS consultation_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES doctor_chat_conversations(id) ON DELETE SET NULL,
    document_type VARCHAR(30) NOT NULL DEFAULT 'other',
    title TEXT,                          -- User-provided or AI-extracted title
    original_filename TEXT,              -- Original upload filename (encrypted)
    file_size_bytes INTEGER,
    mime_type VARCHAR(50),               -- application/pdf, image/jpeg, etc.
    file_data_encrypted TEXT,            -- Base64 file content, AES-256-GCM encrypted
    ai_classification JSONB,            -- { category, language, confidence }
    ai_summary TEXT,                    -- AI-generated summary of the document (encrypted)
    ai_extracted_data JSONB,            -- Structured extraction: medications, markers, recommendations (encrypted values)
    ai_analysis TEXT,                   -- Full Dr. Alex analysis in user's health context (encrypted)
    credit_cost INTEGER NOT NULL DEFAULT 3,  -- AI credits consumed
    model_used VARCHAR(50),             -- Claude model used for analysis
    input_tokens INTEGER,
    output_tokens INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'uploaded',  -- uploaded, analyzing, completed, failed
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_docs_user ON consultation_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_consultation_docs_conversation ON consultation_documents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_docs_type ON consultation_documents(document_type);
```

### Relationship to Existing Tables

```
consultation_documents
  ├── user_id -> users (CASCADE delete)
  ├── conversation_id -> doctor_chat_conversations (SET NULL on delete)
  │   └── The analysis creates a new conversation or appends to an existing one
  ├── file_data_encrypted -- stored with same Encryptor used for measurements
  └── ai_extracted_data -- structured JSON (medications, markers found in doc)
       ├── Medications found -> can be imported to user_medications
       └── Lab values found -> can be imported to measurements (via existing import pipeline)
```

### Encryption Strategy

| Field | Encrypted | Rationale |
|---|---|---|
| `original_filename` | Yes | PII -- filename may contain patient name |
| `file_data_encrypted` | Yes | The document itself contains sensitive health data |
| `ai_summary` | Yes | Derived from sensitive document content |
| `ai_analysis` | Yes | Contains user-specific health context |
| `ai_extracted_data` | Partially | Values encrypted, keys (field names) in plaintext for querying |
| `title` | No | User-controlled, used for display in list views |
| `document_type` | No | Categorical, needed for filtering |

### Storage Considerations

- Documents are stored as base64-encoded, AES-256-GCM encrypted blobs in the database
- Max file size: 10MB per file (same as import pipeline)
- For MVP, store in PostgreSQL. Future: consider S3-compatible object storage with encrypted references
- File retention follows the same 360-day default as chat messages (configurable via `app_settings`)
- GDPR: included in data export and hard purge (CASCADE from users table)

---

## Upload Flow

```
User clicks "Upload Document" in Dr. Alex
    ↓
[1] Frontend: file picker (PDF, JPEG, PNG, WebP)
    - Validate: max 10MB, allowed mime types
    - Show preview thumbnail for images
    ↓
[2] Frontend: document type picker (optional)
    - User can pre-select type or let AI classify
    - Type picker: Prescription, Lab Report, Article, Advice, Supplement, Other
    ↓
[3] Frontend: POST /doctor-chat/documents/upload (multipart)
    - File + optional document_type + optional title
    ↓
[4] Backend: validate + store
    - Check AI credits (cost: 3 per document analysis)
    - Check tier feature gate: 'document_analysis'
    - Upload to consultation_documents with status='uploaded'
    - Encrypt file_data and original_filename
    ↓
[5] Backend: classify document
    - Call classify_document() (existing function)
    - Update ai_classification JSON
    - If user didn't specify type, use AI classification
    ↓
[6] Backend: analyze document
    - Build health context: build_health_context()
    - Call Claude Vision with document + health context + analysis prompt
    - Prompt varies by document_type (see AI Prompt Design below)
    - Extract structured data (medications, markers, recommendations)
    - Generate summary + full analysis
    - Encrypt and store results
    - Update status='completed'
    ↓
[7] Backend: create/append conversation
    - Create new doctor_chat_conversation titled "[Document Type]: [Title]"
    - Add assistant message with the analysis
    - User can continue the conversation with follow-up questions
    ↓
[8] Backend: consume credits + log usage
    - consume_ai_credits(pool, user_id, "document_analysis")
    - log_usage() to ai_usage_log
    ↓
[9] Backend: return analysis response
    - Document ID, conversation ID, summary, extracted data, full analysis
    ↓
[10] Frontend: show analysis
    - Display in Dr. Alex chat view as a special "document analysis" message
    - Show extracted items (medications, markers) with import actions
    - "Import medications" button -> pre-fill user_medications
    - "Import lab values" button -> pre-fill measurements via existing import flow
```

---

## AI Prompt Design

### System Prompt (shared across all types)

```
You are Dr. Alex, a health data analyst for Sovereign Health. A user has uploaded 
a health document for analysis. You have access to their health profile below.

Analyze the document in the context of their personal health data. Be specific 
about how the document's content relates to their existing measurements, 
medications, and health goals.

HEALTH CONTEXT:
{health_context}

DOCUMENT TYPE: {document_type}
```

### Type-Specific Instructions

**Prescription (`prescription`)**
```
Analyze this prescription. For each medication:
1. Identify the drug name, dosage, frequency, and duration
2. Check for interactions with the user's current medications: {user_medications}
3. Identify which markers this medication may affect
4. Note any monitoring recommendations (e.g., "check liver function after 3 months")

Use the extract_prescription tool to return structured data.
```

**Lab Report (`lab_report`)**
```
Analyze this lab report. For each result:
1. Extract the marker name, value, unit, and reference range
2. Compare with the user's most recent measurement of the same marker
3. Flag significant changes (>10% deviation)
4. Identify any values outside the reference range
5. Note markers that appear in the report but the user hasn't tracked before

Use the extract_lab_results tool to return structured data.
```

**Medical Article (`article`)**
```
Analyze this health article in the context of the user's data:
1. Summarize the key findings in 2-3 sentences
2. Rate relevance to the user's health profile (high/medium/low)
3. Identify specific markers or conditions mentioned that the user tracks
4. Note any actionable recommendations
5. Assess evidence quality (peer-reviewed, clinical trial, observational, opinion)
```

**Practitioner Advice (`advice`)**
```
Analyze this practitioner's advice letter:
1. Summarize the recommendations
2. Cross-reference with the user's current measurements and trends
3. Identify any conflicts with the user's current protocol ({diet_protocol}, {eating_pattern})
4. Note follow-up actions (tests to schedule, measurements to track)
```

**Supplement Label (`supplement`)**
```
Analyze this supplement label:
1. List all active ingredients with amounts per serving
2. Compare with the user's current supplements and medications
3. Check for redundancy (already getting enough from existing supplements)
4. Check for interactions with current medications
5. Identify which of the user's deficient markers this supplement could help
```

### Tool-Use for Structured Extraction

```json
{
  "name": "extract_document_data",
  "description": "Extract structured health data from the analyzed document",
  "input_schema": {
    "type": "object",
    "properties": {
      "medications": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "generic_name": { "type": "string" },
            "dosage": { "type": "string" },
            "frequency": { "type": "string" },
            "duration": { "type": "string" }
          }
        }
      },
      "lab_values": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "marker_name": { "type": "string" },
            "value": { "type": "number" },
            "unit": { "type": "string" },
            "reference_low": { "type": "number" },
            "reference_high": { "type": "number" },
            "status": { "type": "string", "enum": ["normal", "low", "high", "critical"] }
          }
        }
      },
      "recommendations": {
        "type": "array",
        "items": { "type": "string" }
      },
      "follow_up_actions": {
        "type": "array",
        "items": { "type": "string" }
      },
      "summary": { "type": "string" }
    }
  }
}
```

---

## API Changes

### New Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/doctor-chat/documents/upload` | Required | Upload + analyze a document |
| GET | `/doctor-chat/documents` | Required | List user's analyzed documents |
| GET | `/doctor-chat/documents/{id}` | Required | Get document analysis detail |
| DELETE | `/doctor-chat/documents/{id}` | Required | Soft-delete a document |
| POST | `/doctor-chat/documents/{id}/import-meds` | Required | Import extracted medications |
| POST | `/doctor-chat/documents/{id}/import-labs` | Required | Import extracted lab values |

### Upload Request

```
POST /doctor-chat/documents/upload
Content-Type: multipart/form-data

Fields:
  file: <binary>
  document_type: "prescription" (optional, AI classifies if omitted)
  title: "My blood work from Dr. Mueller" (optional)
```

### Upload Response

```json
{
  "data": {
    "document_id": "uuid",
    "conversation_id": "uuid",
    "document_type": "lab_report",
    "title": "Blood Work Results - Apr 2026",
    "status": "completed",
    "summary": "Lab report with 12 markers. 2 values outside reference range...",
    "extracted": {
      "medications": [],
      "lab_values": [
        { "marker_name": "Glucose", "value": 5.8, "unit": "mmol/L", "status": "normal" }
      ],
      "recommendations": ["Follow up HbA1c in 3 months"],
      "follow_up_actions": ["Schedule fasting glucose test"]
    },
    "analysis": "Based on your lab results and your current keto protocol...",
    "credit_cost": 3,
    "importable": {
      "medications": 0,
      "lab_values": 12
    }
  }
}
```

---

## Tier Gating & Credit Cost

| Tier | Access | Credit Cost |
|---|---|---|
| Glimpse (free) | Not available | -- |
| Focus | Not available | -- |
| Insight | Available | 3 credits per document |
| Clarity | Available | 3 credits per document |
| Horizon | Available | 3 credits per document |
| Core (self-hosted) | Unlimited | 0 (self-hosted) |

**Credit cost rationale:** Document analysis requires Claude Vision (expensive) plus health context injection (large prompt). A single analysis typically uses 2,000-5,000 input tokens and 1,000-2,000 output tokens, costing approximately 0.03-0.05 EUR. The 3-credit cost reflects the heavier compute versus a standard chat message (1 credit).

**Feature key:** `document_analysis` in `product_features` / `tier_features`.

---

## UI Changes

### 1. Upload Button in Dr. Alex

Add a document upload button next to the chat input:
- Paperclip icon or document icon
- Opens file picker (PDF, JPEG, PNG, WebP, max 10MB)
- After file selection, shows type picker inline
- Submit triggers upload + analysis

### 2. Analysis Result Card

In the chat conversation, display the analysis as a special message card:
- Document icon with type badge (Prescription, Lab Report, etc.)
- Title (user-provided or AI-generated)
- Collapsible summary section
- Extracted data section:
  - Medications table with "Import" button
  - Lab values table with "Import" button
  - Recommendations list
  - Follow-up actions checklist
- Full analysis text (expandable)
- File size and timestamp

### 3. Document History

In Dr. Alex sidebar or a sub-tab:
- List of all analyzed documents
- Filter by type
- Click to open the associated conversation
- Delete option (soft delete)

### 4. Import Actions

- "Import X medications" button -> opens user_medications form pre-filled with extracted data
- "Import X lab values" button -> opens import confirmation flow (reuse existing import confirm UI)

---

## Privacy & Security

| Concern | Mitigation |
|---|---|
| Document contains PII | Encrypted at rest (AES-256-GCM) via Encryptor. Decrypted only during analysis and user access. |
| Document sent to Claude API | Necessary for analysis. Anthropic's usage policy applies. Data is not used for training. |
| Document stored long-term | 360-day retention (configurable). Included in GDPR export and hard purge. |
| Admin access | Admin cannot view document content (encrypted). Admin sees metadata only (type, date, credit cost). |
| Cross-user leakage | Standard user_id filtering. CASCADE delete on account deletion. |

---

## Open Questions

- [ ] Should we support multi-page PDF analysis (currently import supports up to 10 pages)?
- [ ] Should extracted lab values auto-create measurements, or always require user confirmation?
- [ ] Should document analysis be available as a standalone feature, or only within Dr. Alex chat?
- [ ] Max documents per month -- should this be a separate limit or just use the credit pool?
- [ ] Should we OCR the document first (Tesseract) to reduce Claude Vision costs, or rely on Vision entirely?

---

## Implementation Estimate

| Component | Effort | Sprint |
|---|---|---|
| Migration: consultation_documents table | 1 pt | Future |
| Backend: upload + classify + analyze flow | 5 pts | Future |
| Backend: document list, detail, delete endpoints | 2 pts | Future |
| Backend: import-meds, import-labs actions | 3 pts | Future |
| Frontend: upload button + type picker | 2 pts | Future |
| Frontend: analysis result card | 3 pts | Future |
| Frontend: document history list | 2 pts | Future |
| Frontend: import action flows | 2 pts | Future |
| i18n: EN + DE | 1 pt | Future |
| **Total** | **21 pts** | **2-3 sprints** |

---

## References

- Existing import pipeline: `api/src/handlers/import.rs`
- Document classification: `api/src/services/doctor_chat.rs:1519` (`classify_document`)
- Claude Vision calls: `api/src/services/doctor_chat.rs:1069` (`call_claude_vision`)
- Health context builder: `api/src/services/doctor_chat.rs:34` (`build_health_context`)
- Encryption: `crates/brickos-crypto/src/lib.rs` (AES-256-GCM Encryptor)
- AI credit enforcement: `api/src/services/tier.rs:1137` (`check_ai_credits`)
- AI usage logging: `api/src/services/ai_usage.rs`
- Unified credit pool design: migration `20260326000003_ai_credit_pool.sql`
