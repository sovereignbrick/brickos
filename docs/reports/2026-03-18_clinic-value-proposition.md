# Sovereign Health Intelligence — Value Proposition for Clinics

**Date:** 2026-03-18
**Audience:** Physicians, clinic operators, nutritionists, and health professionals
**Version:** v0.20.0

---

## Dear Doctor,

Your patients spend 99% of their time outside your office. Between appointments, they make dietary choices, take medications, adjust supplements, and experience symptoms — all without structured documentation. When they return, you often rely on vague descriptions, incomplete lab printouts, or fragmented data from multiple sources.

**Sovereign Health Intelligence** changes this. It gives your patients a tool to systematically track biomarkers, medications, and lifestyle factors between visits — and gives you structured, exportable data to work with when they return.

This document explains what makes our platform unique, how it benefits your practice, and why it is fundamentally different from other health tracking tools on the market.

---

## Table of Contents

1. [What Is Sovereign Health?](#1-what-is-sovereign-health)
2. [Core Values](#2-core-values)
3. [What Your Patients Can Do](#3-what-your-patients-can-do)
4. [What You Get as a Practitioner](#4-what-you-get-as-a-practitioner)
5. [The Horizon Tier — Built for Clinics](#5-the-horizon-tier--built-for-clinics)
6. [Unique Selling Points vs. Market Alternatives](#6-unique-selling-points-vs-market-alternatives)
7. [Security & Compliance](#7-security--compliance)
8. [Pricing Overview](#8-pricing-overview)
9. [Deployment Options](#9-deployment-options)
10. [Getting Started](#10-getting-started)

---

## 1. What Is Sovereign Health?

Sovereign Health Intelligence is a **privacy-first biomarker tracking and analysis platform** that enables patients to:

- Track **85+ biomarkers** across 8 health zones (metabolic, cardiovascular, detoxification, structural, and more)
- Analyze trends with **AI-powered health coaching** (Dr. Alex)
- Manage **medications and supplements** with interaction warnings
- Generate **PDF health reports** for clinic visits
- Export data as **CSV, JSON, or structured PDF** — ready for your EHR

The platform is available as a hosted SaaS service or as a **self-hosted solution** that runs entirely on your own infrastructure — meaning patient data never leaves your premises.

---

## 2. Core Values

### 2.1 Data Sovereignty

> "Your patients' data belongs to them — not to a SaaS vendor."

Unlike consumer health apps that monetize user data through advertising, partnerships, or anonymized data sales, Sovereign Health is built on an architectural commitment to data ownership:

- **Full data export** at any time (CSV, JSON, PDF)
- **Account deletion** with 30-day grace period and cryptographic hard purge
- **Self-hosting option** — run the entire platform on your own server
- **Open source** (AGPL-3.0) — every line of code is publicly auditable
- **No vendor lock-in** — data is yours, even if you leave

### 2.2 Privacy by Architecture

> "We should not be able to read your patients' health data — even if we wanted to."

This is not a policy statement. It is an engineering decision:

- **AES-256-GCM encryption at rest** — measurement values, chat messages, and MFA secrets are encrypted with keys you control
- **Row-Level Security** at the database layer — even a compromised backend cannot access another user's data
- **Zero-knowledge AI queries** — patient names and emails are never sent to the AI model
- **No analytics, no tracking cookies, no behavioral profiling**
- **pgaudit** — tamper-proof database audit logging for every write operation

### 2.3 Medical Transparency

Every piece of health information in the platform is:

- **Referenced** — marker pages include clinical references and normal ranges
- **Localized** — full German and English support (more languages planned)
- **Explainable** — plain-language explanations of what each biomarker means
- **Actionable** — food recommendations, supplement guidance, and protocol comparisons per marker

### 2.4 Patient Empowerment

The goal is to make patients **active participants** in their health journey:

- Structured tracking replaces vague descriptions
- Trend visualization makes progress visible
- AI coaching provides context between appointments
- Medication interaction warnings increase safety

---

## 3. What Your Patients Can Do

### Biomarker Tracking

| Capability | Details |
|---|---|
| Markers supported | 85+ across 8 health zones |
| Key markers | Blood glucose, HbA1c, ketones, cholesterol (total, LDL, HDL), triglycerides, hemoglobin, hematocrit, uric acid, lactate, liver enzymes, kidney markers, thyroid, vitamins, minerals |
| Calculated markers | BMI, Waist-to-Height Ratio (WHtR), Glucose-Ketone Index (GKI), HOMA-IR |
| Device support | Fora 6, Qardio Arm, QardioBase, any lab provider |
| Entry methods | Manual input, measurement templates, CSV import, AI-assisted lab photo import |
| Time periods | 7 days, 30 days, 6 months, 1 year, all time |

### AI Health Coach — Dr. Alex

| Agent | What It Does |
|---|---|
| General health Q&A | Answers questions personalized to the patient's data |
| Trend analysis | Reviews biomarker trends over the last 60 days |
| Lab explanation | Explains lab results in plain language |
| Diet & nutrition | Personalized dietary recommendations |
| Supplement review | Evaluates current supplement stack |
| Protocol comparison | Compares dietary protocols (keto, carnivore, Mediterranean, etc.) against the patient's markers |

**Important:** Patient names and emails are never sent to the AI. All queries are anonymized by design.

### Medication & Supplement Management

| Feature | Details |
|---|---|
| Medication tracking | Dosage, frequency, timing, start/end dates |
| Interaction database | Drug-supplement and drug-drug interaction warnings |
| Marker impact tracking | See how a medication affects specific biomarkers over time |
| Import | CSV import, AI-assisted import from photos |

### Export & Reporting

| Format | Purpose |
|---|---|
| **PDF health report** | Printable summary for clinic visits — includes trends, current values, medications |
| **CSV export** | Raw data for spreadsheets or EHR import |
| **JSON export** | Structured data for integration with practice management systems |
| **Full GDPR export** | Complete data package (all measurements, settings, chat history) |

---

## 4. What You Get as a Practitioner

### Better Data at Every Visit

Instead of asking _"How has your blood sugar been?"_ and getting _"I think it's been okay..."_ — you receive:

- Timestamped measurement history with device/lab source attribution
- Trend charts showing direction and velocity of change
- Normal-range overlays showing when values were in/out of range
- Medication timeline correlated with biomarker changes
- AI-generated trend summary (patient can share)

### Multi-Patient Oversight (Horizon Tier)

| Feature | Details |
|---|---|
| Team sharing | Up to 10 team members per organization |
| Access scopes | Read-only, read-write, or full access per patient |
| Organization types | Clinic, family, enterprise |
| Audit trail | Every data access logged (who accessed what, when) |
| Role-based access | Practitioner, patient, viewer roles |

### Structured Reports

Patients on Insight tier and above can generate **PDF health reports** that include:

- Current biomarker values with normal ranges
- Trend charts for key markers
- Medication and supplement list
- Lifestyle factors (sleep, exercise, stress)
- AI-generated insights (optional)

These reports are designed to be **brought to your office** — structured, consistent, and complete.

---

## 5. The Horizon Tier — Built for Clinics

The **Horizon** tier is designed specifically for health professionals and clinical use:

| Feature | Included |
|---|---|
| Unlimited biomarkers | All 85+ markers, all calculated markers |
| Unlimited measurements | No caps on data volume |
| Unlimited AI access | All Dr. Alex agents, no monthly quotas |
| Multi-patient dashboard | Up to 10 team members |
| API access | Programmatic access for EHR integration |
| Self-hosted hybrid | Cloud + on-premise deployment |
| Weekly PDF reports | Automated reporting |
| Unlimited imports | Lab photo import, medication import |
| Personal onboarding | Dedicated setup assistance |
| Priority support | Dedicated support channel |

**Pricing:** Custom — contact us for clinic volume pricing.

---

## 6. Unique Selling Points vs. Market Alternatives

### Competitive Landscape

| Feature | Sovereign Health | Apple Health / Google Fit | MyFitnessPal / Cronometer | Heads Up Health | InsideTracker | Specialty Lab Apps (e.g., Fora) |
|---|---|---|---|---|---|---|
| **85+ biomarkers** | Yes | Limited (steps, HR) | Nutrition-focused | Yes | 40+ (lab-only) | Device-specific only |
| **Self-hosting** | Yes (AGPL-3.0) | No | No | No | No | No |
| **Encryption at rest** | AES-256-GCM | Platform-dependent | No | No | No | No |
| **Open source** | Yes (full audit) | No | No | No | No | No |
| **AI health coach** | Yes (Dr. Alex) | No | No | No | Limited | No |
| **Medication tracking** | Yes + interactions | No | No | Limited | No | No |
| **Lab + device support** | Both | Devices only | No labs | Labs only | Labs only | Single device |
| **Bitcoin payments** | Yes (5% discount) | No | No | No | No | No |
| **GDPR hard purge** | Yes (cryptographic) | Unclear | Policy-only | Policy-only | Policy-only | Unclear |
| **Multi-language** | EN + DE (growing) | Multi-language | EN primarily | EN only | EN only | Varies |
| **PDF reports for doctors** | Yes | No | No | Yes | Yes | No |
| **Data export** | CSV + JSON + PDF | Limited | CSV | CSV | PDF only | No |
| **No tracking / no ads** | Guaranteed | Limited | Ads / premium | No ads | No ads | Varies |
| **Row-Level Security** | PostgreSQL RLS | N/A | No | No | No | No |
| **Custom reference ranges** | Yes (per marker) | No | No | Limited | Yes | No |
| **Calculated markers** | BMI, WHtR, GKI, HOMA-IR | BMI only | No | Limited | No | No |

### Key Differentiators

#### 1. True Data Sovereignty — Not Just a Privacy Policy

Most health apps promise privacy in their terms of service. Sovereign Health enforces it **architecturally**:

- AES-256-GCM encryption means data is unreadable without the encryption key
- Row-Level Security at the database level means even a SQL injection cannot cross user boundaries
- Self-hosting means data never leaves your network
- Open source means every claim is verifiable

**Why this matters to your clinic:** Patient health data is among the most sensitive data that exists. A data breach at a consumer health app can expose your patients' conditions, medications, and biomarkers. With Sovereign Health's self-hosted option, that risk is eliminated entirely.

#### 2. Lab + Device + Manual — All in One Place

Most tools are either lab-focused (InsideTracker, Heads Up Health) or device-focused (Apple Health, Fora app). Sovereign Health combines:

- **Lab results** from any provider (manual entry or AI-assisted photo import)
- **Device readings** from home devices (glucose meters, blood pressure monitors, scales)
- **Manual entries** for symptoms, lifestyle factors, and subjective measures
- **Calculated markers** that combine multiple inputs (e.g., GKI requires glucose + ketones)

**Why this matters:** Your patients use multiple data sources. One platform that captures everything gives you a complete picture.

#### 3. AI That Knows the Patient's Full Context

Dr. Alex is not a generic chatbot. It operates with full access to the patient's:

- Current and historical biomarker values
- Medication and supplement list
- Lifestyle factors and dietary protocols
- Trend direction and velocity

This means a patient can ask: _"My HbA1c went from 5.8 to 6.1 over three months — should I be concerned given my current diet and medications?"_ — and receive a contextualized, data-informed response.

**Why this matters:** AI coaching between visits reduces anxiety-driven calls to your office and helps patients understand their data before the appointment.

#### 4. Open Source & Self-Hosting

Sovereign Health is licensed under **AGPL-3.0** — the same license used by major open-source database and infrastructure projects. This means:

- You can **audit every line of code** for security and compliance
- You can **self-host** on your own infrastructure (Docker-based, runs on any Linux server or Windows via WSL2)
- You are **never locked in** — if the SaaS service disappears, the software continues to work
- You can **customize** the platform for your practice (within AGPL terms)

**Why this matters:** No other biomarker tracking platform offers this level of transparency and control.

#### 5. Designed for European Compliance

| Compliance Aspect | Implementation |
|---|---|
| **GDPR Art. 15** | Full data export (JSON, CSV, PDF) |
| **GDPR Art. 17** | Account deletion with cryptographic hard purge |
| **GDPR Art. 20** | Data portability in standard formats |
| **GDPR Art. 25** | Privacy by design (RLS, encryption, audit) |
| **GDPR Art. 30** | Processing records via data_access_log |
| **Austrian operator** | Registered in Austria, EU jurisdiction |
| **EU data storage** | Hosted in EU (Lithuania) |
| **Bilingual** | Full German + English support |

**Why this matters:** If your clinic operates in the EU/EEA, recommending a tool that is GDPR-compliant by architecture — not just by policy — reduces your regulatory risk.

#### 6. Transparent Pricing with Bitcoin Option

| Aspect | Details |
|---|---|
| No hidden fees | Published pricing, no per-patient surcharges |
| Bitcoin accepted | 5% discount on Lightning/on-chain payments |
| Annual discount | 17% savings on annual plans |
| 30-day refund | Full refund within first 30 days |
| Free tier | Permanently free (not a trial) |
| Self-hosted | Free forever (AGPL-3.0) |

---

## 7. Security & Compliance

### Technical Security Measures

| Layer | Protection |
|---|---|
| **Data at rest** | AES-256-GCM encryption (optional, key-controlled) |
| **Data in transit** | TLS 1.3 (rustls, no OpenSSL) |
| **Authentication** | Argon2id password hashing, JWT tokens (2h expiry) |
| **MFA** | TOTP-based (Google Authenticator, Authy) + 8 recovery codes |
| **Database** | Row-Level Security on 15 user-data tables |
| **Audit** | pgaudit (DDL + writes), data_access_log per query |
| **Rate limiting** | Per-endpoint IP limits (e.g., 5 signups/day, 10 logins/day) |
| **Webhook security** | HMAC-SHA256 verification (Stripe, Strike) |

### What We Do NOT Do

| Practice | Status |
|---|---|
| Sell or share patient data | Never — architectural commitment |
| Use data for advertising | Never |
| Train AI on user data | Never |
| Track user behavior | No analytics, no cookies |
| Store data outside the EU | No (EU hosting, or self-hosted on your own infrastructure) |

### Compliance Status

| Standard | Status |
|---|---|
| **GDPR** | Compliant by design (encryption, RLS, export, deletion, audit) |
| **HIPAA** | Not certified — but technical controls exceed most consumer apps |
| **SOC 2** | Not certified — open-source audit serves as alternative |
| **CE Medical Device** | Not applicable — Sovereign Health is a tracking/analysis tool, not a diagnostic device |

**Note on medical disclaimer:** Sovereign Health provides health data tracking, trend visualization, and AI-assisted insights. It does **not** provide medical diagnoses, treatment recommendations, or replace professional medical judgment. All AI outputs include appropriate disclaimers.

---

## 8. Pricing Overview

| Tier | Monthly | Annual | Best For |
|---|---|---|---|
| **Glimpse** | Free | Free | Patients who want to explore basic tracking |
| **Focus** | €9.99 | €99.90 | Patients serious about tracking (20 markers, full history) |
| **Insight** | €24.99 | €249.90 | Patients who want AI analysis + PDF reports |
| **Clarity** | €49.99 | €499.90 | Biohackers and optimizers (unlimited AI, team sharing) |
| **Horizon** | Custom | Custom | Clinics, nutritionists, health coaches (multi-patient, API) |
| **Self-hosted** | Free | Free | Full control, all features, AGPL-3.0 |

### Clinic Volume Options

For clinics recommending Sovereign Health to patients:

- **Affiliate program** — 20% commission on referred subscriptions
- **Horizon tier** — custom pricing for multi-practitioner setups
- **Self-hosted** — run on your own infrastructure at no cost
- **White-label** — contact us for discussion (not yet available)

---

## 9. Deployment Options

| Option | Infrastructure | Data Location | Cost | Best For |
|---|---|---|---|---|
| **SaaS (Cloud)** | Managed by Sovereign Health | EU (Lithuania) | Tier pricing | Most patients and small clinics |
| **Self-hosted** | Your server (Docker) | Your premises | Free (AGPL-3.0) | Privacy-maximalist clinics, on-premise requirements |
| **Hybrid** (Horizon) | Cloud + on-premise | Configurable | Custom | Large clinics with mixed requirements |

### Self-Hosting Requirements

| Requirement | Minimum |
|---|---|
| OS | Linux (Ubuntu 22.04+), or Windows via Docker Desktop + WSL2 |
| Docker | Engine 24+, Compose v2 |
| RAM | 2 GB |
| Storage | Depends on patient volume |
| Setup time | Under 5 minutes (Docker Compose) |

---

## 10. Getting Started

### For Individual Practitioners

1. **Try it yourself** — sign up for a free Glimpse account at [app.sovereignhealth.io](https://app.sovereignhealth.io)
2. **Track your own biomarkers** for 2–4 weeks to experience the workflow
3. **Recommend Focus or Insight** to patients who would benefit from structured tracking
4. **Review PDF reports** that patients bring to appointments

### For Clinics

1. **Contact us** about the Horizon tier for multi-patient dashboards
2. **Evaluate self-hosting** if on-premise data storage is required
3. **Join the affiliate program** for referral commissions
4. **Request a demo** — we'll walk through the platform with your team

### Contact

| Channel | Details |
|---|---|
| Website | [sovereignhealth.io](https://sovereignhealth.io) |
| Email | contact@sovereignhealth.io |
| Security | security@sovereignhealth.io |
| Source code | [github.com/sovereignbrick/brickos](https://github.com/sovereignbrick/brickos) |

---

## Summary — Why Sovereign Health?

| For Your Patients | For Your Practice |
|---|---|
| Structured tracking replaces guesswork | Better data at every visit |
| AI coaching between appointments | Fewer anxiety-driven calls |
| Full control over their health data | Reduced regulatory risk (GDPR) |
| Works with any lab or device | No vendor lock-in |
| Available in German and English | Self-hosting option for full control |
| Transparent pricing, no hidden costs | Affiliate commissions for referrals |

> **"Your patients become active participants in their health journey — and you get structured, exportable, verifiable data to work with."**
