-- Migration: Comprehensive reference ranges + tooltips for all markers + diet protocols
-- Sprint 014 QA: fills all NULL ranges, adds keto/carnivore protocol overrides,
-- populates marker_translations.tooltip with consistent format.
-- Format: "Name (Abbreviation) -- description. LOINC:xxxxx"
--
-- IMPORTANT: All ON CONFLICT DO UPDATE to be idempotent.

-- ============================================================
-- PART 1: MARKER TOOLTIPS (marker_translations.tooltip)
-- Format: display_name -- description sentence. LOINC:code
-- ============================================================

-- Energy & Metabolic
UPDATE marker_translations SET tooltip = 'Blood Glucose (Glc) measures the concentration of glucose circulating in your bloodstream. It is your body''s primary fuel source and must be kept within a narrow range. LOINC:2345-7' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'glucose') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Blutzucker (Glc) misst die Konzentration von Glukose im Blut. Er ist die primaere Energiequelle des Koerpers und muss in einem engen Bereich gehalten werden. LOINC:2345-7' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'glucose') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Blood Ketones (BHB) measures beta-hydroxybutyrate, the primary ketone body used as fuel during fasting or low-carb diets. LOINC:53061-8' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ketones') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Blutketone (BHB) misst Beta-Hydroxybutyrat, den wichtigsten Ketonkoerper als Energiequelle bei Fasten oder Low-Carb-Ernaehrung. LOINC:53061-8' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ketones') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Fasting Insulin (Ins) measures the hormone that regulates blood sugar uptake into cells. Elevated fasting insulin is an early marker of insulin resistance. LOINC:2484-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'insulin') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Nuechterninsulin (Ins) misst das Hormon, das die Blutzuckeraufnahme in Zellen reguliert. Erhoehtes Nuechterninsulin ist ein frueher Marker fuer Insulinresistenz. LOINC:2484-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'insulin') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'HbA1c (Glycated Hemoglobin) reflects your average blood sugar over the past 2-3 months. It is the gold standard for long-term glucose control. LOINC:4548-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hba1c') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'HbA1c (glykiertes Haemoglobin) zeigt den durchschnittlichen Blutzucker der letzten 2-3 Monate. Es ist der Goldstandard fuer die langfristige Glukosekontrolle. LOINC:4548-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hba1c') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'TSH (Thyroid-Stimulating Hormone) controls your thyroid gland. High TSH suggests underactive thyroid; low TSH suggests overactive. LOINC:3016-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'tsh') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'TSH (Thyreotropin) steuert die Schilddruese. Hoher TSH deutet auf Unterfunktion, niedriger TSH auf Ueberfunktion hin. LOINC:3016-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'tsh') AND locale = 'de';

-- Cardiovascular
UPDATE marker_translations SET tooltip = 'Total Cholesterol (TC) measures all cholesterol in your blood including LDL, HDL, and VLDL. Context matters more than the number alone. LOINC:2093-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'total_cholesterol') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Gesamtcholesterin (TC) misst das gesamte Cholesterin im Blut einschliesslich LDL, HDL und VLDL. Der Kontext ist wichtiger als die Zahl allein. LOINC:2093-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'total_cholesterol') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'LDL Cholesterol (LDL) carries cholesterol to your arteries. High LDL, especially small dense particles, increases cardiovascular risk. LOINC:2089-1' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ldl_c') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'LDL-Cholesterin (LDL) transportiert Cholesterin zu den Arterien. Hoher LDL, besonders kleine dichte Partikel, erhoeht das Herz-Kreislauf-Risiko. LOINC:2089-1' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ldl_c') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'HDL Cholesterol (HDL) transports cholesterol away from arteries back to the liver. Higher values are protective against heart disease. LOINC:2085-9' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hdl_c') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'HDL-Cholesterin (HDL) transportiert Cholesterin von den Arterien zurueck zur Leber. Hoehere Werte schuetzen vor Herzerkrankungen. LOINC:2085-9' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hdl_c') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Triglycerides (TG) are fats in your blood used for energy. High levels increase cardiovascular risk and often indicate insulin resistance. LOINC:2571-8' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'triglycerides') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Triglyzeride (TG) sind Fette im Blut, die als Energie genutzt werden. Hohe Werte erhoehen das Herz-Kreislauf-Risiko und deuten oft auf Insulinresistenz hin. LOINC:2571-8' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'triglycerides') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'ApoB (Apolipoprotein B) represents the number of atherogenic lipoprotein particles. It is arguably the single best predictor of cardiovascular risk. LOINC:1884-6' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'apob') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'ApoB (Apolipoprotein B) repraesentiert die Anzahl atherogener Lipoproteinpartikel. Es ist wohl der beste einzelne Praediktor fuer kardiovaskulaeres Risiko. LOINC:1884-6' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'apob') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'hs-CRP (High-Sensitivity C-Reactive Protein) measures systemic inflammation. Elevated levels indicate chronic inflammation and increased cardiovascular risk. LOINC:30522-7' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hs_crp') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'hs-CRP (hochsensitives C-reaktives Protein) misst systemische Entzuendungen. Erhoehte Werte zeigen chronische Entzuendung und erhoehtes kardiovaskulaeres Risiko an. LOINC:30522-7' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hs_crp') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Blood Pressure Systolic (Sys) measures the pressure in your arteries when your heart beats. It is the top number in a blood pressure reading. LOINC:8480-6' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'bp_systolic') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Blutdruck Systolisch (Sys) misst den Druck in den Arterien beim Herzschlag. Es ist der obere Wert einer Blutdruckmessung. LOINC:8480-6' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'bp_systolic') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Blood Pressure Diastolic (Dia) measures the pressure in your arteries between heartbeats. It is the bottom number in a blood pressure reading. LOINC:8462-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'bp_diastolic') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Blutdruck Diastolisch (Dia) misst den Druck in den Arterien zwischen den Herzschlaegen. Es ist der untere Wert einer Blutdruckmessung. LOINC:8462-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'bp_diastolic') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Heart Rate (HR) measures how many times your heart beats per minute at rest. A lower resting heart rate generally indicates better cardiovascular fitness. LOINC:8867-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'heart_rate') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Herzfrequenz (HR) misst, wie oft das Herz pro Minute in Ruhe schlaegt. Eine niedrigere Ruheherzfrequenz zeigt generell bessere kardiovaskulaere Fitness an. LOINC:8867-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'heart_rate') AND locale = 'de';

