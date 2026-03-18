# Requirements Specification — APPROVED
**Status:** Finalized  
**Datum:** 2026-03-01  
**User Input:** Helmut

---

## ✅ Anforderungen (aus deinen Antworten)

### A. Multi-User (MVP)
- **MVP Nutzer:** Helmut + Peter (2 Users)
- **Architektur:** Multi-User vorbereitet (nicht Helmut-only Code)
- **Ziel:** Peter = Co-Tester, später Familie möglich (Skalierbarkeit)
- **Authentifizierung:** User Login (Helmut/Peter separate Accounts)

### B. Essensgewohnheiten (Data Entry)
- **Format:** Einfache Tagesnotiz
- **Beispiel:** "carnivore + honey + 1 coffee + no dairy"
- **Helper:** Tooltip-Hilfe für häufige Einträge
- **Optionen:** Dropdown / Vorlagen (z.B. "carnivore", "keto", "mixed")
- **Struktur:** Freitext + optional Tags

### C. Schlafgewohnheiten (Data Entry)
- **Erfassung:** Einfach
- **Felder:** Stunden, Qualität (1–10), optional Zeiten
- **Format:** Tagesnotiz (ähnlich Essensgewohnheiten)

### D. AI Tips & Knowledge Base
- **Trigger:** On-Demand (User klickt "Get Tips" Button)
- **Output:** Knowledge Base (nicht generative KI für MVP)
  - Bilder (z.B. "BG Trend nach Honey erklärt")
  - Beschreibung (Text)
  - Erklärung (Why it matters)
- **Beispiele:** "Uric Acid spike pattern", "Ketones fall with carbs", etc.
- **Implementation:** Curated Templates (später AI-generated)

### E. Privacy & Data Sharing
- **Default:** Jeder User sieht nur eigene Daten
- **Sharing:** Optional (User kann Familie einladen, Daten explizit teilen)
- **Family Groups:** Später (Phase 2), MVP = nur private Daten

### F. MVP Scope (A + B + C + Security)
- **Features:** Single User Auth + Data Entry + Dashboard + Knowledge Base
- **Security (CRITICAL):**
  - ✅ Encryption in Transit (TLS/HTTPS)
  - ✅ Encryption at Rest (Database + File storage)
  - ✅ Encryption in RAM (optional, depends on deployment)
  - ✅ User authentication (Password + Hash)
  - ✅ Session management (JWT Token, secure cookies)

---

## 🎬 USER PERSONAS

### Persona 1: Helmut (Owner/Expert)

```
Name:           Helmut
Age:            56
Expertise:      High (Metabolic health expert, self-experimenting)
Primary Goal:   Track metabolic health + AI insights
Primary Pain:   Aware is closed-source, expensive
Device:         Fora 6 (home), Aware (lab)
Frequency:      2x/week (Tue + Fri)
```

**Needs:**
- ✅ Track glucose, BP, weight, ketones, UA, cholesterin
- ✅ Log diet (carnivore, honey, coffee)
- ✅ Log sleep (hours, quality)
- ✅ See trends
- ✅ Get AI insights (on demand)
- ✅ Knowledge Base (why my UA spiked?)

**Constraints:**
- Privacy-first (health data sensitive)
- Data encrypted
- Open source (want to audit)

---

### Persona 2: Peter (Tester/Co-User)

```
Name:           Peter
Age:            [Unknown — assume similar to Helmut]
Expertise:      Medium (Testing, feedback)
Primary Goal:   Track health + Test app
Primary Pain:   Same as Helmut
Device:         [To be determined — Fora 6? Other?]
Frequency:      2x/week (or ad-hoc testing)
```

**Needs:**
- ✅ Same as Helmut
- ✅ Provide feedback on UX
- ✅ Help identify bugs

**Constraints:**
- Data encryption (privacy)
- Clean UX (feedback loop)

---

### Persona 3: Family Member (Future, Phase 2)

```
Name:           Partner / Child (hypothetical)
Age:            [Varies]
Expertise:      Low (casual tracking)
Primary Goal:   Track health, see family trends
```

**Future Needs** (not MVP):
- See own data only
- Optional share with family
- Family dashboard (Phase 2)

