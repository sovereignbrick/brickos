# Claude Code Prompt — Doctor Chat Redesign + Website Fixes (2026-03-15)

## PART A: Website Source Fixes (do first, quick)

### A1. Fix localhost URLs in website source
```bash
cd ~/projects/sovereign-health/saas/website
grep -rn "localhost" src/ --include="*.tsx" --include="*.ts" --include="*.json"
```
Replace ALL `localhost:3000` and `http://localhost:3000` with `https://app.sovereignhealth.io` in the website source. This is the production app URL — never reference localhost in production builds.

### A2. Fix favicon in website
Ensure the website has proper favicon references in the root layout/head. The app (`core-frontend`) has favicons — make sure the website (`saas/website`) also includes them in `public/` and references them in `<head>`.

### A3. Rebuild & deploy website
```bash
cd ~/projects/sovereign-health/saas/website
rm -rf .next out
pnpm build
rsync -avz --delete out/ root@72.61.154.115:/opt/sovereign-health/homepage/
```
Then purge Cloudflare cache.

---

## PART B: Doctor Chat Redesign — "Unified Chat Canvas"

This is a major UI refactor of `/doctor-chat` in `core-frontend`.

### The Problem
The current Doctor Chat has a tile-overview page showing feature cards. Clicking a tile opens a separate prompt window. Users jump back and forth between overview and chat. The sidebar (new chat + history) is misaligned with the app header. It looks cluttered and dated.

### The Solution: Single-Window Chat with Smart Empty State

**Design philosophy:** Think ChatGPT / Claude empty state. When there's no active conversation, the chat canvas shows a greeting + categorized prompt suggestions. Click one → you're chatting. No page jumps. No feature tiles. One window.

### Layout (3-Zone)

```
┌─────────────────────────────────────────────────────────┐
│  [App Nav Bar — unchanged]                              │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ History  │         Chat Canvas                          │
│ Sidebar  │                                              │
│ (collap- │  (empty state OR active conversation)        │
│  sible)  │                                              │
│          │                                              │
│          ├──────────────────────────────────────────────┤
│          │  [Input bar — always visible at bottom]      │
└──────────┴──────────────────────────────────────────────┘
```

### Sidebar (Left — Chat History)
- Width: 280px desktop, hidden drawer on mobile (slide-in with backdrop)
- MUST be aligned properly under the nav bar (flush with app logo boundary — this was broken before)
- Top: `+ Neues Gespräch` button (full width, primary color)
- Below: Simple chat list (title truncated, relative date)
- REMOVE the filter chips (Alle/Allgemein/Trends/etc.) — too cluttered
- Add expandable search icon at top instead
- Mobile: hamburger/history icon (🕒) in chat header toggles the drawer

### Chat Canvas — State A: Empty (no conversation)

```
         🩺 Dr. Alex
         "Wie kann ich dir heute helfen?"

         ┌─ COLUMN 1 ───┐  ┌─ COLUMN 2 ───┐
         │ 🩺 prompt 1   │  │ 📈 prompt 4   │
         │ ⚠️ prompt 2   │  │ 📊 prompt 5   │
         │ 🎯 prompt 3   │  │ ⚖️ prompt 6   │
         └───────────────┘  └───────────────┘

         ── SMART IMPORT ──────────────────
         │ 📸 Scan  │ 📄 PDF  │ 💊 Meds  │

         [═══ Input bar ═══════════════════]
```

Centered vertically when content fits. Scrollable if not.

### Chat Canvas — State B: Active conversation
Standard chat bubbles (Dr. Alex left-aligned, user right-aligned). Clean, spacious, markdown-rendered. Same input bar at bottom.

### Prompt Suggestions Config

Create a config/constant array. Each prompt has: `id`, `icon`, `textKey` (i18n key), `tooltipKey` (i18n key), `minTier`, `category`, `zoneColor`.

**Categories & Prompts:**

#### DEINE GESUNDHEIT / YOUR HEALTH
| id | Icon | DE text | EN text | Tooltip DE | Tooltip EN | minTier | zoneColor |
|----|------|---------|---------|------------|------------|---------|-----------|
| health-overview | 🩺 | Gib mir einen Überblick über meinen aktuellen Gesundheitsstatus | Give me an overview of my current health status | Dr. Alex fasst alle deine aktuellen Gesundheitsdaten zusammen | Dr. Alex summarizes all your current health data | Glimpse | #3498DB |
| warning-signs | ⚠️ | Gibt es Warnsignale in meinen aktuellen Daten? | Are there any warning signs in my current data? | Prüft ob Marker außerhalb sicherer Bereiche liegen | Checks if markers are outside safe ranges | Glimpse | #E74C3C |
| focus-next | 🎯 | Worauf sollte ich mich als nächstes konzentrieren? | What should I focus on next? | Personalisierte Empfehlung basierend auf deinen Trends | Personalized recommendation based on your trends | Focus | #3B82F6 |

