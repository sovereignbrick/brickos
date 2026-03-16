# Sovereign Health

Sovereign Health is a privacy-first metabolic health tracking platform. It helps you log biomarkers, track trends over time, and understand what your lab results actually mean. The platform is open source (AGPL-3.0) and designed to be self-hosted.

## Core Principles

**Privacy-first.** Your health data is encrypted at rest with AES-256-GCM. Even the server administrator cannot read your measurement values. There is no telemetry, no tracking, and no data sharing.

**Protocol-aware.** If you practice intermittent fasting, keto, or carnivore, your reference ranges should reflect that. Sovereign Health adjusts thresholds based on your active protocol so a "high" ketone reading during a 48-hour fast is not flagged as abnormal.

**Trend-first.** A single lab result is noise. Sovereign Health emphasizes rolling averages, trend direction, and phase comparisons over individual data points. The dashboard shows where you are heading, not just where you are today.

**Self-hosted.** You own the server, the database, and the encryption keys. Run it on a $5/month VPS or a Raspberry Pi. No cloud account required.

## What You Can Track

Sovereign Health supports 84+ biomarkers organized into 8 health zones:

- **Metabolic Energy** (glucose, ketones, insulin, HbA1c, GKI, HOMA-IR)
- **Cardiovascular** (total cholesterol, LDL, HDL, triglycerides, blood pressure, TG/HDL ratio)
- **Body Composition** (weight, body fat, waist circumference, BMI, WHtR)
- **Inflammation & Immunity** (CRP, ESR, WBC, IL-6, ferritin)
- **Liver Function** (ALT, AST, GGT, bilirubin, albumin, ALP)
- **Kidney Function** (creatinine, BUN, eGFR, uric acid, BUN/creatinine ratio)
- **Thyroid** (TSH, free T3, free T4, reverse T3, TPO antibodies)
- **Blood Health** (hemoglobin, hematocrit, RBC, platelets, MCV, iron, TIBC)

Each marker includes descriptions, optimal reference ranges, related foods, supplements, and published references.

## Key Features

- **Traffic light status** for every measurement (green, yellow, red)
- **Calculated markers** derived automatically (GKI, BMI, HOMA-IR, WHtR, TG/HDL)
- **Dr. Alex AI assistant** with 6 specialist modes for contextual health guidance
- **Medication tracking** with interaction warnings and marker effect annotations
- **Data export** in JSON format for portability
- **Dark-themed UI** built with Next.js and Tailwind CSS

## SaaS vs. OSS

Sovereign Health is available in two modes:

- **OSS (self-hosted):** All features unlocked, no tier limits, bring your own AI key. Set `SHI_MODE=oss` in your environment.
- **SaaS (sovereignhealth.io):** Hosted service with tiered plans (Glimpse free tier, Focus, Insight, Clarity, Horizon). Features and quotas are gated by your subscription.

## Getting Started

Head to [Quick Start](./getting-started/quick-start.md) to have a running instance in under 5 minutes.
