# Data Security & Sovereignty Architecture
**Status:** DRAFT — needs review and prioritization  
**Date:** 2026-03-09  
**Source:** Helmut's requirements

---

## Principles

1. **User owns their data.** Always. Export, delete, migrate.
2. **Minimum PII.** Collect only what's needed. Strip PII from analytics and AI.
3. **Encrypt everything.** At rest, in transit, in exports.
4. **Self-hosted = full sovereignty.** OSS users never touch our infrastructure.
5. **SaaS sync = anonymized.** No email, no name, no IP in analytics pipeline.

---

## Current State (March 2026)

| Layer | Status | Risk |
|-------|--------|------|
| Transit (HTTPS/TLS) | ✅ TLS 1.3 via Let's Encrypt | Low |
| Auth (JWT + Argon2) | ✅ Working | Low |
| DB encryption at rest | ❌ Plaintext in PostgreSQL | **High** |
| Doctor Chat PII | ❌ Age+gender sent, but email/name not sent | Medium |
| CSV export protection | ❌ Unencrypted CSV download | Medium |
| Admin data access | ❌ Admin can query raw DB | Medium |
| SaaS analytics sync | ❌ Not built yet | N/A |
| User data deletion | ❌ No self-service delete | Medium |

---

## Implementation Plan

### Phase 1 (M09): Encryption at Rest

**What:** Encrypt sensitive columns in PostgreSQL using AES-256-GCM.

**Columns to encrypt:**
- measurements.value_canonical (the actual health data)
- measurements.lifestyle_note (free text, potentially sensitive)
- user_profile.* (gender, age, height)
- doctor_chat_messages.question + response (conversation content)

**How:**
- Encryption key from env var: ENCRYPTION_KEY (256-bit, hex-encoded)
- Encrypt on write, decrypt on read (transparent to API consumers)
- Store as BYTEA columns with a version prefix (v1:iv:ciphertext:tag)
- Key rotation procedure: re-encrypt all rows with new key, documented runbook

**What stays plaintext:**
- marker_id, timestamp, device_id (needed for queries/indexes)
- zone_markers, reference_ranges (non-sensitive reference data)
- user.email (needed for login, but hashed for analytics)

**Verification:**
- psql SELECT on measurements shows encrypted blobs, not values
- API returns decrypted values correctly
- Performance: <5ms overhead per read

### Phase 2: Anonymized Doctor Chat

**Current:** System prompt receives age, gender, protocol tag, and measurement values. Email and name are NOT sent.

**Improvements:**
- Audit and enforce: grep codebase for any PII leaking into Claude context
- Add explicit PII filter before API call:
  - Strip: email, name, IP, user_id (replace with anonymous session ID)
  - Keep: age bracket (50s), gender, measurement values, protocol tags, calculated markers
  - Log what gets sent (without the actual values) for audit trail
- Add user consent toggle: "Allow AI analysis of my data" in settings (default: on for SaaS, user choice for OSS)

### Phase 3: Protected CSV Export

**Options:**
1. **Password-protected ZIP:** Export as .zip with AES-256 encryption, password = user's login password
   - Pro: standard format, any OS can open
   - Con: password is the login password (if compromised, both are exposed)
2. **User-set export password:** Prompt for a separate export password at download time
   - Pro: independent of login credentials
   - Con: user might forget it
3. **Encrypted PDF report** (for sharing with doctors): password-protected PDF with charts + tables
   - Pro: professional, shareable
   - Con: more complex to generate

**Recommendation:** Option 2 (user-set export password) for CSV, plus Option 3 (PDF) as a Phase 2 feature (M21).

### Phase 4: Anonymized SaaS Sync Layer

**Purpose:** Allow admin to see aggregate health improvement patterns without identifying users.

**What gets synced (anonymized):**
- Anonymous user ID (UUID, not linked to email)
- Demographics: age bracket (e.g. "50-59"), gender, country (optional)
- Lifestyle: diet protocol (keto/carnivore/mixed/vegan), fasting protocol, exercise frequency
- All blood marker values with timestamps (the core data)
- Calculated markers (GKI, HOMA-IR, etc.)
- Improvement deltas (before/after lifestyle changes)

**What NEVER syncs:**
- Email, name, IP address, user-agent
- Free-text notes (lifestyle_note)
- Device serial numbers
- Doctor Chat conversations

**Implementation:**
- Separate analytics database (or schema) with only anonymized data
- One-way sync: app DB → analytics DB (no reverse path)
- User opt-in: "Contribute anonymized data to health research" toggle in settings
- OSS self-hosted: sync is OFF by default, optional opt-in to SaaS analytics
- Admin dashboard reads from analytics DB only

**Admin can see:**
- "52 users aged 50-59 on carnivore diet improved HbA1c by avg 0.4% over 3 months"
- "Users who measure 2x/week retain 3x longer than 1x/week"
- NOT: "Helmut's glucose was 5.8 on March 7"

### Phase 5: Full Data Sovereignty (OSS)

**For self-hosted users:**
- Zero telemetry by default (no phone-home)
- All data stays on their server
- Optional: anonymized sync to SaaS analytics (opt-in, configurable endpoint)
- Data export: full JSON dump of everything (not just CSV)
- Data deletion: one-click "delete my account and all data" with confirmation
- Data portability: export in FHIR-compatible format (future, for interop with medical systems)

---

## Priority Order

| Priority | What | Module | Effort |
|----------|------|--------|--------|
| 1 | Encryption at rest | M09 | Medium |
| 2 | Anonymized Doctor Chat audit | — | Small |
| 3 | Protected CSV export (password ZIP) | M14b | Small |
| 4 | User data deletion (self-service) | — | Small |
| 5 | Anonymized SaaS sync layer | — | Large |
| 6 | Admin analytics dashboard | M24 | Medium |
| 7 | FHIR export | — | Large (future) |

---

_This document is the security roadmap. Review with Helmut, then schedule into sprints._
