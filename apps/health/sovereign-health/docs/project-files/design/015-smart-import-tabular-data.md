<!--
============================================================================
 SOVEREIGN HEALTH INTELLIGENCE

 BLOOD · BIOMARKERS · INSIGHT

 Design Doc 015 — Smart Import: Tabular Measurement Data
 Date: 2026-03-20

 https://sovereignhealth.io/
 AGPL-3.0 — https://github.com/sovereignbrick/brickos
============================================================================
-->

# Design 015 — Smart Import: Tabular Measurement Data

**Status:** Draft
**Priority:** High (Sprint 005)
**Estimated effort:** 8-13 pts

## Problem

Users have historical health measurement data in spreadsheets (ODS, XLSX, CSV) and as photos of measurement tables. Currently, the only way to enter this data is manually, one measurement at a time. Dr. Alex can import lab PDFs and supplement photos, but not tabular measurement data.

The pilot import (Sprint 004) revealed:
- Users have months/years of home device data in spreadsheets
- Data includes multiple devices (Fora 6, Qardio Base, Qardio Arm)
- Columns map to markers, rows map to measurement sessions
- Diet protocols, fasting states, and notes are captured alongside values
- Device assignment matters — markers should link to the user's existing devices

## Solution

Add a third Smart Import option: **"Tabellarische Messwerte"** (Tabular Measurements). This handles both file uploads (ODS/XLSX/CSV) and photo uploads (image of a spreadsheet/table).

---

## UX Flow

### 1. Entry Points

**Agent Grid (Smart Import section):**
```
SMART-IMPORT
┌─────────────────────┐  ┌──────────────────────────┐  ┌────────────────────────────┐
│ 📄 Labor-PDF        │  │ 💊 Einflussfaktoren      │  │ 📊 Tabellarische Messwerte │
│    hochladen        │  │    erfassen              │  │    importieren             │
└─────────────────────┘  └──────────────────────────┘  └────────────────────────────┘
```

**Chat input attachment button (paperclip):**
Show a submenu on click:
```
┌─────────────────────────────────┐
│ 📄 Laborergebnis (PDF/Foto)    │
│ 💊 Medikamente/Supplemente     │
│ 📊 Messwerte-Tabelle           │
└─────────────────────────────────┘
```
If the button currently triggers a single upload → replace with this submenu.

### 2. File Upload

**Accepted formats:**
- Images: JPEG, PNG, WebP (photo of a table)
- Spreadsheets: ODS, XLSX, CSV
- Max 3 files, 10MB each (same limits as other imports)

**Frontend validation:**
- Check file type before upload
- Show error for unsupported formats
- Photo count validation (max 3)

### 3. Backend Processing

#### For spreadsheet files (ODS/XLSX/CSV):

1. **Convert to CSV** using LibreOffice headless (already available on VPS)
2. **Send CSV content to Claude** with a structured prompt:
   ```
   Analyze this CSV health measurement data. Identify:
   1. Which row is the header
   2. Column mapping: which columns contain dates, times, marker values
   3. For each marker column: the marker name, unit, and likely device
   4. Data rows with their values

   Return structured JSON with the column mapping and parsed rows.
   ```
3. **Match markers** against the user's existing markers (fuzzy match)
4. **Match devices** against the user's existing devices
5. Return structured import session for review

#### For image files (photo of table):

1. **Send to Claude Vision** with prompt:
   ```
   This is a photo of a health measurement table/spreadsheet.
   Extract all visible data rows with columns, dates, and values.
   Identify marker names from the column headers.
   Return structured JSON.
   ```
2. Same matching and review flow as spreadsheet files

### 4. Review Screen

Reuse the Lab PDF review pattern (not the influence factor pattern):

```
┌─────────────────────────────────────────────────────────────────┐
│ Review Extracted Measurements                                    │
│ source_file.xlsx — 33 dates found, 10 markers                   │
│                                                          Cancel  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ COLUMN MAPPING                                                   │
│ ┌──────────────┬──────────────────┬────────┬──────────────┐     │
│ │ Source Column │ Matched Marker   │ Unit   │ Device       │     │
│ ├──────────────┼──────────────────┼────────┼──────────────┤     │
│ │ Gewicht (kg) │ Weight        ✓  │ kg     │ Qardio Base  │     │
│ │ Blutdruck s. │ BP Systolic   ✓  │ mmHg   │ Qardio Arm   │     │
│ │ Blutzucker   │ Glucose       ✓  │ mmol/L │ Fora 6       │     │
│ │ Hämatokrit   │ Hematocrit    ✓  │ %      │ Fora 6       │     │
│ │ Unknown Col  │ [Select marker▾] │ ?      │ [Select ▾]   │     │
│ └──────────────┴──────────────────┴────────┴──────────────┘     │
│                                                                  │
│ PROTOCOL MAPPING                                                 │
│ ┌──────────────────┬────────────────────┐                       │
│ │ "Nüchtern"       │ Fasting         ✓  │                       │
│ │ "2h nach Essen"  │ 2h after meal   ✓  │                       │
│ │ "Abendmessung"   │ Standard        ✓  │                       │
│ └──────────────────┴────────────────────┘                       │
│                                                                  │
│ PREVIEW (first 5 rows)                                           │
│ ┌──────────┬────────┬────────┬─────┬─────────┬──────┐          │
│ │ Date     │ Weight │ BP Sys │ HR  │ Glucose │ HCT  │          │
│ ├──────────┼────────┼────────┼─────┼─────────┼──────┤          │
│ │ 24.06.25 │ 73.0   │ 109    │ 75  │ 5.0     │ 41   │          │
│ │ 25.06.25 │ 72.6   │ 111    │ 70  │ 4.0     │ 40   │          │
│ │ ...      │ ...    │ ...    │ ... │ ...     │ ...  │          │
│ └──────────┴────────┴────────┴─────┴─────────┴──────┘          │
│                                                                  │
│ ☑ Skip duplicate timestamps (recommended)                        │
│                                                                  │
│ 33 / 33 rows selected          Cancel    Import 33 Measurements  │
└─────────────────────────────────────────────────────────────────┘
```

