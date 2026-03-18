# Implementation Roadmap (Detailed)
**Responsive Design, History/Retention, Offline Mode, Premium Features, Open Source Architecture**

---

## 3️⃣ RESPONSIVE DESIGN SPECIFICATION

### Breakpoints

```
Mobile Phone:     0–599px   (small phone to standard phone + landscape)
Tablet:           600–1023px (iPad mini to standard iPad)
Desktop Browser:  1024px+   (all screen sizes)
```

### Layout Strategies per Device

#### Mobile (0–599px)

**Dashboard:**
```
Single column, stacked zones
┌──────────────────┐
│ ⚡ Energy        │
│ 🟢 6/7           │
│ [Expand ▼]       │
└──────────────────┘
┌──────────────────┐
│ 💪 Structural    │
│ 🟡 6/9           │
│ [Expand ▼]       │
└──────────────────┘
[...7 more zones...]

Bottom navigation (5 tabs):
[🏠] [📊] [📚] [⚙️] [👤]
```

**New Measurement Form:**
```
Bottom sheet (draggable)
Scrollable content inside
[❌ Close]
Date [____]
Time [____]
Device [▼]
─────────
Metrics stacked vertically
─────────
[Save] [Cancel]
```

**Trends Chart:**
```
Chart height: 200px (mobile-optimized)
Legend: Horizontal, wrappable
X-axis: Date labels every 5 days (not crowded)
Tap-to-zoom: Pinch = zoom into date range
```

#### Tablet (600–1023px)

**Dashboard:**
```
2-column grid for zones
┌─────────────────────┬─────────────────────┐
│ ⚡ Energy   🟢 6/7  │ 💪 Structural 🟡 6/9│
│ [Expand]            │ [Expand]            │
├─────────────────────┼─────────────────────┤
│ 🫀 Cardiovascular 🟢 │ 🧠 Cognitive 🟢 7/8 │
│ [Expand]            │ [Expand]            │
├─────────────────────┴─────────────────────┤
│ [+ Add Measurement]                       │
└─────────────────────────────────────────┘

Side navigation (4 tabs):
[Home] [Trends] [KB] [Settings]
```

**New Measurement Form:**
```
Modal (not bottom sheet)
2 columns where possible
┌────────────────────────────┐
│ Date [______]              │
│ Time [______]              │
│ Device [▼]                 │
│                            │
│ Blood Glucose [___] [▼ mm] │
│ Ketones [___] [▼ mm]       │
│                            │
│ Journal [__________]       │
│ Tags [______]              │
│                            │
│ [Save] [Cancel] [Preview] │
└────────────────────────────┘
```

#### Desktop (1024px+)

**Dashboard:**
```
3-column grid for zones
Width: max-width 1200px, centered
┌──────────────┬──────────────┬──────────────┐
│ ⚡ Energy    │ 💪 Structural│ 🫀 Cardio    │
├──────────────┼──────────────┼──────────────┤
│ 🧠 Cognitive │ 🛡️ Immune    │ 🔄 Detox     │
├──────────────┼──────────────┼──────────────┤
│ 🎯 Hormonal  │ 🌱 Nutrition │ [Empty]      │
└──────────────┴──────────────┴──────────────┘

Left sidebar (4 main sections):
[⌂ Home]
[📊 Trends]
[📚 Knowledge Base]
[⚙️ Settings]
```

**New Measurement Form:**
```
Modal (larger)
┌─────────────────────────────────────┐
│ New Measurement              [✕]    │
├─────────────────────────────────────┤
│                                     │
│ Date [_______] Time [_______]       │
│ Device [▼]            Location [▼]  │
│                                     │
│ Blood Glucose [___] [▼ mmol/L]      │
│ Ketones [___] [▼ mmol/L]            │
│ Weight [___] [▼ kg]                 │
│ BP [___] / [___] [mmHg]             │
│                                     │
│ Journal [_________________]         │
│                                     │
│ Tags [_________________]            │
│                                     │
│ [Save] [Cancel] [Preview] [Reset]  │
│                                     │
└─────────────────────────────────────┘
```

