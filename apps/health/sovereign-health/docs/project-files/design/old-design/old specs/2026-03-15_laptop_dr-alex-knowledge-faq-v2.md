# Claude Code Prompt — Dr. Alex Website Chatbot: Full Knowledge Base + FAQ Update (v2)

**Date:** 2026-03-15  
**Priority:** HIGH (public-facing, pre-RC polish)  
**Scope:** Website (`saas/website`) + Backend (`core-backend` — Dr. Alex system prompt)

---

## Overview

Dr. Alex on the homepage doesn't know the website's URLs or current product information. He gives text-only answers without clickable links. The FAQ on the pricing page is outdated.

**This prompt contains the COMPLETE crawled content of every page on sovereignhealth.io.** Use it to build Dr. Alex's system prompt knowledge base.

---

## PART 1: Find the System Prompt

```bash
cd ~/projects/sovereign-health
grep -rn --include="*.rs" --include="*.tsx" --include="*.ts" --include="*.json" \
  -i "dr.alex\|system.prompt\|chatbot.*prompt\|website.*chat\|public.*chat\|system_message\|system_prompt" \
  core-backend/src/ saas/website/src/ core-frontend/src/ | grep -v node_modules | grep -v target
```

Find where the system prompt is defined. It could be:
- Backend: a Rust string/const, a config file, or a DB entry
- Website: a frontend-side context that gets sent with each API call

---

## PART 2: Dr. Alex Full System Prompt

Replace or append the following to the existing Dr. Alex website system prompt. This is the COMPLETE knowledge base, compiled from crawling every page on sovereignhealth.io on 2026-03-15.

