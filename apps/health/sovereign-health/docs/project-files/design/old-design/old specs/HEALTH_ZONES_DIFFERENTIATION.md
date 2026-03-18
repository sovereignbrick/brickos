# Health Zones Differentiation
**Complete Rationale, German Equivalents, Design Philosophy**

---

## 🎯 Design Philosophy

**Why 8 Functional Health Zones (Not 10 Organ-Based)?**

This system answers **outcome questions**, not lab categories:
- **Aware/Traditional Approach:** Organ-based (Liver, Kidney, Heart) → User thinks "What organ is broken?"
- **Our Approach:** Functional outcome-based → User thinks "What can my body DO?"

**Consequence:**
- Users become health experts (understand mechanisms, not just numbers)
- Multi-zone markers (e.g., Magnesium improves both Energy AND Structural)
- Personalized prioritization (fix Energy first, then Cardiovascular resilience)

---

## 🌍 Language Support

All zone names + descriptions appear in:
- **English (EN)** — i18n key: `zone.{zone_id}.title` / `zone.{zone_id}.description`
- **German (Deutsch, DE)** — same keys, German translations
- **Storage:** User settings include `language_preference` (default: EN)

**German Typography Note:**
- Zone names are 15-25% longer in German (e.g., "Energy & Power" → "Energie & Stoffwechselkraft")
- UI must allow flexible widths; avoid truncation
- Settings screen shows both EN/DE side-by-side for clarity

---

## 8 Health Zones (Detailed)

---

### 1. ⚡ Energy & Metabolic Power

**English Name:** Energy & Metabolic Power  
**German Name:** Energie & Stoffwechselkraft  
**Zone ID:** `energy_metabolism`

