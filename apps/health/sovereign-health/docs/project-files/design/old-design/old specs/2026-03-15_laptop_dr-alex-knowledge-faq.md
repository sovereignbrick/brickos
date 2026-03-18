# Claude Code Prompt — Dr. Alex Website Chatbot: Knowledge Base + FAQ Update

**Date:** 2026-03-15  
**Priority:** HIGH (public-facing, pre-RC polish)  
**Scope:** Website (`saas/website`) + Backend (`core-backend` — Dr. Alex system prompt)

---

## Overview

Two problems:
1. **Dr. Alex (website chatbot)** doesn't know website URLs → gives text answers without clickable links
2. **FAQ section on pricing page** is outdated (shows old tier limits: "15 markers, 90 days")

**Solution:** Give Dr. Alex a comprehensive system prompt with all URLs, product info, and tier v3 data. Update the FAQ. No separate FAQ page needed.

---

## PART 1: Dr. Alex System Prompt — URL & Knowledge Base

Find where the Dr. Alex website chatbot system prompt is configured. It's likely in:
- Backend: a system prompt string/template in the doctor chat handler or a config file
- Or: a frontend-side context builder that sends context to the API

Search for it:
```bash
cd ~/projects/sovereign-health
grep -rn --include="*.rs" --include="*.tsx" --include="*.ts" --include="*.json" \
  -i "dr.alex\|system.prompt\|chatbot.*prompt\|website.*chat\|public.*chat" \
  core-backend/src/ saas/website/src/ core-frontend/src/ | grep -v node_modules | grep -v target
```

### Add this knowledge block to Dr. Alex's system prompt

Append or integrate this into the existing system prompt for the **website** Dr. Alex (not the in-app Dr. Alex — that one has user data context):