**Key features of review screen:**
- Column-to-marker mapping table (editable — user can reassign)
- Device assignment per marker column (auto-detected from user's devices)
- Protocol mapping (auto-detected from source data)
- Preview of first 5 rows for verification
- Row selection (checkbox to include/exclude)
- Duplicate detection toggle
- Total count of rows to import

### 5. Import Execution

1. Create measurements via existing `POST /measurements` endpoint
2. Group by device (one API call per device per timestamp)
3. Track all created measurement IDs for rollback
4. Show progress bar during upload
5. On completion: success toast with count + "View in History" button

### 6. Rollback

After a successful import, store the import session:

```sql
-- New table
CREATE TABLE import_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    source_type VARCHAR(20) NOT NULL,  -- 'spreadsheet', 'image', 'lab_pdf', 'medication'
    source_filename TEXT,
    measurement_ids UUID[],            -- Array of created measurement IDs
    measurement_count INTEGER NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rolled_back_at TIMESTAMPTZ,
    rolled_back_by UUID REFERENCES users(id)
);
```

**Rollback UI:**
- In measurement history, show "Import: source_file.xlsx (33 measurements)" as a group header
- Clicking it shows option: "Undo this import" → deletes all measurements from that session
- Also accessible from Settings → Data & Privacy → Import History

---

## Device Matching Logic

1. Fetch user's devices with their `markers_measured` arrays
2. For each marker column in the spreadsheet:
   - Check which user device has that marker in `markers_measured`
   - If exactly one device matches → auto-assign
   - If multiple match → pick the default device, or show dropdown
   - If none match → leave as "Manual Entry"
3. Show the mapping in the review screen for user confirmation

---

## AI Prompt Design

### Spreadsheet extraction prompt:
```
You are analyzing a health measurement spreadsheet exported as CSV.

The user's existing markers are: [list from DB]
The user's devices are: [list with markers_measured]

Rules:
1. Identify the header row (column names)
2. Map each column to a health marker slug from the user's marker list
3. Detect the date format (DD.MM.YYYY, MM/DD/YYYY, etc.)
4. Detect measurement protocols (fasting, postprandial, etc.)
5. Parse all data rows, converting comma decimals to periods
6. Skip empty rows and rows with no marker values
7. For each marker, suggest which user device it belongs to

Return JSON:
{
  "header_row": 1,
  "date_column": 0,
  "time_column": 1,
  "columns": [
    { "index": 5, "source_name": "Gewicht (kg)", "marker_slug": "weight", "unit": "kg", "device": "Qardio Base" },
    ...
  ],
  "protocols": {
    "Nüchtern": "fasting",
    "2h nach Essen": "postprandial"
  },
  "rows": [
    { "date": "2025-06-24", "time": "06:00", "protocol": "fasting", "values": { "weight": 73.0, ... }, "notes": "..." },
    ...
  ]
}
```

### Image extraction prompt:
```
This is a photo of a health measurement table or spreadsheet.
Extract ALL visible data. Read every row and column carefully.

[Same rules and output format as above]
```

---

## File Size & Limits

| Limit | Value |
|-------|-------|
| Max files | 3 |
| Max file size | 10MB each |
| Max rows | 500 per import |
| Max markers per row | 20 |
| Accepted image formats | JPEG, PNG, WebP |
| Accepted spreadsheet formats | ODS, XLSX, CSV |

---

## Chat Input Button Behavior

**Current:** Single paperclip button → opens file picker → uploads to lab import or med import based on agent type.

**Proposed:** Paperclip button → shows submenu:
```
📄 Lab result (PDF/photo)
💊 Medication/supplement (photo)
📊 Measurement table (spreadsheet/photo)
```

Each option opens the file picker with appropriate accepted file types. The selected option determines which processing pipeline the files go through.

If implementing the submenu is complex, keep the current button for lab/medication and only add the new import via the Agent Grid card.

---

## Implementation Phases

### Phase A: Backend (3-5 pts)
- [ ] `POST /import/upload-measurements` — accepts ODS/XLSX/CSV/images
- [ ] LibreOffice conversion for spreadsheets
- [ ] Claude prompt for column mapping + data extraction
- [ ] Marker + device matching against user's data
- [ ] `POST /import/confirm-measurements` — creates measurements in bulk
- [ ] `import_sessions` table for rollback tracking
- [ ] `DELETE /import/sessions/{id}/rollback` — undo an import

### Phase B: Frontend — Review Screen (3-5 pts)
- [ ] Column mapping table (editable dropdowns)
- [ ] Device assignment per column
- [ ] Protocol mapping
- [ ] Row preview with selection
- [ ] Duplicate detection toggle
- [ ] Progress bar during import
- [ ] Success toast with "View in History" link

### Phase C: Frontend — Entry Points (2-3 pts)
- [ ] Agent Grid: add "Tabellarische Messwerte" card
- [ ] Chat input: submenu for attachment button (or keep separate)
- [ ] i18n: EN + DE for all new strings

---

## Open Questions

1. Should the review screen allow editing individual cell values (like the influence factor import does)?
2. Should we support multi-sheet ODS/XLSX files (pick which sheet to import)?
3. Should the rollback be time-limited (e.g., only within 24 hours of import)?
4. Should we show a diff against existing data (highlight duplicates in the preview)?
