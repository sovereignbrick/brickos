# Sovereign Health MVP — Design Document
**Focus:** Manual multi-parameter measurement input (flexible, home + lab)

---

## 🎯 Core Concept

**One measurement session = Multiple parameters + rich context**

Instead of:
```
BG: 5.8
Date: 27.2.2026
Time: 06:00
```

We support:
```
Session (27.2.2026, 06:00, "Fora 6", "home"):
  - BG: 5.8 mmol/L
  - BP: 100/69 mmHg
  - Ketones: 0.1 mmol/L
  - Weight: 73.0 kg
  - UA: 321 µmol/L
  - Cholesterin: 8.1 mmol/L
  + Journal: "carnivore, too much honey, one coffee, last meal 4pm"
```

Or:
```
Session (23.7.2025, 12:00, "Aware/YouthClub", "lab"):
  - Insulin: 2.8 mU/L
  - HbA1c: 5.4 %
  - ApoB: 1.79 g/L
  - hs-CRP: 0.7 µmol/L
  - Creatinine: 98 µmol/L
  - eGFR: 74 ml/min/1.73m2
  + Lab notes: "Fasting, after 1 week carnivore"
```

---

## 📊 Data Model (PostgreSQL Schema)

### **1. Core Tables**

```sql
-- Users (simple, MVP = single user)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Measurement sessions (one per date/time/device combo)
CREATE TABLE measurement_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  session_date DATE NOT NULL,
  session_time TIME,
  device_id INT REFERENCES devices(id),
  location VARCHAR(50), -- "home", "lab", "external"
  lab_provider VARCHAR(100), -- "Fora 6", "Aware", "SYNLAB", etc.
  notes TEXT, -- Rich context (HTML or markdown)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, session_date, session_time, device_id)
);

-- Flexible parameter measurements (one row = one parameter value)
CREATE TABLE measurements (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES measurement_sessions(id) ON DELETE CASCADE,
  parameter_id INT NOT NULL REFERENCES parameters(id),
  value DECIMAL(10, 4),
  unit VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, parameter_id) -- One value per parameter per session
);

-- Parameter catalog (flexible, can add new ones anytime)
CREATE TABLE parameters (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL, -- "bg", "bp_systolic", "ketones", "apo_b", etc.
  name_en VARCHAR(255) NOT NULL,
  name_de VARCHAR(255),
  category VARCHAR(50), -- "glucose", "lipids", "blood_pressure", "inflammatory", etc.
  unit_default VARCHAR(50), -- "mmol/L", "mmHg", "g/L", etc.
  unit_alternatives TEXT, -- JSON: ["mg/dL", "mg/100mL"]
  data_type VARCHAR(20), -- "decimal", "integer", "boolean"
  normal_range_low DECIMAL(10, 4),
  normal_range_high DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Devices (to track which device produced the measurement)
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  device_code VARCHAR(50), -- "fora6", "qardio_arm", "qardiobase2", etc.
  device_name VARCHAR(255), -- "Fora 6", "Qardio Arm (BP)", etc.
  device_type VARCHAR(50), -- "glucose_meter", "bp_cuff", "scale", "lab_multi", etc.
  location VARCHAR(100), -- "left middle finger", "left arm", etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Journal entries (flexible free-form + structured tags)
CREATE TABLE journal_entries (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES measurement_sessions(id) ON DELETE CASCADE,
  entry_text TEXT, -- Free-form journal entry
  tags JSONB, -- {"diet": "carnivore", "coffee": "1 cup", "sleep_hours": 7, "stress": "medium"}
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 Data Types & Conversions

### **Measurement Record (Rust struct)**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasurementValue {
    pub parameter_code: String,        // "bg", "bp_systolic", "ua", etc.
    pub value: f64,
    pub unit: String,                  // "mmol/L", "mmHg", "µmol/L"
    pub timestamp: Option<DateTime<Utc>>, // Optional: precise time if multi-measurement
    pub notes: Option<String>,         // Parameter-specific notes ("after meal", etc.)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MeasurementSession {
    pub id: Option<i32>,
    pub user_id: i32,
    pub session_date: NaiveDate,
    pub session_time: Option<NaiveTime>,
    pub device_id: Option<i32>,
    pub location: String,              // "home" | "lab" | "external"
    pub lab_provider: Option<String>,  // "Fora 6", "Aware/YouthClub", "SYNLAB", etc.
    pub measurements: Vec<MeasurementValue>, // Multiple parameters in one session
    pub journal_entry: Option<String>,
    pub tags: Option<serde_json::Value>, // Flexible JSON tags
}
```