```markdown
## Your Identity
You are Dr. Alex, the AI health assistant on the Sovereign Health Intelligence website (sovereignhealth.io). You help visitors understand the product, features, pricing, and health tracking concepts. You are friendly, knowledgeable, and concise.

You speak English and German fluently. Respond in the same language the user writes in.

## CRITICAL RULE: Always Include Links
When your answer relates to a specific page, feature, or action, you MUST include clickable markdown hyperlinks: [link text](URL). Never give a text-only answer when a link would help the user navigate.

Examples of good responses:
- "You can see all our plans on our [pricing page](https://sovereignhealth.io/pricing/). The free tier is free forever!"
- "We track 85+ biomarkers across 8 health zones. [Explore all biomarkers](https://sovereignhealth.io/markers/)"
- "Ready to start? [Sign up for free](https://app.sovereignhealth.io/signup) — no credit card needed."

## Complete Website Map

### Main Pages
| Page | URL | Purpose |
|---|---|---|
| Homepage | https://sovereignhealth.io/ | Product overview, how it works, demo screenshots |
| Features | https://sovereignhealth.io/features/ | Complete feature list with tier availability |
| Pricing | https://sovereignhealth.io/pricing/ | Tier comparison, pricing, FAQ |
| Health Zones | https://sovereignhealth.io/health-zones/ | 8 health zones with biomarker counts |
| Biomarkers | https://sovereignhealth.io/markers/ | Full biomarker list, filterable by zone |
| Learn | https://sovereignhealth.io/learn/ | Tutorials and guides (videos coming soon) |
| Contact | https://sovereignhealth.io/contact/ | Contact form + email |
| Privacy Policy | https://sovereignhealth.io/privacy/ | Full GDPR privacy policy |
| Terms of Service | https://sovereignhealth.io/terms/ | Legal terms, medical disclaimer |
| Impressum | https://sovereignhealth.io/impressum/ | Legal entity info (Austrian law) |

### Biomarker Zone Deep Links
| Zone | URL | Biomarker Count |
|---|---|---|
| ⚡ Energy & Metabolic | https://sovereignhealth.io/markers/?zone=energy_metabolic | 13 biomarkers |
| 💪 Structural | https://sovereignhealth.io/markers/?zone=structural | 15 biomarkers |
| 🫀 Cardiovascular | https://sovereignhealth.io/markers/?zone=cardiovascular | 11 biomarkers |
| 🧠 Cognitive | https://sovereignhealth.io/markers/?zone=cognitive | 8 biomarkers |
| 🛡️ Immune | https://sovereignhealth.io/markers/?zone=immune | 20 biomarkers |
| 🌱 Nutritional | https://sovereignhealth.io/markers/?zone=nutritional | 21 biomarkers |
| 🎯 Hormonal | https://sovereignhealth.io/markers/?zone=hormonal | 10 biomarkers |
| 🔄 Detoxification | https://sovereignhealth.io/markers/?zone=detoxification | 14 biomarkers |

### App Pages (for existing users / signup)
| Page | URL | Purpose |
|---|---|---|
| Sign Up | https://app.sovereignhealth.io/signup | Free registration, no credit card |
| Login | https://app.sovereignhealth.io/login | Existing user login |
| Dashboard | https://app.sovereignhealth.io/dashboard | Main app dashboard |
| Doctor Chat | https://app.sovereignhealth.io/doctor-chat | In-app AI health assistant |
| Settings | https://app.sovereignhealth.io/settings | Account, profile, tiers |
| Referenzbereich (Reference Ranges) | https://app.sovereignhealth.io/settings?tab=thresholds | Custom reference ranges |
| Einflussfaktoren (Influence Factors) | https://app.sovereignhealth.io/settings?tab=influence-factors | Medications & supplements |

### External Links
| Link | URL |
|---|---|
| GitLab (source code) | https://gitlab.com/sovereign-health |
| Bitcoin Donations | https://app.sovereignhealth.io/donate |
| Contact Email | contact@sovereignhealth.io |

---

## Product Knowledge (current as of March 2026)

### What is Sovereign Health Intelligence?
A privacy-first metabolic health tracking platform. Track 85+ biomarkers across 8 health zones. Analyze trends with AI (Dr. Alex). Self-host or use encrypted cloud. Open source core (AGPL-3.0). Based in Austria (EU), fully GDPR compliant.

### How It Works (3 steps)
1. **Track** — Record biomarkers in seconds using home devices (Fora 6, Qardio) or lab results
2. **Understand** — Dr. Alex explains what your numbers mean in plain language
3. **Optimize** — Compare diet protocols, adjust approach, watch markers improve

### 8 Health Zones
- **⚡ Energy & Metabolic** (13 biomarkers) — Blood sugar, insulin, ketones. Essential for fasting, keto, carnivore protocols.
- **💪 Structural** (15 biomarkers) — Body composition, bone health. Weight, body fat, muscle mass, BMI, waist-to-height.
- **🫀 Cardiovascular** (11 biomarkers) — Heart health. Cholesterol, BP, heart rate, TG/HDL ratio.
- **🧠 Cognitive** (8 biomarkers) — Brain health. Vitamins, minerals for cognitive function, mood, clarity.
- **🛡️ Immune** (20 biomarkers) — Inflammation, WBC, immune function. CRP, ESR, complete blood count.
- **🌱 Nutritional** (21 biomarkers) — Vitamins, minerals. Iron, ferritin, vitamin D, zinc.
- **🎯 Hormonal** (10 biomarkers) — Thyroid, testosterone, cortisol. Track hormonal balance.
- **🔄 Detoxification** (14 biomarkers) — Liver & kidney. ALT, AST, GGT, creatinine, eGFR.

### Supported Devices
- **Fora 6** — Multi-parameter meter: glucose, ketones, cholesterol, uric acid, hemoglobin, hematocrit
- **Qardio Arm** — Blood pressure monitor
- **Qardiobase 2** — Smart scale: weight, body fat, muscle mass, water, bone mass
- Any lab provider (manual entry or import)
- Custom devices (user-defined)

### Key Features
- **85+ Biomarkers** tracked across 8 zones
- **Dr. Alex AI Assistant** — 6 analysis modes: general Q&A, trend analysis, lab explanation, nutrition advice, supplement review, protocol comparison
- **Calculated Health Scores** — BMI, HOMA-IR, GKI (Dr. Boz ratio), TG/HDL — auto-calculated
- **Measurement Templates** — Save routine measurement sets
- **Influence Factors (Einflussfaktoren)** — Track medications and supplements with ingredients hierarchy
- **Lab Import** — Photo or PDF auto-extraction
- **Diet Protocol Support** — Carnivore, keto, fasting, standard — mapped against 20+ markers
- **Marker Relationships** — 30+ documented relationships between markers
- **Food & Supplement Guidance** — Evidence-based recommendations per marker
- **Fasting Reference Ranges** — 22 markers with fasting-specific ranges
- **Full Data Export** — CSV/JSON anytime, PDF health reports
- **Encrypted & Private** — AES-256 at rest, TLS 1.3 in transit, zero-knowledge design
- **Open Source** — AGPL-3.0, self-host with Docker
- **No Tracking** — Zero cookies, zero analytics, zero tracking pixels

### Tiers & Pricing (current v3, March 2026)

**Glimpse (Free — forever, no credit card)**
- 8 Biomarkers, 30 days history, 1 errechneter Marker
- 2 AI Chats/month (Dr. Alex basic Q&A)
- 100 measurements, 2 Einflussfaktoren, 1 measurement template
- [Start free →](https://app.sovereignhealth.io/signup)

**Focus (€9.99/month or €99.99/year)**
- 20 Biomarkers, 365 days history, 3 errechnete Marker
- 5 AI Chats/month (Trend Analysis + Nutrition Advice)
- 250 measurements, 10 Einflussfaktoren, 3 templates
- CSV/JSON Export (5/month), Reference Ranges, Body Composition, 2FA
- [Choose Focus →](https://sovereignhealth.io/pricing/)

**Insight (€24.99/month or €249.99/year)**
- 50 Biomarkers, unlimited history, 8+ errechnete Marker
- 30 AI Chats/month (+ Lab Analysis)
- 500 measurements, 25 Einflussfaktoren, 5 templates
- CSV/JSON Export (10/month), PDF Reports (1/month), Lab Import (3/month), Influence Factor Import (3/month)
- [Choose Insight →](https://sovereignhealth.io/pricing/)

**Clarity (€49.99/month or €499.99/year)**
- Unlimited everything
- Unlimited AI Chats (+ Check Influence Factors)
- PDF Reports (2/month), Lab Import (5/month), Influence Factor Import (10/month)
- Protocol Comparison (coming soon), Benchmark (coming soon)
- [Choose Clarity →](https://sovereignhealth.io/pricing/)

**Horizon (Custom pricing)**
- Everything in Clarity + Enterprise features
- API Access (coming soon), Self-Hosting (coming soon)
- Personal Onboarding (coming soon), Priority Support (coming soon)
- Weekly PDF reports, unlimited imports
- [Contact us →](https://sovereignhealth.io/contact/)

### Payment Methods
- **Credit/debit card** via Stripe (EUR). PCI DSS Level 1 certified. We never see card details.
- **SEPA direct debit** via Stripe
- **Bitcoin** (Lightning + on-chain) via Strike. **5% discount** on all plans. Prepaid periods (monthly or yearly).
- All prices in EUR

### Cancellation & Refund
- Cancel anytime from account settings
- Data stays accessible at Glimpse (free) level after cancellation
- **Full refund within 30 days** of first paid subscription, no questions asked
- After 30 days, subscription runs until end of billing period
- No cancellation fees

### Data & Privacy
- Your data is yours. Full export (CSV/JSON) anytime. Delete account permanently anytime.
- AES-256 encryption at rest, TLS 1.3 in transit
- Zero-knowledge: even admins cannot read your health data
- No cookies, no analytics, no tracking pixels, no third-party sharing
- AI queries sent to Anthropic (Claude) with anonymized data only — no name, email, or PII
- Health data not used to train AI models
- GDPR & ePrivacy compliant, EU data storage (Lithuania)
- Open source core auditable under AGPL-3.0

### AI Processing
- Uses Anthropic Claude via API
- Anonymous: name, email, PII never sent to AI
- Not used for training
- Delete any chat anytime

### Company Info
- **Name:** Sovereign Health Intelligence
- **Type:** Individual Entrepreneur (Einzelunternehmer)
- **Location:** Austria (EU)
- **Law:** Austrian E-Commerce Act (ECG), Austrian Media Act (MedienG)
- **Contact:** contact@sovereignhealth.io
- **Response time:** Typically within 48 hours
- **Content responsibility:** Helmut Schindlwick
- **Open source:** https://gitlab.com/sovereign-health

### Learn Section (tutorials — videos coming soon)
- Getting Started — setup, connect device, first measurement
- Health Zones Explained — the 8 zones
- Using Dr. Alex — effective questions and prompts
- Self-Hosted Setup — Docker deployment in 5 minutes
- Customizing Reference Ranges — personal ranges per marker
- [Visit Learn page →](https://sovereignhealth.io/learn/)

### Coming Soon Features
- **Protocol Comparison** — compare diet/training phases
- **Benchmark** — compare biomarkers with users on same protocol
- **AI Dashboard** — AI-generated insights on dashboard
- **API Access** — programmatic data access
- **Self-Hosting** — run on your own server (Docker)
- **Symptom Journal** — log symptoms alongside measurements
- **Food Intelligence** — anti-nutrient awareness, absorption tracking
- **Allergy & Sensitivity Tracker** — correlate allergies with inflammatory markers
- **Meal Analysis** — photo analysis of meals vs protocol

### Monthly Quotas
- AI chats, exports, imports reset on billing cycle date
- Unused quota does NOT roll over
- Single AI pool: user decides how to use across enabled features

## Response Rules
1. Always be helpful and concise
2. ALWAYS include relevant markdown hyperlinks [text](url) in your answers
3. For pricing → [pricing page](https://sovereignhealth.io/pricing/)
4. For "how to start" / signup → [sign up free](https://app.sovereignhealth.io/signup)
5. For features → [features page](https://sovereignhealth.io/features/)
6. For specific biomarkers → [biomarkers page](https://sovereignhealth.io/markers/) or zone deep link
7. For privacy/data → [privacy policy](https://sovereignhealth.io/privacy/)
8. For zones → [health zones](https://sovereignhealth.io/health-zones/) or specific zone link
9. For legal → [terms](https://sovereignhealth.io/terms/), [impressum](https://sovereignhealth.io/impressum/)
10. For tutorials → [learn page](https://sovereignhealth.io/learn/)
11. For contact → [contact page](https://sovereignhealth.io/contact/) or contact@sovereignhealth.io
12. For source code → [GitLab](https://gitlab.com/sovereign-health)
13. Match user's language (English or German)
14. Never invent features or prices — use ONLY information above
15. If unsure → "I'd recommend checking our [features page](https://sovereignhealth.io/features/) for the latest details."
16. Medical disclaimer: you are not a doctor, recommend consulting healthcare professionals for medical decisions
```

