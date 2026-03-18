# Sovereign Health MVP — Requirements Interview
**Status:** In Progress  
**Datum:** 2026-03-01

---

## 📋 SECTION 1: User & Context

### 1.1 Who Will Use This App?

**Q:** Für wen schreibst du diese App primär?

- [ ] Nur dich selbst (Helmut)?
- [ ] Dich + einige Beta-Tester (2–5 Leute)?
- [ ] Kleine Community (10–50)?
- [ ] Später öffentlich (unbegrenzt)?

**Q:** Welche Expertise haben die Nutzer (initial)?

- [ ] Experten im Metabolic Tracking (wie du)
- [ ] Health-Conscious aber anfänger (Keto/Carnivore Starter)
- [ ] Mix aus beiden

**Q:** Primäres Szenario: Wer nutzt die App?

- [ ] Einzelne Person tracking own health
- [ ] Paar (z.B. du + Partner)?
- [ ] Familie (Eltern + Kinder)?
- [ ] Clinician + Patient (z.B. Arzt nutzt mit Patienten)?

---

### 1.2 Primary Use Case (Main Job to Be Done)

**Q:** Was ist die **Hauptaufgabe**, die die App lösen muss?

- [ ] Tägliche Messwerte schnell eingeben + speichern
- [ ] Messwerte tracken + Trends sehen
- [ ] Messwerte erfassen + AI-Analyse bekommen
- [ ] Messwerte mit Arzt/Coach teilen
- [ ] Messwerte ins CSV exportieren für externe Analyse
- [ ] Andere: _________

**Q:** Wie wichtig ist jede dieser Aktivitäten? (Rangfolge 1–3)

```
___ Eingeben von Messwerten (data entry)
___ Ansehen von Trends/Dashboards
___ Journaling (Context: was ich gegessen habe, wie ich mich fühle)
___ Teilen mit anderen (Doctor, Coach, Friend)
___ Export/Backup
___ AI-Insights bekommen
```

---

## 📊 SECTION 2: Data & Measurements

### 2.1 What Data Are We Tracking?

**Q:** Welche Messwerte sollen in Phase 1 (MVP) supportiert werden?

**Home Measurements (Fora 6 wie bei dir):**
- [ ] Glucose (BG)
- [ ] Blood Pressure (Systolic + Diastolic)
- [ ] Heart Rate / Pulse
- [ ] Weight
- [ ] Ketones (βHB)
- [ ] Cholesterin (Total)
- [ ] Uric Acid (UA)
- [ ] Hemoglobin
- [ ] Hematocrit
- [ ] Other: _________

**Lab Measurements (Aware/SYNLAB wie bei dir):**
- [ ] Insulin (fasting)
- [ ] HbA1c
- [ ] ApoB
- [ ] hs-CRP
- [ ] Triglycerides
- [ ] HDL/LDL
- [ ] Creatinine, eGFR
- [ ] ALT, GGT
- [ ] Vitamin D
- [ ] Vitamin B12
- [ ] Other: _________

**Journal/Context (optional aber wichtig):**
- [ ] Free-text notes
- [ ] Structured tags (Diet Phase, Coffee, Sleep, etc.)
- [ ] Symptoms/Energy
- [ ] Other: _________

---

### 2.2 Measurement Frequency & Sessions

**Q:** Wie häufig erfolgen Messungen typischerweise?

- [ ] Täglich (wie dein Fora 6 jeden Morgen)
- [ ] 2–3x pro Woche (wie dein Dienstag + Freitag)
- [ ] Wöchentlich
- [ ] Monatlich
- [ ] Ad-hoc (unregelmäßig)
- [ ] Mix (home täglich, lab monatlich)

**Q:** Wie viele Parameter pro Session typischerweise?

- [ ] 1–2 (Glucose + BP nur)
- [ ] 3–5 (Standard Fora 6)
- [ ] 6–10 (Volle Fora 6 + Extra)
- [ ] 10+ (Labs, viele Parameter)
- [ ] Variabel (manchmal 2, manchmal 20)

**Q:** Multiple Messungen an einem Tag (z.B. Fasting + Post-Meal)?

- [ ] Nein, nur eine pro Tag
- [ ] Ja, mehrere Zeitpunkte (fasting, post-meal, evening)
- [ ] Optional (user choice)

