# Requirements Reference (SNAPSHOT)
**Status:** Approved & Locked  
**Date:** 2026-03-01  
**Phase:** Design Review

---

## 📋 PROJECT DEFINITION

**Name:** Sovereign Health MVP  
**Vision:** Sovereign health empowerment through self-tracking and knowledge  
**USP:** NOT an Aware clone — unique functional health zones + complete knowledge base  
**Languages:** English + German (default: English)  
**Platform:** Web (Next.js) + Mobile (React Native, Phase 2)  
**Backend:** Rust + Actix-web + PostgreSQL  
**Deployment:** Self-hosted (Docker + VPS)  
**Timeline:** 10–12 weeks (Design → MVP → Testing)  
**Code:** Claude AI + User QA/Testing  

---

## 🎯 CORE FEATURES (MVP)

### 1. **8 Functional Health Zones** (75+ Biomarkers)
- ⚡ Energy & Metabolic Power (7)
- 💪 Structural Integrity & Building Blocks (9)
- 🫀 Cardiovascular Resilience (9)
- 🧠 Cognitive & Nervous System (8) — UNIQUE
- 🛡️ Immune & Inflammatory Balance (17)
- 🔄 Detoxification & Waste Clearance (13)
- 🎯 Hormonal Harmony (9)
- 🌱 Nutritional Sufficiency (14)

### 2. **Manual Data Entry**
- Single session = multiple parameters (10–15 typically)
- Units selectable (mmol/L ↔ mg/dL, kg ↔ lbs, etc.)
- Personal thresholds (Green/Yellow/Red zones)
- Journal entry + contextual tags
- Fora 6 + Qardio devices supported (extensible)

### 3. **Dashboard**
- Collapsed Health Zones view (all 8 zones visible)
- Zone score: "9/11 In Range 🟢"
- Click zone → Expanded detail (all markers)
- Historical session list + trends

### 4. **Knowledge Base** (Complete)
- All 75+ markers fully documented:
  - Plain English explanation
  - High/Low consequences
  - Foods to improve/avoid (Tier 1/2/3)
  - Lifestyle changes (training, sleep, fasting, stress)
  - Red flags (when to see doctor)
  - Connections to other markers
  - Personal strategy (if high/low/normal)
  - Common myths debunked
- Multi-language (EN + DE)
- Food database (500+ foods in Phase 2)

### 5. **Trends & Analysis**
- Select metric → view chart (last 30 days)
- Time range filter
- Target band visualization
- Export CSV

### 6. **Settings**
- Unit preferences (glucose mmol/L vs mg/dL, etc.)
- Personal thresholds (Ampel-Logik per marker)
- Device configuration
- Language selection (EN/DE)

### 7. **Multi-User Support**
- Helmut (primary user)
- Peter (tester)
- Prepared for family sharing (Phase 2)
- User data isolation (no cross-user visibility)

### 8. **Authentication & Security**
- Email + password signup/login
- JWT token (15 min expiry, refreshable)
- Password hashing (bcrypt, work factor 12)
- TLS/HTTPS (all traffic)
- AES-256 database encryption (at rest)
- User data isolated by user_id

---

## 🎨 DESIGN SYSTEM

**Colors:**
- 🟢 Success: #10B981
- 🟡 Warning: #F59E0B
- 🔴 Critical: #EF4444
- 🟣 Brand: #8B5CF6
- 🟦 Background: #F4F4F6

**Typography:**
- H1: 32px, bold, -0.5px letter spacing
- H2: 20px, semibold
- Body: 16px, regular
- Caption: 12px, gray

**Spacing:** 4px base (xs/sm/md/lg/xl/2xl/3xl/4xl)  
**Border Radius:** 4px–20px + full  
**Shadows:** soft, minimal  

**10 Reusable Components:**
1. StatusBadge (Normal/Warning/Critical colors)
2. MetricCard (icon, title, value, unit, status, range bar)
3. CircularScore (X/Y percentage ring + text)
4. HealthGridItem (icon + label, clickable)
5. BiomarkerListItem (name, value, unit, trend, status)
6. AdviceListItem (title, description, impact, difficulty, timeline)
7. MetricInputField (value input + unit dropdown, live validation)
8. RangeDisplay (visual slider with green/yellow/red zones)
9. TrendChart (line chart with target band, Recharts)
10. SectionCard (container with title, icon, optional action)

---

## 📱 9 SCREENS (MVP)

1. **Login/Signup** — Email + password, simple form
2. **Dashboard (Health Zones)** — 8 collapsed zones, zone score, key metrics
3. **Zone Detail** — Expanded zone, all markers, status, trends, KB links
4. **New Measurement** — Multi-parameter entry, units, validation, journal, tags
5. **Session History** — List of sessions, quick filters, view/edit/delete actions
6. **Trends/Charts** — Metric selector, time range, line chart, export CSV
7. **Knowledge Base** — Browse zones, search, quick tips, full articles
8. **KB Tip Detail** — Full article: what is it, why it matters, foods, lifestyle, myths
9. **Settings** — Units, thresholds (Ampel), devices, language, profile

---

## 📊 DATA MODEL (Core)

**Users:**
- id, email, password_hash, language (en/de), timezone, created_at

**Measurement Sessions:**
- id, user_id, session_date, session_time, device_id, location (home/lab), lab_provider, journal_entry, tags (JSON), created_at