---

## 🎯 KEY USE CASES (MVP)

### UC-1: Helmut Logs Morning Measurements (Cardio + Vitals)

```
Actor:      Helmut
Trigger:    Morning (06:00, post-Fora 6 test)
Goal:       Store daily measurement session (metabolic + cardio)
Frequency:  2x/week (Tue + Fri)

Flow:
  1. Helmut opens app
  2. Logs in (email + password)
  3. Clicks "New Session"
  4. Selects Date/Time (auto: today, 06:00)
  5. Selects Device: "Fora 6"
  6. Enters measurements:
     
     METABOLIC MARKERS (Fora 6):
     - BG: 5.8 mmol/L
     - Ketones: 0.1 mmol/L
     - Cholesterin: 8.1 mmol/L
     - UA: 321 µmol/L
     - Hemoglobin: 7.57 mmol/L
     - Hematocrit: 36%
     
     CARDIO & VITALS (Qardio + Manual):
     - BP Systolic: 100 mmHg
     - BP Diastolic: 69 mmHg
     - Pulse / Heart Rate: 69 bpm
     - Weight: 73.0 kg
     
  7. Adds journal entry: "carnivore, honey, 1 coffee, sleep 9h"
  8. (Optional) Adds tags: #carnivore #honey #morning
  9. Clicks "Save"
 10. App encrypts data + stores in DB
 11. Success message: "Saved"

Acceptance Criteria:
  - ✅ All measurements persisted (metabolic + cardio)
  - ✅ Data encrypted in storage
  - ✅ User can see saved session immediately
  - ✅ Cardio data (BP, Pulse, Weight) stored separately but same session
```

---

### UC-2: Helmut Reviews Recent Sessions

```
Actor:      Helmut
Trigger:    Wants to see past measurements
Goal:       View trends, compare sessions
Frequency:  1–2x/week

Flow:
  1. Helmut opens app
  2. Clicks "Sessions" or "History"
  3. Sees list of recent sessions (last 30 days, newest first)
  4. Clicks on a session
  5. Views detail:
     - Date, Time, Device
     - All measurements (BG, BP, Weight, etc.)
     - Journal entry + tags
  6. (Optional) Clicks "Compare with Previous"
  7. Views trend chart (BG over 30 days, for example)

Acceptance Criteria:
  - ✅ Sessions listed chronologically
  - ✅ Session detail shows all measurements
  - ✅ Data decrypted only when displayed (user must be logged in)
```

---

### UC-3: Helmut Gets AI Tips (On-Demand)

```
Actor:      Helmut
Trigger:    Clicks "Get Tips" or "Why did my UA spike?"
Goal:       Get knowledge base article + explanation
Frequency:  1–2x/week (or as needed)

Flow:
  1. Helmut opens app
  2. Clicks "AI Tips" or "Knowledge Base"
  3. Sees topic list (or search):
     - "Uric Acid Spikes"
     - "Ketone Drop Patterns"
     - "Honey Effect on BG"
     - "BP Stability Tips"
  4. Clicks on "Uric Acid Spikes"
  5. Sees:
     - Image (graph showing typical UA pattern)
     - Description (why UA spikes)
     - Explanation (what causes it, when to worry)
     - Examples (from users, anonymized)
  6. (Optional) "See your data" → shows his UA trend on same graph
  7. Reads

Acceptance Criteria:
  - ✅ Knowledge base topics loaded
  - ✅ Images + text displayed
  - ✅ Optional: overlay user's data on graph
```

---

### UC-4: Peter Registers & Uses App

```
Actor:      Peter
Trigger:    Helmut sends invite or Peter signs up
Goal:       Create separate account, track own data
Frequency:  2x/week (or testing frequency)

Flow:
  1. Peter opens app (signup page)
  2. Enters email + password
  3. Verifies email (link)
  4. Logs in
  5. Sees own empty dashboard
  6. Starts logging measurements (like UC-1)
  7. Data stored encrypted, separate from Helmut

Acceptance Criteria:
  - ✅ Peter's account isolated from Helmut
  - ✅ Peter can't see Helmut's data (unless explicitly shared, Phase 2)
  - ✅ Each user's data encrypted separately
```