---

## 4️⃣ HISTORY & DATA RETENTION POLICY

### Data Storage

```
ALL measurements stored forever (never deleted by app)
Helmut owns his data; he decides when/if to delete

Storage math:
- 2 measurements per week × 52 weeks × 5 years
- = ~500 measurements total
- ~1–2 MB database size
- Cost: negligible

Philosophy: "Your data is yours. We keep it safe."
```

### Free vs. Premium Tiers

#### Tier 1: Free (Foundation)

```
✓ Unlimited measurements stored
✓ Manual data entry
✓ Dashboard with all 8 zones
✓ Basic trends (30-day view)
✓ Knowledge base (all articles)
✓ Offline measurements (with sync)
✓ Personal settings (units, thresholds)

❌ CSV/PDF export (premium)
❌ Lab result photo upload / OCR (premium)
❌ Advanced analytics / predictions (premium)
❌ Multiple users / sharing (premium)
```

#### Tier 2: Premium (€4.99/month or €49/year)

```
✓ Everything in Free PLUS:

Export Features:
✓ Download trends as PDF (professional report)
✓ Download measurements as CSV
✓ Share link (shareable, time-limited)
✓ Print-friendly views

Lab Features:
✓ Upload lab report (PDF or photo)
✓ OCR parsing (auto-extract values)
✓ Merge with home measurements
✓ Max 10 lab uploads per month

Advanced Analytics:
✓ 5-year trend analysis
✓ Correlation detection (e.g., honey → glucose)
✓ Predictive trends (ML, Phase 2)
✓ Anomaly detection + alerts

Collaboration:
✓ Share with doctor (encrypted link, time-limited)
✓ Invite family member (read-only or edit)
✓ Export for clinician
```

### Lab Pricing Model

```
Option A: Free Lab Uploads
- 2 free lab photo uploads per year
- Then €2.99 per upload after

Option B: Annual Subscription
- Unlimited lab uploads
- Included in Premium (€49/year)
- OR standalone €20/year

Rationale:
- Most users: quarterly labs (4/year)
- Free tier: 2 uploads (semi-annual baseline)
- Premium users: unlimited (committed members)
- Casual users: pay-as-go (€2.99/upload)
```

---

## 7️⃣ OFFLINE MODE SPECIFICATION

### Offline Capabilities

```
User CAN (offline):
✓ View dashboard (cached data)
✓ Add new measurement (local storage)
✓ View history (cached, last 30 days)
✓ Read KB articles (cached, downloaded on login)
✓ View personal settings
✓ Search local KB

User CANNOT (offline):
✗ Export data (requires server)
✗ Upload lab photo (requires server)
✗ Share measurements (requires server)
✗ Sync changes (will queue)
```

### Implementation

```
Local Storage (IndexedDB):
- Last 30 days of measurements (cached)
- User settings (units, thresholds, preferences)
- KB articles (all, downloaded once)
- Pending changes (unsaved measurements, edits)

Sync Strategy:
1. User goes online (detected by navigator.onLine)
2. App auto-syncs pending measurements
3. If conflict: show "server newer, update local?" dialog
4. Sync complete: badge removed, toast "✓ Synced"
5. If sync fails: auto-retry, show "retry available"

Data Safety:
- Never delete local data
- Pending measurements preserved until synced
- Conflict resolution is manual (user decides)
- Last-write-wins is NOT acceptable
```

### Offline Example