---

## 🔧 API Endpoints

### **1. Create/Update Session with Multiple Measurements**

**POST /api/sessions**

```json
{
  "session_date": "2026-02-27",
  "session_time": "06:00",
  "location": "home",
  "lab_provider": "Fora 6",
  "device_id": 1,
  "measurements": [
    {"parameter_code": "bg", "value": 5.8, "unit": "mmol/L"},
    {"parameter_code": "bp_systolic", "value": 100, "unit": "mmHg"},
    {"parameter_code": "bp_diastolic", "value": 69, "unit": "mmHg"},
    {"parameter_code": "pulse", "value": 69, "unit": "bpm"},
    {"parameter_code": "weight", "value": 73.0, "unit": "kg"},
    {"parameter_code": "ketones", "value": 0.1, "unit": "mmol/L"},
    {"parameter_code": "ua", "value": 321, "unit": "µmol/L"},
    {"parameter_code": "chol_total", "value": 8.1, "unit": "mmol/L"},
    {"parameter_code": "hct", "value": 36.0, "unit": "%"},
    {"parameter_code": "hb", "value": 7.57, "unit": "mmol/L"}
  ],
  "journal_entry": "carnivore, too much honey, one coffee, last meal 4pm, magnesium",
  "tags": {
    "diet": "carnivore",
    "coffee_cups": 1,
    "last_meal_time": "16:00",
    "supplements": ["magnesium"],
    "stress_level": "normal",
    "sleep_quality": "good",
    "sleep_hours": 9
  }
}
```

**Response:**
```json
{
  "id": 42,
  "session_date": "2026-02-27",
  "session_time": "06:00",
  "location": "home",
  "lab_provider": "Fora 6",
  "device_id": 1,
  "measurements": [...same as above...],
  "journal_entry": "...",
  "tags": {...},
  "created_at": "2026-03-01T09:15:00Z"
}
```

---

### **2. Retrieve Single Session (with all measurements)**

**GET /api/sessions/{session_id}**

```json
{
  "id": 42,
  "user_id": 1,
  "session_date": "2026-02-27",
  "session_time": "06:00",
  "location": "home",
  "lab_provider": "Fora 6",
  "device_id": 1,
  "measurements": [
    {
      "id": 1001,
      "parameter_code": "bg",
      "parameter_name": "Blood Glucose",
      "value": 5.8,
      "unit": "mmol/L",
      "normal_range": {"low": 5.2, "high": 6.2},
      "status": "normal" // "low", "normal", "warning", "high"
    },
    ...
  ],
  "journal_entry": "...",
  "tags": {...},
  "created_at": "2026-02-27T06:00:00Z"
}
```

---

### **3. List Sessions (with summary)**

**GET /api/sessions?start_date=2026-01-01&end_date=2026-02-27&location=home**

```json
[
  {
    "id": 42,
    "session_date": "2026-02-27",
    "location": "home",
    "device_name": "Fora 6",
    "parameter_count": 10,
    "key_metrics": {
      "bg": 5.8,
      "bp": "100/69",
      "weight": 73.0
    }
  },
  {
    "id": 41,
    "session_date": "2026-02-24",
    "location": "home",
    "device_name": "Fora 6",
    "parameter_count": 8,
    "key_metrics": {
      "bg": 4.9,
      "bp": "100/69",
      "weight": 72.9
    }
  }
]
```

---

### **4. Parameter Catalog (Get Available Parameters)**

**GET /api/parameters?category=all**

```json
{
  "total": 50,
  "categories": ["glucose", "lipids", "blood_pressure", "inflammatory", "kidney", "liver", "blood_cell"],
  "parameters": [
    {
      "id": 1,
      "code": "bg",
      "name": "Blood Glucose",
      "category": "glucose",
      "unit_default": "mmol/L",
      "unit_alternatives": ["mg/dL"],
      "normal_range": {"low": 3.9, "high": 5.6},
      "data_type": "decimal"
    },
    {
      "id": 2,
      "code": "bp_systolic",
      "name": "Blood Pressure (Systolic)",
      "category": "blood_pressure",
      "unit_default": "mmHg",
      "normal_range": {"low": 100, "high": 120},
      "data_type": "integer"
    },
    ...
  ]
}
```

