# Scope Visualization — Single User vs. Family Platform
**2026-03-01**

---

## 📊 Drei Mögliche Szenarien

```
SCENARIO A: Single-User MVP (Helmut nur)
═══════════════════════════════════════════
App:
  └─ User: Helmut
      ├─ Data Entry: Glucose, BP, Weight, Ketones, UA, Cholesterin
      ├─ Journal: Essensgewohnheiten, Schlafgewohnheiten
      ├─ Dashboard: Personal Metrics + Trends
      └─ AI Tips: Personalized Suggestions (weekly)

Timeline: 6–8 Wochen
Complexity: Low
Peter's Role: Optional Beta Tester (later, phase 2)
Family: Not supported


SCENARIO B: Multi-User (Helmut + Peter + mögliche Familie)
═══════════════════════════════════════════════════════════
App:
  ├─ User: Helmut
  │   ├─ Profile + Data
  │   ├─ Personal Dashboard
  │   └─ Personal AI Tips
  │
  ├─ User: Peter
  │   ├─ Profile + Data (separate)
  │   ├─ Personal Dashboard
  │   └─ Personal AI Tips
  │
  └─ User: Ehepartner (später)
      ├─ Profile + Data
      ├─ Personal Dashboard
      └─ Personal AI Tips

Timeline: 10–12 Wochen
Complexity: Medium (Auth, User Mgmt)
Peter's Role: Co-User, separate tracking
Family: Each person tracked separately, no shared data


SCENARIO C: Family Platform (Helmut + Peter + Familie mit Shared Features)
══════════════════════════════════════════════════════════════════════════
App:
  ├─ Family: "Swick Family" (Owner: Helmut)
  │   ├─ Members:
  │   │   ├─ Helmut (Owner)
  │   │   ├─ Peter (Viewer/Editor)
  │   │   ├─ Partner (Viewer)
  │   │   └─ Child (Viewer)
  │   │
  │   ├─ Shared Features:
  │   │   ├─ Family Dashboard (see everyone's key metrics)
  │   │   ├─ Family Group (shared challenges, goals)
  │   │   └─ Shared Insights (trends across family)
  │   │
  │   └─ Personal Spaces:
  │       ├─ Helmut's Dashboard + AI Tips
  │       ├─ Peter's Dashboard + AI Tips
  │       ├─ Partner's Dashboard + AI Tips
  │       └─ Child's Dashboard + AI Tips

Timeline: 14–18 Wochen
Complexity: High (Multi-tenant, Permissions, Sharing)
Peter's Role: Co-User, can see family trends
Family: Collective health tracking + individual optimization
```

---

## 🎯 Die Große Frage: Welches Szenario?

```
                      │
                      │  Flexibility
                      │  & Features
                      │
   SCENARIO C:        ├────────────────────── Family Platform
   Family Platform    │  ★★★★★ Complex
                      │  Full sharing, groups, collective tracking
                      │
   SCENARIO B:        ├────────────────────── Multi-User
   Multi-User         │  ★★★★ Medium
                      │  Separate users, no shared data
                      │
   SCENARIO A:        ├────────────────────── Single User
   Single-User MVP    │  ★★ Simple
                      │  Just you + AI tips
                      │
                      └──────────────────────────→ Complexity & Time
                         6–8 weeks  10–12 weeks  14–18 weeks
```

---

## 📋 Anforderungs-Klarification: A–F

Antworte auf diese 6 Fragen, dann weiß ich genau, welches Szenario:

### **A. Multi-User: Helmut + Peter?**

```
A1) [ ] Nein, MVP ist nur für Helmut (Single-User)
    [ ] Ja, Helmut + Peter parallel (separate accounts)
    [ ] Ja, + Familie später (prepare for it)
```

---

### **B. Essensgewohnheiten — Wie detailliert?**

