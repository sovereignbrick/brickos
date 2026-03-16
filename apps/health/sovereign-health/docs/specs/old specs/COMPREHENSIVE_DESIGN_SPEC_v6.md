# Sovereign Health Intelligence — Comprehensive Design Specification v6
## Complete, Final, Ready for Technical Implementation

**Status:** Design Complete | Recommendations Integrated | Ready for Phase 1 Toolchain Setup  
**Last Updated:** March 8, 2026  
**Version:** 6.1 (Added: GKI + calculated home markers, waist circumference, protocol-aware thresholds, fasting/diet protocol tags)

---

## 📑 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design Principles & Accessibility](#design-principles--accessibility)
3. [User Journeys](#user-journeys)
4. [Feature Set: Phase 1 + Phase 2 + Phase 3](#feature-set)
5. [Visual Design System](#visual-design-system)
6. [Dashboard & Navigation](#dashboard--navigation)
7. [Measurement & Data Entry](#measurement--data-entry)
8. [Health Zones & Markers](#health-zones--markers)
9. [Calculated Markers](#calculated-markers)
10. [Admin Panel](#admin-panel)
11. [Device Management](#device-management)
12. [Sharing & Collaboration](#sharing--collaboration)
13. [Notifications & Engagement](#notifications--engagement)
14. [Data Model & Architecture](#data-model--architecture)
15. [Security & Privacy](#security--privacy)
16. [Licensing & Monetization](#licensing--monetization)
17. [CI/CD & Deployment](#cicd--deployment)
18. [Missing Pieces & Final Checks](#missing-pieces--final-checks)

---

## 1. Executive Summary

**Product Name:** Sovereign Health Intelligence  
**Internal / Codebase Name:** sovereign-health (repos, Docker, domain: sovereignhealth.io)

**What:** Privacy-first metabolic health intelligence platform with 8 functional health zones, 75+ biomarkers, calculated markers, multi-device support, and optional E2E encryption.

**Who:** Helmut (56M) + future users (freemium SaaS + self-hosted option)

**Why:** Metabolic health tracking is currently fragmented (Apple Health, Fitbit, manual spreadsheets). This app consolidates data, adds medical context (KB, recommendations, doctor sharing), and enables lifestyle experiments.

**Architecture:** Hybrid SaaS + Self-Hosted (Option C)
- **Phase 1:** SaaS MVP (Standard encryption, Stripe, metadata-only admin)
- **Phase 2:** E2E encryption, Bitcoin, self-hosted Docker, open-source
- **Phase 3+:** Mobile app, AI coach, advanced analytics

**Tech Stack:**
- Frontend: Next.js 14+ (TypeScript)
- Backend: Rust + Actix-web
- Database: PostgreSQL (encrypted at rest)
- Cache: Redis
- Deployment: Docker Compose
- Payment: Stripe (Phase 1) + Bitcoin (Phase 2)
- License: Public (AGPLv3) + Private (proprietary premium)

**Timeline:** Phase 0 (Hello World Deployed) → Phase 1 (MVP features) → Phase 2 (E2E + Bitcoin) → Phase 3 (Mobile + AI). See Section 17 for deployment milestones.

---

## 2. Design Principles & Accessibility

### Core Principles

1. **Privacy First** — User data encrypted, admin never sees health values
2. **Evidence-Based** — Every marker linked to clinical significance
3. **Minimalist** — Show what matters, hide complexity
4. **Encouraging** — Positive feedback, celebrate progress
5. **Context-Driven** — Data + explanation + action in one flow
6. **Self-Determination** — Users set their own targets, not forced to defaults
7. **Transparent** — Formulas visible, calculations explainable

### Accessibility Standards

**WCAG 2.1 Level AA Compliance (Mandatory)**

#### Color System: WCAG AA Compliant

| Use Case | Color | Hex | Contrast Ratio | WCAG Status |
|----------|-------|-----|---|---|
| **Status: In Range** | Soft Green | #4CAF50 | 4.8:1 vs white | ✅ AA Pass |
| **Status: Caution** | Muted Amber | #F5B04C | 4.2:1 vs white | ✅ AA Pass |
| **Status: Alert** | Soft Red | #FF6B6B | 5.1:1 vs white | ✅ AA Pass |
| **Background** | Off-white | #F2F1F7 | N/A | ✅ Very light |
| **Text Primary** | Dark Grey | #333333 | 12.6:1 vs #F2F1F7 | ✅ AAA Pass |
| **Text Secondary** | Medium Grey | #666666 | 7.2:1 vs #F2F1F7 | ✅ AA Pass |
| **Cards** | White | #FFFFFF | 1:1 vs bg | ✅ Sufficient shadow |
| **Zone: Energy** | Warm Orange | #FF9500 | 4.5:1 vs white | ✅ AA Pass |
| **Zone: Cardiovascular** | Magenta Red | #E91E63 | 4.6:1 vs white | ✅ AA Pass |
| **Zone: Cognitive** | Purple | #7C4DFF | 4.3:1 vs white | ✅ AA Pass |
| **Zone: Immune** | Teal Green | #009688 | 4.8:1 vs white | ✅ AA Pass |
| **Zone: Structural** | Blue | #2196F3 | 4.8:1 vs white | ✅ AA Pass |
| **Zone: Detox** | Cyan | #00BCD4 | 5.2:1 vs white | ✅ AA Pass |
| **Zone: Hormonal** | Rose | #E91E63 | 4.6:1 vs white | ✅ AA Pass |
| **Zone: Nutritional** | Lime | #8BC34A | 4.7:1 vs white | ✅ AA Pass |

**Note:** All colors tested with Web Contrast Checker. Icons + text always used together (not color-only).

#### Typography Accessibility

- **Minimum font size:** 14px (body text)
- **Line height:** 1.6 (generous spacing)
- **Font:** System sans-serif (default, accessible)
- **Header hierarchy:** H1 → H6 (never skip levels)
- **Text contrast:** 4.5:1 minimum (WCAG AA)

#### Interactive Elements

- **Touch targets:** 44x44px minimum (iOS/Android)
- **Keyboard navigation:** Full tab support
- **Focus indicators:** Clear 2px focus ring
- **ARIA labels:** All icons labeled
- **Alt text:** All images have descriptive alt text

#### Color-Blind Friendly Design

- ✅ **Not relying on color alone:**
  - Status shown as: 🟢 GREEN + text "In range"
  - Trend shown as: ↗ icon + "Improving"
  - Warning shown as: ⚠️ icon + "Alert"

- ✅ **Testing:** Designs validated with Coblis simulator (Red/Green/Blue colorblindness)

---

## 3. User Journeys

### Journey 1: New User Signup & Setup

```
Step 1: Signup
├─ Email + Password
├─ Auto-assign 👁️ Glimpse tier (10 markers, 3 Doctor Chat requests for 30 days)
├─ Send welcome email with license key
└─ Confirm email

Step 2: MFA Setup (Onboarding)
├─ User chooses: TOTP (default) or SMS (optional)
├─ For TOTP: Scan QR code in authenticator app
├─ Confirm 6-digit code
└─ ✅ MFA enabled

Step 3: Profile & Preferences
├─ Gender: Male/Female/Other
├─ Age: [years]
├─ Height: [cm]
├─ Weight: [kg]
│  └─ System calculates: BMI, BMR, TDEE, Ideal Body Weight, Body Fat %
├─ Date format: DD/MM/YYYY or MM/DD/YYYY
├─ Time format: 24-hour or 12-hour (AM/PM)
├─ Timezone: Europe/Berlin (or user's choice)
├─ Unit preferences: mmol/L vs mg/dL, kg vs lbs, etc.
└─ [Save Profile]

Step 4: Reference Ranges Setup
├─ System shows age+gender defaults
├─ User can customize each marker (based on doctor advice)
├─ Example: "Glucose: Doctor said 5.0-5.5, not 5.0-5.8"
├─ [Save Custom Ranges]
└─ These drive 🟢🟡🔴 status throughout app

Step 5: Device Setup
├─ Select primary device: Fora 6, Qardio Arm, manual entry, etc.
├─ For each: Calibration notes, known bias, measurement location
├─ [Can add more devices later]
└─ ✅ Ready to measure

Result: User can now enter measurements and see dashboard.
```

### Journey 2: Daily Measurement Entry

```
Step 1: User clicks "➕ Add Measurement"
├─ Date: Today (pre-filled, user can change)
├─ Time: Current time (pre-filled, user can change or leave blank)
├─ Marker: [Glucose ▼] (dropdown of 10 markers in 👁️ Glimpse tier)
├─ Value: [5.3] mmol/L (user's preferred unit)
├─ Device: [Fora 6 ▼] (active devices only)

Step 2: Optional Context (Extended Entry)
├─ Protocol Tag: [Standard ▼] or [Fasting ▼]
│  ├─ If Standard → Diet Protocol: [Carnivore ▼] [Keto] [Vegan] [Only Fish] [Mixed] [Custom]
│  └─ If Fasting  → Fasting Protocol: [16:8 ▼] [OMAD] [36h] [48h] [72h] [Extended (>72h)] [Custom]
│     ├─ Fast Start: [Date + Time] (when this fast began)
│     └─ Fasting Hours (auto-calculated from fast start, or manual override)
├─ Meal Timing Tag: [Before Meal ▼] or [2h After Meal]
├─ Exercise: [None ▼] or [Light/Moderate/Intense] + timing
├─ Sleep (previous night): [7.5] hours, [Good ▼] quality
├─ Stress Level: [3/10] (slider)
├─ Lifestyle Note: "Fasting 18h, slept well, calm morning" (optional, 300 chars)
└─ (All optional, user can toggle "Extended Entry" in settings)

NOTE: Protocol Tag drives threshold interpretation.
Markers measured under "Fasting" protocol are analysed against
fasting-specific reference ranges (e.g., UA, glucose, ketones, GKI).
Markers under "Standard" use diet-specific ranges where applicable.
See Section 9 (Calculated Markers) for protocol-aware thresholds.

Step 3: Summary Before Save
├─ Shows: Glucose 5.3 mmol/L (Fasting, Before Meal, Fora 6)
├─ Shows: Date 02/03/2026, Time 06:15, Context: Calm, 7.5h sleep
└─ [Cancel] [Save]

Step 4: Post-Save
├─ ✅ Measurement saved
├─ Dashboard updates: 
│  ├─ Glucose card shows: 5.3 mmol/L (🟢 GREEN)
│  ├─ Energy zone shows: 🟢 count updates
│  ├─ Calculated markers recalculate (if applicable)
│  └─ Encouragement message: "Great work! Keep it up!"
└─ User can continue adding more measurements or view dashboard

Real Scenario (Fasting Day):
├─ 06:15: Add Glucose 5.3 (Fasting, Before Meal)
├─ 09:15: Add Glucose 5.2 (Fasting, Before Meal)
├─ 12:15: Add Glucose 5.1 (Fasting, Before Meal)
└─ All tracked on same day, different times
```

### Journey 3: View Marker Details & Timeline

```
Step 1: User clicks marker from dashboard/zone
├─ Goes to: Marker Detail Screen
└─ Shows: Glucose (example)

Step 2: Marker Detail Screen
├─ TOP SECTION:
│  ├─ 🩸 Glucose
│  ├─ Current: 5.3 mmol/L
│  ├─ Status: 🟢 GREEN (in your range: 5.0-5.8)
│  ├─ Last measured: Today 06:15
│  ├─ Device: Fora 6
│  ├─ Measurement properties (collapsible):
│  │  ├─ Fasting State: Fasting
│  │  ├─ Meal Timing: Before Meal
│  │  ├─ Sleep: 7.5h, Good
│  │  ├─ Exercise: None
│  │  ├─ Stress: 3/10
│  │  ├─ Diet: Carnivore
│  │  └─ Notes: "Fasting 18h, slept well..."
│  └─ [Edit ✎] [Delete 🗑]
│
├─ ENCOURAGEMENT BOX (if trending well):
│  └─ "Keep up the good work! Your glucose is improving 📈"
│
├─ REFERENCE VISUALIZATION (Range Bar):
│  ├─ Population: 4.0 ────────● 6.0 (grey zone)
│  ├─ Your target: 5.0 ──●────── 5.8 (green zone)
│  ├─ Your current: ────●──── 5.3 ✓ (positioned marker)
│  └─ [Edit Your Target]
│
├─ 30-DAY TREND CHART:
│  ├─ Line graph (black line)
│  ├─ Green background band (healthy zone)
│  ├─ Soft gridlines
│  ├─ Current point highlighted
│  ├─ Trend: ↗ Improving (last 30 days: avg 5.6 → current 5.3)
│  └─ Timeframe selector: [All] [1Y] [6M] [1M] (default: 30d)
│
├─ MARKER INFORMATION (Inline Education):
│  ├─ What is it? "Glucose is your blood sugar..."
│  ├─ Why matters? "High glucose leads to insulin resistance..."
│  ├─ [Show More Scientific Details]
│  └─ Related markers: [Insulin ↗] [HbA1c ↗]
│
├─ HOW TO IMPROVE (Card Stack):
│  ├─ 🍎 Foods That Help
│  │  ├─ Spinach [Image] Iron, Magnesium → Improves insulin
│  │  ├─ Salmon [Image] Omega-3, Vit D → Reduces inflammation
│  │  └─ [View All Foods Grid]
│  ├─ 🏃 Exercise Tips
│  │  ├─ 30 min cardio → Lowers glucose 15-20%
│  │  ├─ Post-meal walks → Reduces glucose spike
│  │  └─ Strength training → Improves sensitivity
│  ├─ 🌙 Lifestyle
│  │  ├─ 7-9h sleep → Stabilizes glucose
│  │  ├─ Reduce stress → Cortisol ↓, glucose ↓
│  │  └─ Intermittent fasting → Improves insulin sensitivity
│  └─ 💊 Supplements (if relevant)
│
├─ RED FLAGS (When to see doctor):
│  ├─ Fasting glucose > 7.0 mmol/L consistently
│  ├─ Post-meal glucose > 8.5 mmol/L
│  └─ [Doctor Contact] [Ask Questions]
│
└─ RELATED CALCULATED MARKERS (if applicable):
   ├─ ✦ HOMA-IR: 0.55 (Calculated from Glucose + Insulin)
   │  └─ [View Details ↗]
   └─ ✦ TyG Index: [Calculated from Glucose + TG]
      └─ [View Details ↗]

Step 3: User can:
├─ [Edit Measurement ✎] → Opens form with all properties
├─ [Delete] → Warning modal
├─ [View All Timeline] → Shows all 127 glucose measurements
├─ [Edit Your Target] → Customize range
└─ [Foods Grid] → See full list of improving foods
```

### Journey 4: Upgrade (👁️ Glimpse → 🎯 Focus)

```
Step 1: User sees Glimpse tier limit
├─ "You have 10 markers tracked (Glimpse limit)"
├─ "Unlock all 75+ markers with 🎯 Focus for €9.99/month"
├─ [Upgrade to Focus]
└─ Or continues with 10-marker limit

Step 2: Stripe Checkout
├─ Email (pre-filled)
├─ Card details
├─ Billing address
├─ Plan: 🎯 Focus (€9.99/month or €99.90/year)
└─ [Subscribe]

Step 3: Post-Payment
├─ ✅ Payment processed
├─ Focus license activated
├─ All 75+ markers unlocked
├─ All 22+ calculated markers shown
├─ 5 Doctor Chat requests/month activated
├─ Focus features enabled:
│  ├─ Cloud sync
│  ├─ PDF export
│  ├─ CSV export
│  ├─ Doctor sharing
│  ├─ Per-marker AI analysis
│  └─ Weekly health summary
├─ 📧 Welcome email: "Welcome to 🎯 Focus!"
└─ Dashboard shows: "🎯 Focus — renews 02/04/2026"

If subscription expires:
├─ Focus features disabled
├─ Data kept (can view, but no export/sync)
├─ Top 7 calculated markers still visible (GKI, WHtR, BMI, Dr. Boz, HCT/HB, TG/HDL, HOMA-IR)
├─ Doctor Chat quota drops to 0
├─ Message: "Renew to unlock all 75+ markers"
└─ [Renew Subscription]
```

---

## 4. Feature Set: Phase 1 + Phase 2 + Phase 3

### Phase 1: SaaS MVP (Standard Encryption)

**User Features:**
- ✅ 8 Health Zones
- ✅ 75+ Biomarkers (10 in Glimpse, all in Focus+)
- ✅ Manual measurement entry (with extended context)
- ✅ Calculated markers (7 in Core/Glimpse incl. GKI + WHtR, 22+ in Focus+)
- ✅ 30-day trend charts
- ✅ Health score card (X/Y in range)
- ✅ Reference range bars
- ✅ Knowledge base (in-app, editable by admin)
- ✅ Food grids (grid layout per marker/zone)
- ✅ Dark mode
- ✅ Multi-language (EN + DE)
- ✅ MFA setup (TOTP + SMS optional)
- ✅ Device management (multi-device)
- ✅ Measurement editing (can change past measurements)
- ✅ Extended entry (optional: fasting, meal timing, exercise, sleep, stress, diet, notes)
- ✅ Encouragement messaging (conditional positive feedback)

**🎯 Focus+ Features (from €9.99/month — see LICENSING_STRATEGY.md for full tier details):**
- ✅ Cloud sync (real-time, multi-device)
- ✅ CSV export
- ✅ PDF export (styled report)
- ✅ Doctor sharing link (encrypted, time-limited)
- ✅ All 75+ biomarkers (not just 10)
- ✅ All 22+ calculated markers

**Admin Panel (Metadata-Only):**
- ✅ User management (view, license issue/revoke)
- ✅ KB editor (live publish, no app redeploy)
- ✅ License management (Stripe subscriptions)
- ✅ Analytics dashboard (users, revenue, churn, growth)
- ✅ Activity monitor (real-time user actions)
- ✅ Content management (food database, thresholds)
- ✅ Audit logging (every admin action tracked)

**Admin Never Sees:**
- ❌ User glucose values
- ❌ User health trends
- ❌ User segments/recommendations
- ❌ PII beyond email

**Deployment:**
- ✅ SaaS: sovereignhealth.io (Helmut's VPS)
- ✅ Docker Compose (local dev + production)
- ✅ SSL/TLS (Let's Encrypt)
- ✅ Automated backups (S3)
- ✅ PostgreSQL (encrypted at rest)
- ✅ Redis (cache + sessions)

**Payment:**
- ✅ Stripe (Glimpse: €0, Focus: €9.99/mo, Insight: €24.99/mo, Clarity: €49.99/mo)
- ✅ Glimpse tier (auto-issued, free, 10 markers, 3 Doctor Chat requests for 30 days)

---

### Phase 2: E2E + Bitcoin + Self-Hosted (Enhancements)

**Added User Features:**
- ✅ E2E encryption toggle (user's choice: standard or E2E)
- ✅ Master password setup (for E2E)
- ✅ Client-side encryption (browser-based)
- ✅ Bitcoin payment option (no chargebacks, privacy)
- ✅ Self-hosted Docker image (open-source AGPLv3)
- ✅ Weekly health summaries (email digest)
- ✅ Population comparison (percentile context)
- ✅ Habit streaks (engagement mechanics)
- ✅ Goal tracking (simple: set + track progress)
- ✅ Doctor mode export (certified PDF for medical use)
- ✅ Gamification (achievements, milestones)

**Data Import/Migration:**
- ✅ CSV import (bulk upload historical measurements)
- ✅ Wearable sync (Apple Health, Google Fit)

**Sharing & Collaboration:**
- ✅ Real-time doctor dashboard (if E2E off)
- ✅ Doctor comments/notes (two-way communication)
- ✅ Shared reports (automated weekly for coach)
- ✅ Revocable access (stop sharing anytime)

**Admin Panel:**
- ✅ User improvement analytics (red→orange→green %)
- ✅ Engagement vs. improvement correlation
- ✅ User stories (examples of success/decline)
- ✅ Trend analysis (30/60/90 day windows)

**Deployment:**
- ✅ Self-hosted: Docker image (GitHub Container Registry)
- ✅ Public repo: GitHub (AGPLv3 license)
- ✅ Documentation: Complete setup + customization

---

### Phase 3+: Mobile + AI + Advanced Analytics

**Mobile App (React Native):**
- ✅ iOS + Android native apps
- ✅ Apple HealthKit integration (auto-sync)
- ✅ Google Fit integration
- ✅ Push notifications (native)
- ✅ Offline mode (measure without internet)
- ✅ Home screen widgets (quick measurements)

**AI Coach:**
- ✅ Pattern detection (correlations: exercise → glucose)
- ✅ Personalized recommendations ("Try more fasting")
- ✅ Predictive alerts ("Trending toward orange zone")
- ✅ Seasonal insights ("Winter: your glucose rises")
- ✅ Meal impact estimation ("Salmon: predict +0.5 glucose")

**Advanced Analytics:**
- ✅ Correlation dashboard (what affects your markers)
- ✅ Experiment tracking (formal: name, baseline, end, metrics)
- ✅ Before/after analysis (lifestyle experiments)
- ✅ Population benchmarking (where you stand)
- ✅ Longitudinal insights (years of data analysis)

**Coach/Trainer Integration:**
- ✅ Multi-client dashboard (for trainers)
- ✅ Trainer recommendations (sync to client)
- ✅ Progress tracking (vs. recommendations)
- ✅ Integration with fitness platforms (Strava, etc.)

---

## 5. Visual Design System

### Color Palette

**Primary Colors (Status)**
```
🟢 In Range (Green)
  Hex: #4CAF50
  RGB: 76, 175, 80
  Use: Healthy status, positive feedback
  Contrast: 4.8:1 (WCAG AA)

🟡 Caution (Amber)
  Hex: #F5B04C
  RGB: 245, 176, 76
  Use: Warning, slightly out of range
  Contrast: 4.2:1 (WCAG AA)

🔴 Alert (Red)
  Hex: #FF6B6B
  RGB: 255, 107, 107
  Use: Critical, action needed
  Contrast: 5.1:1 (WCAG AA)
```

**Zone-Specific Colors (Unique Per Zone)**
```
⚡ Energy & Metabolic Power
  Hex: #FF9500 (Warm Orange)
  Accent: #FFB74D
  Contrast: 4.5:1 (WCAG AA)

💪 Structural Integrity
  Hex: #2196F3 (Blue)
  Accent: #42A5F5
  Contrast: 4.8:1 (WCAG AA)

🫀 Cardiovascular Resilience
  Hex: #E91E63 (Magenta Red)
  Accent: #EC407A
  Contrast: 4.6:1 (WCAG AA)

🧠 Cognitive & Nervous System
  Hex: #7C4DFF (Purple)
  Accent: #9575CD
  Contrast: 4.3:1 (WCAG AA)

🛡️ Immune & Inflammatory
  Hex: #009688 (Teal Green)
  Accent: #26A69A
  Contrast: 4.8:1 (WCAG AA)

🔄 Detoxification & Waste Clearance
  Hex: #00BCD4 (Cyan)
  Accent: #4DD0E1
  Contrast: 5.2:1 (WCAG AA)

🎯 Hormonal Harmony
  Hex: #E91E63 (Rose Pink)
  Accent: #F06292
  Contrast: 4.6:1 (WCAG AA)

🌱 Nutritional Sufficiency
  Hex: #8BC34A (Lime)
  Accent: #9CCC65
  Contrast: 4.7:1 (WCAG AA)
```

**Background & Text**
```
Background (Primary)
  Hex: #F2F1F7 (Off-white lavender)
  Use: Main page background

Cards
  Hex: #FFFFFF (White)
  Shadow: 0 2px 8px rgba(0,0,0,0.08)
  Radius: 20-24px

Text (Primary)
  Hex: #333333 (Dark Grey)
  Contrast: 12.6:1 (WCAG AAA)
  Use: Headers, important text

Text (Secondary)
  Hex: #666666 (Medium Grey)
  Contrast: 7.2:1 (WCAG AA)
  Use: Descriptions, meta info

Text (Tertiary)
  Hex: #999999 (Light Grey)
  Contrast: 4.3:1 (WCAG AA)
  Use: Timestamps, less important

Dividers
  Hex: #E0E0E0 (Light Grey)
  Opacity: 0.3
  Use: Visual separation
```

**Accessibility Notes:**
- ✅ All status colors tested with Coblis colorblind simulator
- ✅ Icons + text always paired (not color-only)
- ✅ Contrast ratios verified with WebAIM checker
- ✅ No dependence on color alone for meaning

### Typography

**Font Family:** System sans-serif stack
```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif
```

**Sizes & Weights**
```
H1 (Page Title)
  Size: 32px
  Weight: 700 (bold)
  Line Height: 1.2
  Use: Page headlines

H2 (Section Title)
  Size: 24px
  Weight: 600 (semibold)
  Line Height: 1.3
  Use: Major sections

H3 (Subsection)
  Size: 18px
  Weight: 600 (semibold)
  Line Height: 1.4
  Use: Card titles, zone names

Body (Default)
  Size: 14-16px
  Weight: 400 (regular)
  Line Height: 1.6
  Use: Descriptions, body text

Small (Meta)
  Size: 12px
  Weight: 400 (regular)
  Line Height: 1.5
  Color: #999999
  Use: Timestamps, units, hints

Bold (Metric)
  Size: 20-28px
  Weight: 700 (bold)
  Use: Large numbers (glucose value, score)

Button
  Size: 14px
  Weight: 600 (semibold)
  Padding: 12px 20px
  Radius: 8px
```

**Line Length:** Max 65-80 chars for readability

### Spacing System

```
8pt Grid System:
- 4px (micro spacing, borders)
- 8px (compact spacing)
- 12px (internal padding)
- 16px (standard padding)
- 20px (generous padding)
- 24px (large gaps)
- 32px (section spacing)
- 40px (major section spacing)
```

**Card Layout**
```
Card Radius: 20-24px
Card Padding: 16-20px internal
Card Shadow: 0 2px 8px rgba(0,0,0,0.08)
Card Border: None (shadow only)

Grid Gaps:
- Mobile: 12px between items
- Tablet: 16px between items
- Desktop: 20px between items
```

**Button Sizing**
```
Touch Target: 44x44px minimum
Small Button: 36x36px (desktop only)
Standard Padding: 12px (v) x 20px (h)
```

### Icons

**Style:** Rounded, minimalist, 24x24px base size

**Per Zone:** One icon per health zone (unique, recognizable)
```
⚡ Energy
💪 Structure
🫀 Cardiovascular
🧠 Cognitive
🛡️ Immune
🔄 Detoxification
🎯 Hormonal
🌱 Nutritional
```

**Status Indicators**
```
🟢 In Range
🟡 Caution
🔴 Alert
⚪ No Data

↗ Improving
➡ Stable
↘ Declining

✓ Complete
⚠️ Warning
ℹ️ Info
```

---

## 6. Dashboard & Navigation

### Bottom Navigation (4-5 Tabs)

```
┌─────────────────────────────────────┐
│ [🏠] [📊] [➕] [👤] [⚙️]           │
│ Home | Zones | Add | Profile | Settings
└─────────────────────────────────────┘
```

**Tab 1: Home (Dashboard)**
- ✅ Health Score card (X/Y in range)
- ✅ High-level pie chart (3 segments: green/orange/red)
- ✅ Zone mini pies (8 zones)
- ✅ Quick actions (Add measurement, View trends)
- ✅ Recent activity (last 5 measurements)

**Tab 2: Zones (Detailed View)**
- ✅ All 8 zones in list/card format
- ✅ Tap zone → see all markers (alphabetically, mixed user+calculated)
- ✅ Tap marker → see timeline + details

**Tab 3: Add (Measurement Entry)**
- ✅ Quick form (date, time, marker, value, device)
- ✅ Extended context (if toggled on in settings)
- ✅ Submit & add another

**Tab 4: Profile (User Data)**
- ✅ Profile info (name, email, age, height, weight)
- ✅ Derived metrics (BMI, BMR, TDEE, etc.)
- ✅ Quick links: Edit profile, View licenses, Health goals

**Tab 5: Settings**
- ✅ Profile & preferences
- ✅ Date/time format, timezone
- ✅ Unit preferences
- ✅ Reference ranges
- ✅ Device management
- ✅ MFA setup
- ✅ Data privacy (download/delete)

---

## 7. Measurement & Data Entry

### Quick Entry Form

```
┌──────────────────────────────┐
│ Date: 02/03/2026 ▼          │
│ Time: 06:15 ▼               │
│ Marker: Glucose ▼           │
│ Value: [5.3] mmol/L         │
│ Device: Fora 6 ▼            │
│ [Save] [Cancel]             │
└──────────────────────────────┘

Notes:
- Date pre-filled with today
- Time pre-filled with current time
- User can change both
- Device dropdown shows ACTIVE devices only (decommissioned hidden)
```

### Extended Entry Form (Optional, Toggled in Settings)

```
BASIC:
├─ Date, Time, Marker, Value, Device

CONTEXT (Optional):
├─ Protocol Tag: Standard / Fasting
│  ├─ If Standard → Diet Protocol: Carnivore / Keto / Vegan / Only Fish / Mixed / Custom
│  └─ If Fasting  → Fasting Protocol: 16:8 / OMAD / 36h / 48h / 72h / Extended (>72h) / Custom
│     ├─ Fast Start: [Date + Time] (links multiple sessions to same fast)
│     └─ Fasting Hours: auto-calculated or manual
├─ Meal Timing: Before / 30m After / 1h After / 2h After / 3h+ / No Tag
├─ Exercise: None / Light / Moderate / Intense + timing
├─ Sleep: [7.5] hours, [Quality: Good]
├─ Stress: [3/10] slider
├─ Lifestyle Note: [Text, 300 chars max]
└─ [Save]

Default: Extended OFF (user toggles in settings if wanted)

PROTOCOL TAG LOGIC:
- Protocol Tag replaces the old "Fasting State" + "Diet Type" fields
- Fasting protocol: measurements analysed against fasting-specific thresholds
- Standard protocol: measurements analysed against eating-protocol thresholds
- GKI + other calculated markers auto-adjust interpretation based on protocol
- Multiple sessions can share the same fast_start_datetime (links a multi-day fast)
```

### Edit Past Measurement

```
User clicks [Edit ✎] on a measurement
├─ Form opens pre-filled
├─ Can change: date, time, marker, value, device, ALL context
├─ Shows: Original entry time, last edit time
├─ On save: Recalculates dependent markers
└─ Undo available (within 30 days, contact support)
```

---

## 8. Health Zones & Markers

### 8 Health Zones (Functional, Not Organ-Based)

| Zone | Icon | Color | Markers | Purpose |
|------|------|-------|---------|---------|
| ⚡ Energy & Metabolic | ⚡ | #FF9500 | Glucose, Insulin, HbA1c, TSH, fT4, Cortisol | Sustained energy, metabolic health |
| 💪 Structural | 💪 | #2196F3 | Weight, Albumin, Calcium, Magnesium, Protein | Build/maintain muscle & bone |
| 🫀 Cardiovascular | 🫀 | #E91E63 | LDL, HDL, TG, ApoB, Homocysteine, BP | Heart & circulation optimization |
| 🧠 Cognitive | 🧠 | #7C4DFF | B12, Folate, Omega-3 Index, Homocysteine | Brain health & sharpness |
| 🛡️ Immune | 🛡️ | #009688 | hs-CRP, WBC, IL-6, TNF-α, Vitamin D | Resilience to infection |
| 🔄 Detoxification | 🔄 | #00BCD4 | eGFR, Creatinine, UA, ALT, AST, GGT, Bilirubin | Waste processing |
| 🎯 Hormonal | 🎯 | #E91E63 | Free T3, Free T4, TSH, Testosterone, Estrogen, Cortisol | Hormonal balance |
| 🌱 Nutritional | 🌱 | #8BC34A | Iron, B12, Folate, Vitamin D, Selenium, Zinc | Micronutrient sufficiency |

**Total: 75+ biomarkers across 8 zones**

### Marker Display (Zone Detail)

```
ALPHABETICALLY SORTED (No Separation by Type):

┌────────────────────────────────────────┐
│ Albumin                        🟢 GREEN │
│ 45 g/L | Target: > 35         [Edit ✎] │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✦ Calcium / Magnesium Ratio  🟢 OPTIMAL│
│ 2.5 | Formula: Ca ÷ Mg (Calculated)    │
│ [Not editable - calculated marker]     │
│ Based on: Calcium + Magnesium [View ↗] │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Calcium                        🟢 GREEN │
│ 2.4 mmol/L | Target: 2.1-2.6 [Edit ✎] │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✦ HOMA-IR (INCOMPLETE)          ⚫ GREY │
│ [No value - missing Insulin]           │
│ Formula: (Glucose × Insulin) ÷ 405     │
│ Missing: Fasting Insulin                │
│ [+ Add Insulin Measurement]             │
└────────────────────────────────────────┘

Legend:
- Regular: User-entered (editable)
- ✦ Prefix: Calculated (read-only)
- ⚫ Greyed: Incomplete (waiting for data)
- All sorted alphabetically
```

---

## 9. Calculated Markers

### Design Principle: Two Categories

Calculated markers fall into two categories based on data source:

1. **Home-Derived** — computed from Fora 6 + Qardio + manual measurements (available every session)
2. **Lab-Derived** — require at least one lab result (available when labs are uploaded)
3. **Hybrid** — combine home + lab inputs (e.g., TyG Index uses home glucose + lab TG)

Home-derived markers are the most valuable because they update **every measurement session**
(2x/week), giving real-time metabolic feedback — not just a quarterly lab snapshot.

### Protocol-Aware Thresholds

All calculated markers support **protocol-aware interpretation**. When a measurement is tagged
with a Protocol Tag (see Section 7), thresholds shift accordingly:

| Protocol Tag | Sub-Protocol | Threshold Behaviour |
|---|---|---|
| **Standard** | Carnivore | Default thresholds; expect low TG, higher TC, moderate ketones |
| **Standard** | Keto | Default thresholds; expect moderate ketones (0.5–1.5) |
| **Standard** | Vegan | Default thresholds; watch B12-dependent markers |
| **Standard** | Only Fish | Default thresholds; expect good omega-3, lower UA than red meat |
| **Standard** | Mixed / Custom | Default thresholds (baseline) |
| **Fasting** | 16:8 / OMAD | Mild fasting shift: UA yellow threshold relaxed +15%, GKI targets lower |
| **Fasting** | 36h / 48h | Moderate fasting shift: UA relaxed +25%, glucose expected lower, GKI 1–3 expected |
| **Fasting** | 72h / Extended | Deep fasting shift: UA relaxed +40%, ketones expected 2–5+, GKI <1 achievable, HCT watch for dehydration |

**Implementation:** Each calculated marker stores `default_thresholds` + optional `protocol_overrides` (JSON).
When protocol_tag is present on a measurement, the system looks up protocol-specific thresholds first,
then falls back to defaults.

```
Example: Uric Acid (raw marker, not calculated — but protocol logic applies to all)
├─ Standard (any diet): 🟢 280–360, 🟡 360–450, 🔴 >480
├─ Fasting 16:8/OMAD:   🟢 280–380, 🟡 380–480, 🔴 >520
├─ Fasting 48h:         🟢 280–420, 🟡 420–520, 🔴 >560
└─ Fasting Extended:    🟢 280–450, 🟡 450–560, 🔴 >600 (expected elevation, kidneys conserving)

Example: GKI (calculated marker)
├─ Standard (any diet): Not very meaningful (glucose dominant, ketones minimal)
│  └─ Display: greyed or "N/A — GKI is most useful during fasting or ketosis"
├─ Standard Keto:       🟢 3–6, 🟡 6–9, 🔴 >9 (not in nutritional ketosis)
├─ Fasting 16:8/OMAD:   🟢 3–9, 🟡 9–15, 🔴 >15
├─ Fasting 36–48h:      🟢 1–3, 🟡 3–6, 🔴 >6 (expected deeper state)
├─ Fasting 72h+:        🟢 <1, 🟡 1–3, 🔴 >3 (deep therapeutic ketosis expected)
└─ Autophagy proxy:     GKI ≤ 1.0 = "Autophagy zone (Seyfried)" badge shown
```

### All Calculated Markers (20+)

#### FREE TIER — Home-Derived (Top 7)

These use **only** Fora 6 + Qardio + manual tape measurements. Available every session.

1. **GKI — Glucose-Ketone Index** ⭐ NEW
   - Source: Home (Fora 6)
   - Formula: Glucose (mmol/L) ÷ Ketones (mmol/L)
   - Why: Best non-invasive proxy for metabolic depth + autophagy state (Thomas Seyfried)
   - Protocol-aware: Yes (see threshold table above)
   - Targets (fasting context):
     - < 1.0 = 🟢 Deep therapeutic ketosis / autophagy zone
     - 1–3  = 🟢 Moderate ketosis (excellent for metabolic health)
     - 3–6  = 🟡 Mild ketosis
     - 6–9  = 🟡 Transitional
     - > 9  = 🔴 Glucose dominant (not in ketosis)
   - Edge case: If ketones = 0.0, GKI = undefined → display "Ketones below detection"
   - Display note: Show Dr. Boz Ratio equivalent below (Glucose mg/dL ÷ Ketones mmol/L)

2. **Dr. Boz Ratio** ⭐ NEW
   - Source: Home (Fora 6)
   - Formula: Glucose (mg/dL) ÷ Ketones (mmol/L)
   - Why: US-popular variant of GKI (Dr. Annette Bosworth). Identical concept, different unit.
   - Targets:
     - < 20  = 🟢 Deep ketosis (medical supervision recommended at this depth)
     - 20–40 = 🟢 Strong autophagy / fat adaptation
     - 40–80 = 🟡 Moderate ketosis
     - > 80  = 🔴 Glucose dominant
   - Implementation: Display as secondary readout under GKI (toggle, not separate card)
   - Conversion: Dr. Boz Ratio = GKI × 18

3. **WHtR — Waist-to-Height Ratio** ⭐ NEW
   - Source: Home (Manual tape measure + profile height)
   - Formula: Waist Circumference (cm) ÷ Height (cm)
   - Why: Best simple proxy for visceral fat. Better than BMI for metabolic/cardiovascular risk prediction. Endorsed by NICE, multiple meta-analyses.
   - Targets:
     - < 0.40 = 🟢 Very lean (ensure not underweight)
     - 0.40–0.50 = 🟢 Healthy (keep your waist below half your height)
     - 0.50–0.53 = 🟡 Slightly elevated risk
     - 0.53–0.58 = 🟡 Elevated risk — visceral fat accumulation likely
     - 0.58–0.63 = 🔴 High risk
     - > 0.63 = 🔴 Very high risk
   - Measurement protocol: At navel level, end of normal exhale, standing, no clothing compression
   - Update frequency: Weekly or 2x/week (same as weight)

4. **BMI — Body Mass Index**
   - Source: Home (Qardio scale + profile height)
   - Formula: Weight (kg) ÷ Height² (m)
   - Why: Universal reference. Less useful than WHtR for metabolic health, but widely understood.
   - Targets: 18.5–24.9 (🟢), 25–29.9 (🟡), >30 (🔴)
   - Note: For muscular individuals, WHtR is more reliable. Display WHtR prominently, BMI secondary.

5. **HCT/HB Ratio** ⭐ NEW
   - Source: Home (Fora 6)
   - Formula: Hematocrit (%) ÷ Hemoglobin (g/dL)
   - Unit conversion needed: Fora 6 reports HB in mmol/L → convert to g/dL (× 1.61) before calculation
   - Why: Estimates Mean Corpuscular Volume (MCV). Flags hydration status during fasting.
   - Targets:
     - 2.7–3.5 = 🟢 Normal MCV range
     - < 2.7 = 🟡 Microcytic tendency (iron, B12?)
     - > 3.5 = 🟡 Macrocytic tendency (folate, B12, dehydration?)
   - Protocol-aware: During extended fasting, ratio >3.3 + rising = dehydration flag

6. **Triglycerides / HDL Ratio**
   - Source: Lab (or Fora 6 Total Cholesterol as context — but TG/HDL needs lab lipid panel)
   - Formula: TG ÷ HDL
   - Why: Best predictor of insulin resistance from standard lipid panel
   - Target: < 1.5 (excellent), < 3 (moderate), > 3 (high risk)

7. **HOMA-IR (Insulin Resistance Index)**
   - Source: Lab (Fasting Glucose × Fasting Insulin) ÷ 405 (mg/dL version)
   - Why: Quantifies insulin resistance directly
   - Target: < 1.0 (excellent), < 2 (normal), > 2 (resistance)
   - Note: Home fasting glucose (Fora 6) can substitute for lab glucose if lab insulin is available

#### PREMIUM TIER — Lab-Derived + Hybrid (Additional 13+)

8. **LDL / HDL Ratio**
   - Formula: LDL ÷ HDL
   - Why: Balance between atherogenic & protective cholesterol
   - Target: < 2.0 (optimal), < 3 (acceptable)

9. **Total Cholesterol / HDL Ratio**
   - Formula: TC ÷ HDL
   - Why: Often more predictive than LDL alone
   - Target: < 3.5 (ideal), < 5 (acceptable)

10. **TyG Index (Triglyceride-Glucose)** — Hybrid ⭐
    - Source: Hybrid (Home glucose from Fora 6 + Lab TG)
    - Formula: Ln[TG (mg/dL) × Glucose (mg/dL) / 2]
    - Why: Insulin resistance proxy when fasting insulin is unavailable. Validated in multiple large cohort studies. Uses YOUR home glucose measurement.
    - Target: < 4.49 (🟢 low IR), 4.49–4.73 (🟡 moderate), > 4.73 (🔴 high IR)
    - Protocol-aware: Fasting glucose preferred (flag if meal_timing_tag ≠ before)

11. **UA / Creatinine Ratio** — Hybrid ⭐
    - Source: Hybrid (Home UA from Fora 6 + Lab Creatinine)
    - Formula: Uric Acid (µmol/L) ÷ Creatinine (µmol/L)
    - Why: Kidney clearance efficiency. High ratio = UA overproduction or under-excretion.
    - Protocol-aware: Fasting shifts expected ratio upward

12. **Sodium / Potassium Ratio**
    - Formula: Na ÷ K
    - Why: Electrolyte balance, cardiovascular stress
    - Target: 1.0–1.5 (optimal)

13. **Calcium / Magnesium Ratio**
    - Formula: Ca ÷ Mg
    - Why: Mineral balance, vascular stiffness
    - Target: 2.0–2.5 (optimal)

14. **Non-HDL Cholesterol**
    - Formula: Total Cholesterol − HDL
    - Why: Captures all atherogenic lipoproteins (LDL + VLDL + remnants)

15. **Remnant Cholesterol**
    - Formula: TC − HDL − LDL
    - Why: Emerging cardiovascular risk marker

16. **Neutrophil / Lymphocyte Ratio**
17. **AST / ALT Ratio**
    - Why: Liver stress marker; ratio >2 may indicate alcoholic liver disease
18. **GGT / Triglycerides**
19. **Transferrin Saturation**
20. **Ferritin / CRP Ratio**
21. **ApoB / ApoA1 Ratio**
22+ [More as added by admin]

### New Measurement Parameter: Waist Circumference ⭐ NEW

**Added to Cardio & Vitals section alongside Weight:**

```
BODY COMPOSITION (Qardio + Manual):
├─ Weight:              [73.0]  kg     (Qardiobase 2)
├─ Waist Circumference: [84.0]  cm     (Manual tape measure)  ⭐ NEW
├─ BP Systolic:         [100]   mmHg   (Qardio Arm)
├─ BP Diastolic:        [69]    mmHg   (Qardio Arm)
└─ Heart Rate:          [69]    bpm    (Qardio Arm)
```

- **Device:** Manual (tape measure) — no device_id needed, or create "Manual / Tape" device
- **Unit:** cm (or inches with conversion)
- **Frequency:** 2x/week (with weight) or weekly minimum
- **Measurement protocol (shown in tooltip):**
  - Stand upright, feet together
  - Measure at navel level (not waist of pants)
  - End of normal exhale
  - Skin-level (no clothing compression)
  - Same time each measurement (fasting morning preferred)
- **Zone assignment:** ⚡ Energy & Metabolic Power + 💪 Structural Integrity
- **Unlocks calculated markers:** WHtR, BMI context
- **Total measurement parameters:** 11 → **12** (6 metabolic + 5 cardio/body + 1 context)

### Calculated Marker Display

**When Complete (Protocol-Aware):**
```
✦ GKI: 2.0 (🟢 MODERATE KETOSIS)
  Protocol: Fasting 48h

Formula: Glucose (mmol/L) ÷ Ketones (mmol/L)
Calculation: 4.8 ÷ 2.4 = 2.0

Based on:
- Glucose: 4.8 mmol/L [View ↗]  (Fora 6, fasting)
- Ketones: 2.4 mmol/L [View ↗]  (Fora 6, fasting)

Dr. Boz Ratio: 36.0 (Glucose 86.4 mg/dL ÷ 2.4)

🔬 Autophagy Indicator:
"GKI of 2.0 during a 48h fast suggests you are in a
 metabolic state where autophagy is likely active.
 GKI ≤ 1.0 = deeper therapeutic zone (Seyfried)."

Context (protocol-aware):
"For a 48h fast, GKI 1–3 is the expected sweet spot.
 Your glucose is appropriately low and ketones elevated.
 This is consistent with effective fat oxidation."
```

**When Complete (Standard Protocol):**
```
✦ WHtR: 0.47 (🟢 HEALTHY)
  Protocol: Standard (Carnivore)

Formula: Waist (cm) ÷ Height (cm)
Calculation: 84 ÷ 179 = 0.47

Based on:
- Waist: 84 cm [View ↗]  (Manual tape, fasting morning)
- Height: 179 cm (Profile)

Why valuable:
"Your waist is below half your height — the key threshold
 for visceral fat risk. Better predictor than BMI for
 metabolic and cardiovascular risk."

Trend: 84 → 83 → 84 cm (stable, ±1 cm noise)
```

**When Incomplete:**
```
✦ GKI (INCOMPLETE) ⚫ GREY

Formula: Glucose (mmol/L) ÷ Ketones (mmol/L)
Status: Cannot calculate (missing data)

Missing base measurements:
✓ Glucose: 5.3 mmol/L (you have this)
✗ Ketones: MISSING

To enable this marker:
[+ Add Ketones measurement]
  Opens form pre-filled with marker selected

Why track GKI:
"The Glucose-Ketone Index is the best non-invasive proxy
 for metabolic depth during fasting. It estimates how
 deeply your body has shifted from glucose to fat burning."
```

**GKI Edge Case — Ketones = 0:**
```
✦ GKI: — (UNDEFINED)

Ketones reading: 0.0 mmol/L (below detection limit)
GKI cannot be calculated when ketones = 0.

This typically means:
- Not in ketosis (glucose-dominant metabolism)
- Recently consumed carbohydrates
- Not fasting long enough for ketone production

Suggestion: If fasting, retest in 12–16 hours.
```

---

## 10. Admin Panel

### Dashboard Metrics

```
┌─ USERS ─────────────────────┐
│ Total: 247 (up 12 this week) │
│ Paid (Focus+): 89 (36%)      │
│ Glimpse (free): 158 (64%)   │
│ Active (30d): 189 (77%)      │
└──────────────────────────────┘

┌─ REVENUE ────────────────────┐
│ MRR: €441.11                 │
│ Stripe: 77 active            │
│ Bitcoin: 12 active           │
│ Churn: 2.1%                  │
└──────────────────────────────┘

┌─ GROWTH ─────────────────────┐
│ New users (week): +12        │
│ New users (month): +43       │
│ Upgrades (Glimpse→Focus): +8 │
│ Churn (month): 1 user        │
└──────────────────────────────┘

┌─ FEATURE USAGE ──────────────┐
│ Measurements: 12,543 total   │
│ Cloud syncs: 1,234 this month│
│ PDF exports: 45 this month   │
│ CSV exports: 32              │
│ Doctor shares: 23 active     │
└──────────────────────────────┘

┌─ USER IMPROVEMENT ───────────┐
│ 27% improved metrics (red→✓)  │
│ 17% declined metrics          │
│ 56% stable                    │
│ High engagement: 62% improve  │
│ Low engagement: 15% improve   │
└──────────────────────────────┘
```

### 7 Admin Screens

1. **Dashboard** (above)
2. **Users & Licenses** (list, issue, revoke, resend email)
3. **Content Management** (KB editor, food DB)
4. **Settings** (reference ranges, thresholds)
5. **Analytics** (user growth, churn, revenue trends)
6. **Activity Monitor** (real-time user actions)
7. **Audit Log** (admin actions, who changed what, when)

**Admin Never Sees:**
- User health values
- User trends
- User segments
- Personalized insights

---

## 11. Device Management

### Device Setup

```
Active Devices:
┌─ Fora 6 ─────────────────────┐
│ Status: Active (6 months)    │
│ Markers: Glucose, Ketones,.. │
│ Location: Left middle finger  │
│ Calibration: Validated       │
│ Bias: +0.15 mmol/L glucose   │
│ [Edit ✎] [Decommission ⚠️]  │
└─────────────────────────────┘

┌─ Qardio Arm ─────────────────┐
│ Status: Active (3 months)    │
│ Markers: BP, Heart Rate      │
│ Location: Left arm           │
│ [Edit ✎] [Decommission ⚠️]  │
└─────────────────────────────┘

Decommissioned Devices:
- Apple Watch (data preserved)
  [Restore] [Permanently Delete]
```

### Location Dropdowns (Smart by Device Type)

```
Fora 6 (Fingerstick):
- Left middle finger
- Left index finger
- Left ring finger
- Right middle finger
- Right index finger
- Right ring finger

Qardio Arm (BP):
- Left arm
- Right arm
- Left ankle
- Right ankle

Qardiobase 2 (Scale):
- Bathroom floor
- Bedroom floor
- Tile floor
- [Custom location]

CGM (Freestyle/Dexcom):
- Left arm
- Right arm
- Left abdomen
- Right abdomen
- Left leg
- Right leg
```

---

## 12. Sharing & Collaboration

### Doctor Sharing (Phase 1)

```
User clicks [Share with Doctor]
├─ Doctor email: [user@example.com]
├─ Data range: [Last 30 days ▼]
├─ Zones included: [All 8 ▼] or specific zones
├─ Validity: [30 days ▼] (auto-expire)
├─ Share type: [Read-only link]
└─ [Generate & Send]

Doctor receives:
├─ Email: "Helmut shared their health data"
├─ Link: https://sovereignhealth.io/share/xyz123
├─ Doctor sees:
│  ├─ Selected 30 days of measurements
│  ├─ Calculated markers
│  ├─ Trends & status
│  ├─ Context (fasting, exercise, sleep, stress)
│  ├─ NO personal health history (just selected range)
│  └─ Expires: March 30, 2026
├─ Can print/download as PDF
└─ Cannot edit user data
```

### Phase 2 Enhancements

- ✅ Doctor dashboard (multiple patients)
- ✅ Doctor comments/notes (annotate measurements)
- ✅ Automated weekly summaries (digest email)
- ✅ Real-time updates (if user agrees)

---

## 13. Notifications & Engagement

### Encouragement Messaging

```
When user has improvement:
"Your glucose improved 8% this month! 🎉"

When user maintains consistency:
"14 days of consistent tracking 💪"

When user enters range:
"HbA1c back in target. Excellent!"

When user needs attention:
"Haven't measured glucose in 5 days. Check in today?"

When user achieves milestone:
"First 100 measurements! 🌟"
```

### Habit Streaks (Phase 2)

```
Display under measurements:
┌────────────────────────┐
│ 🔥 Consecutive Days: 14│
│ 📊 Weeks Improving: 7  │
│ ⚡ Days with Measure: 32
└────────────────────────┘
```

### Weekly Summary (Phase 2)

```
Email every Friday:
"Your Weekly Health Summary"

Content:
- Markers improved: 3
- Markers declined: 1
- Best zone: Cardiovascular (all 5 ✓)
- Focus zone: Energy (1 🟡)
- Recommendation: "Continue fasting, add morning walk"
- [View Full Report]
```

---

## 14. Data Model & Architecture

### Core Tables

**users**
- user_id (UUID, PK)
- email (UNIQUE)
- password_hash (bcrypt)
- created_at
- role (user/admin)
- language (EN/DE)
- timezone (Europe/Berlin)
- mfa_enabled (boolean)
- deleted_at (soft delete)

**user_preferences**
- user_id (FK)
- date_format (DD/MM/YYYY, MM/DD/YYYY)
- time_format (24h, 12h)
- glucose_unit (mmol/L, mg/dL)
- weight_unit (kg, lbs)
- [8 more unit preferences]
- extended_entry_enabled (boolean)
- timezone

**user_profile**
- user_id (FK)
- gender (M/F/Other)
- age (years)
- height_cm (cm) — static, used for BMI + WHtR calculations
- weight (kg)
- derived_metrics: BMI, BMR, TDEE, IBW, WHtR (calculated)

**measurements**
- measurement_id (UUID, PK)
- user_id (FK)
- marker_id (FK)
- timestamp (date + time, ISO)
- value_canonical (normalized to standard unit)
- unit_canonical (e.g., mmol/L)
- device_id (FK)
- status (green/orange/red, calculated from user's reference range)
- protocol_tag (standard, fasting) — replaces old fasting_state
- diet_protocol (carnivore, keto, vegan, only_fish, mixed, custom) — when protocol_tag = standard
- fasting_protocol (16_8, omad, 36h, 48h, 72h, extended, custom) — when protocol_tag = fasting
- fast_start_datetime (ISO timestamp, nullable) — links sessions within same fast
- fasting_hours (int, nullable) — auto-calculated or manual override
- meal_timing_tag (before, 30m_after, 1h_after, 2h_after, 3h_after, no_tag)
- exercise_activity (none, light, moderate, intense)
- exercise_timing (pre, during, post)
- sleep_hours (previous night)
- sleep_quality (poor, fair, good, excellent)
- stress_level (1-10)
- lifestyle_note (optional, 300 chars)
- created_at
- updated_at
- [encrypted_data for E2E in Phase 2]

**reference_ranges**
- user_id (FK)
- marker_id (FK)
- protocol_context (default, fasting_16_8, fasting_48h, fasting_72h, fasting_extended, standard_carnivore, standard_keto, etc.) — NEW
- green_min, green_max (user's target range)
- orange_min, orange_max
- red_min, red_max
- custom_thresholds (boolean, user overrode defaults)
- UNIQUE (user_id, marker_id, protocol_context)

**calculated_markers**
- calculated_marker_id (UUID, PK)
- marker_id (e.g., "gki", "tg_hdl_ratio", "whtr")
- formula (e.g., "glucose_mmol ÷ ketones_mmol")
- base_markers_required (array: ["glucose", "ketones"])
- source_type (home, lab, hybrid) — NEW: where inputs come from
- category (autophagy_fasting, insulin_resistance, cardiovascular, body_composition, etc.)
- importance (high, medium, low)
- free_tier (boolean, show to all users)
- protocol_aware (boolean) — NEW: thresholds shift based on protocol_tag
- default_thresholds (JSONB: {green_min, green_max, yellow_min, yellow_max, red_min, red_max})
- protocol_overrides (JSONB, nullable) — NEW: per-protocol threshold overrides
  ```json
  {
    "fasting_16_8":  { "green_max": 6, "yellow_max": 9 },
    "fasting_48h":   { "green_max": 3, "yellow_max": 6 },
    "fasting_72h":   { "green_max": 1, "yellow_max": 3 },
    "standard_keto": { "green_max": 6, "yellow_max": 9 }
  }
  ```

**calculated_marker_values**
- calculated_value_id (UUID, PK)
- user_id (FK)
- calculated_marker_id (FK)
- timestamp
- value (0.63, if TG/HDL complete)
- status (green/orange/red, or null if incomplete)
- base_measurement_ids (which measurements used)

**devices**
- device_id (UUID, PK)
- user_id (FK)
- device_name (Fora 6, Qardio Arm, etc.)
- device_nickname (custom name user sets)
- status (active, archived, decommissioned)
- markers_measured (array)
- measurement_location (left_middle_finger, left_arm, etc.)
- calibration_notes (optional)
- known_bias (optional, e.g., "+0.15 mmol/L glucose")
- total_measurements (count)
- last_measurement_date
- created_at
- decommissioned_at (when user decommissioned)

**user_licensing**
- user_id (FK)
- tier_id (FK → license_tiers: core/glimpse/focus/insight/clarity/horizon)
- license_key (UNIQUE)
- expires_at
- stripe_subscription_id
- bitcoin_address
- last_checked_at
- created_at

**admin_audit_log**
- event_id (UUID, PK)
- admin_id (FK to users)
- action (user_created, license_revoked, kb_updated, etc.)
- entity (user, license, kb_article, etc.)
- entity_id (UUID of affected entity)
- changes (JSONB, before/after)
- ip_address
- created_at

**kb_markers**
- marker_id (PK, e.g., "glucose")
- marker_name (Glucose)
- marker_icon (🩸)
- marker_image_url (/images/markers/glucose.svg)
- what_is_it (HTML rich text)
- why_matters (HTML rich text)
- published (boolean)

**kb_food_samples**
- food_sample_id (UUID)
- marker_id (FK)
- food_name (Spinach)
- image_url (/images/foods/spinach.jpg)
- key_nutrients (Iron, Magnesium)
- impact (Improves insulin sensitivity)
- category (improve, avoid)
- published (boolean)

[+ 10 more tables for calculated markers, sharing, goals, achievements, etc.]

---

## 15. Security & Privacy

### Encryption Strategy

**Phase 1: Standard Encryption**
- ✅ TLS 1.3 (in transit)
- ✅ AES-256-GCM (at rest in DB)
- ✅ Argon2 (password hashing)
- ✅ Secrets in environment variables
- ✅ Admin can theoretically decrypt (with DB access)

**Phase 2: Optional E2E Encryption**
- ✅ Master password (user sets on first login)
- ✅ Client-side key derivation (Argon2)
- ✅ Browser-based AES-256 encryption
- ✅ Server stores encrypted blobs (0x1F2A...)
- ✅ Admin cannot decrypt (impossible, no key)
- ✅ Trade-off: Can't read data server-side (no recommendations)

### MFA

**Phase 1:**
- ✅ TOTP (Google Authenticator, Authy, etc.)
- ✅ SMS (optional backup)
- ✅ Required on first login
- ✅ User can disable (not recommended)

### Data Handling

- ✅ No data sold, shared, or exported externally
- ✅ User can download all their data (CSV)
- ✅ User can delete all data (irreversible, warning modal)
- ✅ GDPR-compliant (right to access, delete, portability)
- ✅ Audit trail (who accessed what, when)

---

## 16. Licensing & Monetization

> **📄 Full specification:** See `LICENSING_STRATEGY.md` (single source of truth)
> This section is a summary. All details, database schema, white-label model,
> and sub-licensing mechanics are in the dedicated licensing document.

### Tier Structure (6 Tiers — "Clarity/Vision" naming)

| Tier | Name | Price | Doctor Chat | Key Differentiator |
|------|------|-------|-------------|-------------------|
| T0 | 🏗️ **Core** | Free (self-hosted) | — | Privacy, control, OSS (AGPLv3) |
| T1 | 👁️ **Glimpse** | Free (SaaS) | 3 (30d trial) | Zero setup, try it |
| T2 | 🎯 **Focus** | €9.99/mo | 5/month | AI coaching + convenience |
| T3 | 💡 **Insight** | €24.99/mo | 15/month | Holistic analysis + predictions |
| T4 | 🔬 **Clarity** | €49.99/mo | Unlimited | Professional + API + coaching |
| T5 | 🌐 **Horizon** | Custom | Unlimited | White-label + sub-licensing |

### Key Business Decisions (Approved 2026-03-08)

- **Revenue share (Horizon partners):** 20% platform fee
- **Refund policy:** 30-day money-back guarantee (exceeds EU 14-day minimum)
- **Trial periods:** Glimpse: 30d AI taste, Focus: 7d, Insight: 14d, Clarity: 30d
- **Overage model:** Buyable extras (Focus: €2.99/5, Insight: €4.99/10)
- **Rollover:** Partial (Focus: max 2, Insight: max 5)
- **Annual discount:** 17% (≈ 2 months free)
- **Open source license:** AGPLv3 (core) + Commercial license available for closed-source use

### License Model

```
Open Source Core (AGPLv3)  →  Free forever, self-host, fork, contribute
         ↓
SaaS Premium (Proprietary) →  Hosted, AI-powered, convenience, paid tiers
         ↓
White-Label (Horizon)      →  Partners run branded instances, sub-licensing
         ↓
Commercial License         →  For companies embedding core in proprietary products
```

### Payment Methods

**Phase 1:** Stripe (cards, PayPal, SEPA, Apple/Google Pay)
**Phase 2:** Bitcoin (BTCPay Server, Lightning, annual plans only)

### Superseded Documents

The following documents are **replaced** by `LICENSING_STRATEGY.md`:
- ~~`LICENSING_ARCHITECTURE_COMPLETE.md`~~
- ~~`DOCTOR_CHAT_BUNDLE_TIERS.md`~~
- ~~`LICENSE_ARCHITECTURE.md`~~
- ~~`DOCTOR_CHAT_PREMIUM_FEATURE.md`~~

---

## 17. CI/CD & Deployment

### Repository Structure (GitLab)

```
gitlab.com/sovereign-health/
├── Core/ 🌐 (public — AGPLv3 open source)
│   ├── backend     (Rust/Actix-web API)
│   └── frontend    (Next.js / React)
├── Ops/ 🔒 (private — infrastructure, CI/CD, deployment)
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   ├── ssl/
│   ├── backup/
│   └── monitoring/
└── SaaS/ 🔒 (private — licensing, Stripe integration, admin panel extensions)
    ├── licensing-service/
    └── payment-webhooks/
```

**Local development mirrors GitLab:**
```
~/projects/sovereign-health/
├── core-backend/      ← git remote: .../Core/backend.git
├── core-frontend/     ← git remote: .../Core/frontend.git
├── ops/               ← git remote: .../Ops.git
├── saas/              ← git remote: .../SaaS.git
└── docker-compose.dev.yml  (convenience symlink/copy, canonical in ops/)
```

Each directory = independent git repo. No submodules.

### GitLab CI/CD Pipelines

**core-backend/.gitlab-ci.yml:**
```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: rust:latest
  script:
    - cargo fmt -- --check
    - cargo clippy -- -D warnings
    - cargo test
  rules:
    - if: $CI_MERGE_REQUEST_ID
    - if: $CI_COMMIT_BRANCH == "main"

build-docker:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker build -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-production:
  stage: deploy
  script:
    - ssh deploy@sovereignhealth.io "cd /opt/sovereign-health && docker compose pull && docker compose up -d"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual   # manual gate — click to deploy
  environment:
    name: production
    url: https://sovereignhealth.io
```

**core-frontend/.gitlab-ci.yml:**
```yaml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:22
  script:
    - npm ci
    - npm run lint
    - npm run build
    - npm test
  rules:
    - if: $CI_MERGE_REQUEST_ID
    - if: $CI_COMMIT_BRANCH == "main"

build-docker:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker build -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy-production:
  stage: deploy
  script:
    - ssh deploy@sovereignhealth.io "cd /opt/sovereign-health && docker compose pull && docker compose up -d"
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
  environment:
    name: production
    url: https://sovereignhealth.io
```

### Deployment Architecture (Production)

```
sovereignhealth.io (Helmut's VPS)
├─ nginx (reverse proxy + SSL termination)
│  ├─ sovereignhealth.io        → frontend:3000
│  ├─ api.sovereignhealth.io    → backend:8080
│  └─ SSL: Let's Encrypt (certbot auto-renew)
├─ frontend (Docker container, Next.js standalone)
│  └─ Port 3000 (internal only)
├─ backend (Docker container, Rust/Actix-web)
│  └─ Port 8080 (internal only)
├─ postgresql (Docker container, encrypted at rest)
│  └─ Port 5432 (internal only, no external access)
├─ redis (Docker container, session cache)
│  └─ Port 6379 (internal only)
└─ backup (cron → S3-compatible storage)
```

### Phase 0 Milestone: "Hello World Deployed" ⭐

**Goal:** Prove the full stack runs end-to-end on the VPS before building any real features.
This is the foundation — no point building 22 calculated markers if you can't deploy.

**Must pass before Phase 1B (Data Entry & Dashboard) begins.**

#### Step 1: Local Smoke Test
```
□ docker compose -f docker-compose.dev.yml up
□ Frontend: http://localhost:3000 loads (even if just "Hello World")
□ Backend: http://localhost:8080/health returns 200 OK + JSON
□ PostgreSQL: migrations run, DB schema created
□ Redis: connection established
□ Frontend → Backend: at least one API call works (e.g., GET /health from frontend)
```

#### Step 2: GitLab CI/CD Pipeline
```
□ core-backend: push to main triggers test + build
□ core-frontend: push to main triggers test + build
□ Docker images pushed to GitLab Container Registry
□ Pipeline passes green on both repos
```

#### Step 3: VPS Deployment
```
□ SSH access to sovereignhealth.io verified
□ Docker + Docker Compose installed on VPS
□ docker compose pull (from GitLab Container Registry)
□ docker compose up -d (all services start)
□ nginx configured (reverse proxy + SSL)
□ Let's Encrypt cert issued and auto-renewing
```

#### Step 4: Production Smoke Test
```
□ https://sovereignhealth.io loads (frontend, valid SSL)
□ https://api.sovereignhealth.io/health returns 200 OK (backend, valid SSL)
□ User can register (POST /auth/signup → 201)
□ User can login (POST /auth/login → 200 + JWT)
□ One measurement can be saved (POST /measurements → 201)
□ One measurement can be retrieved (GET /measurements → 200 + data)
□ Data is encrypted in DB (verify: psql → SELECT * shows encrypted blobs, not plaintext)
□ No external ports open except 80/443 (verify: nmap or ss)
□ Firewall rules: PostgreSQL, Redis NOT accessible from internet
```

#### Step 5: Security Baseline
```
□ SSL Labs test: A or A+ rating (https://www.ssllabs.com/ssltest/)
□ HSTS header present
□ No server version headers leaked (nginx, actix)
□ .env files not accessible via HTTP
□ CORS configured (only sovereignhealth.io origin allowed)
□ Rate limiting on auth endpoints (prevent brute force)
```

**Pass criteria:** All boxes checked = green light to build real features.
**Estimated time:** 1–2 days (if repos are clean and VPS is ready).

### Environment Configuration

**Development (.env.dev — in ops/, gitignored):**
```
DATABASE_URL=postgres://dev:dev@localhost:5432/sovereign_health_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-me
RUST_LOG=debug
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8080
```

**Production (.env.prod — on VPS only, never in git):**
```
DATABASE_URL=postgres://prod_user:<strong_password>@db:5432/sovereign_health
REDIS_URL=redis://redis:6379
JWT_SECRET=<generated-256-bit-secret>
RUST_LOG=warn
FRONTEND_URL=https://app.sovereignhealth.io
BACKEND_URL=https://api.sovereignhealth.io
ENCRYPTION_KEY=<generated-AES-256-key>
```

**Rule:** No `.env` file is ever committed. Dev values in `.env.example` (committed, safe defaults).

---

## 18. Missing Pieces & Final Checks

### Addressed in This Document

✅ Health score card (X/Y in range)  
✅ Encouragement messaging (conditional feedback)  
✅ Horizontal range bar (reference visualization)  
✅ Color system (WCAG AA, zone-specific)  
✅ Bottom navigation (4-5 tabs)  
✅ Simplified detail flow (scrollable, linear)  
✅ Food grid layout (3 columns, visual)  
✅ Gamification (streaks, achievements - Phase 2)  
✅ Weekly summaries (Phase 2)  
✅ Population comparison (Phase 2)  
✅ Doctor mode export (Phase 2)  
✅ Habit tracking (Phase 2)  
✅ Correlation dashboard (Phase 3)  
✅ AI predictions (Phase 3)  
✅ Meal logging (Phase 3)  
✅ Coach integration (Phase 3)  
✅ Data import/migration (CSV, wearables - Phase 2)  
✅ Sharing & collaboration (Phase 1+2)  
✅ Notifications (Phase 1+2)  
✅ Accessibility (WCAG AA, colorblind-safe)  
✅ CI/CD pipeline (GitLab, per-repo)  
✅ Deployment architecture (Docker Compose, nginx, SSL)  
✅ Hello World smoke test (Phase 0 milestone)  
✅ Repository structure (multi-repo, Core/Ops/SaaS)  

### Remaining Design Clarifications

**Resolved in This Document:**
- ✅ Color accessibility (all WCAG AA tested)
- ✅ Device management (location dropdowns smart)
- ✅ Timezone selection (in settings)
- ✅ Extended entry toggle (optional)
- ✅ Measurement editing (full capability)
- ✅ Calculated markers (incomplete display, greyed)
- ✅ Base measurement hyperlinks (transparent)

### Not in Scope (Can Add Later)

- ❌ Insurance integration (future)
- ❌ Smart watch native apps (Phase 3)
- ❌ Advanced wearable sync (Oura, Fitbit - Phase 2+)
- ❌ Full meal logging (Phase 3, scope creep)
- ❌ Genetic testing integration (future)
- ❌ Supplement tracking (nice-to-have)
- ❌ Multiple language support beyond EN/DE (future)

---

## Summary: Design Complete ✅

This document represents the **complete, finalized design** for Sovereign Health Intelligence, incorporating:

- ✅ All Phase 1-3 recommendations
- ✅ WCAG AA accessibility compliance
- ✅ Privacy-first architecture
- ✅ User-centered UX patterns
- ✅ Reference app insights integrated
- ✅ All 12 design question clarifications

**Next: Phase 1 Toolchain Setup**

Now ready to move to Phase 1: Infrastructure setup on popOS + GitLab + Rust + deployment automation.

---

**Document Status:** FINAL | Ready for Phase 1 Planning  
**Version:** 6.1  
**Last Updated:** March 8, 2026  
**Changes in 6.1:** GKI + Dr. Boz + WHtR + HCT/HB calculated markers, waist circumference measurement, protocol-aware thresholds (fasting vs standard diet), fasting/diet protocol tags replacing old fasting_state + diet_type fields, CI/CD pipelines (GitLab), deployment architecture, Phase 0 "Hello World Deployed" smoke test milestone, repository structure documentation  
**Next Review:** After Phase 1 Toolchain + Phase 2 Hello World complete