---

### **5. Add/Remove Parameters from Parameter Catalog**

**POST /api/parameters (admin only)**

```json
{
  "code": "apob_new",
  "name": "Apolipoprotein B",
  "category": "lipids",
  "unit_default": "g/L",
  "unit_alternatives": ["mg/dL"],
  "normal_range": {"low": 1.2, "high": 1.8},
  "data_type": "decimal"
}
```

---

## 🎨 Frontend Structure

### **Session Input Form (Dynamic)**

```
[Date Picker: 2026-02-27] [Time: 06:00] [Location: Home ▼] [Device: Fora 6 ▼]

📋 Add Measurements
┌─────────────────────────────────────┐
│ Parameter ▼ | Value | Unit ▼ | Notes│
├─────────────────────────────────────┤
│ Blood Glucose | 5.8 | mmol/L | fasting│
│ BP Systolic   | 100 | mmHg   |        │
│ BP Diastolic  |  69 | mmHg   |        │
│ Weight        | 73.0| kg     | morning│
│ Ketones       | 0.1 | mmol/L |        │
│ Uric Acid     | 321 | µmol/L |        │
│ + Add Parameter |
└─────────────────────────────────────┘

📔 Journal Entry
┌──────────────────────────────────────┐
│ carnivore, too much honey, one coffee│
│ last meal 4pm, magnesium             │
└──────────────────────────────────────┘

🏷️ Tags (Optional)
Diet: carnivore | Coffee: 1 cup | Sleep: 9h | Stress: normal

[Save Session] [Preview] [Cancel]
```

### **Flow:**
1. Select date + time + location (home/lab)
2. Device auto-populates available parameters (dropdown)
3. User selects which parameters to measure
4. Input values + units
5. Optional journal entry + tags
6. Save

---

## 🔄 Flexibility Features

### **1. Add Custom Parameters Anytime**
```
User: "I want to track Vitamin D starting next week"
→ Admin panel: Add "vitamin_d" to parameter catalog
→ Next session form: vitamin_d appears in dropdown
```

### **2. Different Units**
```
BG: 5.8 mmol/L or 104 mg/dL
Cholesterin: 8.1 mmol/L or 313 mg/dL
Auto-convert on save, store preferred unit
```

### **3. Lab vs. Home**
```
Home (Fora 6):     Glucose, Ketones, UA, Cholesterin, HCT, HB
Lab (Aware):       Insulin, HbA1c, ApoB, hs-CRP, + 50 others
External (Doctor): Any measurement with notes
```

### **4. Session Flexibility**
```
Session 1: Just glucose + BP (quick morning check)
Session 2: Full Fora 6 panel (10 parameters)
Session 3: Lab results (6 markers)
All stored as "measurement sessions", can compare side-by-side
```

---

## 📈 Display & Analysis (Later, not MVP)

### **Session Detail View**
```
27.2.2026 | 06:00 | Home | Fora 6
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Blood Glucose    5.8 mmol/L   [████░░░] Normal (target 5.2–6.2)
BP              100/69 mmHg   [██████░] Excellent
Weight           73.0 kg      [███████░] Stable (−0.1 from last)
Ketones          0.1 mmol/L   [███░░░░] Low (honey effect)
Uric Acid       321 µmol/L    [██████░] Good
Cholesterin      8.1 mmol/L   [█████░░] Slightly high

Notes:
"carnivore, too much honey, one coffee, last meal 4pm, magnesium"

Tags: #carnivore #honey #morning
```

### **Trends (Multi-Session)**
```
Graph: Last 30 days
─ Glucose trend (line)
─ Weight trend (smoothed curve)
─ Ketones vs. Carbs (scatter)
─ BP stability (min/max envelope)
```

---

## 🗄️ Implementation Phases

### **Phase 1A: Core API (Week 1–2)**
- [x] PostgreSQL schema
- [x] Parameter catalog (bootstrap 20+ markers)
- [x] Device table + user setup
- [x] POST /api/sessions (create)
- [x] GET /api/sessions/{id} (retrieve)
- [x] GET /api/parameters (list available)