```markdown
## Your Identity
You are Dr. Alex, the AI health assistant on the Sovereign Health Intelligence website. You help visitors understand the product, features, pricing, and health tracking concepts. You are friendly, knowledgeable, and concise.

## IMPORTANT: Always Include Links
When your answer relates to a specific page or feature, ALWAYS include a clickable hyperlink in your response using markdown format: [link text](URL). Never give a text-only answer when a link would help the user navigate.

## Website URL Map
Use these exact URLs in your responses:

| Topic | URL | When to link |
|---|---|---|
| Homepage | https://sovereignhealth.io/ | General product info |
| Pricing & Plans | https://sovereignhealth.io/pricing/ | Any question about cost, tiers, plans, buying, subscribing |
| Features | https://sovereignhealth.io/features/ | What the app can do, feature questions |
| Health Zones | https://sovereignhealth.io/health-zones/ | Zone-specific questions, what zones exist |
| Biomarkers | https://sovereignhealth.io/markers/ | Which markers are tracked, marker details |
| Privacy Policy | https://sovereignhealth.io/privacy/ | Data privacy, GDPR, data ownership |
| Terms of Service | https://sovereignhealth.io/terms/ | Legal, terms, cancellation policy |
| Impressum | https://sovereignhealth.io/impressum/ | Legal entity, company info |
| Sign Up (Free) | https://app.sovereignhealth.io/signup | Registration, getting started, free trial |
| Login | https://app.sovereignhealth.io/login | Existing users, logging in |
| App Dashboard | https://app.sovereignhealth.io/dashboard | After signup, using the app |
| Doctor Chat (in-app) | https://app.sovereignhealth.io/doctor-chat | AI health assistant inside the app |
| Settings | https://app.sovereignhealth.io/settings | Account settings, profile |
| Contact | mailto:contact@sovereignhealth.io | Support, business inquiries |

## Current Product Information (as of March 2026)

### Tiers & Pricing
- **Glimpse (Free):** 8 Biomarkers, 30 days history, 2 AI Chats/month, 100 measurements. [Start free](https://app.sovereignhealth.io/signup)
- **Focus (€9.99/month, €99.99/year):** 20 Biomarkers, 365 days history, 5 AI Chats/month, 250 measurements, Trend Analysis, Nutrition Advice, CSV Export, Reference Ranges, Body Composition, 2FA
- **Insight (€24.99/month, €249.99/year):** 50 Biomarkers, unlimited history, 30 AI Chats/month, 500 measurements, Lab Analysis, PDF Reports, Lab Import, Influence Factor Import
- **Clarity (€49.99/month, €499.99/year):** Unlimited everything, Check Influence Factors, Protocol Comparison, Benchmark
- **Horizon (Custom pricing):** Enterprise features, API Access, Self-Hosting, Personal Onboarding, Priority Support

### Payment Methods
- Credit card, debit card, SEPA direct debit via Stripe (EUR)
- Bitcoin (Lightning + on-chain) via Strike with 5% discount
- All prices in EUR

### Key Facts
- Free tier is free forever, no credit card required
- Cancel anytime, no cancellation fees
- Full refund within 30 days, no questions asked
- Your data is yours — export everything, delete anytime
- Open source core under AGPL-3.0
- 85+ Biomarkers across 8 Health Zones
- AI Doctor Chat powered by Dr. Alex
- Available in English and German
- Based in Austria (EU), GDPR compliant

### Health Zones (8)
Heart & Circulation, Energy & Metabolic, Liver & Detox, Kidney & Electrolytes, Blood & Immune, Hormones & Signaling, Bone & Structural, Nutrition & Vitamins

### AI Features
- Dr. Alex Chat: General health Q&A (all tiers)
- Trend Analysis: AI-powered trend detection (from Focus)
- Nutrition Advice: Personalized recommendations (from Focus)
- Lab Analysis: Lab result explanations (from Insight)
- Check Influence Factors: Evaluate medications & supplements (from Clarity)
- All AI features share a single monthly chat pool

### Coming Soon
- Protocol Comparison (compare diet/training phases)
- Benchmark (compare with similar users)
- AI Dashboard (AI insights on dashboard)
- API Access (programmatic data access)
- Self-Hosting option
- Personal Onboarding
- Priority Support

## Response Guidelines
1. Always be helpful and concise
2. Include relevant links as markdown hyperlinks: [text](url)
3. For pricing questions → link to [pricing page](https://sovereignhealth.io/pricing/)
4. For "how to start" → link to [sign up](https://app.sovereignhealth.io/signup)
5. For feature questions → link to [features page](https://sovereignhealth.io/features/)
6. For privacy/data questions → link to [privacy policy](https://sovereignhealth.io/privacy/)
7. For specific biomarker questions → link to [biomarkers page](https://sovereignhealth.io/markers/)
8. Never make up features or prices — use the information above
9. If unsure, say "I'd recommend checking [our features page](https://sovereignhealth.io/features/) for the latest details"
10. Use both English and German depending on user's language
```

### Ensure Links Render as Clickable

In the website chatbot component, Dr. Alex's responses must render markdown. Check that the chat message component:
- Parses markdown (especially `[text](url)` links)
- Renders `<a>` tags with `target="_blank"` and `rel="noopener noreferrer"`
- Links are styled visibly (underline or color highlight, not plain text)

```bash
# Find the chat message rendering component
grep -rn --include="*.tsx" --include="*.ts" -i "markdown\|ReactMarkdown\|dangerouslySetInnerHTML\|chat.*message.*render" \
  saas/website/src/ | grep -v node_modules
```

If markdown rendering is missing, add it:
```bash
cd ~/projects/sovereign-health/saas/website
pnpm add react-markdown
```

