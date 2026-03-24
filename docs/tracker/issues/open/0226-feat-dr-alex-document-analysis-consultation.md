---
number: 226
title: "feat: Dr. Alex document analysis — upload prescriptions, articles, doctor advice for AI evaluation"
labels: [enhancement, ai, dr-alex]
milestone: ai-smart-features
---

## Description

Allow users to upload documents (doctor prescriptions, medical articles, health advice) to Dr. Alex for AI-powered analysis against their personal health data.

### Use Cases

1. **Doctor's prescription/advice** — "My doctor prescribed X. What do you think based on my blood work?"
2. **Medical article** — "I read this article about vitamin D. Is this relevant to my levels?"
3. **Lab report from another provider** — "Here's my lab report from a different clinic. How does it compare?"
4. **Supplement advice** — "My naturopath recommended these supplements. Do they make sense for my values?"

### Proposed Flow

1. User uploads document (PDF, photo, text) in Dr. Alex chat
2. AI extracts key information from the document
3. AI cross-references with user's biomarker data, trends, and reference ranges
4. AI provides personalized evaluation: "Based on your glucose of 8.0 mmol/L, the recommendation to reduce carbs aligns with your markers..."
5. Document is saved as a **consultation record** (new type: `prescription_advice`, `external_report`, `health_article`)

### Data Model

```
consultation_documents (new table)
- id UUID
- user_id UUID
- chat_conversation_id UUID (link to Dr. Alex conversation)
- document_type: 'prescription' | 'lab_report' | 'article' | 'advice' | 'other'
- original_filename TEXT
- extracted_text TEXT
- ai_summary TEXT (generated)
- created_at TIMESTAMPTZ
```

### UI Changes

- Dr. Alex chat input: new upload button for "Consult about a document"
- Document type picker after upload (prescription, article, etc.)
- Consultation history in a dedicated tab or filter in Dr. Alex

### Dependencies

- Existing: lab import PDF extraction (can reuse OCR pipeline)
- Existing: Dr. Alex chat with user context injection
- New: document storage + consultation record model

### Notes

- Privacy: documents stored encrypted (like measurement values)
- Tier-gated: Insight tier and above (uses AI quota)
- Follow-up: user can ask further questions referencing the uploaded document
