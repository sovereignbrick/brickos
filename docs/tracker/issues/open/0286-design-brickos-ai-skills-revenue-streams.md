---
number: 286
github_number: 439
github: 267
title: "design: BrickOS AI skills marketplace + revenue stream opportunities"
labels: [design, business, strategy, priority-medium]
milestone: business-model
---

## Description

Evaluate opportunities to expand BrickOS from a platform into a service ecosystem. Inspired by here.now's AI skill model -- explore how BrickOS can offer paid skills, APIs, and services built on top of its existing infrastructure.

## Context

BrickOS already has:
- **Sovereign Health Intelligence** -- 100+ biomarker tracking, AI analysis, protocol-aware ranges
- **Sovereign Link** -- URL shortener with QR codes, analytics, vanity codes
- **Dr. Alex AI** -- Health marker analysis and consultation
- **Smart Import** -- AI-powered lab report extraction (PDF, photo, CSV)
- **Encryption infrastructure** -- AES-256-GCM field-level encryption
- **Multi-tier licensing** -- Feature gating, AI credit pool, per-tier limits
- **i18n** -- Bilingual EN/DE with framework for more
- **AGPL-3.0 dual-license** -- Open core + commercial licensing possible

## AI Skills / Paid Services Brainstorm

### Health Intelligence Services
- [ ] **AI Health Marker Analysis API** -- Pay-per-analysis API for third-party apps (labs, clinics, wellness apps) to submit bloodwork and get AI-powered insights, protocol-aware ranges, and trend analysis
- [ ] **Lab Report Extraction API** -- Expose Smart Import as a paid API: upload PDF/photo -> structured JSON of biomarkers. Valuable for health apps, clinics, insurance
- [ ] **Reference Range Consultation** -- Personalized reference range recommendations based on diet protocol, age, gender, health goals. Premium tier or per-consultation
- [ ] **Health Risk Scoring** -- Composite health scores (metabolic, cardiovascular, nutritional) computed from biomarker panels. API or white-label
- [ ] **Trend Prediction** -- AI-powered biomarker trend forecasting: "if current trajectory continues, your HbA1c will be X in 6 months"
- [ ] **Protocol Optimization** -- AI recommends optimal diet/fasting protocol based on biomarker history

### Link / URL Services
- [ ] **Sovereign Link as a Service** -- Paid URL shortener for businesses: custom domains, branded short links, QR codes, analytics dashboard
- [ ] **QR Code Generator API** -- Pay-per-use QR code generation with branding, tracking, and analytics
- [ ] **Affiliate Link Platform** -- White-label affiliate tracking for health/wellness brands

### Platform Services
- [ ] **BrickOS Hosting** -- Managed hosting for self-hosters who want sovereignty without sysadmin: BrickOS on their own VPS, managed by us
- [ ] **Data Sovereignty Consulting** -- Help companies implement GDPR-compliant, self-hosted health data infrastructure
- [ ] **White-Label Health Platform** -- License SHI as white-label for clinics, health coaches, corporate wellness programs
- [ ] **Plugin/Extension Marketplace** -- Third-party developers build and sell extensions (new marker zones, integrations, custom reports)

### Data & Integration Services
- [ ] **Health Connect / Apple Health Sync** -- Premium integration: continuous sync with wearables and phone health data
- [ ] **FHIR/HL7 Integration** -- Medical records interoperability for clinics and hospitals
- [ ] **Insurance API** -- Anonymized, user-consented health scoring for insurance risk assessment
- [ ] **Corporate Wellness Dashboard** -- Aggregated (anonymized) health insights for employers

### Content & Education
- [ ] **AI Health Reports** -- Monthly/quarterly PDF health reports with AI analysis, trends, recommendations. Printable for doctor visits
- [ ] **Biomarker Education Platform** -- Interactive courses on understanding bloodwork, optimizing markers
- [ ] **Practitioner Portal** -- Paid portal for health practitioners to monitor patient biomarkers (with patient consent)

## Revenue Model Options

| Model | Description | Example |
|-------|-------------|---------|
| **SaaS Tiers** | Current model (Focus/Clarity/Horizon) | Core free, premium tiers |
| **API Pay-per-use** | Charge per API call for extraction, analysis | 0.10 EUR per lab extraction |
| **White-label License** | Annual license for clinics/companies | 5,000-50,000 EUR/year |
| **Marketplace Commission** | 30% cut on third-party plugin sales | App Store model |
| **Managed Hosting** | Monthly fee for managed BrickOS instance | 29-99 EUR/month |
| **Data Insights** | Anonymized, aggregated health population data | Research institutions |

## Evaluation Criteria

For each opportunity, assess:
1. **Technical feasibility** -- How much new code vs reusing existing infrastructure?
2. **Time to market** -- Can we ship an MVP in 1-2 sprints?
3. **Revenue potential** -- TAM, pricing, willingness to pay
4. **Alignment** -- Does it strengthen the sovereignty/privacy mission?
5. **Regulatory** -- GDPR, medical device regulation, health data laws

## Next Steps

- [ ] Prioritize top 3 opportunities by feasibility x revenue
- [ ] Design doc for highest priority opportunity
- [ ] MVP scope definition
- [ ] Market research: competitors, pricing, demand validation

## References

- here.now AI skills model: https://here.now/
- Design 029: Licensing SSoT Architecture
- Design 030: Licensing Model
- Issue #241: Multi-product multi-org license model
