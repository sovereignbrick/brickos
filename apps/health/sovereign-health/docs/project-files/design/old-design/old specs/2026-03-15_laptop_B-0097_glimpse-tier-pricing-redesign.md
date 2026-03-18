# Claude Code Prompt — B-0097: Glimpse Tier Reduction + Measurement Caps + Pricing Label Redesign

**Date:** 2026-03-15  
**Priority:** HIGH (RC blocker)  
**Scope:** Website (`saas/website`) + App (`core-frontend`) + Backend (`core-backend`)

---

## Overview

Three changes in one:
1. **Reduce Glimpse (free) tier limits** — too generous for a SaaS business
2. **Add measurement caps** to ALL tiers (new limit dimension)
3. **Redesign pricing feature labels** — German text is way too long, breaking column layouts

---

## PART 1: Feature Label Redesign (ALL tiers)

### Problem
German feature names like "Nahrungsergänzungsmittel-Überprüfungen/Monat" destroy the pricing grid layout. Columns overflow, text wraps 3-4 lines, looks broken.

### Solution: Short Label + Info Tooltip

Every feature line becomes:
```
✓ Short Label ⓘ          ← visible (≤25 chars)
     ↑                     ↑
  compact name         hover/tap shows full description
```

**Implementation:**
- Each feature item: `<span>{shortLabel}</span> <InfoIcon tooltip={description} />`
- InfoIcon: small `ⓘ` circle (12px, `text-gray-500`), shows tooltip on hover (desktop) or tap (mobile)
- Tooltip: max 120 chars, explains what the feature actually does
- Tooltip style: dark bg (`#1A1D26`), white text, rounded, `z-50`, positioned above/below depending on space
- Mobile: tap ⓘ to toggle tooltip, tap elsewhere to dismiss

### Complete Feature Label Map

Use these EXACT short labels and tooltips. All via i18n keys.

| Feature ID | EN Short | DE Short | EN Tooltip | DE Tooltip |
|---|---|---|---|---|
| `biomarkers` | Biomarkers | Biomarker | Track blood, body and lifestyle markers | Blut-, Körper- und Lifestyle-Marker verfolgen |
| `history` | History | Verlauf | How far back you can see your data | Wie weit zurück du deine Daten sehen kannst |
| `calculated` | Calculated values | Rechenwerte | Auto-calculated ratios like TG/HDL, ApoB/ApoA1 | Automatisch berechnete Werte wie TG/HDL, ApoB/ApoA1 |
| `templates` | Measurement templates | Messvorlagen | Save your routine measurement sets | Speichere deine Mess-Routinen |
| `medications` | Medications | Medikamente | Track medications and supplements | Medikamente und Supplemente verfolgen |
| `ai_chats` | AI Chats | AI-Chats | Monthly conversations with Dr. Alex | Monatliche Gespräche mit Dr. Alex |
| `trends` | Trend analysis | Trendanalysen | AI-powered trend detection across your data | KI-gestützte Trenderkennung in deinen Daten |
| `lab_explain` | Lab explanations | Labor-Analysen | Dr. Alex explains your lab results simply | Dr. Alex erklärt deine Laborwerte verständlich |
| `nutrition` | Nutrition advice | Ernährungs-Tipps | Personalized nutrition recommendations | Personalisierte Ernährungsempfehlungen |
| `supplement` | Supplement checks | Supplement-Checks | Evaluate if your supplements help your markers | Prüft ob deine Supplemente deinen Markern helfen |
| `csv_export` | CSV/JSON Export | CSV/JSON-Export | Download your data in open formats | Lade deine Daten in offenen Formaten herunter |
| `thresholds` | Custom thresholds | Schwellenwerte | Set personal alert thresholds per marker | Persönliche Grenzwerte pro Marker setzen |
| `body_comp` | Body composition | Körperanalyse | Track body fat, muscle mass, water | Körperfett, Muskelmasse, Wasser verfolgen |
| `twofa` | 2FA Security | 2FA-Sicherheit | Two-factor authentication for your account | Zwei-Faktor-Authentifizierung für dein Konto |
| `measurements` | Measurements | Messungen | Total measurements you can store | Gesamtanzahl speicherbarer Messungen |
| `ai_dashboard` | AI Dashboard Insights | AI-Dashboard | AI-generated insights on your dashboard | KI-generierte Erkenntnisse auf dem Dashboard |
| `pdf_reports` | PDF Health Reports | PDF-Berichte | Downloadable health summary reports | Herunterladbare Gesundheitsberichte |
| `lab_import` | Lab import | Labor-Import | Import lab results from PDF or photo | Laborergebnisse aus PDF oder Foto importieren |
| `med_import` | Medication import | Medikamenten-Import | Import medication lists automatically | Medikamentenlisten automatisch importieren |
| `protocols` | Protocol comparison | Protokollvergleich | Compare different diet/training phases | Verschiedene Ernährungs-/Trainingsphasen vergleichen |
| `cohort` | Cohort comparison | Kohortenvergleich | Compare your data with anonymous cohorts | Vergleiche deine Daten mit anonymen Kohorten |
| `api_access` | API Access | API-Zugang | Programmatic access to your data | Programmatischer Zugriff auf deine Daten |
| `self_hosted` | Self-hosted option | Self-Hosting | Run Sovereign Health on your own server | Sovereign Health auf eigenem Server betreiben |
| `onboarding` | Personal onboarding | Persönliches Onboarding | 1:1 setup session with our team | 1:1 Einrichtung mit unserem Team |
| `priority` | Priority support | Prioritäts-Support | Fast-track support response | Bevorzugte Support-Antwort |
| `weekly_pdf` | Weekly PDF reports | Wöchentliche Berichte | Automated weekly health summaries | Automatische wöchentliche Gesundheitsberichte |
| `unlimited_import` | Unlimited imports | Unbegrenzte Importe | No limits on lab/med imports | Keine Limits bei Labor-/Medikamenten-Importen |