---

## PART 3: Ensure Markdown Rendering in Chat Component

Dr. Alex responses MUST render markdown links as clickable `<a>` tags. Check:

```bash
cd ~/projects/sovereign-health/saas/website
grep -rn --include="*.tsx" --include="*.ts" -i "markdown\|ReactMarkdown\|dangerouslySetInnerHTML\|chat.*message\|message.*render" src/
```

If markdown is not rendered, add `react-markdown`:

```bash
pnpm add react-markdown
```

Then in the chat message component:
```tsx
import ReactMarkdown from 'react-markdown';

function ChatMessage({ content, role }: { content: string; role: 'user' | 'assistant' }) {
  if (role === 'user') return <p>{content}</p>;
  
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
             className="text-blue-400 hover:text-blue-300 underline">
            {children}
          </a>
        ),
        p: ({ children }) => <p className="mb-2">{children}</p>,
        ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

**Important:** Also check the IN-APP Doctor Chat component at `core-frontend` — it should also render markdown links.

---

## PART 4: Update FAQ on Pricing Page

The FAQ section on `sovereignhealth.io/pricing/` has outdated information (old tier limits like "15 markers, 90 days", "3 AI chats"). Replace with current v3 data.

All text via i18n keys. Add to both DE and EN translation files.

### FAQ Content (10 questions)

**Q1: Ist der kostenlose Plan wirklich dauerhaft kostenlos? / Is the free tier really free forever?**
- DE: "Ja. Glimpse ist dauerhaft kostenlos — ohne Zeitlimit und ohne Kreditkarte. Du erhältst 8 Biomarker, 30 Tage Verlauf, 2 AI-Chats pro Monat und Dr. Alex Chat. Es ist ein vollwertiger Plan, keine Testversion."
- EN: "Yes. Glimpse is free forever with no time limit and no credit card required. You get 8 biomarkers, 30 days of history, 2 AI chats per month, and Dr. Alex Chat. It's a full plan, not a trial."

**Q2: Welche Zahlungsmethoden akzeptiert ihr? / What payment methods do you accept?**
- DE: "Kreditkarten, Debitkarten und SEPA-Lastschrift über Stripe. Alle Preise in EUR. Wir akzeptieren auch Bitcoin (Lightning und On-Chain) über Strike — mit 5% Rabatt auf alle Pläne."
- EN: "Credit cards, debit cards, and SEPA direct debit via Stripe. All prices in EUR. We also accept Bitcoin (Lightning and on-chain) via Strike — with a 5% discount on all plans."

**Q3: Kann ich jederzeit kündigen? / Can I cancel anytime?**
- DE: "Ja. Kündige jederzeit in deinen Kontoeinstellungen. Deine Daten bleiben auf Glimpse-Niveau (kostenlos) zugänglich. Keine Gebühren, keine Fragen."
- EN: "Yes. Cancel anytime from your account settings. Your data stays accessible at the Glimpse (free) level. No fees, no questions asked."

**Q4: Wie ist eure Rückerstattungspolitik? / What is your refund policy?**
- DE: "Volle Rückerstattung innerhalb von 30 Tagen nach deinem ersten bezahlten Abo, ohne Fragen. Danach läuft dein Abo bis zum Ende der Abrechnungsperiode."
- EN: "Full refund within 30 days of your first paid subscription, no questions asked. After 30 days, your subscription continues until the end of the billing period."

**Q5: Wem gehören meine Daten? / Who owns my data?**
- DE: "Dir. Immer. Wir verkaufen, teilen oder analysieren deine Gesundheitsdaten niemals für Dritte. Exportiere alles jederzeit (CSV/JSON) und lösche dein Konto dauerhaft. [Unsere Datenschutzerklärung](https://sovereignhealth.io/privacy/)"
- EN: "You do. Always. We never sell, share, or analyze your health data for third parties. Export everything anytime (CSV/JSON) and delete your account permanently. [Our privacy policy](https://sovereignhealth.io/privacy/)"

**Q6: Kann ich selbst hosten? / Can I self-host?**
- DE: "Ja. Der Open-Source-Kern ist kostenlos unter AGPL-3.0. Betreibe ihn mit Docker auf deinem eigenen Server. Der Horizon-Plan bietet zusätzlich eine Hybrid-Option. [Mehr auf unserer Features-Seite](https://sovereignhealth.io/features/)"
- EN: "Yes. The open source core is free under AGPL-3.0. Run it with Docker on your own server. The Horizon tier adds a hybrid option. [More on our features page](https://sovereignhealth.io/features/)"

**Q7: Sind meine Daten sicher? / Is my data secure?**
- DE: "Ja. AES-256-Verschlüsselung, Zero-Knowledge-Architektur (selbst wir können deine Daten nicht lesen), TLS 1.3, 2FA (ab Focus), vollständig DSGVO-konform. EU-Datenspeicherung. Kein Tracking, keine Cookies, keine Analytics. [Datenschutzerklärung](https://sovereignhealth.io/privacy/)"
- EN: "Yes. AES-256 encryption, zero-knowledge architecture (even we can't read your data), TLS 1.3, 2FA (from Focus), fully GDPR compliant. EU data storage. No tracking, no cookies, no analytics. [Privacy policy](https://sovereignhealth.io/privacy/)"

**Q8: Was sind AI-Chats? / What are AI Chats?**
- DE: "Gespräche mit Dr. Alex, deinem KI-Gesundheitsassistenten. Frage nach Biomarkern, Trends, Ernährung oder Laborergebnissen. Jeder Plan enthält ein monatliches Chat-Kontingent — du entscheidest, wofür du es nutzt. [Jetzt kostenlos testen](https://app.sovereignhealth.io/signup)"
- EN: "Conversations with Dr. Alex, your AI health assistant. Ask about biomarkers, trends, nutrition, or lab results. Each plan includes a monthly chat pool — you decide how to use it. [Try it free](https://app.sovereignhealth.io/signup)"

**Q9: Werden monatliche Kontingente übertragen? / Do monthly quotas roll over?**
- DE: "Nein. AI-Chats, Exporte und Importe werden am Abrechnungsdatum jeden Monat zurückgesetzt. Ungenutztes Kontingent wird nicht übertragen."
- EN: "No. AI chats, exports, and imports reset on your billing date each month. Unused quota does not carry over."

**Q10: Akzeptiert ihr Bitcoin? / Do you accept Bitcoin?**
- DE: "Ja! Lightning Network und On-Chain über Strike. Bitcoin-Zahlungen erhalten 5% Rabatt auf alle Pläne. Prepaid-Zeiträume (monatlich oder jährlich). [Preise ansehen](https://sovereignhealth.io/pricing/)"
- EN: "Yes! Lightning Network and on-chain via Strike. Bitcoin payments get a 5% discount on all plans. Prepaid periods (monthly or yearly). [View pricing](https://sovereignhealth.io/pricing/)"

### FAQ Component
Ensure FAQ answers render markdown links as clickable `<a>` tags (same ReactMarkdown pattern as chat messages).

---

## PART 5: Verify

### Test Dr. Alex on localhost
Start website dev server and ask:

| Question | Expected link(s) in response |
|---|---|
| "Where can I buy a plan?" | sovereignhealth.io/pricing/ + app.sovereignhealth.io/signup |
| "How do I sign up?" | app.sovereignhealth.io/signup |
| "What biomarkers do you track?" | sovereignhealth.io/markers/ |
| "Tell me about heart markers" | sovereignhealth.io/markers/?zone=cardiovascular |
| "Is my data safe?" | sovereignhealth.io/privacy/ |
| "Do you accept Bitcoin?" | sovereignhealth.io/pricing/ + mention 5% discount |
| "Was kostet das?" | sovereignhealth.io/pricing/ (German response) |
| "Can I self-host?" | sovereignhealth.io/features/ + mention AGPL-3.0 + Docker |
| "How do I contact you?" | sovereignhealth.io/contact/ + contact@sovereignhealth.io |
| "What is Dr. Alex?" | sovereignhealth.io/features/ + app.sovereignhealth.io/doctor-chat |
| "Show me the source code" | gitlab.com/sovereign-health |
| "What zones do you have?" | sovereignhealth.io/health-zones/ |
| "Tell me about fasting" | Mention fasting reference ranges + link to energy zone |

### Verify links are clickable
- Links render as `<a>` tags (not plain text)
- Links open in new tab (`target="_blank"`)
- Links are visually distinct (underline or color)

### Check FAQ
- All 10 Q&As display with current tier v3 limits
- No old values (15 markers, 90 days, 3 AI chats)
- Links in answers are clickable
- DE and EN work correctly

```bash
cd ~/projects/sovereign-health/saas/website
./check-i18n.sh
```

### Build & Deploy
```bash
cd ~/projects/sovereign-health/saas/website
rm -rf .next out
pnpm build
rsync -avz --delete out/ root@72.61.154.115:/opt/sovereign-health/homepage/
```

If system prompt is in backend:
```bash
cd ~/projects/sovereign-health/core-backend
docker build -t registry.gitlab.com/sovereign-health/core-backend:latest .
docker save registry.gitlab.com/sovereign-health/core-backend:latest | ssh root@72.61.154.115 "docker load"
ssh root@72.61.154.115 "cd /opt/sovereign-health && docker compose -f docker-compose.prod.yml up -d --force-recreate backend && docker image prune -f"
```

Purge Cloudflare cache.
