# Sovereign Health Intelligence

**Your health data belongs to you -- not your lab, not your doctor's portal, not a cloud provider.**

## The Problem

Your health data is trapped in silos:

- Lab results locked in proprietary portals you can't export from
- PDFs emailed to you that no app can read
- Wearable data in yet another vendor's cloud
- Doctor records in systems you'll never access directly

You generated this data with your own blood, sweat, and discipline. But you can't combine it, analyze it, or even reliably access it across providers.

## The Solution

Sovereign Health imports, normalizes, and unifies your health data into a single platform you control:

```
Lab PDF ──────┐
Wearable CSV ─┤                    ┌─── Biomarker Dashboard
Manual entry ─┼──► Import + Parse ─┼─── Trend Analysis
Doctor notes ─┤        │           ├─── AI Assistant (Dr. Alex)
Old records ──┘        ▼           └─── Data Export (JSON/CSV)
              Normalized Markers
              (encrypted at rest)
```

**100+ biomarkers** across 8 health zones -- energy/metabolic, cardiovascular, structural, cognitive, immune, nutritional, hormonal, detoxification. Plus 8 calculated markers (GKI, BMI, HOMA-IR, WHtR, TG/HDL ratio, and more).

## Key Features

| Feature | Description |
|---------|-------------|
| **PDF Lab Import** | AI-powered extraction from lab result PDFs -- no manual entry |
| **Biomarker Dashboard** | Color-coded status (green/orange/red) with protocol-aware reference ranges |
| **Dr. Alex AI Chat** | AI health assistant that understands YOUR data and answers in context |
| **Calculated Markers** | Auto-computed ratios (GKI, HOMA-IR, BMI) from your raw measurements |
| **Data Export** | JSON + CSV export -- your data, your format, no lock-in |
| **Influence Factors** | Track medications and supplements and correlate with marker changes |
| **Measurement Templates** | Save your regular lab panels for quick manual entry |
| **Protocol-Aware Ranges** | Fasting, keto, and standard -- your protocol changes what "normal" means |
| **Dark Theme** | Easy on the eyes, always |

## Data Sovereignty

- **Encryption at rest** -- AES-256-GCM for all health measurements
- **Row-Level Security** -- PostgreSQL RLS ensures users can only access their own data
- **Self-hostable** -- Run on your own VPS, Start9, or local Docker
- **GDPR compliant** -- Full data export (Art. 20), account deletion cascade (Art. 17), consent management (Art. 7)
- **No tracking** -- Zero third-party analytics, no ad networks, no data selling
- **Open source** -- AGPL-3.0, audit every line of code

## Structure

```
sovereign-health/
├── api/            Rust Actix-web backend (v0.28.0)
├── frontend/       Next.js 16 PWA (installable, offline-capable)
├── website/        Marketing site (sovereignhealth.io)
├── ops/            Deploy scripts, Docker compose, nginx configs
└── docs/           Design docs, sprint planning, ADRs, releases
```

## Tiers

| Tier | Price | Markers | AI Credits | Key Features |
|------|-------|---------|-----------|-------------|
| **Glimpse** | Free | 8 | 5/mo | Dashboard, basic tracking |
| **Focus** | 9.99/mo | 20 | 15/mo | CSV export, custom ranges, 2FA |
| **Insight** | 24.99/mo | 50 | 50/mo | Lab import, trend analysis, PDF reports |
| **Clarity** | 49.99/mo | Unlimited | Unlimited | Team sharing, cohort benchmark |
| **Horizon** | 99.99/mo | Unlimited | Unlimited | API access, self-hosted hybrid, priority support |
| **Core** | Free (AGPL) | Unlimited | Unlimited | Self-hosted, full access, your server |

## Links

- **App:** [app.sovereignhealth.io](https://app.sovereignhealth.io)
- **Website:** [sovereignhealth.io](https://sovereignhealth.io)
- **Demo:** [demo.sovereignhealth.io](https://demo.sovereignhealth.io)
- **Platform:** [brickos.io](https://brickos.io)

## License

AGPL-3.0 -- see [LICENSE](../../LICENSE) for details.