```
Scenario: User measures at gym (no WiFi)

1. Tap [+ Add Measurement]
2. Form opens normally (feels normal, no indication of offline)
3. User enters: Weight 72.8 kg, BP 110/70
4. User clicks [Save]
5. Toast: "✓ Saved (offline, will sync when online)"
6. Badge appears: "📡 1 pending"
7. User leaves gym, WiFi available
8. App detects online: "Syncing..."
9. 2 seconds later: Badge gone, "✓ Synced"
10. Dashboard updated with new measurement

No interruption, no data loss, transparent experience.
```

---

## 8️⃣ PREMIUM FEATURES & MONETIZATION

### Feature: Lab Photo Upload & OCR

```
User's Flow (Premium):
1. [+ Upload Lab Report]
2. Camera opens: take photo of lab report
3. OCR processes: "Parsing your report..."
4. Shows extracted values: "Glucose: 5.2 mmol/L ✓"
5. User reviews + edits
6. [Merge with Home Measurements]
7. App creates "lab session" with all values
8. Now visible in dashboard alongside home data

Implementation:
- Frontend: camera + image preview
- Backend: Claude Vision API (OCR parsing)
- Parser: Maps lab marker names to canonical names
  (e.g., "Blutglukose" → "glucose", "TSH Serum" → "tsh")
- Validation: Confidence scores + user review
- Storage: Marked as "lab" source for visualization
```

### Feature: Sharing with Doctor

```
User's Flow (Premium):
1. [Share with Doctor]
2. Generates encrypted link:
   https://app.sovereign-health.com/share/abc123xyz
3. Time limit: 30 days (user can extend)
4. Sets permissions: "View last 3 months"
5. QR code to scan
6. Doctor receives link → can view trends PDF
7. Can download data (user approves each export)

Security:
- Link encrypted (doctor can't share or guess)
- Time-limited (expires after 30 days)
- Audit log (user sees "doctor viewed on Mar 2 @ 10:00")
- User can revoke anytime
```

### Feature: Advanced Analytics (Phase 2)

```
Predictive Trends:
- "Based on your glucose pattern, expect 5.8 on Friday"
- "Honey increases your BG by +0.8 mmol/L (90% confidence)"

Anomaly Alerts:
- "Your glucose was unusual: 6.8 (3σ above normal)"
- "Weekend BP higher (+8 mmHg): stress or salt?"

Correlations:
- "Measurements after honey: avg +0.5 higher"
- "Sleep <7h correlates with +0.3 fasting glucose"

ML Training Data (Privacy-First):
- On-device only (no data leaves user's phone)
- OR: Federated learning (model updates, not data)
- OR: Optional opt-in to cloud analysis
```

---

## 🏗️ OPEN SOURCE ARCHITECTURE

### Modular Structure (Community Contributions)

```
Sovereign Health App:

Core (Always Included):
├─ frontend/ (Next.js + React)
│  ├─ components/ (reusable UI components)
│  ├─ pages/ (screen layouts)
│  ├─ hooks/ (data fetching, state)
│  └─ lib/ (utilities)
│
├─ backend/ (Rust + Actix-web)
│  ├─ api/ (REST endpoints)
│  ├─ db/ (database models)
│  ├─ auth/ (JWT, password hashing)
│  └─ utils/ (validation, errors)
│
└─ docs/ (guides, contributing, API docs)

Plugins (Optional, Community-Built):
├─ plugin-wearables/ (Apple Health, Oura, Fitbit)
├─ plugin-lab-automation/ (auto-fetch from LabCorp API)
├─ plugin-nutrition/ (food database, recipe tracking)
├─ plugin-training/ (workout logging)
├─ plugin-insurance/ (integrations with health insurance)
└─ plugin-clinician-dashboard/ (doctor view)

Data Flows (Modular):
├─ Measurement (home device input)
├─ Lab Integration (external lab data)
├─ Trend Analysis (built-in)
├─ KB Articles (built-in)
├─ Export/Share (built-in)
└─ Plugins extend: measurement sources, analysis, visualization
```

### Contributing Model