### i18n Key Structure

```json
// EN
{
  "pricing.feature.biomarkers.label": "Biomarkers",
  "pricing.feature.biomarkers.tooltip": "Track blood, body and lifestyle markers",
  "pricing.feature.history.label": "History",
  "pricing.feature.history.tooltip": "How far back you can see your data",
  // ... for every feature
}

// DE
{
  "pricing.feature.biomarkers.label": "Biomarker",
  "pricing.feature.biomarkers.tooltip": "Blut-, Körper- und Lifestyle-Marker verfolgen",
  "pricing.feature.history.label": "Verlauf",
  "pricing.feature.history.tooltip": "Wie weit zurück du deine Daten sehen kannst",
  // ... for every feature
}
```

### Pricing Feature Component

Create a reusable component:

```tsx
// PricingFeature.tsx
interface PricingFeatureProps {
  featureId: string;
  value: string;        // "5-8", "30 Tage", "Unbegrenzt", "100", etc.
  included: boolean;    // ✓ or ✗
  comingSoon?: boolean; // "Bald" badge
}

function PricingFeature({ featureId, value, included, comingSoon }: PricingFeatureProps) {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <li className="flex items-center gap-2 text-sm py-1.5">
      {included ? (
        <CheckIcon className="w-4 h-4 text-green-400 flex-shrink-0" />
      ) : (
        <XIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
      )}
      <span className={included ? "text-gray-200" : "text-gray-500"}>
        {value && <span className="text-white font-medium">{value} </span>}
        {t(`pricing.feature.${featureId}.label`)}
      </span>
      {comingSoon && (
        <span className="text-[10px] bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 rounded">
          {t('pricing.comingSoon')}
        </span>
      )}
      <button
        className="ml-auto text-gray-500 hover:text-gray-300 flex-shrink-0"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label={t(`pricing.feature.${featureId}.tooltip`)}
      >
        <InfoIcon className="w-3.5 h-3.5" />
      </button>
      {showTooltip && (
        <Tooltip>{t(`pricing.feature.${featureId}.tooltip`)}</Tooltip>
      )}
    </li>
  );
}
```

---

## PART 2: New Tier Limits

### Glimpse (Free) — REDUCED
| Feature | Old | New |
|---|---|---|
| Biomarkers | 15 | 8 |
| History | 90 days | 30 days |
| Calculated values | 3 | 1 |
| Measurement templates | 1 | 1 (unchanged) |
| Medications | 5 | 2 |
| AI Chats | 3/mo | 1/mo |
| Trend analysis | 1/mo | 0 (upgrade teaser) |
| Lab explanations | 1/mo | 0 (upgrade teaser) |
| Nutrition advice | — | 0 (upgrade teaser) |
| Supplement checks | — | 0 (upgrade teaser) |
| **Measurements** | **unlimited** | **100** |

### Focus (€9.99/mo) — ADD measurement cap
| Feature | Value |
|---|---|
| All Glimpse features | ✓ |
| Biomarkers | All (85+) |
| History | Unlimited |
| Calculated values | 8+ |
| Measurement templates | 3 |
| Medications | 10 |
| CSV/JSON Export | ✓ |
| Custom thresholds | ✓ |
| Body composition | ✓ |
| 2FA Security | ✓ |
| **Measurements** | **250** |