---

### UC-5: Export Data (Optional, Phase 1B)

```
Actor:      Helmut
Trigger:    Wants CSV for external analysis
Goal:       Download measurements as CSV
Frequency:  Monthly or as needed

Flow:
  1. Helmut opens app
  2. Clicks "Export"
  3. Selects date range
  4. Selects format (CSV)
  5. Clicks "Download"
  6. Browser downloads file
  7. File contains: Date, Time, Parameter, Value, Unit, Journal

Acceptance Criteria:
  - ✅ CSV standard format
  - ✅ All measurements included
  - ✅ Encrypted file download (HTTPS)
```

---

## 📱 KEY SCREENS (MVP)

### Screen 1: Login
```
┌─────────────────────┐
│  Sovereign Health     │
│  [Open Source]      │
├─────────────────────┤
│                     │
│  Email:             │
│  [________________] │
│                     │
│  Password:          │
│  [________________] │
│                     │
│  [Login] [Signup]   │
│                     │
└─────────────────────┘
```

---

### Screen 2: Dashboard (Home)

```
┌─────────────────────────────────────┐
│ Sovereign Health          [Helmut ▼]   │ (Logout)
├─────────────────────────────────────┤
│  Last Measurement: 2026-03-01 06:00 │
│  Device: Fora 6                     │
├─────────────────────────────────────┤
│  📊 Key Metrics                      │
│  ─────────────────────────────────  │
│  Glucose:        5.8 mmol/L  [•→] ↓ │
│  BP:            100/69 mmHg  [•→] ↓ │
│  Weight:         73.0 kg     [•→] ↓ │
│  Ketones:        0.1 mmol/L  [•→] ↓ │
│  UA:            321 µmol/L   [•→] ↓ │
│  Cholesterin:    8.1 mmol/L  [•→] ↓ │
├─────────────────────────────────────┤
│  [+ New Session] [History] [Trends] │
│  [AI Tips]      [Knowledge Base]    │
│  [Settings]     [Export]            │
└─────────────────────────────────────┘
```

---

### Screen 3: New Session (Data Entry)

```
┌─────────────────────────────────────┐
│ New Measurement Session              │
├─────────────────────────────────────┤
│ Date: [2026-03-01 ▼]                │
│ Time: [06:00      ▼]                │
│ Device: [Fora 6   ▼]                │
│ Location: [Home   ▼]                │
├─────────────────────────────────────┤
│ Measurements:                        │
│ ─────────────────────────────────   │
│ Blood Glucose    │ 5.8   │ mmol/L   │
│ BP Systolic      │ 100   │ mmHg     │
│ BP Diastolic     │ 69    │ mmHg     │
│ Weight           │ 73.0  │ kg       │
│ Ketones          │ 0.1   │ mmol/L   │
│ Uric Acid        │ 321   │ µmol/L   │
│ Cholesterin      │ 8.1   │ mmol/L   │
│ [+ Add Parameter ▼]                 │
├─────────────────────────────────────┤
│ Journal Entry (with ? tooltip):      │
│ [___________________________________] │
│ "carnivore + honey + 1 coffee + 9h" │
│                                     │
│ Tags (optional):                    │
│ [#carnivore #honey #morning]        │
├─────────────────────────────────────┤
│ [Save] [Cancel] [Preview]           │
└─────────────────────────────────────┘
```

---

### Screen 4: Session History

```
┌─────────────────────────────────────┐
│ Session History                     │
├─────────────────────────────────────┤
│ Filter: [Last 30 days ▼]            │
│ Device: [All ▼]                     │
├─────────────────────────────────────┤
│ 2026-02-27 06:00 | Fora 6           │
│ BG: 5.8, BP: 100/69, W: 73.0, ...   │
│ [View] [Edit] [Delete]              │
│ ─────────────────────────────────   │
│ 2026-02-24 06:00 | Fora 6           │
│ BG: 4.9, BP: 100/69, W: 72.9, ...   │
│ [View] [Edit] [Delete]              │
│ ─────────────────────────────────   │
│ 2026-02-20 06:00 | Fora 6           │
│ BG: 5.8, BP: 114/73, W: 73.05, ...  │
│ [View] [Edit] [Delete]              │
│                                     │
│ [← Previous] [1 2 3] [Next →]       │
└─────────────────────────────────────┘
```