---

### 2.3 Data Source & Input Method (Phase 1)

**Q:** Wie sollen Daten in die App kommen (MVP)?

- [ ] **Nur manuelle Eingabe** (User tippt jeden Wert ein)
- [ ] **CSV Import** (Export aus Fora 6 App → Upload in Sovereign Health)
- [ ] **Beides** (Aber welches zuerst?)
- [ ] **Später:** API/Direct device connection (Phase 2+)

**Q:** Falls CSV Import wichtig ist:

- [ ] Fora 6 CSV Format
- [ ] SYNLAB CSV Format
- [ ] Aware/YouthClub CSV Format
- [ ] Generic CSV (user maps columns himself)
- [ ] Alle obigen

---

## 👤 SECTION 3: User Workflows

### 3.1 Typical Day: Data Entry Workflow

**Q:** Beschreib einen **typischen Tag** für Helmut:

- [ ] Morgens (06:00): Messe mit Fora 6 (BG, BP, Weight, Ketones) → Will schnell eingeben
- [ ] Mittags: Isst etwas → Will Post-Meal-BG notieren (optional)
- [ ] Abends: Kurze Notiz (Energielevel, wie ging der Tag)
- [ ] Wochenende: Lab-Ergebnis von Aware kommt rein → Will die 10 Lab-Parameter eingeben

**Q:** Wie sollte der Workflow aussehen?

```
Option A (Schnell):
  App öffnen → Datum (auto heute) → [BG: 5.8] [BP: 100/69] → [Speichern]
  
Option B (Detail):
  App öffnen → Datum → Zeit → Gerät → [BG] [BP] [Weight] [Ketones] 
  → Notiz: "carnivore, 1 coffee" → Tags: diet=carnivore → [Speichern]
  
Option C (Hybrid):
  Schnell-Eingabe für täglich (nur essentials)
  Detail-Eingabe für Labs (alle Parameter)

Preference?
```

---

### 3.2 Data Review Workflow

**Q:** Wie oft schaut Helmut auf die eingegebenen Daten?

- [ ] Täglich (quick check: ist BG wie erwartet?)
- [ ] Wöchentlich (review: wie war die Woche?)
- [ ] Monatlich (summary: trends?)
- [ ] Nur auf Anfrage (wenn AI analyse kommt)

**Q:** Was will der Nutzer sehen, wenn er seine Daten anschaut?

- [ ] Neueste Messwerte (letzte 3–5 Einträge)
- [ ] Trend-Graph (z.B. BG über 30 Tage)
- [ ] Vergleich (diese Woche vs. letzte Woche)
- [ ] Tabelle (alle Daten in Zeilen)
- [ ] Dashboard (Key Metrics: Glucose, Weight, UA, etc.)
- [ ] Alles kombiniert

---

## 🎬 SECTION 4: Screens & UX

### 4.1 Key Screens — Which Are Essential for MVP?

**Q:** Welche Screens brauchst du mindestens (MVP)?

**Priorität (1=must, 2=nice-to-have, 3=later):**

```
___ Login/Signup (oder Single User skip?)
___ Home Dashboard (Überblick)
___ Data Entry Screen (Manual input)
___ Session Detail (View single session)
___ Sessions List (History)
___ Trends/Charts
___ Settings (Devices, Units, Preferences)
___ Import/Backup
___ Help/Documentation
```

**Q:** Single-User App (nur du) oder Multi-User vorbereiten?

- [ ] **Single User MVP** (simplify: no login, no multi-user logic)
- [ ] **Multi-User vorbereitet** (aber MVP hat nur 1 User)

---

### 4.2 Data Entry Screen (Most Critical)

**Q:** Wie soll der Data Entry Screen aussehen?