#### TRENDS & MUSTER / TRENDS & PATTERNS
| id | Icon | DE text | EN text | Tooltip DE | Tooltip EN | minTier | zoneColor |
|----|------|---------|---------|------------|------------|---------|-----------|
| glucose-trend | 📈 | Wie hat sich mein Blutzucker im letzten Monat verändert? | How has my blood sugar changed in the last month? | Zeigt Blutzucker-Trend mit Kontext (Ernährung, Schlaf, Training) | Shows blood sugar trend with context (diet, sleep, training) | Focus | #3498DB |
| lipid-trends | 📊 | Zeige mir meine Lipid-Trends (ApoB, LDL, HDL, Triglyzeride) | Show me my lipid trends (ApoB, LDL, HDL, Triglycerides) | Umfassende Lipid-Analyse mit Risikobewertung | Comprehensive lipid analysis with risk assessment | Focus | #E74C3C |
| weight-analysis | ⚖️ | Analysiere meinen Gewichtstrend und was ihn beeinflusst | Analyze my weight trend and what influences it | Gewichtstrend mit Korrelationen zu Ernährung und Training | Weight trend with correlations to diet and training | Focus | #F39C12 |

#### LABORERGEBNISSE / LAB RESULTS
| id | Icon | DE text | EN text | Tooltip DE | Tooltip EN | minTier | zoneColor |
|----|------|---------|---------|------------|------------|---------|-----------|
| explain-labs | 🔬 | Erkläre mir meine letzten Laborergebnisse in einfachen Worten | Explain my latest lab results in simple terms | Verständliche Erklärung aller Laborwerte | Easy-to-understand explanation of all lab values | Focus | #27AE60 |
| out-of-range | 🚦 | Welche meiner Marker sind außerhalb des Referenzbereichs? | Which of my markers are outside the reference range? | Zeigt auffällige Werte mit Ampel-Logik | Shows flagged values with traffic-light logic | Focus | #E74C3C |
| improve-labs | 💡 | Wie kann ich meine auffälligen Laborwerte verbessern? | How can I improve my abnormal lab values? | Konkrete Maßnahmen für auffällige Marker | Specific actions for flagged markers | Insight | #27AE60 |

#### ERNÄHRUNG & LIFESTYLE / NUTRITION & LIFESTYLE
| id | Icon | DE text | EN text | Tooltip DE | Tooltip EN | minTier | zoneColor |
|----|------|---------|---------|------------|------------|---------|-----------|
| nutrition-recs | 🍎 | Welche Ernährungsempfehlungen passen zu meinen Werten? | What nutrition recommendations fit my values? | Datenbasierte Ernährungstipps | Data-driven nutrition tips | Insight | #F39C12 |
| supplement-eval | 💊 | Bewerte meine Supplemente — helfen sie meinen Markern? | Evaluate my supplements — are they helping my markers? | Analysiert Supplement-Wirkung anhand deiner Daten | Analyzes supplement effectiveness from your data | Insight | #9B59B6 |
| compare-protocols | 🔄 | Vergleiche meine Protokolle — was funktioniert besser? | Compare my protocols — what works better? | Vergleicht verschiedene Ernährungs-/Trainingsphasen | Compares different nutrition/training phases | Clarity | #3B82F6 |

#### SMART IMPORT (action buttons, not prompts — horizontal row)
| id | Icon | DE label | EN label | minTier | Action |
|----|------|----------|----------|---------|--------|
| scan-labs | 📸 | Laborergebnisse scannen | Scan lab results | Focus | Opens camera/file picker for image |
| upload-pdf | 📄 | Labor-PDF hochladen | Upload lab PDF | Focus | Opens file picker for PDF |
| record-meds | 💊 | Medikamente erfassen | Record medications | Focus | Opens medication input flow |

### Prompt Chip Styling

```css
.prompt-chip {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 3px solid var(--zone-color);
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.prompt-chip:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.prompt-chip.locked {
  opacity: 0.45;
  cursor: default;
}
.prompt-chip.locked:hover {
  transform: none;
  box-shadow: none;
}
```

Icon: 20px left-aligned. Text: 14px, line-height 1.4. Lock icon (🔒) 12px top-right if locked.

