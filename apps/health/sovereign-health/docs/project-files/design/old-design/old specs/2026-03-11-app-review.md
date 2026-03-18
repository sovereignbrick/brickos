# App Review Log — 2026-03-11

## Group A: Diet Protocol & Lifestyle System (spec needed first)
*These are interconnected — the diet model feeds into thresholds, measurements, Doctor Chat, and education.*

| # | Page | Issue | Type |
|---|------|-------|------|
| 1 | `/measurements/new` | Rework diet protocol + eating pattern as **two independent axes** (what you eat vs. when you eat). Group diets by category. | Feature |
| 5c | `/settings` → Profile (lifestyle) | Update extended lifestyle section to reflect new two-axis model | Feature |
| 8a | `/settings` → Thresholds | "Apply recommended thresholds" bar — only show when user actually changes diet protocol, not as persistent banner | UX |
| 3b | `/doctor-chat` (2.0) | Add dietary protocol context to image imports | 2.0 |
| 14 | `/markers/glucose` (chart) | Replace single "Standard range" checkbox with two: "Standard range" + "Fasting range" | UX |

**→ Needs: spec for two-axis diet/eating-pattern model before implementation.**

---

## Group B: License & Billing System (critical bugs)
*All related to tier sync, Stripe integration, and feature gating.*