**Measurements:**
- id, session_id, parameter_id, value, unit, created_at

**Parameters:**
- id, code (bg, ua, etc.), name_en, name_de, category, unit_default, unit_alternatives (JSON), normal_range_low, normal_range_high

**User Thresholds:**
- id, user_id, parameter_code, unit, green_min, green_max, yellow_min, yellow_max, red_min, red_max

**User Unit Preferences:**
- id, user_id, parameter_code, preferred_unit

**Devices:**
- id, user_id, device_code (fora6, qardio_arm, etc.), device_name, device_type, location (left middle finger, left arm, etc.)

**Health Zones:**
- id, name_en, name_de, icon, display_order

**Zone Markers:**
- zone_id, parameter_id (many-to-many relationship)

---

## 🔐 SECURITY REQUIREMENTS

✅ TLS/HTTPS (all traffic encrypted in transit)  
✅ AES-256 database encryption (sensitive fields at rest)  
✅ Bcrypt password hashing (work factor 12+)  
✅ JWT tokens (short-lived 15 min, refreshable)  
✅ User data isolation (query filtering by user_id)  
✅ No sensitive data in logs  
✅ CORS configured for localhost/VPS domain  

---

## 🚀 TECH STACK (LOCKED)

**Frontend:** Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui + Zustand + Recharts  
**Backend:** Rust + Actix-web + PostgreSQL + Diesel ORM  
**State:** Zustand (minimal, lean)  
**Charts:** Recharts (React-native API)  
**Mobile (Phase 2):** Expo + React Native + NativeWind (~70% code share)  
**Deployment:** Docker + VPS (Helmut's Hostinger)  

---

## 💾 DELIVERABLES (LOCKED)

```
✅ HEALTH_ZONES_UNIQUE.md
   — 8 zones with rationale
   — 75+ biomarkers mapped
   — Multi-role markers (e.g., Magnesium in 5 zones)

✅ KNOWLEDGE_BASE_SYSTEM.md
   — Complete KB template (all 75+ markers)
   — Food database spec (500+ foods, Phase 2)
   — OCR blood test photo import (Premium, Phase 2)

✅ WIREFRAMES_LOWFI.md
   — 9 screens with navigation flow
   — Layout descriptions (text-based)
   — Component placement

✅ DESIGN_TOKENS.json
   — Colors, typography, spacing
   — Component styles (Button, Card, Input, Badge)

✅ COMPONENT_SPECS.md
   — 10 components with props, variants
   — Tailwind CSS examples
   — Accessibility notes

✅ TECH_STACK_RECOMMENDATION.md
   — Full architecture overview
   — Why each choice
   — Comparison matrix

✅ REQUIREMENTS_APPROVED.md
   — Functional requirements
   — Use cases (5 core)
   — Feature prioritization
```

---

## 📋 FEATURE PRIORITIZATION

**MUST HAVE (MVP):**
- Multi-user auth (Helmut + Peter)
- 8 Health Zones dashboard
- Manual data entry (multi-parameter)
- Session history (list + detail)
- KB for 20 core markers
- Trends/charts (basic)
- Settings (units + thresholds)
- Multi-language (EN + DE)
- Full encryption (transit + storage)

**SHOULD HAVE (Phase 1B, if time):**
- KB for all 75+ markers
- Food database (basic, 50 foods)
- Advanced trends (predictions, ML prep)
- Export CSV

**NICE TO HAVE (Phase 2):**
- OCR photo import (premium)
- Advanced food DB (500+ foods)
- AI coach recommendations
- Doctor-shareable reports
- Wearable integrations
- Mobile app (full React Native)

---

## 🎯 SUCCESS CRITERIA (MVP)

- [ ] All 8 zones visible on dashboard
- [ ] Zone detail shows all markers with status
- [ ] Manual entry works for 10+ parameters per session
- [ ] Personal thresholds (Green/Yellow/Red) customizable per marker
- [ ] KB popups work + full articles readable
- [ ] Multi-language toggle (EN ↔ DE) functional
- [ ] All data encrypted (transit + storage)
- [ ] User isolation tested (Helmut ≠ Peter data)
- [ ] Mobile responsive (iPhone/iPad viewport)
- [ ] Export CSV functional
- [ ] All tests passing
- [ ] Deployed to Helmut's VPS

---

## 📅 TIMELINE (Estimated)

**Week 1–2:** Backend setup + data models + auth  
**Week 3–5:** Frontend components + dashboard + data entry  
**Week 6–7:** KB integration + food database (basic)  
**Week 8–10:** Trends/charts + settings + mobile responsive  
**Week 11–12:** Testing + bug fixes + deployment  

---

## 🔄 NEXT PHASE

1. **Wireframe Review** (THIS STEP)
   - Approve layout & flow
   - Approve component placement
   - Approve multi-language display
   - Request changes if needed

2. **Backend API Spec**
   - Document all REST endpoints
   - Request/response schemas
   - Error handling

3. **Claude Code Brief**
   - Wireframes → Code instructions
   - Component templates
   - Database schema (SQL)

4. **Code Phase Begins**
   - Frontend implementation
   - Backend implementation
   - Integration testing

---

_Reference snapshot for team communication. Updates require explicit approval._