Then use in the chat message component:
```tsx
import ReactMarkdown from 'react-markdown';

function ChatMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
             className="text-blue-400 hover:text-blue-300 underline">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

---

## PART 2: Update FAQ Section on Pricing Page

The FAQ on `sovereignhealth.io/pricing/` is outdated. Update it with current tier v3 information.

### Updated FAQ Content (DE + EN via i18n)

All FAQ text must use i18n keys. Add keys for each question + answer.

**Q1: Is the free tier really free forever?**
- EN: "Yes. Glimpse is free with no time limit and no credit card required. You get 8 biomarkers, 30 days of history, 2 AI chats per month, and Dr. Alex Chat. It is a fully functional tier, not a trial."
- DE: "Ja. Glimpse ist kostenlos, ohne Zeitlimit und ohne Kreditkarte. Du erhältst 8 Biomarker, 30 Tage Verlauf, 2 AI-Chats pro Monat und Dr. Alex Chat. Es ist ein vollwertiger Plan, keine Testversion."

**Q2: What payment methods do you accept?**
- EN: "We accept credit cards, debit cards, and SEPA direct debit via Stripe. All prices are in EUR. We also accept Bitcoin (Lightning and on-chain) via Strike with a 5% discount."
- DE: "Wir akzeptieren Kreditkarten, Debitkarten und SEPA-Lastschrift über Stripe. Alle Preise in EUR. Wir akzeptieren auch Bitcoin (Lightning und On-Chain) über Strike mit 5% Rabatt."

**Q3: Can I cancel anytime?**
- EN: "Yes. Cancel anytime from your account settings. Your data stays accessible at the Glimpse (free) level. No cancellation fees, no questions asked."
- DE: "Ja. Kündige jederzeit in deinen Kontoeinstellungen. Deine Daten bleiben auf Glimpse-Niveau (kostenlos) zugänglich. Keine Kündigungsgebühren, keine Fragen."

**Q4: What is your refund policy?**
- EN: "Full refund within 30 days of your first paid subscription, no questions asked. After 30 days, your subscription continues until the end of the billing period."
- DE: "Volle Rückerstattung innerhalb von 30 Tagen nach deinem ersten bezahlten Abonnement, ohne Fragen. Nach 30 Tagen läuft dein Abo bis zum Ende der Abrechnungsperiode."

**Q5: Who owns my data?**
- EN: "You do. Always. We never sell, share, or analyze your health data for third parties. You can export everything at any time (CSV/JSON) and delete your account permanently."
- DE: "Du. Immer. Wir verkaufen, teilen oder analysieren deine Gesundheitsdaten niemals für Dritte. Du kannst alles jederzeit exportieren (CSV/JSON) und dein Konto dauerhaft löschen."

**Q6: Can I self-host instead?**
- EN: "Yes. The open source core is free under AGPL-3.0. Run it on your own server with Docker. The Horizon tier adds a hybrid option that syncs a self-hosted instance with our cloud features. [Learn more about self-hosting](https://sovereignhealth.io/features/)"
- DE: "Ja. Der Open-Source-Kern ist kostenlos unter AGPL-3.0. Betreibe ihn auf deinem eigenen Server mit Docker. Der Horizon-Plan bietet eine Hybrid-Option, die eine selbst gehostete Instanz mit unseren Cloud-Funktionen synchronisiert. [Mehr über Self-Hosting](https://sovereignhealth.io/features/)"

**Q7: Is my data secure?** (NEW)
- EN: "Yes. We use industry-standard encryption, 2FA authentication (from Focus tier), and are fully GDPR compliant. Your health data is stored in the EU and never leaves our secured infrastructure. [Read our privacy policy](https://sovereignhealth.io/privacy/)"
- DE: "Ja. Wir verwenden branchenübliche Verschlüsselung, 2FA-Authentifizierung (ab Focus), und sind vollständig DSGVO-konform. Deine Gesundheitsdaten werden in der EU gespeichert und verlassen niemals unsere gesicherte Infrastruktur. [Lies unsere Datenschutzerklärung](https://sovereignhealth.io/privacy/)"

**Q8: What are AI Chats?** (NEW)
- EN: "AI Chats are conversations with Dr. Alex, your personal AI health assistant. Ask about your biomarkers, trends, nutrition, or lab results. Each tier includes a monthly chat pool — you decide how to use it across all enabled AI features. [Try Dr. Alex now](https://app.sovereignhealth.io/signup)"
- DE: "AI-Chats sind Gespräche mit Dr. Alex, deinem persönlichen KI-Gesundheitsassistenten. Frage nach Biomarkern, Trends, Ernährung oder Laborergebnissen. Jeder Plan enthält ein monatliches Chat-Kontingent — du entscheidest, wie du es auf alle freigeschalteten AI-Funktionen verteilst. [Probiere Dr. Alex aus](https://app.sovereignhealth.io/signup)"

**Q9: Do monthly quotas roll over?** (NEW)
- EN: "No. AI chats, exports, and imports reset on your billing cycle date each month. Unused quota does not accumulate."
- DE: "Nein. AI-Chats, Exporte und Importe werden an deinem Abrechnungsdatum jeden Monat zurückgesetzt. Ungenutztes Kontingent sammelt sich nicht an."

**Q10: What is Bitcoin payment?** (NEW)
- EN: "We accept Bitcoin via Lightning Network and on-chain payments through Strike. Bitcoin payments get a 5% discount on all plans. Pay in BTC for prepaid periods (monthly or yearly). [View pricing](https://sovereignhealth.io/pricing/)"
- DE: "Wir akzeptieren Bitcoin über Lightning Network und On-Chain-Zahlungen über Strike. Bitcoin-Zahlungen erhalten 5% Rabatt auf alle Pläne. Zahle in BTC für Prepaid-Zeiträume (monatlich oder jährlich). [Preise anzeigen](https://sovereignhealth.io/pricing/)"

### i18n Keys

```json
{
  "faq.title": "Frequently Asked Questions",
  "faq.q1.question": "Is the free tier really free forever?",
  "faq.q1.answer": "Yes. Glimpse is free with no time limit...",
  "faq.q2.question": "What payment methods do you accept?",
  "faq.q2.answer": "We accept credit cards...",
  // ... etc for all 10 Q&As, DE equivalents
}
```

### FAQ Styling
- Keep the existing accordion/expandable style
- Ensure links in answers render as clickable `<a>` tags (not plain text)
- All Q&As must use i18n keys (no hardcoded strings)
- Mobile: full width, touch-friendly tap targets

---

## PART 3: Verify

```bash
# i18n check
cd ~/projects/sovereign-health/saas/website
./check-i18n.sh