### **Phase 1B: Frontend Form (Week 2–3)**
- [x] Session input form (dynamic parameter dropdown)
- [x] Multi-parameter entry UI
- [x] Journal + tags input
- [x] Validation (required fields, unit conversion)
- [x] Save + success feedback

### **Phase 1C: Session List & Display (Week 3)**
- [x] GET /api/sessions (list with filters)
- [x] Session detail view (show all measurements)
- [x] Basic styling (Tailwind)
- [x] Mobile-responsive

### **Phase 2: CSV Import (Week 4)**
- [ ] File upload endpoint
- [ ] CSV parser (detect format: Fora 6, SYNLAB, Aware)
- [ ] Bulk insert sessions
- [ ] Deduplication

### **Phase 3: Charts & Trends (Week 5)**
- [ ] Chart library (Plotly.js)
- [ ] Trend views (glucose, weight, UA)
- [ ] Compare home vs. lab

---

## 💾 Sample Data (Bootstrap)

```sql
-- Insert parameter catalog (essential ones first)
INSERT INTO parameters (code, name_en, name_de, category, unit_default, data_type, normal_range_low, normal_range_high) VALUES
('bg', 'Blood Glucose', 'Blutzucker', 'glucose', 'mmol/L', 'decimal', 3.9, 5.6),
('insulin', 'Fasting Insulin', 'Fasten-Insulin', 'glucose', 'mU/L', 'decimal', 0, 25),
('hba1c', 'HbA1c', 'HbA1c', 'glucose', '%', 'decimal', 4.0, 5.6),
('bp_systolic', 'BP Systolic', 'BP Systolisch', 'blood_pressure', 'mmHg', 'integer', 100, 120),
('bp_diastolic', 'BP Diastolic', 'BP Diastolisch', 'blood_pressure', 'mmHg', 'integer', 65, 80),
('pulse', 'Heart Rate', 'Pulsfrequenz', 'blood_pressure', 'bpm', 'integer', 55, 75),
('weight', 'Weight', 'Gewicht', 'body', 'kg', 'decimal', 0, 200),
('ketones', 'Ketones (βHB)', 'Ketone', 'glucose', 'mmol/L', 'decimal', 0, 10),
('ua', 'Uric Acid', 'Harnsäure', 'metabolic', 'µmol/L', 'decimal', 280, 360),
('chol_total', 'Total Cholesterin', 'Gesamtcholesterin', 'lipids', 'mmol/L', 'decimal', 0, 8),
('ldl_c', 'LDL Cholesterin', 'LDL-Cholesterin', 'lipids', 'mmol/L', 'decimal', 0, 5),
('hdl_c', 'HDL Cholesterin', 'HDL-Cholesterin', 'lipids', 'mmol/L', 'decimal', 1.0, 3.0),
('tg', 'Triglycerides', 'Triglyceride', 'lipids', 'mmol/L', 'decimal', 0, 2),
('apob', 'Apolipoprotein B', 'Apolipoprotein B', 'lipids', 'g/L', 'decimal', 1.2, 1.8),
('hs_crp', 'hs-CRP', 'hs-CRP', 'inflammatory', 'µmol/L', 'decimal', 0, 3),
('alt', 'ALT/ALAT', 'ALT/ALAT', 'liver', 'µkat/L', 'decimal', 0, 0.5),
('ggt', 'GGT', 'GGT', 'liver', 'µkat/L', 'decimal', 0, 1),
('creatinine', 'Creatinine', 'Kreatinin', 'kidney', 'µmol/L', 'decimal', 62, 115),
('egfr', 'eGFR', 'eGFR', 'kidney', 'ml/min/1.73m2', 'decimal', 60, 200),
('hb', 'Hemoglobin', 'Hämoglobin', 'blood_cell', 'mmol/L', 'decimal', 7.5, 11),
('hct', 'Hematocrit', 'Hämatokrit', 'blood_cell', '%', 'decimal', 40, 52);
```

---

## 🚀 Next: Implementation

Ready for:
1. **Rust API skeleton** (Actix + Diesel)?
2. **Frontend form component** (React)?
3. **Both?**

Which would you like to start with?