**Icon:** ⚡ (Lightning bolt)  
**Color Accent:** Warm Gold (#FFA500)

**The Question We Answer:**
> "Can I have sustained energy throughout the day without crashes?"

**Why This Zone?**
Glucose, insulin, and thyroid function are the **engine** of metabolic health. This zone is the gateway: fix this first, and the rest becomes easier. High insulin or unstable glucose undermines *every other zone*.

**Markers in This Zone (7):**
- Blood Glucose (Fasting)
- Insulin (Fasting) ← **Primary insulin sensitivity marker**
- HbA1c (3-month average glucose)
- TSH (Thyroid stimulating hormone)
- Free T4 (Active thyroid hormone)
- Free T3 (Active thyroid hormone, thermogenesis)
- DHEA-S (Energy hormone, stress recovery)

**Mechanism (Why They Matter):**
- **Glucose + Insulin:** The metabolic foundation. High fasting glucose/insulin → insulin resistance → chaos in 7 other zones.
- **HbA1c:** Historical trend (3-month average). Most important for long-term strategy.
- **TSH/T4/T3:** Metabolic rate, energy production, heat generation. Low T3 = fatigue, weight gain, cold hands.
- **DHEA-S:** Stress resilience, recovery, age-related energy decline.

**Improvement Sequence (Typical):**
1. Fix fasting glucose (5.2–6.2 mmol/L)
2. Reduce insulin (fasting <2.5 mU/L = excellent)
3. Stable HbA1c (aim <5.5%, means consistent metabolic control)
4. Verify thyroid (TSH 2–4 mIU/L is sweet spot for most)

**Actionable Triggers:**
- 🟢 **Green:** Glucose 5.2–6.2, Insulin <2.5, HbA1c <5.5%
- 🟡 **Yellow:** Glucose 6.3–6.8, Insulin 2.5–3.5, HbA1c 5.5–5.9%
- 🔴 **Red:** Glucose >6.8, Insulin >3.5, HbA1c >6.0% → See clinician

**German Description:**
Der Energiemotor deines Körpers. Glucose und Insulin bestimmen, ob du den ganzen Tag über stabil Energie hast oder in Tiefs verfällst. Dies ist die Basis — repariere diese Zone zuerst.

---

### 2. 💪 Structural Integrity & Building Blocks

**English Name:** Structural Integrity & Building Blocks  
**German Name:** Strukturelle Integrität & Bausteine  
**Zone ID:** `structural_building`

**Icon:** 💪 (Muscle arm)  
**Color Accent:** Ocean Blue (#1E90FF)

**The Question We Answer:**
> "Are my bones, muscles, and connective tissues strong and resilient?"

**Why This Zone?**
Calcium, magnesium, potassium, proteins, and vitamins D build the structural scaffolding. Without them, injuries, weak bones, muscle loss, and poor recovery are inevitable. This zone is about *durability*.

**Markers in This Zone (9):**
- Albumin (Protein status, collagen precursor)
- Total Protein
- Calcium (Bone health, muscle contraction)
- Magnesium (Co-factor for 300+ enzymes, muscle relaxation, bone density)
- Potassium (Muscle contraction, cellular hydration, nerve signals)
- Creatinine (Muscle mass proxy, kidney function)
- Vitamin D (Calcium absorption, immune function, mood)
- Iron (Oxygen transport, mitochondrial function)
- Phosphate (Bone mineralization)

**Mechanism (Why They Matter):**
- **Albumin + Protein:** Building blocks for muscle, collagen, skin. Low = muscle wasting, poor recovery.
- **Calcium + Phosphate + Vit D:** Bone mineralization. Without these, osteoporosis risk rises.
- **Magnesium:** Relaxes muscles, improves sleep quality, stabilizes glucose. Depleted by stress and fasting.
- **Potassium:** Regulates water balance, nerve signals, muscle contraction. High salt without K = muscle cramps.
- **Iron:** Oxygen carrier, mitochondrial electron transport. Low = fatigue, poor exercise performance.
- **Creatinine:** Muscle mass proxy. Stable creatinine = stable muscle (unless kidney disease).

**Improvement Sequence (Typical):**
1. Ensure adequate protein intake (track with albumen/total protein)
2. Sufficient magnesium (300-400 mg/day; symptoms: muscle tension, sleep issues)
3. Vitamin D optimization (aim 75–125 nmol/L / 30–50 ng/mL)
4. Iron status if fatigued (ferritin 30–100 ng/mL is optimal)

**Actionable Triggers:**
- 🟢 **Green:** Albumin >35 g/L, Mg >0.85 mmol/L, VitD >75 nmol/L
- 🟡 **Yellow:** Albumin 30–35, Mg 0.75–0.85, VitD 50–75
- 🔴 **Red:** Albumin <30, Mg <0.75, VitD <50 → Increased risk of fractures, weak muscles

**German Description:**
Die Bausteine deines Körpers. Ohne genug Kalzium, Magnesium und Protein werden Knochen schwach, Muskeln schrumpfen und Verletzungen werden häufiger. Dies ist Dauerhaftigkeit.

---

### 3. 🫀 Cardiovascular Resilience

**English Name:** Cardiovascular Resilience  
**German Name:** Kardiovaskuläre Widerstandskraft  
**Zone ID:** `cardiovascular_resilience`

**Icon:** 🫀 (Heart)  
**Color Accent:** Crimson Red (#DC143C)

**The Question We Answer:**
> "Is my heart and circulation strong and do I have low cardiovascular disease risk?"

**Why This Zone?**
Cardiovascular disease is the #1 global killer. This zone focuses on *true risk* (particle count via ApoB), not just cholesterol levels. Blood pressure and heart rate reveal day-to-day resilience.

**Markers in This Zone (9):**
- Blood Pressure (Systolic + Diastolic)
- Resting Heart Rate
- Total Cholesterol
- LDL-Cholesterol (Particle count proxy, but inferior to ApoB)
- HDL-Cholesterol (Anti-inflammatory HDL)
- Triglycerides (Metabolic dysfunction marker)
- **ApoB** (TRUE cardiovascular risk marker — particle count)
- Lipoprotein(a) / Lp(a) (Genetic risk, independent of cholesterol)
- hs-CRP (Vascular inflammation)

**Mechanism (Why They Matter):**
- **ApoB (PRIMARY MARKER):** Counts the number of atherogenic particles. If ApoB is high, plaque risk is HIGH, regardless of total cholesterol. This is the #1 predictor of CVD events.
- **Blood Pressure:** Chronic elevation damages arteries. 100–120 / 65–80 is optimal.
- **Heart Rate:** Elevated resting HR (>80) suggests cardiovascular deconditioning or stress.
- **HDL/TG Ratio:** HDL protects arteries; high TG + low HDL = metabolic dysfunction.
- **Lp(a):** Genetic risk factor (cannot be lowered much). Inherited from parents.
- **hs-CRP:** Arterial inflammation. <1.0 mg/L is low risk.

**Improvement Sequence (Typical):**
1. **Reduce ApoB** (main lever: reduce refined carbs, optimize fasting, increase soluble fiber)
2. **Lower BP** (sodium balance, potassium, magnesium, stress management)
3. **Lower TG** (reduce fructose, increase omega-3)
4. **Raise HDL** (exercise, sleep, unsaturated fats)

**Actionable Triggers:**
- 🟢 **Green:** ApoB <1.4 g/L, BP <120/80, HR 55–70, TG <1.5, hs-CRP <1.0
- 🟡 **Yellow:** ApoB 1.4–1.8, BP 120–130, HR 70–80, TG 1.5–3.0
- 🔴 **Red:** ApoB >1.8, BP >130/80, HR >80 resting, TG >3.0, Lp(a) >75 nmol/L → Discuss with cardiologist

**German Description:**
Das Herz ist eine Pumpe, und die Arterien sind Rohre. ApoB sagt dir, wie viele Cholesterin-Partikel in deinen Arterien sind — das ist die echte Gefahr. Blutdruck und Pulsrate zeigen tägliche Belastbarkeit.

---

### 4. 🧠 Cognitive & Nervous System

**English Name:** Cognitive & Nervous System  
**German Name:** Gehirn & Nervensystem  
**Zone ID:** `cognitive_nervous`

**Icon:** 🧠 (Brain)  
**Color Accent:** Purple (#9370DB)

**The Question We Answer:**
> "Is my brain sharp, memory clear, and mood stable?"

**Why This Zone?**
Brain health is neglected. Markers like B12, folate, magnesium, and thyroid hormones directly impact cognition, memory, and depression risk. This zone is **prevention for dementia and cognitive decline**.

**Markers in This Zone (8):**
- Vitamin B12 (Neurological protection, energy, mood)
- Folate / B9 (Methylation, homocysteine regulation, mood)
- Vitamin B6 (Neurotransmitter synthesis, mood regulation)
- Magnesium (NMDA receptor blocker, anxiety reduction, neural plasticity)
- Testosterone (Cognitive function, motivation, mood in men)
- Estradiol (Memory, neuroprotection in women)
- Free T3 (Brain metabolism, mood, executive function)
- Creatinine (Muscle mass = metabolic proxy for brain protection)

**Mechanism (Why They Matter):**
- **B12 + B9 (Folate):** Control homocysteine (high = dementia risk). Essential for myelin (nerve insulation).
- **B6:** Makes serotonin, dopamine, GABA. Low = depression, irritability.
- **Magnesium:** Stabilizes neurons, reduces anxiety, improves sleep quality and memory consolidation.
- **Testosterone + Estradiol:** Sex hormones optimize cognition, motivation, mood. Low = depression, memory loss.
- **Free T3:** Brain runs on glucose + thyroid. Low T3 = brain fog, depression, fatigue.

**Improvement Sequence (Typical):**
1. Ensure B12 >300 pmol/L (vegetarians often deficient)
2. Optimize folate (support methylation)
3. Sufficient magnesium (often depleted by stress)
4. Verify thyroid T3 (not just TSH)
5. Check sex hormones (testosterone in men often low by 50s)

**Actionable Triggers:**
- 🟢 **Green:** B12 >300 pmol/L, Folate >7 µg/L, Mg >0.85 mmol/L, Homocysteine <10 µmol/L
- 🟡 **Yellow:** B12 200–300, Folate 5–7, Mg 0.75–0.85, Homocysteine 10–15
- 🔴 **Red:** B12 <200 (B12 deficiency anemia risk), Homocysteine >15 → See neurologist/internist

**German Description:**
Das Gehirn ist kein Ersatzteil. Vitamin B12, Folat und Magnesium schützen deine Neuronen. Testosterone und Östrogen optimieren deine Kognitionen und Stimmung. Dies ist Vorbeugung gegen Demenz.

---

### 5. 🛡️ Immune & Inflammatory Balance

**English Name:** Immune & Inflammatory Balance  
**German Name:** Immune- & Entzündungsausgleich  
**Zone ID:** `immune_inflammation`

**Icon:** 🛡️ (Shield)  
**Color Accent:** Teal (#20B2AA)

**The Question We Answer:**
> "Is my immune system balanced — not overreacting and not underdefended?"

**Why This Zone?**
Too much inflammation = disease; too little immunity = infections. This zone is about **balance**. White blood cells, C-reactive protein, and nutrient status (vitamin D, zinc, selenium) determine immune resilience.

**Markers in This Zone (17):**
- **White Blood Cell Counts (5 types):**
  - Total WBC
  - Lymphocytes (T cells, B cells, NK cells)
  - Neutrophils (First responders, bacterial defense)
  - Monocytes (Clean-up, antigen presentation)
  - Eosinophils (Parasites, allergy response)
  - Basophils (Allergic response)
  
- **Red Blood Cell Status:**
  - RBC count
  - Hemoglobin
  - Hematocrit
  
- **Inflammatory Markers:**
  - hs-CRP (High-sensitivity C-reactive protein)
  - Lp(a) (Also pro-inflammatory)
  
- **Micronutrients (Immune support):**
  - Vitamin D (T cell maturation, anti-inflammatory)
  - Selenium (Antioxidant, antiviral)
  - Zinc (Immune cell proliferation, wound healing)

**Mechanism (Why They Matter):**
- **WBC Differential:** Out-of-range values suggest infection (high neutrophils), allergy (high eosinophils), or immune suppression (low lymphocytes).
- **hs-CRP:** Chronic inflammation marker. <1.0 is ideal; >3.0 suggests systemic inflammation (CVD, autoimmune, infection).
- **RBC/Hct:** Low = anemia (reduces oxygen delivery); high = dehydration or polycythemia (thick blood, clot risk).
- **Vit D:** Deficiency linked to infection, autoimmunity, cancer. Optimal 75–125 nmol/L.
- **Zinc + Selenium:** Cofactors for immune enzyme production. Low = slow wound healing, infection susceptibility.

**Improvement Sequence (Typical):**
1. Optimize vitamin D (75–125 nmol/L)
2. Ensure sufficient zinc (15–20 mg/day from food or supplement)
3. Provide selenium (200 µg/day, Brazil nuts are excellent)
4. Monitor hs-CRP (reflect lifestyle; fasting, sleep, stress lower it)
5. Maintain hydration (steady hematocrit 42–47%)

**Actionable Triggers:**
- 🟢 **Green:** WBC 4.5–11.0, Lymph% 20–40%, VitD >75 nmol/L, hs-CRP <1.0
- 🟡 **Yellow:** WBC 3.5–4.5 or 11–15, Lymph% 18–20%, VitD 50–75, hs-CRP 1.0–3.0
- 🔴 **Red:** WBC <3.5 or >15 (suggests acute infection or immune suppression), VitD <50, hs-CRP >3.0 → See physician

**German Description:**
Immun-Balance ist wie ein Schild: Zu schwach, und du wirst krank; zu aggressiv, und du greifst dich selbst an. Vitamin D, Zink und Selen halten das Gleichgewicht.

---

### 6. 🔄 Detoxification & Waste Clearance

**English Name:** Detoxification & Waste Clearance  
**German Name:** Entgiftung & Abfallausscheidung  
**Zone ID:** `detoxification_clearance`

**Icon:** 🔄 (Circular arrows, recycling)  
**Color Accent:** Sage Green (#9DC183)

**The Question We Answer:**
> "Can my body efficiently process and eliminate metabolic waste and toxins?"

**Why This Zone?**
Liver and kidneys are the filtration system. ALT/GGT (liver), creatinine/eGFR (kidneys), uric acid, and bilirubin reveal how well your detox pathways work. Damage here cascades.

**Markers in This Zone (13):**
- **Liver Enzymes (5):**
  - ALT / ALAT (Alanine aminotransferase — hepatocyte leakage marker)
  - AST / ASAT (Aspartate aminotransferase — hepatocyte injury)
  - GGT (Gamma-glutamyl transferase — oxidative stress, fatty liver indicator)
  - ALP (Alkaline phosphatase — cholestasis, bone metabolism)
  - LDH (Lactate dehydrogenase — tissue injury marker)
  
- **Bilirubin (2):**
  - Total bilirubin (Hemoglobin breakdown product, liver processing)
  - Direct bilirubin (Bile duct clearance)
  
- **Kidney Function (3):**
  - Creatinine (Muscle breakdown product, kidney filtration proxy)
  - eGFR (Estimated glomerular filtration rate — kidney function)
  - Cystatin C (Kidney function marker, less influenced by muscle mass)
  
- **Waste Products (2):**
  - Uric Acid (Purine metabolism byproduct; high = gout, CVD risk)
  - Albumin (Synthesized by liver; also a transport protein)
  - Total Protein (Liver synthesis capacity)
  
- **Electrolytes/Support (1):**
  - Magnesium (Cofactor for detoxification enzymes)

**Mechanism (Why They Matter):**
- **ALT/GGT:** Rising ALT suggests hepatocyte injury (NAFLD, viral hepatitis, medications). GGT may rise with fatty liver, fructose overconsumption.
- **eGFR:** <60 = significant kidney function loss; <30 = kidney failure approaching. Creatinine alone doesn't capture this in elderly/low-muscle individuals.
- **Uric Acid:** High (>480 µmol/L) = gout risk, CVD risk, metabolic syndrome. Driven by fructose, alcohol, dehydration.
- **Bilirubin:** Elevated = hemolysis, liver disease, or bile duct blockage. Mild elevation in Gilbert's syndrome is benign.
- **Albumin:** Low = malnutrition, liver failure, or kidney disease (protein loss in urine).

**Improvement Sequence (Typical):**
1. Reduce ALT/GGT (eliminate fructose, reduce alcohol, increase aerobic exercise)
2. Lower uric acid (hydrate, limit purine-rich foods, fasting windows)
3. Protect kidneys (manage BP, avoid NSAIDs, limit protein if eGFR <60)
4. Support detox pathways (adequate magnesium, b vitamins, antioxidants)

**Actionable Triggers:**
- 🟢 **Green:** ALT <35 IU/L, GGT <50, Creatinine <100 µmol/L, eGFR >60, UA 280–360, Albumin >35
- 🟡 **Yellow:** ALT 35–50, GGT 50–100, Creatinine 100–130, eGFR 45–60, UA 360–450
- 🔴 **Red:** ALT >50 + rising, GGT >100, eGFR <45 → See hepatologist/nephrologist

**German Description:**
Leber und Nieren sind deine Filter. Ohne sie sammeln sich Giftstoffe an. ALT, GGT und eGFR zeigen dir, wie gut dein Körper aufräumt. Vernachlässige diese Zone nicht.

---

### 7. 🎯 Hormonal Harmony

**English Name:** Hormonal Harmony  
**German Name:** Hormonelles Gleichgewicht  
**Zone ID:** `hormonal_harmony`

**Icon:** 🎯 (Target/bullseye)  
**Color Accent:** Rose Pink (#FF69B4)

**The Question We Answer:**
> "Are my sex hormones, reproductive health, and stress resilience optimized?"

**Why This Zone?**
Hormones orchestrate metabolism, mood, libido, and recovery. In your 50s, testosterone often declines; estrogen shifts (in women). This zone is about **thriving, not just surviving**.

**Markers in This Zone (9):**
- **Hypothalamic-Pituitary Axis:**
  - FSH (Follicle-stimulating hormone — fertility, menopause marker)
  - LH (Luteinizing hormone — fertility, ovulation trigger)
  
- **Testosterone Pathway:**
  - Total Testosterone (Overall anabolic status)
  - Free Testosterone (Bioavailable, active form)
  - Sex Hormone Binding Globulin / SHBG (Binds testosterone; high = less free T)
  - Free Androgen Index (Free T / SHBG — bioavailable androgen)
  
- **Female Sex Hormones:**
  - Estradiol (Neuroprotection, bone health, mood)
  - Progesterone (Sleep, anxiety reduction, metabolic regulation)
  
- **Lactation/Stress:**
  - Prolactin (Lactation hormone, elevated in stress/depression)

**Mechanism (Why They Matter):**
- **Testosterone:** Energy, muscle, libido, bone density, mood. Age-related decline is normal, but optimizing improves quality of life.
- **Free T vs. Total T:** High SHBG reduces free testosterone (insulin, estrogen, leptin increase SHBG). This is why obese men have low testosterone activity.
- **FSH/LH:** In men, elevated FSH suggests testicular decline. In women, elevated FSH signals menopause onset.
- **Estradiol:** Protective for brain, bones, cardiovascular system. Deficiency (post-menopause) increases CVD, osteoporosis, mood disorders.
- **Progesterone:** Calming, pro-sleep. Low = anxiety, insomnia, rapid aging.
- **Prolactin:** Elevated in depression, stress, sleep deprivation, prolactinoma.

**Improvement Sequence (Typical):**
1. Optimize insulin sensitivity (improves testosterone/reduces SHBG)
2. Adequate sleep (7–9 hrs; critical for testosterone synthesis)
3. Strength training (increases testosterone, improves SHBG balance)
4. Manage stress (cortisol excess suppresses sex hormones)
5. If very low, discuss TRT or HRT with endocrinologist

**Actionable Triggers (Men, 56 yo):**
- 🟢 **Green:** Total T >15 nmol/L, Free T >300 pmol/L, LH normal (5–20 IU/L)
- 🟡 **Yellow:** Total T 10–15, Free T 200–300, LH elevated (>20)
- 🔴 **Red:** Total T <10, Free T <200, symptoms of fatigue/depression → Discuss TRT with endocrinologist

**Actionable Triggers (Women, if applicable):**
- Perimenopause: FSH >20 IU/L, Estradiol declining
- Post-menopause: FSH >30, Estradiol <110 pmol/L

**German Description:**
Hormone sind deine Dirigenten. Testosteron gibt dir Energie und Muskeln; Estradiol schützt dein Gehirn und deine Knochen. Im Alter sinken sie ab — aber du kannst die Senkung verlangsamen.

---

### 8. 🌱 Nutritional Sufficiency

**English Name:** Nutritional Sufficiency  
**German Name:** Nährstoffbedarf erfüllt  
**Zone ID:** `nutritional_sufficiency`

**Icon:** 🌱 (Sprout/plant growth)  
**Color Accent:** Lime Green (#32CD32)

**The Question We Answer:**
> "Do I have sufficient micronutrients to run my cells optimally?"

**Why This Zone?**
Vitamins and minerals are cofactors for thousands of enzymes. Deficiencies cascade quietly (fatigue, poor immunity, slow recovery). This zone is about **prevention and optimization**.

**Markers in This Zone (14):**
- **Fat-Soluble Vitamins (3):**
  - Vitamin A (Vision, immune function, skin)
  - Vitamin D (Calcium absorption, immune, mood)
  - Vitamin E (Antioxidant, cardiovascular protection)
  
- **Water-Soluble B Vitamins (6):**
  - B1 / Thiamine (Energy metabolism, nerve function)
  - B2 / Riboflavin (Electron transport, FAD cofactor)
  - B3 / Niacin (NAD metabolism, energy, cholesterol)
  - B5 / Pantothenic Acid (CoA synthesis, stress hormone production)
  - B6 / Pyridoxine (Amino acid metabolism, neurotransmitters)
  - B12 / Cobalamin (Neurological, methylation) [also in Cognitive zone]
  - Folate / B9 (Methylation, homocysteine control) [also in Cognitive zone]
  
- **Minerals (4):**
  - Calcium (Bones, muscle contraction) [also in Structural]
  - Magnesium (300+ enzyme cofactor) [also in Structural & Cognitive]
  - Potassium (Muscle/nerve function, hydration balance)
  - Sodium (Nerve signals, fluid balance)
  
- **Trace Elements (2):**
  - Iron (Oxygen transport, mitochondria) [also in Structural]
  - Selenium (Thyroid, antioxidant, immune)
  - Zinc (Immune, wound healing, taste)
  
- **Omega-3 Fatty Acids (3):**
  - EPA (Eicosapentaenoic acid — inflammation reduction, mood, cardiovascular)
  - DHA (Docosahexaenoic acid — brain, retina, heart)
  - Omega-3 Index (Ratio of Omega-3 to Total Fatty Acids; higher = better)

**Mechanism (Why They Matter):**
- **B Vitamins:** Energy metabolism (convert food to ATP). Deficiency = fatigue, brain fog, peripheral neuropathy.
- **Magnesium:** Activates 300+ enzymes. Deficiency = muscle tension, sleep issues, anxiety.
- **Iron:** Oxygen transport, mitochondrial cytochrome function. Low = fatigue, exercise intolerance.
- **Vitamin D:** Immune T cell maturation, bone health, mood regulation. Deficiency linked to depression, osteoporosis, infection risk.
- **Omega-3 (EPA/DHA):** Anti-inflammatory, protective for heart and brain. Most people are deficient (Western diet is high Omega-6).

**Improvement Sequence (Typical):**
1. Vitamin D optimization first (75–125 nmol/L)
2. Ensure sufficient B12 (especially if vegetarian/vegan)
3. Iron status if fatigued (ferritin 30–100 ng/mL)
4. Magnesium via food (spinach, pumpkin seeds) or supplement
5. Omega-3 (fatty fish 2–3x/week OR algae supplement)

**Actionable Triggers:**
- 🟢 **Green:** VitD >75 nmol/L, B12 >300 pmol/L, Folate >7 µg/L, Ferritin 30–100, Omega-3 Index >8%
- 🟡 **Yellow:** VitD 50–75, B12 200–300, Ferritin 20–30, Omega-3 Index 5–8%
- 🔴 **Red:** VitD <50, B12 <200 (B12 deficiency risk), Ferritin <15 (anemia risk), Omega-3 <4% → Consider supplementation + diet change

**German Description:**
Mikronährstoffe sind wie Öl in einem Motor — ohne sie läuft alles knirscht und bricht. Vitamin D, B12, Magnesium und Omega-3 sind die Top-4 Mängel im modernen Leben.

---

## 🎨 Design Tokens (Rebranding: Slick & Simple)

**No Aware References** — Fresh, Modern, Functional  
**Unified Zone Design** — Marker colors (Ampel) take priority, not zone colors

### Color Palette

**Neutral Zone Containers:**
- Zone Card Background: #FFFFFF (Pure white, no color distinction)
- Zone Border: #E8E8E8 (Subtle divider, all zones same)
- Zone Header Background: #F5F5F5 (Neutral gray header)
- Zone Title Text: #1A1A1A (Dark gray, consistent)

**Background & Base:**
- App Background: #FAFAFA (Off-white, very subtle)
- Card Background: #FFFFFF (Pure white)
- Text Primary: #1A1A1A (Almost black, not #000000)
- Text Secondary: #666666 (Mid-gray)
- Dividers: #E8E8E8 (Light gray)
- Border: #D0D0D0 (Subtle gray)

**Icon Colors (Zone Identifiers, Subtle):**
- Each zone icon is rendered in muted gray (#888888) or icon's natural color (not zone-specific)
- Icon serves to **identify** the zone, not color-code it
- This keeps the visual focus on **Ampel status colors** (what matters: data quality)

**Status Badges (PRIMARY VISUAL FOCUS):**
- 🟢 Green (In Range): #27AE60 (vibrant, healthy)
- 🟡 Yellow (Warning): #F39C12 (attention-grabbing)
- 🔴 Red (Out of Range): #E74C3C (urgent, action needed)

**Why Neutral Zone Colors?**
The Ampel (🟢🟡🔴) status of each marker is what matters. By keeping zone backgrounds neutral, the status colors **pop** and guide user attention to data quality, not aesthetics. This is data-first, not design-first.

### Typography (Responsive)

**Desktop:**
- H1: 32px, Bold, Primary Text
- H2: 24px, Bold, Primary Text
- H3: 18px, SemiBold, Primary Text
- Body: 16px, Regular, Secondary Text
- Caption: 12px, Regular, Secondary Text (lighter)

**Mobile (375px–767px):**
- H1: 24px
- H2: 20px
- H3: 16px
- Body: 14px
- Caption: 11px

### Spacing System

Base unit: 4px

- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px
- `2xl`: 32px
- `3xl`: 48px
- `4xl`: 64px

### Border Radius

- Buttons + Small elements: 6px
- Cards: 12px
- Large containers: 16px
- Full-width rounded: 20px

### Shadows (Minimal, Modern)

- **Light Shadow (Cards):** `0 1px 3px rgba(0,0,0,0.08)`
- **Medium Shadow (Hover):** `0 4px 8px rgba(0,0,0,0.12)`
- **Deep Shadow (Modals):** `0 8px 16px rgba(0,0,0,0.15)`

---

## 📱 Responsive Design Principles

**German Space Consideration:**
- German text is 15–25% longer than English
- Buttons, labels, and card widths must flex
- Avoid fixed-width containers; use `max-width` + padding
- Example: "Energy & Metabolic Power" (26 chars EN) vs. "Energie & Stoffwechselkraft" (28 chars DE)

**Breakpoints:**
- Mobile: 0–374px (small phone)
- Mobile+: 375–599px (standard phone)
- Tablet: 600–1023px
- Desktop: 1024px+

**German Typography Adjustments:**
- Line height: 1.6 (vs. 1.5 for EN) to accommodate longer text
- Padding around labels: +4px horizontal
- Input fields: min-width 280px (not 240px)

---

## ✅ Approval Checklist

- [ ] All 8 zone names + German equivalents approved
- [ ] "Why" rationale makes sense per zone
- [ ] Markers feel correct (not too many, not too few)
- [ ] Color palette distinct from Aware
- [ ] Typography responsive for German
- [ ] Design tokens documented
- [ ] Ready to proceed to i18n structure

---

_This document is the foundation for app design and backend schema. Share feedback on zone names, marker selections, or color preferences._