---

### Screen 5: Session Detail

```
┌─────────────────────────────────────┐
│ Session: 2026-02-27 06:00            │
│ Device: Fora 6 | Location: Home      │
├─────────────────────────────────────┤
│ 📊 Measurements                      │
│ ─────────────────────────────────   │
│ Blood Glucose    5.8 mmol/L   ✓      │
│ BP Systolic     100 mmHg      ✓      │
│ BP Diastolic     69 mmHg      ✓      │
│ Weight           73.0 kg      ✓      │
│ Ketones          0.1 mmol/L   🟡     │
│ Uric Acid       321 µmol/L    ✓      │
│ Cholesterin      8.1 mmol/L   🟡     │
├─────────────────────────────────────┤
│ 📝 Journal                           │
│ "carnivore, honey, 1 coffee, sleep9h"│
│ Tags: #carnivore #honey #morning    │
├─────────────────────────────────────┤
│ [Edit] [Delete] [Compare] [Share]   │
│ [Back]                              │
└─────────────────────────────────────┘
```

---

### Screen 6: AI Tips / Knowledge Base

```
┌─────────────────────────────────────┐
│ Knowledge Base & AI Tips             │
├─────────────────────────────────────┤
│ Search: [_________________]          │
├─────────────────────────────────────┤
│ Categories:                         │
│ ✓ Glucose & Insulin                 │
│ ✓ Lipids (Cholesterol, ApoB)        │
│ ✓ Uric Acid                         │
│ ✓ Blood Pressure                    │
│ ✓ Sleep & Recovery                  │
│ ✓ Diet Strategies                   │
│ ✓ Fasting Patterns                  │
├─────────────────────────────────────┤
│ Popular Topics:                     │
│ • Uric Acid Spike Patterns          │
│ • Honey Effect on Glucose           │
│ • Ketone Drop with Carbs            │
│ • Sleep Quality Impact              │
│ • Coffee & BP                       │
│ • Carnivore Benefits                │
│ • Fasting Windows                   │
├─────────────────────────────────────┤
│ [View Topic] [See Your Data Overlay]│
└─────────────────────────────────────┘
```

---

### Screen 7: Knowledge Base Article (Example)

```
┌─────────────────────────────────────┐
│ ◄ Uric Acid Spike Patterns           │
├─────────────────────────────────────┤
│                                     │
│ [Graph Image: UA over 30 days]      │
│ Typical spike patterns shown        │
│                                     │
├─────────────────────────────────────┤
│ 📝 Description:                      │
│ Uric acid (UA) spikes after:        │
│ • Fasting (dehydration)             │
│ • High purine foods (sardines, beef)│
│ • Carb loading (sudden glucose)     │
│ • Dehydration                       │
│                                     │
├─────────────────────────────────────┤
│ 🔍 Explanation:                      │
│ UA is a metabolic byproduct.        │
│ Fasting concentrates it. High       │
│ purines (red meat, organs) increase │
│ it. Carbs cause insulin spike,      │
│ which reduces UA excretion.         │
│                                     │
│ Normal range: 280–360 µmol/L        │
│ High risk: >480 µmol/L (gout risk)  │
│                                     │
├─────────────────────────────────────┤
│ 💡 What You Can Do:                  │
│ • Drink more water                  │
│ • Moderate purine intake            │
│ • Avoid sudden carb spikes          │
│ • Monitor your pattern              │
│                                     │
│ [See Your Data] [Back]              │
└─────────────────────────────────────┘
```

---

## 🔐 SECURITY REQUIREMENTS (CRITICAL)

### S-1: Encryption in Transit (TLS/HTTPS)

```
Requirement:
  - All API calls over HTTPS (TLS 1.2+)
  - No HTTP fallback
  - Certificate validation (no self-signed in production)
  
Implementation:
  - Rust backend: actix-web with rustls
  - Frontend: force HTTPS redirect
  - HSTS headers (Strict-Transport-Security)
```

---

### S-2: Encryption at Rest (Database)