```
OPTION A: Simple (1–2 Parameter pro Form)
┌─────────────────────┐
│ Date: 2026-03-01    │
│ Time: 06:00         │
│ Parameter: BG ▼     │
│ Value: [5.8]        │
│ Unit: mmol/L        │
│ [Save] [Add More]   │
└─────────────────────┘

OPTION B: Multi-Parameter (alle auf 1 Screen)
┌──────────────────────────────────┐
│ Date: 2026-03-01  Time: 06:00    │
│ Device: Fora 6 ▼                 │
├──────────────────────────────────┤
│ BG         │ 5.8  │ mmol/L  │    │
│ BP Syst    │ 100  │ mmHg    │    │
│ Weight     │ 73.0 │ kg      │    │
│ Ketones    │ 0.1  │ mmol/L  │    │
│ + [Add Parameter] ▼              │
├──────────────────────────────────┤
│ Notes: [carnivore, 1 coffee]    │
│ [Save] [Cancel]                  │
└──────────────────────────────────┘

OPTION C: Device-Guided (Gerät wählen → passende Form)
Gerät: Fora 6 ▼
[Pre-filled form with Fora 6's typical 6 parameters]

Preference?
```

**Q:** Wie viele Parameter willst du auf einmal eingeben können?

- [ ] Max 5 (schnell-form)
- [ ] Max 10 (typische session)
- [ ] Unbegrenzt (add as many as you want)

**Q:** Unit-Conversion Support?

- [ ] Nein, nur eine default unit pro parameter (z.B. mmol/L für BG)
- [ ] Ja, user kann zwischen mmol/L und mg/dL wählen
- [ ] Ja, aber auto-convert (user inputs mg/dL → store as mmol/L)

---

### 4.3 Data Display Screen (Sessions List + Detail)

**Q:** Wenn ich alte Messwerte anschaue, will ich sehen:

- [ ] Tabelle (Zeile = 1 Session, Spalten = BG, BP, Weight, etc.)
- [ ] Cards (1 Session = 1 Card, all parameters visible)
- [ ] Timeline (chronologisch, skimmable)
- [ ] Kombination

**Q:** Filtering & Sorting?

- [ ] Datum-Bereich (z.B. letzte 30 Tage)
- [ ] Gerät (z.B. nur Fora 6, nicht Lab)
- [ ] Parameter (z.B. nur BG entries)
- [ ] Andere Filter: _________

**Q:** Was passiert, wenn ich auf eine alte Session klicke?

- [ ] Öffnet Detail-View (alle Parameter für diese Session)
- [ ] Öffnet Edit-Dialog (kann ich ändern?)
- [ ] Öffnet Chart (diese Parameter im Trend)
- [ ] Andere: _________

---

### 4.4 Trends/Charts Screen

**Q:** Brauchst du Trend-Charts im MVP?

- [ ] Nein (zu komplex, später)
- [ ] Ja, aber nur für Home-Daten (Fora 6)
- [ ] Ja, für Home + Lab (vergleichen)
- [ ] Minimal (nur 1–2 simple charts)

**Q:** Welche Charts wären sinnvoll?

- [ ] Glucose over time (line chart, 30 Tage)
- [ ] Weight trend (smoothed curve)
- [ ] UA volatility (scatter plot)
- [ ] BP over time
- [ ] Ketones vs. Glucose (scatter)
- [ ] Andere: _________

---

## 📱 SECTION 5: Device & Integration

### 5.1 Device Management

**Q:** Brauchst du mehrere Geräte in der App?

- [ ] Nein, nur Fora 6 (home)
- [ ] Ja: Fora 6 + Qardio + vielleicht andere
- [ ] Ja, und später weitere (Dexcom, Oura Ring, etc.)

**Q:** Device-Profil (Pro-Nutzer möglich):

- [ ] Nein, einfach Device auswählen bei Eingabe
- [ ] Ja, speichere Device-Infos (Modell, Standort, Notizen)
- [ ] Ja, und verknüpfe default Parameter pro Device

---

### 5.2 CSV Import (Phase 1 oder später?)

**Q:** Ist CSV Import im MVP kritisch?

- [ ] **Nein, erst manuell** (später Phase 2 für bulk upload)
- [ ] **Ja, zuerst** (Helmut will 8 Monate Fora 6 Daten importieren)
- [ ] **Optional** (schön, aber kein Blocker)

**Q:** Falls ja: Welche Formate?

- [ ] Nur Fora 6 CSV
- [ ] Fora 6 + SYNLAB + Aware (3 Formate)
- [ ] Generic CSV (user maps columns)
- [ ] Smart (detect format automatically)

---

## 🔐 SECTION 6: Privacy, Security, Compliance

### 6.1 Data Privacy