### Quota Display
- Top-right of chat canvas: pill/badge `2 von 5 Fragen übrig`
- Colors: green ≥50% remaining, yellow 25-49%, red <25%
- When quota=0: prompt chips remain visible but clicking shows inline upgrade nudge (toast), NOT a separate page

### Input Bar
- Pinned to bottom of chat canvas area (not viewport — within the flex container)
- Left: paperclip icon (📎) for file attachment
- Center: text input, auto-grows up to 4 lines
- Right: Send button (primary blue, disabled when empty)
- Placeholder: i18n `doctorChat.inputPlaceholder`
- Mobile: full width, fixed to bottom of viewport

### Transition Behavior
1. User lands on `/doctor-chat` → **State A** (empty canvas with suggestions)
2. Click a prompt chip → text auto-sends → **State B** (chat starts)
3. During chat: suggestions gone, replaced by conversation bubbles
4. Click `+ Neues Gespräch` → back to **State A**
5. Click a past chat in sidebar → load that conversation in **State B**
6. Animations: fade 200ms between states. Prompt chips stagger-fade-in on load (50ms per chip).

### What to REMOVE
- ❌ Feature tiles/cards overview page (colored category tiles with descriptions)
- ❌ Separate "feature detail" windows/modals that open when clicking a tile
- ❌ Filter chips in sidebar (Alle/Allgemein/Trends/Labor/Ernährung/Supplemente/Protokolle)
- ❌ "LETZTE GESPRÄCHE" section duplicated in main canvas area (keep it in sidebar only)
- ❌ Large Dr. Alex icon/header with repeated description text

### What to KEEP
- ✅ Sidebar with chat history (but properly aligned, cleaned up)
- ✅ Quota display (simplified to pill badge)
- ✅ Smart Import actions (as compact action row, not tiles)
- ✅ Input bar with attachment support
- ✅ Dr. Alex persona and greeting
- ✅ All existing chat API integration (just the UI layer changes)

### Mobile Responsive (<640px)
1. Sidebar: hidden, toggle via 🕒 icon in chat header
2. Prompt grid: single column, full width
3. Smart Import: vertical stack or 2-column mini-grid
4. Dr. Alex header: smaller, no subtitle
5. Input bar: full width fixed to viewport bottom
6. Quota: below Dr. Alex name

### i18n — All Text Must Use Translation Keys

Add these keys to both DE and EN translation files:

```json
{
  "doctorChat.greeting": "Wie kann ich dir heute helfen?",
  "doctorChat.subtitle": "Klicke auf einen Vorschlag oder stelle eine eigene Frage",
  "doctorChat.section.health": "DEINE GESUNDHEIT",
  "doctorChat.section.trends": "TRENDS & MUSTER",
  "doctorChat.section.labs": "LABORERGEBNISSE",
  "doctorChat.section.nutrition": "ERNÄHRUNG & LIFESTYLE",
  "doctorChat.section.import": "SMART IMPORT",
  "doctorChat.quota": "{remaining} von {total} Fragen übrig",
  "doctorChat.inputPlaceholder": "Fragen Sie Dr. Alex zu Ihrer Gesundheit...",
  "doctorChat.send": "Senden",
  "doctorChat.newChat": "+ Neues Gespräch",
  "doctorChat.searchChats": "Gespräche suchen...",
  "doctorChat.locked.tooltip": "Verfügbar ab {tier}",
  "doctorChat.locked.upgrade": "Upgrade für diese Funktion",
  "doctorChat.noHistory": "Noch keine Gespräche"
}
```

Plus equivalent EN keys and all prompt text/tooltip keys from the tables above.

**Run `check-i18n.sh` before committing. Zero hardcoded strings.**

### App Colors (existing tokens — use these)
- Background: `#0F1117`
- Card bg: `#1A1D26`
- Card hover: `#22252F`
- Primary: `#3B82F6`
- Text: `#FFFFFF`
- Text secondary: `#9CA3AF`
- Section headers: `#6B7280` uppercase, letter-spacing 0.05em

### Testing Checklist
- [ ] Desktop Chrome: layout, hover effects, transitions, sidebar alignment
- [ ] Desktop Firefox: same
- [ ] Mobile Chrome (responsive): single column, drawer, bottom input bar
- [ ] Locked prompts show 🔒 + tooltip, upgrade toast on click
- [ ] Unlocked prompts send immediately and start chat
- [ ] `+ Neues Gespräch` returns to empty state
- [ ] Quota badge updates after each message
- [ ] i18n: switch language, verify all strings translate
- [ ] Smart Import buttons trigger correct file pickers
- [ ] `check-i18n.sh` passes clean