-- Structural
UPDATE marker_translations SET tooltip = 'Hemoglobin (Hb) is the protein in red blood cells that carries oxygen. Low hemoglobin indicates anemia; high values may indicate dehydration or polycythemia. LOINC:718-7' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hemoglobin') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Haemoglobin (Hb) ist das Protein in roten Blutkoerperchen, das Sauerstoff transportiert. Niedriges Hb zeigt Anaemie an; hohe Werte koennen auf Dehydration hindeuten. LOINC:718-7' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hemoglobin') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Hematocrit (HCT) measures the percentage of your blood volume occupied by red blood cells. It reflects oxygen-carrying capacity and hydration status. LOINC:4544-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hematocrit') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Haematokrit (HCT) misst den Anteil der roten Blutkoerperchen am Blutvolumen. Er spiegelt die Sauerstofftransportkapazitaet und den Hydratationsstatus wider. LOINC:4544-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'hematocrit') AND locale = 'de';

-- Liver / Detoxification
UPDATE marker_translations SET tooltip = 'ALT (Alanine Aminotransferase) is a liver enzyme. Elevated ALT is a sensitive marker of liver cell damage, commonly from fatty liver, alcohol, or medications. LOINC:1742-6' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'alt') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'ALT (Alanin-Aminotransferase) ist ein Leberenzym. Erhoehter ALT ist ein empfindlicher Marker fuer Leberzellschaeden, haeufig durch Fettleber, Alkohol oder Medikamente. LOINC:1742-6' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'alt') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'AST (Aspartate Aminotransferase) is found in the liver, heart, and muscles. Elevated AST alongside ALT suggests liver damage; isolated AST elevation may indicate muscle or heart issues. LOINC:1920-8' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ast') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'AST (Aspartat-Aminotransferase) kommt in Leber, Herz und Muskeln vor. Erhoehter AST zusammen mit ALT deutet auf Leberschaeden hin; isoliert erhoehter AST kann auf Muskel- oder Herzprobleme hinweisen. LOINC:1920-8' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ast') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'GGT (Gamma-Glutamyl Transferase) is a liver and bile duct enzyme. Elevated GGT is one of the earliest markers of liver stress, alcohol use, or bile duct obstruction. LOINC:2324-2' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ggt') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'GGT (Gamma-Glutamyltransferase) ist ein Leber- und Gallengangsenzym. Erhoehtes GGT ist einer der fruehesten Marker fuer Leberstress, Alkoholkonsum oder Gallengangsobstruktion. LOINC:2324-2' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ggt') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'eGFR (Estimated Glomerular Filtration Rate) estimates how well your kidneys filter waste from your blood. It is calculated from creatinine, age, and sex. Higher values indicate better kidney function. LOINC:33914-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'egfr') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'eGFR (geschaetzte glomerulaere Filtrationsrate) schaetzt, wie gut die Nieren Abfallstoffe aus dem Blut filtern. Er wird aus Kreatinin, Alter und Geschlecht berechnet. Hoehere Werte zeigen bessere Nierenfunktion an. LOINC:33914-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'egfr') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Creatinine (Crea) is a waste product from muscle metabolism filtered by the kidneys. Rising creatinine suggests declining kidney function. LOINC:2160-0' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'creatinine') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Kreatinin (Crea) ist ein Abfallprodukt des Muskelstoffwechsels, das von den Nieren gefiltert wird. Steigendes Kreatinin deutet auf nachlassende Nierenfunktion hin. LOINC:2160-0' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'creatinine') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Uric Acid (UA) is a waste product from purine metabolism. High levels can cause gout and kidney stones, and are associated with cardiovascular risk. LOINC:3084-1' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'uric_acid') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Harnsaeure (UA) ist ein Abfallprodukt des Purinstoffwechsels. Hohe Werte koennen Gicht und Nierensteine verursachen und sind mit kardiovaskulaerem Risiko verbunden. LOINC:3084-1' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'uric_acid') AND locale = 'de';

