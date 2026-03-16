# Sovereign Health App - Design Documentation
**Complete Design System & Implementation Ready**

---

## 📦 Project Overview

A **sovereign, open-source health measurement tracking app** with:
- **8 Functional Health Zones** (75+ biomarkers)
- **Multi-Language Support** (English + German)
- **Light & Dark Themes**
- **Bitcoin Orange Branding** (#F7931A)
- **Timeline Visualization** for trend analysis
- **Bilingual Knowledge Base** (searchable tips)

---

## 🎨 Brand Identity

**Primary Color:** Bitcoin Orange (#F7931A)
- Used for all zone icons
- Consistent across light & dark themes
- Premium, recognizable branding
- Excellent contrast on all backgrounds

---

## 📁 Documentation Files

### Design Foundation
1. **HEALTH_ZONES_DIFFERENTIATION.md** (25.7 KB)
   - 8 functional health zones with complete rationale
   - 75+ biomarkers mapped to zones
   - Design tokens & responsive principles
   - German translations included

2. **LANGUAGE_SUPPORT_STRUCTURE.md** (28.5 KB)
   - i18n architecture (EN + DE)
   - 200+ translation keys defined
   - User settings schema
   - React implementation examples
   - API endpoints for user settings

3. **DARK_THEME_SPECIFICATION.md** (15.5 KB)
   - Complete color palette (light & dark)
   - CSS custom properties & Tailwind integration
   - React ThemeContext implementation
   - Theme switcher component
   - WCAG accessibility compliance

### Mockups & Specifications
4. **MOCKUPS_HIGH_FIDELITY.md** (59.2 KB)
   - 6 complete app screens
   - Desktop (1024px+) & mobile (375px) layouts
   - Measurement timeline visualization
   - Trend charts with 30-day history
   - Multi-metric comparison interface
   - Real data examples (from Helmut)

5. **ICON_LIBRARY_SPEC.md** (12 KB)
   - 8 SVG icons (Bitcoin orange #F7931A)
   - Icon specifications & semantics
   - React SVGIcon component
   - CSS styling & hover effects
   - Scalable (16px–64px)

### Implementation Ready
6. **DESIGN_PHASE_COMPLETE_CHECKLIST.md** (9.9 KB)
   - Complete review checklist
   - Deliverables summary
   - Implementation roadmap
   - Timeline estimates

7. **MOCKUPS_COMPLETE.html** (22.8 KB)
   - **Shareable HTML mockup document**
   - View in any browser
   - Complete visual guide
   - Color swatches & feature lists
   - Ready for stakeholder review

---

## 🎯 Key Features

### Design System
- ✅ Bitcoin Orange (#F7931A) primary brand
- ✅ Light theme (day mode)
- ✅ Dark theme (night mode)
- ✅ System default detection
- ✅ WCAG AA accessibility compliance
- ✅ Responsive layout (375px–2560px+)

### Language Support
- ✅ English (EN) — default
- ✅ German (Deutsch, DE) — full support
- ✅ User toggles in Settings
- ✅ Preference stored in database
- ✅ German text expansion handled (line-height 1.6)

### 8 Health Zones
1. ⚡ Energy & Metabolic Power (7 markers)
2. 💪 Structural Integrity & Building Blocks (9 markers)
3. 🫀 Cardiovascular Resilience (9 markers)
4. 🧠 Cognitive & Nervous System (8 markers)
5. 🛡️ Immune & Inflammatory Balance (17 markers)
6. 🔄 Detoxification & Waste Clearance (13 markers)
7. 🎯 Hormonal Harmony (9 markers)
8. 🌱 Nutritional Sufficiency (14 markers)

### Measurement Management
- ✅ Multiple measurements per marker
- ✅ Timeline visualization (recent 5 on dashboard)
- ✅ Trend analysis (30-day charts)
- ✅ Historical comparisons (current vs. previous vs. average)
- ✅ Pattern detection (correlations, causes)
- ✅ Journal entry for context (diet, sleep, stress)
- ✅ Tag system for quick filtering

### User Experience
- ✅ Ampel Logic (🟢🟡🔴 status indicators)
- ✅ Real-time validation (live status feedback)
- ✅ Searchable knowledge base
- ✅ Personalized tips based on data
- ✅ Export to CSV / Share with doctor
- ✅ Responsive design (mobile-first)

---

## 🚀 Implementation Roadmap

### Phase 1: MVP (2–3 weeks)
**What's Included:**
- 6 core screens (Dashboard, Zone Detail, Measurement, Settings, KB, Trends)
- 8 health zones + 75+ markers
- EN + DE language support
- Light & Dark themes
- User authentication
- Measurement history
- Trend visualization
- Knowledge base

**Estimated Timeline:**
- API Specification: 1–2 days
- Database Schema: 1 day
- Code Brief: 1 day
- Frontend (Next.js + Tailwind): 5–7 days
- Backend (Rust + Actix-web): 3–5 days
- QA & Integration: 2–3 days
- **Total: ~2–3 weeks**

### Phase 2: Premium Features
- OCR blood test photo import
- Advanced trend predictions
- AI coach recommendations
- Doctor-shareable reports
- Community insights

### Phase 3: Ecosystem
- AI personalization
- Wearable integration
- Clinician API
- Community (anonymized)

---

## 🎨 Visual Preview

### Light Theme Colors
```
Brand:    #F7931A (Bitcoin Orange)
BG:       #FAFAFA (Off-white)
Cards:    #FFFFFF (White)
Text:     #1A1A1A (Dark gray)
Status:   🟢 #27AE60 | 🟡 #F39C12 | 🔴 #E74C3C
```

### Dark Theme Colors
```
Brand:    #F7931A (Bitcoin Orange, unchanged)
BG:       #0F0F0F (Deep black)
Cards:    #1A1A1A (Dark gray)
Text:     #F0F0F0 (Light gray)
Status:   🟢 #4CAF50 | 🟡 #FFA500 | 🔴 #FF6B6B
```

---

## 📊 Data Structure

### Measurement Session
```
{
  id: UUID,
  user_id: UUID,
  date: DateTime,
  device: String ("Fora 6", "Qardio Arm", etc.),
  location: String ("Home", "Lab"),
  measurements: [
    {
      marker_id: UUID,
      value: Float,
      unit: String,
      status: String ("green", "yellow", "red")
    }
  ],
  journal_entry: String,
  tags: [String],
  created_at: DateTime,
  updated_at: DateTime
}
```

### User Profile
```
{
  id: UUID,
  email: String,
  name: String,
  gender: String,
  birthdate: Date,
  timezone: String,
  language_preference: String ("en", "de"),
  theme_preference: String ("light", "dark", "system"),
  unit_preferences: {
    glucose: "mmol_l" | "mg_dl",
    cholesterol: "mmol_l" | "mg_dl",
    ...
  },
  personal_thresholds: {
    marker_id: {
      green: [min, max],
      yellow: [min, max],
      red: [min, max]
    }
  }
}
```

---

## 🔐 Security & Privacy

- ✅ User data encrypted (AES-256)
- ✅ No external API calls (sovereign)
- ✅ No tracking or analytics (privacy-first)
- ✅ GDPR compliant
- ✅ Self-hosted option available
- ✅ JWT authentication

---

## 🛠️ Technology Stack

### Frontend
- **Framework:** Next.js 14+ (TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Charts:** Recharts
- **Mobile:** React Native (Expo, Phase 2)

### Backend
- **Language:** Rust
- **Framework:** Actix-web
- **Database:** PostgreSQL
- **Encryption:** AES-256
- **Auth:** JWT + bcrypt

### Deployment
- **Containerization:** Docker
- **Hosting:** VPS (self-hosted)
- **Example:** Helmut's Hostinger VPS (72.61.154.115)

---

## 📋 Next Steps

### For Stakeholder Review
1. Open `MOCKUPS_COMPLETE.html` in browser
2. Review color scheme (Bitcoin Orange #F7931A)
3. Check theme switching (Light / Dark / System)
4. Verify 8 zones & marker organization
5. Confirm measurement timeline visualization
6. Approve language support (EN + DE)

### For Development
1. Read API Specification (TBD)
2. Review Database Schema (TBD)
3. Study Code Brief (TBD)
4. Set up development environment
5. Begin implementation (Phase 1)

---

## 📞 Questions?

All design decisions are documented in individual files:
- **"Why these 8 zones?"** → HEALTH_ZONES_DIFFERENTIATION.md
- **"How does i18n work?"** → LANGUAGE_SUPPORT_STRUCTURE.md
- **"What's the dark theme strategy?"** → DARK_THEME_SPECIFICATION.md
- **"Show me the screens"** → MOCKUPS_HIGH_FIDELITY.md or MOCKUPS_COMPLETE.html

---

## ✅ Status

**Design Phase:** COMPLETE ✅
- All zones designed
- All screens mocked
- All components specified
- All colors finalized (Bitcoin Orange)
- All languages translated (EN + DE)
- All themes implemented (Light + Dark)
- Ready for code phase

**Approval Status:** Awaiting stakeholder review

---

_Last Updated: March 1, 2026_
_Sovereign Health App - Design System v1.0_
