# EU AI Act -- Voluntary Conformity Assessment for Dr. Alex

**System:** Dr. Alex (AI Health Consultant)
**Provider:** Sovereign Brick / BrickOS
**Assessment date:** 2026-04-06
**Assessor:** Internal (voluntary, pre-launch)
**Methodology:** EU AI Act (Regulation 2024/1689) Annex III risk classification + Art. 9 risk management

---

## 1. System Description

### 1.1 Purpose
Dr. Alex is an AI-powered health data analysis assistant integrated into the Sovereign Health Intelligence platform. It analyzes a user's biomarker measurements, lab results, medications, and health profile to provide personalized health insights and educational content.

### 1.2 Technical Architecture
- **AI Provider:** Anthropic (Claude Sonnet 4 / Haiku 4.5)
- **Integration:** REST API calls to Anthropic's API
- **Input:** User's health question + health context (measurements, medications, profile)
- **Output:** Text-based analysis with references to specific biomarker values
- **Context window:** Last 20 messages + user's health data (360-day window, max 200 measurements)
- **No training on user data:** Anthropic's usage policy prohibits training on API inputs

### 1.3 Intended Use
- Users voluntarily ask health-related questions
- Dr. Alex responds with analysis based on the user's own data
- Analysis is informational and educational -- not diagnostic
- Users are advised to consult their healthcare provider for medical decisions
- No automated actions are taken based on AI output (no prescriptions, no treatment changes, no alerts to doctors)

### 1.4 Users
- Individual consumers tracking their own health data
- Not intended for: healthcare professionals making clinical decisions, medical devices, clinical trials, emergency/critical care

---

## 2. Risk Classification Analysis

### 2.1 Annex III Assessment (High-Risk AI Systems)

The EU AI Act Annex III lists specific categories of high-risk AI. We evaluate each relevant category:

| Annex III Category | Description | Dr. Alex Assessment | High-Risk? |
|---|---|---|---|
| **5(a)** | AI intended to be used as a safety component in the management and operation of road traffic, water, gas, heating, electricity | Not applicable -- Dr. Alex is not infrastructure | **NO** |
| **5(b)** | AI intended to be used as safety components of medical devices or in vitro diagnostic medical devices | Dr. Alex is NOT a medical device. It does not diagnose, treat, monitor, or predict disease. It provides educational analysis. | **NO** |
| **5(c)** | AI systems intended to evaluate the eligibility of persons for health care services | Dr. Alex does not evaluate eligibility. Users have full access regardless of AI output. | **NO** |
| **6(a)** | AI used in recruitment, worker management | Not applicable | **NO** |
| **6(b)** | AI used in education, vocational training | Not applicable | **NO** |
| **7** | AI used in law enforcement, migration, justice | Not applicable | **NO** |
| **8** | AI that interacts with natural persons (chatbots) | Applicable -- transparency required (Art. 50) | **LIMITED RISK** |

### 2.2 Why Dr. Alex is NOT a Medical Device

Under EU MDR (2017/745), a medical device is defined as any instrument, apparatus, software intended for:
- Diagnosis, prevention, monitoring, prediction, prognosis, treatment of disease
- Investigation, replacement, modification of anatomy or physiological process

**Dr. Alex does NOT meet this definition because:**

1. **No diagnostic intent:** Dr. Alex does not output diagnoses. It says "Your glucose is 8.0 mmol/L, which is above the reference range" -- this is data presentation, not diagnosis.
2. **No treatment recommendations:** It does not prescribe medications, dosages, or treatment plans. It provides educational context ("foods that may help keep glucose in range").
3. **No monitoring function:** It does not continuously monitor or alert. Users actively ask questions.
4. **No predictive claims:** It does not predict disease outcomes or prognosis.
5. **User-initiated:** Every interaction is explicitly requested by the user. No automated analysis runs without user action.
6. **Disclaimer present:** Every session includes "AI-generated analysis. Not medical advice."

### 2.3 Impact Assessment

| Impact Dimension | Assessment | Severity |
|---|---|---|
| **Health harm from incorrect analysis** | Low -- users are advised to consult doctors. No automated actions. Worst case: user misinterprets educational content. | LOW |
| **Privacy harm from data leakage** | Mitigated -- encryption at rest, per-user isolation, AI sanitization, no cross-user data in context | LOW |
| **Discrimination/bias** | Low -- analysis is based on user's own numerical data, not demographic profiling. Reference ranges adjust for protocol (keto, fasting) not demographics. | LOW |
| **Autonomy restriction** | None -- users can freely ignore AI output. No automated decisions. | NONE |
| **Economic harm** | None -- AI analysis does not affect insurance, employment, or financial decisions. | NONE |