```
B1) Format?
    [ ] Einfach: "Tagesnotiz: carnivore + honey"
    [ ] Strukturiert: Frühstück [Zeit/Beschreibung], Mittag [...], Abend [...]
    [ ] Hybrid: Schnell-Notiz + optional detailliert

B2) Kalorien/Makros tracken?
    [ ] Nein, nur Beschreibung
    [ ] Ja, aber optional
    [ ] Ja, Pflicht
```

---

### **C. Schlafgewohnheiten — Was wichtig?**

```
C1) Erfasse:
    [ ] Nur Stunden (z.B. 7h)
    [ ] Stunden + Qualität (1–10 Score)
    [ ] Stunden + Qualität + Zeiten (Bedtime 20:00, Wake 05:00)
    [ ] Alles + Störungen (Durchschlafen? Aufgewacht?)
```

---

### **D. AI Tips — Welcher Typ & Häufigkeit?**

```
D1) Welche Tipps?
    [ ] Ernährung (z.B. "Reduce honey")
    [ ] Schlaf (z.B. "Early bed → better HbA1c")
    [ ] Generell (z.B. "Drink more water")
    [ ] Personalisierte Experimente (z.B. "Try: Carnivore 7 days")
    [ ] Alle

D2) Wie oft?
    [ ] Täglich (instant feedback nach Eingabe)
    [ ] Wöchentlich (Summary jeden Montag)
    [ ] Monatlich (Trends + Recommendations)
    [ ] On-Demand (User fragt nach)

D3) Nachhaltige/Langfristige Tipps?
    [ ] Ja, nur langfristig sinnvolle Änderungen
    [ ] Ja, aber auch Quick Wins
```

---

### **E. Shared Data (Familie)?**

```
E1) Wenn Helmut + Peter tracken: Was sehen sie?
    [ ] Jeder nur eigene Daten (privacy first)
    [ ] Jeder sieht auch Partner-Daten (comparison ok)
    [ ] Gemeinsames Family Dashboard (collective view)

E2) Privacy/Permissions?
    [ ] Alle können alles sehen (open)
    [ ] Owner (Helmut) kontrolliert Sichtbarkeit
    [ ] User können selbst entscheiden (granular permissions)
```

---

### **F. MVP Scope — Minimum?**

```
F1) Welches Szenario passt?
    [ ] A: Single-User (Helmut, Phase 1)
        Later: Peter als Tester (Phase 2)
    
    [ ] B: Multi-User (Helmut + Peter parallel, Phase 1)
        Family: Später vorbereiten
    
    [ ] C: Family Platform (full sharing, Phase 1)
        Helmut + Peter + Familie: Alles von Start
```

---

## 🚀 Was Ich Dann Mache

Sobald du A–F beantwortet hast:

1. **User Personas** erstellen
   - Helmut (Metabolic Health Expert)
   - Peter (Tester / Co-User?)
   - Familie (Partner, Kinder?)

2. **Use Cases** schreiben
   - "Helmut logs morning Fora 6 data"
   - "Peter reviews his weekly trends"
   - "Family sees collective health metrics" (optional)

3. **User Journeys** visualisieren
   - Step-by-step Workflows
   - Screen Flows (welche Screens, in welcher Reihenfolge)

4. **Wireframes/Mockups**
   - Data Entry Screen
   - Dashboard
   - AI Tips Display
   - (Family Dashboard if Scenario C)

5. **Requirements Catalog** (Spezifikation)
   - Must / Should / Nice-to-Have
   - User Stories (As a user, I want...)
   - Acceptance Criteria

6. **MVP Definition**
   - Scope
   - Timeline
   - Priority

---

## 💬 Parallel: Sollen wir Peter einbeziehen?

**Q:** Soll ich auch Peter interviewen (parallel zu dir)?

- [ ] Ja, jetzt schon (beide Perspektiven early)
- [ ] Nein, erst wenn Helmut-Requirements klar (später)
- [ ] Nein, Peter nur Tester (nicht Designer)

---

_Antworte auf A–F, dann geht es weiter! 🚀_