| # | Page | Issue | Type |
|---|------|-------|------|
| 5b | `/settings` → Profile | License shows "Glimpse" but Billing shows "Horizon (Free)" — mismatch | Bug |
| 18 | `/doctor-chat` + License | Horizon user sees "0 of 3 questions" + Upgrade prompt. Tier not syncing with features. Fix full Stripe flow. | Bug (critical) |
| 21c | `/admin` → Users | Admin ability to manually assign/remove license tiers (with override flag so Stripe doesn't overwrite) | Feature |
| 22 | Admin + Stripe + Website | Promo/coupon code system: Stripe as engine, website + app + admin as surfaces. URL param support (e.g., `?promo=BTCPRAGUE50`) | Feature |
| 23b | Website → Pricing | Pricing mismatch: website shows Focus €9.99, Insight €14.99, Clarity €22.99 vs. spec (€9.99, €24.99, €49.99) — verify and sync | Bug |

**→ Priority: #18 and #5b are blocking for any real user testing.**

---

## Group C: Upload & Doctor Chat Functionality
*File upload issues across the app.*

| # | Page | Issue | Type |
|---|------|-------|------|
| 4 | `/doctor-chat` → Upload Lab PDF + Track Medication | **CONFIRMED BUG (post-deploy):** "Scan Lab Result" works fine. "Upload Lab PDF" and "Track Medication" return errors. NOT quota-related (Horizon user, quota fixed). Different code path or handler issue — needs debug. | Bug |
| 4 (feat) | `/doctor-chat` | Support up to 3 files per upload (front, back, medical notes). Add time (not just date) to quota reset display. | Feature |
| 3 | `/doctor-chat` (image import) | Add context fields: Device (existing/new), fasting state, free notes (reuse from measurements) | Feature |
| 23c | Website → Early Access | "Notify Me" throws NetworkError — same class of error | Bug |

**→ Start by diagnosing the upload/API error (quota? firewall? backend config?).**

---

## Group D: Charts & Data Visualization
*Chart rendering and readability.*

| # | Page | Issue | Type |
|---|------|-------|------|
| 2 | `/trends` (charts) | Legend overlaps chart, y-axis cramped, "fasting" annotation overlap, bottom-left rendering bug ("100000002 mmol/L") | Bug/UX |
| 14 | `/markers/glucose` (chart) | Standard range checkbox unclear (also in Group A) | UX |

---

## Group E: UX Polish & Layout (app-wide)
*Cross-cutting UI improvements.*

| # | Page | Issue | Type |
|---|------|-------|------|
| 5a | `/settings` → Profile | 3-column grid layout — apply across all settings tabs | UX |
| 5d | All forms | Mouseover tooltips on every field label explaining what it is and why it matters | UX |
| 5e | `/settings` → Profile | Remove "Save Profile" button → inline/auto-save (match other tabs) | UX |
| 8b | `/settings` → Thresholds | Unit dropdown height doesn't match other input fields | Bug/UX |
| 8c | `/settings` → Thresholds | Some markers missing descriptions — ensure all have text | Content |
| 8d | `/settings` → Thresholds | Table has too much empty space — better column distribution | UX |
| 8e | `/settings` → Thresholds | Collapsible icons too small + add "Collapse All / Expand All" | UX |
| 9c | `/settings?tab=privacy` → Reports | Redesign export buttons as styled tiles (name, description, colored button like website pricing) | Design |
| 10a | `/settings?tab=security` | 2FA — add more explanatory text about why it protects health data | Content |
| 10b | `/settings?tab=security` | "Active Sessions" tile — unclear purpose, needs content or "Coming Soon" label | UX |
| 11 | `/dashboard` | Remove "Want early access?" section below demo profile tiles | UX |
| 12 | `/zones/*` | Device tags → link to device detail in settings. Apply to all tags everywhere. | Feature |
| 15 | Post-login | Welcome banner overlays profile icon — shorten or reposition below header | Bug/UX |
| 16 | `/markers/glucose` → Foods | Rework: group by food category, mouseover explanations, match Supplements style | Content/UX |
| 9a | `/settings?tab=privacy` | Anonymous data sharing default to active; more benefit text; no em-dashes | UX/Content |
| 9b | `/settings?tab=privacy` | PDF report button just blinks — broken (may be license restriction, needs error msg) | Bug |

---

## Group F: Mobile & Cross-Browser
*Mobile-specific issues and QA.*

| # | Page | Issue | Type |
|---|------|-------|------|
| 19a | Mobile — Header | Only "SH" shown — show full name "Sovereign Health" | Bug/UX |
| 19b | Mobile — Navigation | Menu at bottom is confusing — move to top | UX |
| 19c + 17 | Mobile — `/markers/*` + all swipe tiles | Swipe gestures broken on mobile | Bug |
| 19d | Mobile — Spacing | ✅ Looks good — no changes | N/A |
| 19e | Mobile — Thresholds | Large table unreadable — freeze first column | UX |
| 20 | QA | Test all pages on **Firefox iOS** (WebKit engine) | QA |
| 32 | Mobile — Navigation | **Bug (post-deploy):** Mobile nav items (Overview, History, Doctor Chat, Trends) float as transparent text over page content instead of proper dropdown/overlay. Menu text overlaps welcome card and demo profiles. Completely unreadable. Hamburger menu from Group F broken. | Bug |

---

## Group G: In-App Pricing Page (remove/redirect)
*Architecture decision to simplify.*

| # | Page | Issue | Type |
|---|------|-------|------|
| 6a | `/pricing` (in-app) | Remove page — handle all plan selection at `sovereignhealth.io/pricing` | Architecture |
| 6b–c | `/pricing` (in-app) | Compare plans + FAQ too spacious (moot if removed) | UX |
| 6d | `/pricing` (in-app) | Self-host link should point to `gitlab.com/sovereign-health` | Bug |
| 6e | `/pricing` (in-app) | Footer doesn't match website footer | UX |

---

## Group H: Website Content & Design

| # | Page | Issue | Type |
|---|------|-------|------|
| 23a | Website → Pricing | Focus tier blue highlight — add "Best Value" or "Most Popular" badge | UX |
| 24 | Website → Features | "Coming Soon" on Smart Import but features exist — update with real roadmap items (needs discussion) | Content |
| 25a | Website → `/pricing/` table | Freeze top row + left column for scrolling | UX |
| 25b | Website → `/pricing/` table | Tooltip on each feature (2–3 sentences explaining value) | Content/UX |
| 25c | Website → `/pricing/` bottom | Make tiles more colorful, match tier colors | Design |
| 26a | Website → `/open-source/` | More promotional text: data sovereignty, decentralization, self-hosting benefits | Content |
| 26b | Website → `/open-source/` table | Add SaaS-exclusive features to comparison (upsell path) | Content |
| 26c | Website → `/open-source/` table | Alternate row styling (zebra stripes) | Design |

---

## Group I: Admin Panel

| # | Page | Issue | Type |
|---|------|-------|------|
| 21a | `/admin` → Early Access tab | Bug: throws error page | Bug |
| 21b | `/admin` → Dashboard | Expand with privacy-safe metrics: Stripe revenue/MRR, Mailgun stats, API health, DAU/WAU/MAU, measurement counts, protocol distribution, device distribution, onboarding funnel, alerts | Feature |
| 21c | `/admin` → Users | Manual license assign/remove (with Stripe override flag) — also in Group B | Feature |
| 22 | Admin → Promotions | Promo code management tab — also in Group B | Feature |

---

## Group J: Auth & Session

| # | Page | Issue | Type |
|---|------|-------|------|
| 7 | Auth / Login | Double the session timeout | Config |

---

## Group K: i18n (Internationalization)

| # | Page | Issue | Type |
|---|------|-------|------|
| 13 | All pages | Language change in settings doesn't switch UI. Move language selector to app + website header for all users (visitors, demo, SEO). | Bug/Feature |

---

---

## Group L: New Feature Requests (Coming Soon / Roadmap)

| # | Feature | Description | Type |
|---|---------|-------------|------|
| 27 | Symptom tracking | Add symptoms to each measurement entry (e.g., cramp, headache, pain location, fatigue, brain fog, dizziness). Correlate with biomarker trends over time. | Feature |
| 28 | Food photo AI analysis | Take a photo of your meal → Dr. Alex analyzes if it fits your protocol and how it may affect blood work (e.g., "high fructose — may spike UA and TG for your profile") | Feature (2.0) |
| 29 | **Dr. Alex website chatbot** | Deploy Dr. Alex as a public chatbot on `sovereignhealth.io` — answers product questions, explains markers/zones, licensing, OSS implementation. **PRIORITY for today.** | Feature (🔴 today) |
| 30 | Allergy tracking | Record allergies (hay fever, nut allergy, lactose intolerance, etc.) in user profile. Correlate with blood work patterns (e.g., hs-CRP / eosinophils / IgE spikes during allergy season). Flag potential interactions with diet protocol. | Feature |
| 35 | Medication management | Multi-file upload works but "Upload & Analyze" returns NetworkError. Need: (1) fix the analyze endpoint, (2) new Settings tab "Medications" showing user's tracked medications with details, (3) Doctor Chat must include medication data in context for advising, (4) medication data translatable (EN/DE), (5) new admin Content tab "Medications" for managing medication reference data. | Bug + Feature |
| 36 | Admin AI token cost tracking | Aggregated view per user/subscription showing AI token usage and cost. Show: user email, tier, total tokens (input+output), estimated cost, per-model breakdown, time period filter (day/week/month). | Feature |
| 34 | Stripe live mode + registration testing | **TODO:** Stripe is in sandbox/test mode (sk_test_). Need to: (1) test full registration flow end-to-end, (2) test payment processing for each tier, (3) switch to Stripe live keys when ready, (4) verify webhook works with live events, (5) enable REGISTRATION_ENABLED=true on prod. | Testing/Config |
| 33 | Mailgun integration | **Deferred:** Mailgun API key not configured. Email sending (welcome, password reset, health reports, early access notifications) errors silently. Configure Mailgun API key + domain when ready. | Config/Integration |
| 31 | Anti-nutrients database & warnings | Track anti-nutrients (oxalates, phytates, lectins, tannins, goitrogens, saponins) per food. Show absorption blockers alongside nutrient content. E.g., "Spinach: high iron BUT high oxalate → iron absorption reduced by ~80%". Integrate into Foods to Boost section (#16) and potentially a standalone "Food Intelligence" feature. Protocol-aware: carnivore users see why animal-sourced iron (heme) has no absorption blockers vs. plant iron (non-heme). | Feature |

---

## Suggested execution order

1. **Group B** (License/Billing) — critical, blocks real user testing
2. **Group C** (Upload bugs) — diagnose API errors
3. **Group A** (Diet model) — needs spec first, then implement
4. **Group G** (Remove in-app pricing) — quick architectural win
5. **Group D** (Charts) — visual bugs
6. **Group E** (UX polish) — batch of improvements
7. **Group F** (Mobile) — dedicated mobile pass
8. **Group H** (Website content) — content + design updates
9. **Group I** (Admin panel) — feature expansion
10. **Group J** (Auth) — config change
11. **Group K** (i18n) — language system rework