```
If someone wants to add Fitbit integration:

1. Create plugin: plugin-fitbit/
2. Implements: DataSource interface
   - Authenticate to Fitbit API
   - Fetch steps, HR, sleep
   - Map to canonical measurement format
   - Return list of measurements

3. Register plugin in main app:
   ```
   plugins = [
     PluginFitbit,
     PluginOura,
     PluginAppleHealth,
     // ... user's plugins
   ]
   ```

4. User experience:
   - Settings → [+ Add Device]
   - [Fitbit] → Login → Authorize
   - Sync starts automatically
   - Data appears in dashboard

Technology:
- Plugins are npm packages (TypeScript)
- Interface-driven (plugin must implement DataSource)
- Versioned independently (plugin updates separately)
- Can be open-source or proprietary
```

### Example: Community-Built Nutrition Plugin

```
Problem: Users want to track food's effect on glucose

Community member builds plugin-nutrition/:
├─ manifest.json (metadata + dependencies)
├─ components/
│  ├─ FoodSearch.tsx
│  ├─ MealEntry.tsx
│  └─ NutritionTrends.tsx
├─ lib/
│  ├─ food-database.ts (USDA FoodData)
│  ├─ macros-calculator.ts
│  └─ carb-impact-model.ts
└─ README.md (setup, API keys, usage)

User installs: `npm install @sovereign-health/plugin-nutrition`
Configures: API key for USDA FoodData
Uses: [+ Log Meal] button (from plugin)

Plugin functionality:
1. User enters: "2 slices toast + butter"
2. Search USDA database: Find matching foods
3. Calculate: 40g carbs, 12g fat, 8g protein
4. Predict: "Expected glucose spike: +0.3 mmol/L"
5. After eating: User measures glucose
6. Compare: "Predicted +0.3, actual +0.2 ✓"
7. Learn: Model adjusts for this user's response

Plugin can:
- Add new measurement types (meal entries)
- Add new analysis (carb impact prediction)
- Add new UI (meal search, nutrition trends)
- Store own data (meals + predictions)
- But CANNOT: modify core measurement data, delete user data, access other plugins' data
```

### Governance Model

```
Core Team (Helmut):
- Maintains core API + database schema
- Reviews plugin submissions for security
- Handles version releases
- Maintains backward compatibility

Contributors:
- Submit plugins via GitHub
- Follow plugin guidelines (security, performance)
- Own plugin versioning + maintenance
- Can create community-maintained plugins

Security:
- Plugins run in sandbox (no filesystem access except cache)
- Rate-limited API access (prevent DoS)
- Code review before merging to official plugin registry
- Users can install from GitHub directly (trust model)
```

---

## ✅ COMPLETE CHECKLIST (All 10 Points)

- [x] 1. Interactive Specification (INTERACTIVE_SPECIFICATION.md)
- [x] 2. Accessibility Standards WCAG AA (ACCESSIBILITY_STANDARDS.md)
- [x] 3. Data Model Clarification — "Measurement Session" defined (DATA_MODEL_CLARIFICATION.md)
- [x] 4. Responsive Design (Browser, Tablet, Mobile) — this document
- [x] 5. User Journeys (6 key flows) (USER_JOURNEYS.md)
- [x] 6. History & Retention Policy (all data saved forever) — this document
- [x] 7. Offline Mode (localStorage + auto-sync) — this document
- [x] 8. Premium Features (lab upload, export, sharing) — this document
- [x] 9. Open Source Architecture (modular, plugin-based) — this document
- [x] 10. Monetization (Free + Premium, lab upload pricing) — this document

---

## 📋 NEXT STEPS (Ready to Code)

1. ✅ Design phase complete (11 spec documents)
2. ✅ All 10 improvements planned
3. ⏭️ Next: Backend API Specification (1–2 days)
4. ⏭️ Then: Database Schema (1 day)
5. ⏭️ Then: Code Phase (2–3 weeks)

---

_All pieces in place. App is ready to build._
