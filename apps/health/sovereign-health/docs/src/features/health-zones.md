# Health Zones

Sovereign Health organizes 84+ biomarkers into 8 health zones. Each zone represents a major area of metabolic health and contains related markers that are displayed together on the dashboard.

## The 8 Zones

### 1. Metabolic Energy

Core glucose and insulin metabolism. This zone tracks how your body produces and regulates energy.

**Markers:** glucose, fasting insulin, HbA1c, ketones, C-peptide, fructosamine, GKI (calculated), HOMA-IR (calculated)

### 2. Cardiovascular

Heart and vascular health, including lipid panels and blood pressure.

**Markers:** total cholesterol, LDL cholesterol, HDL cholesterol, triglycerides, VLDL, Lp(a), ApoB, systolic BP, diastolic BP, resting heart rate, TG/HDL ratio (calculated)

### 3. Body Composition

Physical measurements for body size and fat distribution.

**Markers:** weight, body fat percentage, waist circumference, hip circumference, height, BMI (calculated), WHtR (calculated)

### 4. Inflammation & Immunity

Inflammatory markers and immune system indicators.

**Markers:** hs-CRP, ESR, WBC, IL-6, TNF-alpha, ferritin, fibrinogen, homocysteine

### 5. Liver Function

Liver enzyme levels and related metabolic markers.

**Markers:** ALT, AST, GGT, ALP, total bilirubin, direct bilirubin, albumin, total protein, AST/ALT ratio (calculated)

### 6. Kidney Function

Kidney filtration and waste elimination markers.

**Markers:** creatinine, BUN, eGFR, uric acid, cystatin C, BUN/creatinine ratio (calculated)

### 7. Thyroid

Thyroid hormone production and regulation.

**Markers:** TSH, free T3, free T4, reverse T3, TPO antibodies, thyroglobulin antibodies, free T3/reverse T3 ratio (calculated)

### 8. Blood Health

Red blood cell production, iron status, and oxygen-carrying capacity.

**Markers:** hemoglobin, hematocrit, RBC count, MCV, MCH, MCHC, RDW, platelets, iron, TIBC, transferrin saturation, vitamin B12, folate

## Dashboard Organization

The dashboard displays zones as cards, each showing:

- Zone name and icon
- Number of markers tracked in the zone
- Overall zone status (based on the most recent measurements)
- Mini trend indicators for key markers

Clicking a zone card navigates to the zone detail page, which lists all markers in that zone with their latest values and traffic light status.

## Traffic Light System

Every measurement receives a status based on reference ranges:

- **Green:** Value is within the optimal range
- **Yellow:** Value is outside optimal but within acceptable limits
- **Red:** Value is outside acceptable limits and warrants attention

Reference ranges are protocol-aware. A fasting glucose of 95 mg/dL might be green under a standard diet but yellow during a prolonged fast, where lower values are expected.

## Calculated Markers

Some markers are derived automatically from other measurements:

| Calculated Marker | Formula | Zone |
|-------------------|---------|------|
| GKI | glucose (mmol/L) / ketones (mmol/L) | Metabolic Energy |
| HOMA-IR | (fasting insulin x fasting glucose) / 405 | Metabolic Energy |
| BMI | weight (kg) / height (m)^2 | Body Composition |
| WHtR | waist circumference / height | Body Composition |
| TG/HDL | triglycerides / HDL cholesterol | Cardiovascular |