-- Nutritional
UPDATE marker_translations SET tooltip = 'Vitamin D (25-OH) regulates calcium absorption, bone health, and immune function. Deficiency is extremely common, especially in northern latitudes. LOINC:1989-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'vitamin_d') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Vitamin D (25-OH) reguliert die Kalziumaufnahme, Knochengesundheit und Immunfunktion. Mangel ist extrem haeufig, besonders in noerdlichen Breitengraden. LOINC:1989-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'vitamin_d') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Ferritin (Ferr) is your body''s iron storage protein. Low ferritin is the earliest marker of iron deficiency, even before anemia develops. LOINC:2276-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ferritin') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Ferritin (Ferr) ist das Eisenspeicherprotein des Koerpers. Niedriges Ferritin ist der frueheste Marker fuer Eisenmangel, noch bevor eine Anaemie entsteht. LOINC:2276-4' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'ferritin') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Magnesium (Mg) is essential for over 300 enzymatic reactions including energy production, muscle function, and nerve signaling. Deficiency is often underdiagnosed. LOINC:2601-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'magnesium') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Magnesium (Mg) ist essenziell fuer ueber 300 enzymatische Reaktionen einschliesslich Energieproduktion, Muskelfunktion und Nervensignalgebung. Mangel wird oft unterdiagnostiziert. LOINC:2601-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'magnesium') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Homocysteine (Hcy) is an amino acid linked to cardiovascular disease when elevated. B vitamins (B6, B9, B12) are required to keep it in range. LOINC:2092-5' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'homocysteine') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Homocystein (Hcy) ist eine Aminosaeure, die bei erhoehten Werten mit Herz-Kreislauf-Erkrankungen in Verbindung gebracht wird. B-Vitamine (B6, B9, B12) werden benoetigt, um es im Bereich zu halten. LOINC:2092-5' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'homocysteine') AND locale = 'de';

-- Immune
UPDATE marker_translations SET tooltip = 'WBC (White Blood Cell Count) measures your immune system''s cellular army. High WBC suggests infection or inflammation; low WBC may indicate immune suppression. LOINC:6690-2' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'wbc') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Leukozyten (WBC) messen die zellulaere Armee Ihres Immunsystems. Hoher WBC deutet auf Infektion oder Entzuendung; niedriger WBC kann auf Immunsuppression hinweisen. LOINC:6690-2' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'wbc') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'RBC (Red Blood Cell Count) measures oxygen-carrying red blood cells. Low RBC indicates anemia; high RBC may reflect dehydration or polycythemia. LOINC:789-8' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'rbc') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Erythrozyten (RBC) messen die sauerstofftragenden roten Blutkoerperchen. Niedriger RBC zeigt Anaemie an; hoher RBC kann Dehydration oder Polyzythaemie widerspiegeln. LOINC:789-8' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'rbc') AND locale = 'de';

UPDATE marker_translations SET tooltip = 'Platelets (PLT) are cell fragments essential for blood clotting. Low platelets increase bleeding risk; high platelets may indicate inflammation or bone marrow disorders. LOINC:777-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'platelets') AND locale = 'en';
UPDATE marker_translations SET tooltip = 'Thrombozyten (PLT) sind Zellfragmente, die fuer die Blutgerinnung essenziell sind. Niedrige Werte erhoehen das Blutungsrisiko; hohe Werte koennen auf Entzuendung oder Knochenmarkerkrankungen hinweisen. LOINC:777-3' WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'platelets') AND locale = 'de';

-- ============================================================
-- PART 2: FILL NULL REFERENCE RANGES
-- Markers that had all-NULL thresholds now get evidence-based ranges
-- ============================================================

-- Vitamin B1 (Thiamine) -- standard lab range: 70-180 nmol/L
UPDATE reference_ranges SET orange_min = 50, green_min = 70, green_max = 180, orange_max = 250
WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'vitamin_b1') AND user_id IS NULL AND protocol_context = 'standard';

