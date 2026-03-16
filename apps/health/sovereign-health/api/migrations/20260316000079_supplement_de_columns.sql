-- Migration 079: Add German columns for supplement dose and notes.

ALTER TABLE marker_supplements ADD COLUMN IF NOT EXISTS typical_dose_de VARCHAR(100);
ALTER TABLE marker_supplements ADD COLUMN IF NOT EXISTS notes_de TEXT;

-- Glucose supplements
UPDATE marker_supplements SET
  typical_dose_de = '500 mg 2–3× täglich zu den Mahlzeiten',
  notes_de = 'Aktiviert AMPK ähnlich wie Metformin; senkt den Nüchternblutzucker um 1–2 mmol/L in RCTs.'
WHERE supplement_name = 'Berberine';

UPDATE marker_supplements SET
  typical_dose_de = '200–400 mg täglich',
  notes_de = 'Magnesium ist ein Kofaktor für die Insulinrezeptor-Signalgebung; Mangel ist bei insulinresistenten Personen häufig.'
WHERE supplement_name = 'Magnesium (glycinate)';

UPDATE marker_supplements SET
  typical_dose_de = '600 mg täglich',
  notes_de = 'Antioxidans, das die insulinvermittelte Glukoseaufnahme verbessert; stärkste Evidenz bei peripherer Neuropathie.'
WHERE supplement_name = 'Alpha-Lipoic Acid';

UPDATE marker_supplements SET
  typical_dose_de = '200–1000 mcg täglich',
  notes_de = 'Verstärkt die Insulinwirkung; moderate, aber konsistente Senkung des Nüchternblutzuckers in Metaanalysen.'
WHERE supplement_name = 'Chromium Picolinate';

-- Ketone supplements
UPDATE marker_supplements SET
  typical_dose_de = '15–30 ml täglich',
  notes_de = 'Wird direkt in Ketone umgewandelt, unabhängig von Kohlenhydraten; schneller Ketonschub.'
WHERE supplement_name = 'MCT Oil (C8)';

UPDATE marker_supplements SET
  typical_dose_de = '7–12 g vor dem Training',
  notes_de = 'Erhöht den BHB-Spiegel in Minuten ohne Fasten; nützlich für Sportler und kognitive Leistung.'
WHERE supplement_name = 'Exogenous BHB Salts';

-- Common supplements across markers
UPDATE marker_supplements SET
  typical_dose_de = '2000–5000 IE täglich',
  notes_de = NULL
WHERE supplement_name = 'Vitamin D3' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '1000–2000 mg EPA+DHA täglich'
WHERE supplement_name = 'Omega-3 (EPA/DHA)' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '15–30 mg täglich'
WHERE supplement_name = 'Zinc' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '200 mcg täglich'
WHERE supplement_name = 'Selenium' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '25–50 mg täglich (Bisglycinat)'
WHERE supplement_name = 'Iron (bisglycinate)' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '500–1000 mg täglich'
WHERE supplement_name = 'Vitamin C' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '1000 mcg täglich (sublingual)'
WHERE supplement_name = 'Vitamin B12 (methylcobalamin)' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '400–800 mcg täglich'
WHERE supplement_name = 'Folate (methylfolate)' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '100–200 mg täglich (Ubiquinol)'
WHERE supplement_name = 'CoQ10 (ubiquinol)' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '3–5 g täglich'
WHERE supplement_name = 'Creatine Monohydrate' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '500 mg täglich (mit Piperin)'
WHERE supplement_name = 'Curcumin (with piperine)' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '600 mg täglich (KSM-66)'
WHERE supplement_name = 'Ashwagandha (KSM-66)' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '600–1800 mg täglich'
WHERE supplement_name = 'NAC (N-acetylcysteine)' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '150–300 mg Silymarin täglich'
WHERE supplement_name = 'Milk Thistle (silymarin)' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '10–15 g täglich'
WHERE supplement_name = 'Collagen Peptides' AND typical_dose_de IS NULL;

UPDATE marker_supplements SET
  typical_dose_de = '500–1000 mg täglich (Citrat)'
WHERE supplement_name = 'Calcium (citrate)' AND typical_dose_de IS NULL;