```
Requirement:
  - Sensitive data fields encrypted in DB
  - Fields: measurements, journal, tags (PHI)
  - User password: hashed only (bcrypt, NOT encrypted)
  
Implementation:
  - PostgreSQL pgcrypto extension (AES-256)
  - OR application-level encryption (ring crate, AES-256-GCM)
  - Key management: secure key store (environment var or Vault)
  
Decision: Application-level encryption preferred
  (better for portable deployments, self-hosted)
```

---

### S-3: Encryption in RAM (Optional, TBD)

```
Requirement:
  - Depends on deployment model
  - For self-hosted: may not be necessary
  - For SaaS: consider zeroize crate (clear sensitive RAM)
  
Decision (MVP):
  - OPTIONAL (Phase 1, can add in Phase 2)
  - Use zeroize crate for key material
  - Clear decrypted data after use
```

---

### S-4: Password Security

```
Requirement:
  - Passwords hashed with bcrypt (work factor >= 12)
  - NO password reset without email verification
  - Session tokens (JWT): short-lived (15 min), refreshable
  
Implementation:
  - bcrypt crate for hashing
  - jsonwebtoken crate for JWT
  - HTTP-only cookies (JWT stored there, not localStorage)
```

---

### S-5: User Authentication

```
Requirement:
  - Email + Password login
  - JWT token for session
  - Token validation on every API call
  - Logout clears token
  
Implementation:
  - POST /auth/signup (email, password → hash → store)
  - POST /auth/login (email, password → verify hash → issue JWT)
  - POST /auth/logout (invalidate token)
  - Middleware: validate JWT on protected endpoints
```

---

### S-6: Data Isolation (Multi-User)

```
Requirement:
  - User A cannot see User B's data
  - Query filtering: WHERE user_id = current_user_id
  - Tests: verify isolation (SQL injection tests)
  
Implementation:
  - User ID in JWT token
  - All queries filtered by user_id
  - Database constraints: unique (user_id, session_date, device_id)
```

---

### S-7: Audit Logging (Optional, Phase 2)

```
Requirement:
  - Log: who, what, when (for compliance)
  - What to log: login, data entry, delete, export
  - Don't log: passwords, decrypted measurement values
  
Implementation:
  - Separate audit table
  - Encrypted log entries
  - Retention policy (1 year default)
```

---

## 📋 MVPSCOPE & TIMELINE

### Phase 1 (MVP): 10–12 Weeks

**Deliverables:**
- ✅ Rust API (Actix-web)
- ✅ PostgreSQL Database
- ✅ User Authentication (Signup/Login)
- ✅ Data Entry (New Session)
- ✅ Session History (List + Detail)
- ✅ Trends (Basic charts)
- ✅ Knowledge Base (Curated articles)
- ✅ Encryption (TLS + DB)
- ✅ Frontend (React or Leptos)

**Not included (Phase 2):**
- ❌ CSV Import
- ❌ Family Sharing
- ❌ AI-Generated Tips
- ❌ Audit Logging
- ❌ Mobile App

---

### Phase 2 (Later): 6–8 Weeks

**Adds:**
- ✅ CSV Import
- ✅ Family Groups & Sharing
- ✅ Trends (Advanced charts)
- ✅ AI Tips (Integration with OpenAI)
- ✅ Data Export
- ✅ Audit Logging

---

## ✅ ACCEPTANCE CRITERIA (MVP Ready)

- [ ] Helmut can signup/login
- [ ] Helmut can log measurements (10+ parameters per session)
- [ ] Helmut can add journal entry + tags
- [ ] Helmut can view session history
- [ ] Helmut can view session detail
- [ ] Helmut can view trends (basic chart)
- [ ] Knowledge base articles load + display
- [ ] All data encrypted in transit (HTTPS)
- [ ] All data encrypted at rest (database)
- [ ] User isolation verified (Helmut can't see Peter's data)
- [ ] Peter can signup/login (separate account)
- [ ] Peter's data stored separately from Helmut
- [ ] Export works (CSV download)
- [ ] Mobile responsive (tested on iPhone/Android viewport)

---

_Ready for Design Phase (Wireframes + Database Schema)_