# Check Dr. Alex prompt contains URLs
grep -n "sovereignhealth.io" <path-to-system-prompt-file>

# Check FAQ has no old values
grep -n "15 markers\|90 days\|3 AI\|not yet live" saas/website/src/**/*.tsx saas/website/src/**/*.json
```

### Test Dr. Alex on localhost
Start the website dev server and test these questions:
1. "Where can I buy a plan?" → should include link to pricing page
2. "How do I sign up?" → should include link to signup
3. "What biomarkers do you track?" → should include link to markers page
4. "Is my data safe?" → should include link to privacy policy
5. "Do you accept Bitcoin?" → should include link to pricing + mention 5% discount
6. "Was kostet das?" (German) → should respond in German with link to pricing

### Build & Deploy
```bash
cd ~/projects/sovereign-health/saas/website
rm -rf .next out
pnpm build
rsync -avz --delete out/ root@72.61.154.115:/opt/sovereign-health/homepage/
```

If the system prompt is in the backend:
```bash
cd ~/projects/sovereign-health/core-backend
docker build -t registry.gitlab.com/sovereign-health/core-backend:latest .
docker save registry.gitlab.com/sovereign-health/core-backend:latest | ssh root@72.61.154.115 "docker load"
ssh root@72.61.154.115 "cd /opt/sovereign-health && docker compose -f docker-compose.prod.yml up -d --force-recreate backend && docker image prune -f"
```

Purge Cloudflare cache.