-- Vitamin B3 (Niacin) -- standard lab range: 36-130 nmol/L (as NAD)
UPDATE reference_ranges SET orange_min = 25, green_min = 36, green_max = 130, orange_max = 180
WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'vitamin_b3') AND user_id IS NULL AND protocol_context = 'standard';

-- Vitamin B5 (Pantothenic Acid) -- standard lab range: 1.6-2.7 umol/L (converted to nmol/L: 1600-2700)
UPDATE reference_ranges SET orange_min = 1000, green_min = 1600, green_max = 2700, orange_max = 3500
WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'vitamin_b5') AND user_id IS NULL AND protocol_context = 'standard';

-- EPA -- Omega-3 index component: 20-100 mg/L (0.02-0.1 g/L)
UPDATE reference_ranges SET orange_min = 0.01, green_min = 0.02, green_max = 0.1, orange_max = 0.15
WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'epa') AND user_id IS NULL AND protocol_context = 'standard';

-- DHA -- Omega-3 index component: 30-150 mg/L (0.03-0.15 g/L)
UPDATE reference_ranges SET orange_min = 0.02, green_min = 0.03, green_max = 0.15, orange_max = 0.2
WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'dha') AND user_id IS NULL AND protocol_context = 'standard';

-- Weight -- no universal range (depends on height/BMI), but set reasonable bounds
-- Using BMI 18.5-25 for 170cm person: ~53-72kg. Keep generous bounds.
UPDATE reference_ranges SET orange_min = 45, green_min = 55, green_max = 90, orange_max = 120
WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'weight') AND user_id IS NULL AND protocol_context = 'standard';

-- Waist Circumference -- Men: <94cm optimal, <102 acceptable; Women: <80 optimal, <88 acceptable
-- Using male ranges as default (gender-specific would need separate protocol contexts)
UPDATE reference_ranges SET orange_min = NULL, green_min = NULL, green_max = 94, orange_max = 102
WHERE marker_id = (SELECT id FROM markers WHERE marker_slug = 'waist_circumference') AND user_id IS NULL AND protocol_context = 'standard';

-- ============================================================
-- PART 3: KETO/CARNIVORE PROTOCOL REFERENCE RANGES
-- For markers where keto/carnivore diets significantly shift expected values
-- protocol_context = 'standard_keto' for keto/carnivore diet users
-- ============================================================

-- Keto: Total Cholesterol often elevated (lean mass hyper-responder pattern)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', 2.5, 3.5, 7.0, 8.5 FROM markers WHERE marker_slug = 'total_cholesterol'
ON CONFLICT DO NOTHING;

-- Keto: LDL often elevated on keto (especially pattern A large buoyant)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', 0.5, 1.0, 4.5, 6.0 FROM markers WHERE marker_slug = 'ldl_c'
ON CONFLICT DO NOTHING;

-- Keto: HDL typically improves on keto
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', 1.0, 1.3, 3.0, NULL FROM markers WHERE marker_slug = 'hdl_c'
ON CONFLICT DO NOTHING;

-- Keto: Triglycerides drop significantly on keto
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', 0.2, 0.3, 1.2, 1.7 FROM markers WHERE marker_slug = 'triglycerides'
ON CONFLICT DO NOTHING;

-- Keto: Glucose runs lower on keto
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', 3.0, 3.5, 5.0, 6.0 FROM markers WHERE marker_slug = 'glucose'
ON CONFLICT DO NOTHING;

-- Keto: Ketones expected to be elevated
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', 0.3, 0.5, 3.0, 5.0 FROM markers WHERE marker_slug = 'ketones'
ON CONFLICT DO NOTHING;

-- Keto: Uric acid can temporarily spike during keto adaptation
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', 150, 200, 420, 520 FROM markers WHERE marker_slug = 'uric_acid'
ON CONFLICT DO NOTHING;

-- Keto: Insulin should be lower on keto
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', 0.5, 1.0, 5.0, 10.0 FROM markers WHERE marker_slug = 'insulin'
ON CONFLICT DO NOTHING;

-- Keto: HbA1c often lower on keto
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', NULL, 3.8, 5.3, 5.7 FROM markers WHERE marker_slug = 'hba1c'
ON CONFLICT DO NOTHING;

-- Keto: hs-CRP often improves on keto
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', NULL, NULL, 0.8, 2.0 FROM markers WHERE marker_slug = 'hs_crp'
ON CONFLICT DO NOTHING;

-- Keto: Ferritin can be higher on carnivore (more red meat)
INSERT INTO reference_ranges (marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT id, 'standard_keto', 20, 50, 300, 500 FROM markers WHERE marker_slug = 'ferritin'
ON CONFLICT DO NOTHING;