### Insight (€24.99/mo) — unchanged except measurements
| Feature | Value |
|---|---|
| All Focus features | ✓ |
| AI Dashboard Insights | ✓ (Coming Soon) |
| PDF Health Reports | 1/mo (Coming Soon) |
| Lab import | 3/mo (Coming Soon) |
| Medication import | 1/mo (Coming Soon) |
| AI Chats | 30/mo |
| Trend analysis | 10/mo |
| Lab explanations | 10/mo |
| Nutrition advice | 10/mo |
| Supplement checks | 10/mo |
| Protocol comparison | 5/mo (Coming Soon) |
| **Measurements** | **Unlimited** |

### Clarity (€49.99/mo) — unchanged except measurements
| Feature | Value |
|---|---|
| All Insight features | ✓ |
| Cohort comparison | ✓ (Coming Soon) |
| PDF Health Reports | 2/mo (Coming Soon) |
| Lab import | 4/mo (Coming Soon) |
| Medication import | 2/mo (Coming Soon) |
| Unlimited AI Chats | ✓ |
| Unlimited Trend analysis | ✓ |
| Unlimited Lab explanations | ✓ |
| Unlimited Nutrition advice | ✓ |
| Unlimited Supplement checks | ✓ |
| Unlimited Protocol comparison | ✓ |
| **Measurements** | **Unlimited** |

### Horizon (Custom) — unchanged
| Feature | Value |
|---|---|
| All Clarity features | ✓ |
| API Access | ✓ (Coming Soon) |
| Self-hosted option | ✓ (Coming Soon) |
| Personal onboarding | ✓ |
| Priority support | ✓ |
| Weekly PDF reports | ✓ (Coming Soon) |
| Unlimited imports | ✓ (Coming Soon) |
| **Measurements** | **Unlimited** |

---

## PART 3: Pricing Grid Display Format

### Feature value display rules
| Scenario | Display | Example |
|---|---|---|
| Numeric limit | `{number} {label}` | `8 Biomarker` |
| Unlimited | `Unbegrenzt` / `Unlimited` (no number) | `✓ Unbegrenzte AI-Chats` |
| Per month | `{number}/Mo.` (DE) / `{number}/mo` (EN) | `30/Mo. AI-Chats` |
| Not included | Gray text + ✗ icon | `✗ Trendanalysen` |
| Upgrade teaser (Glimpse) | Gray + lock icon + "Ab Focus" tooltip | `🔒 Trendanalysen` |
| Coming Soon | Normal + `Bald` / `Soon` badge | `✓ PDF-Berichte Bald` |
| Time period | `{number} Tage` / `{number} days` | `30 Tage Verlauf` |
| Boolean | Just checkmark + label | `✓ 2FA-Sicherheit` |

### Glimpse "Upgrade teaser" pattern
For features Glimpse doesn't have (trends, lab explanations, nutrition, supplements):
- Show the feature name in gray/dimmed
- Lock icon (🔒) instead of checkmark
- On hover/tap: tooltip says "Verfügbar ab Focus" / "Available from Focus"
- This shows the user what they're missing → drives upgrades

### Column width fix
With short labels, columns should be roughly equal width. Set:
```css
.pricing-card {
  min-width: 220px;
  max-width: 280px;
}
.pricing-feature-list {
  font-size: 0.875rem;  /* 14px */
  line-height: 1.5;
}
```

---

## PART 4: Measurement Cap — Backend Implementation

### Database changes

Add to `tier_limits` table (or wherever tier config is stored):

```sql
-- Add measurement_cap column
ALTER TABLE tier_limits ADD COLUMN measurement_cap INTEGER;

-- Set values
UPDATE tier_limits SET measurement_cap = 100 WHERE tier = 'glimpse';
UPDATE tier_limits SET measurement_cap = 250 WHERE tier = 'focus';
UPDATE tier_limits SET measurement_cap = NULL WHERE tier IN ('insight', 'clarity', 'horizon');
-- NULL = unlimited
```

Also update the Glimpse limits that are changing:

```sql
UPDATE tier_limits SET
  marker_limit = 8,
  history_days = 30,
  calculated_markers = 1,
  medications = 2,
  ai_chats_monthly = 1,
  trend_analysis_monthly = 0,
  lab_explanations_monthly = 0
WHERE tier = 'glimpse';
```

### Backend enforcement

In the measurement creation endpoint (`POST /measurements` or equivalent):

```rust
// Before inserting a new measurement:
let cap = user_tier.measurement_cap; // Option<i32>, None = unlimited
if let Some(cap) = cap {
    let current_count = get_user_measurement_count(user_id).await?;
    if current_count >= cap as i64 {
        return Err(ApiError::MeasurementCapReached {
            current: current_count,
            limit: cap,
            tier: user_tier.name.clone(),
        });
    }
}
```

Return HTTP 403 with a structured error:
```json
{
  "error": "measurement_cap_reached",
  "message": "You've reached your measurement limit (100). Upgrade to Focus for 250 measurements.",
  "current": 100,
  "limit": 100,
  "tier": "glimpse",
  "upgrade_tier": "focus"
}
```