**Q:** Wo sollen Daten gespeichert sein?

- [ ] **Lokal nur** (kein Server, Sqlite file)
- [ ] **Helmuts VPS** (Hostinger, Europa)
- [ ] **Open Source, self-hostable** (andere Leute können deployen)
- [ ] **SaaS später** (Cloud, aber mit Data Residency Options)

**Q:** Sollen Daten verschlüsselt sein?

- [ ] Nein, plain text (MVP is for trusted context)
- [ ] TLS nur (transit encryption)
- [ ] TLS + Database encryption (at rest)
- [ ] End-to-end encryption (user holds key)

---

### 6.2 User Authentication

**Q:** Authentication für MVP?

- [ ] **Kein Login** (single user, local only)
- [ ] **Simple Password** (single user, but protected)
- [ ] **User/Pass** (multi-user, prepare for it)
- [ ] **OAuth** (Google/Apple sign-in, später)

---

## 📊 SECTION 7: Reporting & Export

### 7.1 What Can User Export/Share?

**Q:** Soll User Daten exportieren können?

- [ ] Nein (data bleibt in app)
- [ ] Ja, als CSV (Excel-compatible)
- [ ] Ja, als PDF (pretty report for doctor)
- [ ] Ja, beides
- [ ] Ja, + Share Link (shareable read-only URL mit Doctor/Coach)

**Q:** Welche Daten exportieren?

- [ ] Alles (raw data)
- [ ] Nur bestimmter Zeitraum (z.B. letzte 30 Tage)
- [ ] Mit Analyse (Trends + Summary)
- [ ] Vom User selektierbar

---

## 🤖 SECTION 8: AI & Analysis (Future, but Plan for It)

### 8.1 AI Features

**Q:** Soll MVP AI-Features haben?

- [ ] **Nein** (erst später, nach UI solid)
- [ ] **Ja, aber Basic** (einfache Text-Summary, kein LLM)
- [ ] **Ja, mit LLM** (OpenAI/Claude für smart insights)

**Q:** Falls AI später kommt: Wie sollte es aussehen?

- [ ] Weekly summary (AI schreibt TL;DR der Woche)
- [ ] Flagging anomalies (AI sagt: "Uric Acid spike, warnen")
- [ ] Nutrition suggestions (AI schlägt vor: "Reduce honey")
- [ ] Compare phases (AI vergleicht Carnivore vs. Keto phase)
- [ ] Alles

**Q:** Wer sollte AI-Insights erhalten?

- [ ] Nur der User (Helmut in seinem Dashboard)
- [ ] User + Doctor (shareable report)

---

## 🎯 SECTION 9: MVP Scope & Timeline

### 9.1 Absolute Must-Haves (Phase 1)

**Q:** Was ist absolute **Minimum** um MVP zu starten?

Rank these (1=must, 2=should, 3=can skip):

```
___ Manual data entry (1–10 parameters per session)
___ View recent sessions (list)
___ View single session (detail)
___ Edit session (change values)
___ Delete session
___ Free-text journal/notes
___ Tags (optional structured context)
___ CSV import
___ Trends/charts
___ Settings (units, devices)
___ Export (CSV/PDF)
___ Multi-user support
___ Authentication
___ AI insights
```

### 9.2 Nice-to-Haves (Phase 2+)

**Q:** Was kommt später, wenn MVP stabil läuft?

---

### 9.3 Known Constraints

**Q:** Gibt es Constraints die ich kennen sollte?

- [ ] Budget/Cost? (z.B. kostenlos, oder $ erlaubt?)
- [ ] Timeline? (z.B. "fertig bis Juni"?)
- [ ] Team? (nur dich, oder mehrere Developer?)
- [ ] Deployment? (nur lokal, oder produktiv hosted?)
- [ ] Maintenance? (willst du es lange pflegen, oder PoC?)

---

## ✅ Summary (Wird später gefüllt)

**Nachdem wir diese Fragen beantwortet haben:**
- User Personas ✓
- Use Cases ✓
- Workflows ✓
- Screen Mockups ✓
- MVP Scope ✓
- Requirements Catalog ✓
- Prioritization Matrix ✓

---

_Nächster Schritt: Antworte auf diese Fragen. Dann erstelle ich einen strukturierten Anforderungskatalog._