### 2.4 Risk Level Matrix

| Factor | Score (1-5) | Justification |
|---|---|---|
| Severity of potential harm | 2 | Educational misinterpretation possible but no direct health action |
| Probability of harm | 1 | User must actively misuse educational content AND ignore "consult your doctor" |
| Number of affected persons | 2 | Individual users, not populations |
| Reversibility of harm | 5 | Fully reversible -- no physical intervention, no automated treatment |
| Autonomy of AI | 1 | Zero autonomy -- responds only to explicit user questions |
| **Overall Risk Score** | **2.2 / 5** | **LIMITED RISK** |

---

## 3. Classification Decision

### Decision: LIMITED RISK (Art. 50 -- Transparency Obligations)

Based on the above assessment:

1. Dr. Alex is **not a medical device** under EU MDR
2. Dr. Alex does **not fall under Annex III high-risk categories**
3. Dr. Alex **is** an AI system that interacts with natural persons (Art. 50.1)
4. The risk assessment scores **2.2/5** -- below the high-risk threshold
5. No automated decision-making with legal or similarly significant effects

### Obligations Under Limited Risk (Art. 50)

| Obligation | Implementation | Status |
|---|---|---|
| Inform users they are interacting with AI | "AI-generated analysis" disclaimer in UI | IMPLEMENTED |
| Mark AI-generated content as such | Chat messages from Dr. Alex clearly labeled as "assistant" role | IMPLEMENTED |
| Log AI interactions for auditability | `ai_usage_log` table records all interactions | IMPLEMENTED |
| Provide opt-out mechanism | Users choose to use Dr. Alex; no forced interaction | IMPLEMENTED |

### Why Conformity Assessment is NOT Required

Art. 43 conformity assessment applies only to high-risk AI systems listed in Annex III. Since Dr. Alex:
- Is not classified as high-risk per the Annex III evaluation above
- Is not a medical device per the EU MDR analysis above
- Does not make autonomous decisions affecting users' rights or safety
- Has a documented risk score of 2.2/5 (limited risk)

**A formal third-party conformity assessment is not legally required.**

However, this voluntary self-assessment demonstrates due diligence and can be presented to regulators, auditors, or partners as evidence of responsible AI deployment.

---

## 4. Conditions for Reclassification

Dr. Alex would need to be reclassified as HIGH-RISK if any of these conditions change:

| Condition | Current | Would Trigger Reclassification |
|---|---|---|
| Autonomous medical decisions | No | If Dr. Alex starts prescribing or diagnosing |
| Medical device certification | Not a medical device | If we seek CE marking as medical software |
| Automated alerting to doctors | No | If AI output triggers clinical workflows |
| Integration with medical records | No (personal use only) | If connected to EHR/EMR systems |
| Predictive health scoring | No | If we add disease prediction models |
| Target audience | Individual consumers | If marketed to healthcare professionals for clinical use |

**Review cadence:** Re-evaluate this classification annually or when any feature change touches AI decision-making scope.

---

## 5. Technical Documentation (Art. 11 equivalent, voluntary)

Even though not legally required for limited-risk AI, we maintain:

| Document | Location | Purpose |
|---|---|---|
| AI system architecture | ADR-013, `services/doctor_chat.rs` | Technical implementation |
| Data processing records | `docs/compliance/data-processing-records.md` | What data AI processes |
| AI usage logging | `services/ai_usage.rs`, `ai_usage_log` table | Interaction audit trail |
| Prompt injection defense | `sanitize_ai_input()` in `doctor_chat.rs` | Input security |
| Risk assessment | This document | Risk classification |
| Evidence package | `docs/compliance/evidence/ai-transparency.md` | Control evidence |
| Incident response | `docs/security/incident-response.md` | AI incident handling |

---

## 6. Signature

| Role | Name | Date |
|---|---|---|
| Platform Owner | [To be filled] | 2026-04-06 |
| Technical Lead | [To be filled] | 2026-04-06 |

*This assessment was conducted voluntarily as part of responsible AI deployment practices. It will be reviewed annually or upon material changes to the AI system's capabilities or intended use.*