### API: Usage endpoint

Add or extend `GET /user/usage` to return:

```json
{
  "measurements": { "used": 42, "limit": 100, "unlimited": false },
  "ai_chats": { "used": 0, "limit": 1, "unlimited": false },
  "trend_analysis": { "used": 0, "limit": 0, "unlimited": false },
  "lab_explanations": { "used": 0, "limit": 0, "unlimited": false }
}
```

Frontend calls this to display usage indicators.

---

## PART 5: Frontend — Usage Indicator (Dashboard)

### Dashboard widget: "Your Usage"

Show on the main dashboard, compact:

```
┌─────────────────────────────────┐
│  📊 Dein Verbrauch              │
│                                 │
│  Messungen    ████████░░  42/100│
│  AI-Chats     █░░░░░░░░░   1/1 │
│                                 │
│  [Upgrade →]                    │
└─────────────────────────────────┘
```

- Progress bar per tracked limit
- Colors: green <60%, yellow 60-80%, red >80%
- At 80%: show yellow warning text ("Bald am Limit" / "Approaching limit")
- At 100%: red bar + CTA button → pricing page
- Only show features with numeric caps (skip "unlimited")
- i18n all labels

### Measurement form: cap reached state

When cap is reached and user tries to add a measurement:
- Input form is disabled/dimmed
- Banner at top: "Du hast dein Messlimit erreicht (100/100). Upgrade auf Focus für 250 Messungen."
- CTA button: "Jetzt upgraden" / "Upgrade now" → links to pricing page

---

## PART 6: Update Documentation

Update these files with the new tier limits:

1. **`LICENSING_STRATEGY.md`** — update Glimpse limits table + add measurement caps for all tiers
2. **`COMPREHENSIVE_DESIGN_SPEC_v6.md`** — if it has tier limit references
3. **Backend seed/migration** — ensure DB reflects new limits

---

## PART 7: Build & Deploy

```bash
# Backend
cd ~/projects/sovereign-health/core-backend
docker build -t registry.gitlab.com/sovereign-health/core-backend:latest .
docker save registry.gitlab.com/sovereign-health/core-backend:latest | ssh root@72.61.154.115 "docker load"

# Frontend (app)
cd ~/projects/sovereign-health/core-frontend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.sovereignhealth.io -t registry.gitlab.com/sovereign-health/core-frontend:latest .
docker save registry.gitlab.com/sovereign-health/core-frontend:latest | ssh root@72.61.154.115 "docker load"

# Website
cd ~/projects/sovereign-health/saas/website
rm -rf .next out
pnpm build
rsync -avz --delete out/ root@72.61.154.115:/opt/sovereign-health/homepage/

# Deploy
ssh root@72.61.154.115 "cd /opt/sovereign-health && docker compose -f docker-compose.prod.yml up -d --force-recreate backend frontend && docker image prune -f"
```

Purge Cloudflare cache.

---

## Testing Checklist

### Pricing page (website + app)
- [ ] All tiers: feature labels ≤25 chars, no overflow/wrapping issues
- [ ] All ⓘ tooltips show on hover (desktop) and tap (mobile)
- [ ] Glimpse shows reduced limits (8 biomarker, 30 days, 1 AI chat, etc.)
- [ ] Glimpse shows locked features with 🔒 (trends, lab explanations, nutrition, supplements)
- [ ] All tiers show measurement cap line (100 / 250 / Unbegrenzt)
- [ ] "Bald" badges on Coming Soon features
- [ ] DE and EN both render cleanly (switch language, check both)
- [ ] Mobile: columns stack properly, tooltips work on tap

### Dashboard usage widget
- [ ] Shows measurement progress bar with correct count
- [ ] Shows AI chat usage
- [ ] Colors change at 60% / 80% thresholds
- [ ] At 100%: red bar + upgrade CTA appears
- [ ] Widget hidden for Insight+ (everything unlimited)

### Backend enforcement
- [ ] Glimpse user: can add up to 100 measurements, 101st returns 403
- [ ] Focus user: can add up to 250 measurements
- [ ] Insight user: no measurement cap enforced
- [ ] Glimpse user: AI chat limited to 1/mo, 2nd returns appropriate error
- [ ] Glimpse user: trend analysis returns 0 limit / upgrade teaser
- [ ] `/user/usage` endpoint returns correct counts and limits

### i18n
- [ ] `check-i18n.sh` passes clean
- [ ] All tooltip text translated (DE + EN)
- [ ] "Bald" / "Soon" badge translated
- [ ] "Unbegrenzt" / "Unlimited" translated
- [ ] Usage widget labels translated
