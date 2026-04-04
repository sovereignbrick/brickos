# Issue #309: Health records / document vault for user profile

**Type:** feature
**Priority:** medium
**Component:** full-stack / new module
**Found during:** feature request (2026-04-02)

## Description

Users should be able to upload and store health-related documents (scans, PDFs, photos) in a personal health records vault. These documents enrich the user's health profile and give Dr. Alex additional context for analysis — diagnoses, conditions, allergies, blood type, hospital records, specialist reports, etc.

## Use Cases

- Upload a doctor's diagnosis letter → Dr. Alex knows the user has e.g. Hashimoto's and factors this into thyroid marker analysis
- Store blood type (e.g. A+) as a permanent profile attribute
- Record allergies and intolerances → Dr. Alex warns when supplements or food recommendations conflict
- Hospital discharge summaries → context for recovery tracking
- Vaccination records
- Specialist referral letters
- Insurance documents

## Feature Design

### Document storage
- Upload: PDF, image (JPG/PNG), scanned document
- Encrypted at rest (same encryption as measurements)
- Metadata per document:
  - **Title** (user-editable, auto-suggested from content)
  - **Document type** (diagnosis, lab report, prescription, hospital record, vaccination, insurance, other)
  - **Date** (document date, not upload date)
  - **Provider** (doctor/hospital name — link to existing labs/providers if possible, see #307)
  - **Tags** (free-form: "allergy", "blood type", "surgery", etc.)
  - **Notes** (user annotations)

### Structured health profile fields
Some documents should extract structured data into the user profile:
- **Blood type** (A+, B-, O+, AB-, etc.)
- **Allergies** (list with severity: mild/moderate/severe/anaphylactic)
- **Chronic conditions / diagnoses** (list with ICD code if available, onset date)
- **Medications** (current, links to existing influence factors)
- **Surgeries / procedures** (date + description)

### Dr. Alex integration
- Dr. Alex receives structured health profile data (conditions, allergies, blood type) as context alongside measurements
- When analysing markers, Dr. Alex factors in known conditions (e.g. iron analysis considers known hemochromatosis)
- User can ask Dr. Alex to "read" a specific uploaded document and extract/interpret findings
- Dr. Alex can suggest adding structured data after interpreting a document

### UI
- New section in user profile or dedicated tab: "Health Records" / "Gesundheitsakte"
- Document list with type icons, date, title, provider
- Upload button (camera + file picker)
- Document detail view with preview + metadata editing
- Structured profile section: blood type, allergies, conditions (quick-edit cards)

## Implementation Notes

### Backend
- New tables: `health_documents` (file storage ref, metadata, encrypted), `health_conditions` (structured diagnoses/allergies/blood type)
- File storage: encrypted blob storage (local or S3-compatible)
- New endpoints: CRUD for documents + structured health profile
- Dr. Alex context builder (`doctor_chat.rs`): include conditions, allergies, blood type

### Frontend
- New route: `/profile/health-records` or `/health-records`
- Upload component with document type selector
- Structured data editor (blood type dropdown, allergy list, condition list)
- i18n: EN + DE for all document types, condition names

### Privacy / GDPR
- All documents encrypted at rest
- Included in data export (GDPR right of access)
- Deleted on account deletion (GDPR right to erasure)
- User controls what Dr. Alex can access

## Location

- New module in backend handlers + services
- New frontend route + components
- Extend Dr. Alex context builder in `doctor_chat.rs`
- Extend user profile page
