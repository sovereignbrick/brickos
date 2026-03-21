-- Sprint 005 Phase 2: Populate why_it_matters and when_to_worry for all markers
-- EN: 72 markers missing, DE: 89 markers missing
-- Idempotent: only updates where field is NULL or empty

-- ============================================================================
-- ENGLISH  -  why_it_matters
-- ============================================================================

-- Liver & Metabolic
UPDATE marker_translations SET why_it_matters = 'Albumin reflects your liver''s ability to produce proteins and helps assess nutritional status and kidney function.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'albumin' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'ALP is an enzyme found in the liver and bones. Elevated levels can signal liver obstruction, bone disorders, or other conditions.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'alp' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'AST is a liver enzyme also found in heart and muscle tissue. Elevated levels can indicate liver damage or muscle injury.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ast' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Direct bilirubin is processed by the liver and excreted in bile. Elevated levels can indicate liver disease or bile duct obstruction.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bilirubin_direct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Total bilirubin is a waste product from red blood cell breakdown. High levels cause jaundice and may indicate liver or blood disorders.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bilirubin_total' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'LDH is an enzyme present in most tissues. Elevated levels can indicate tissue damage, hemolysis, or certain cancers.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ldh' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Total protein measures all proteins in your blood, primarily albumin and globulins. It reflects liver function, nutritional status, and immune health.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'total_protein' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Kidney
UPDATE marker_translations SET why_it_matters = 'Cystatin C is a precise marker for kidney filtration that is less affected by muscle mass than creatinine.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'cystatin_c' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Lipids
UPDATE marker_translations SET why_it_matters = 'Non-HDL cholesterol captures all atherogenic lipoproteins in a single number, making it a strong predictor of cardiovascular risk.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'non_hdl_c' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Lp(a) is a genetically determined lipoprotein that independently increases heart attack and stroke risk regardless of other cholesterol levels.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lpa' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Inflammation
UPDATE marker_translations SET why_it_matters = 'Homocysteine is an amino acid linked to cardiovascular disease and cognitive decline when elevated. B vitamins help keep it in check.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'homocysteine' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Thyroid
UPDATE marker_translations SET why_it_matters = 'TSH is the master regulator of thyroid function. Abnormal levels are the earliest sign of hypo- or hyperthyroidism.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'tsh' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Free T3 is the most active thyroid hormone, directly driving metabolism, energy, and body temperature regulation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ft3' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Free T4 is the primary hormone produced by the thyroid. It converts to active T3 and reflects thyroid output capacity.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ft4' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Hormones
UPDATE marker_translations SET why_it_matters = 'Testosterone drives muscle mass, bone density, energy, and libido in both men and women.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'testosterone' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Free testosterone is the biologically active fraction not bound to proteins. It''s a better indicator of androgen status than total testosterone.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'free_testosterone' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'SHBG binds sex hormones and regulates their availability. High or low levels affect the balance of active testosterone and estrogen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'shbg' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'The Free Androgen Index estimates biologically active testosterone relative to SHBG, useful for detecting androgen excess or deficiency.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'free_androgen_index' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'DHEA-S is an adrenal hormone precursor to testosterone and estrogen. It declines with age and is a marker of adrenal function.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'dheas' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Estradiol is the primary estrogen, essential for bone health, cardiovascular protection, and reproductive function.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'estradiol' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Progesterone supports the menstrual cycle and pregnancy. In men, it influences mood and acts as a precursor to other hormones.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'progesterone' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'FSH regulates reproductive function. It''s essential for ovulation in women and sperm production in men.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'fsh' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'LH triggers ovulation in women and stimulates testosterone production in men. It works together with FSH to regulate reproduction.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lh' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Prolactin regulates lactation but can affect fertility and libido when elevated in non-nursing individuals.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'prolactin' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Electrolytes & Minerals
UPDATE marker_translations SET why_it_matters = 'Calcium is essential for bones, muscle contraction, nerve signaling, and blood clotting. Both too little and too much can be dangerous.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'calcium' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Magnesium is involved in over 300 enzymatic reactions including energy production, muscle function, and blood pressure regulation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'magnesium' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Phosphate works with calcium for bone health and is critical for energy metabolism (ATP) and cell signaling.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'phosphate' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Potassium regulates heart rhythm, muscle contractions, and nerve impulses. Abnormal levels can cause life-threatening arrhythmias.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'potassium' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Sodium maintains fluid balance and blood pressure. Too much or too little disrupts cell function throughout the body.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'sodium' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Selenium is a trace mineral essential for thyroid hormone metabolism, antioxidant defense, and immune function.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'selenium' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Zinc supports immune function, wound healing, DNA synthesis, and taste perception. Deficiency is common and often underdiagnosed.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'zinc' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Iron Panel
UPDATE marker_translations SET why_it_matters = 'Transferrin carries iron in the blood. Its level reflects the body''s iron transport capacity and helps diagnose iron deficiency or overload.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'transferrin' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Transferrin saturation shows what percentage of iron-carrying capacity is being used. It helps distinguish types of anemia and iron overload.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'transferrin_sat' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Vitamins
UPDATE marker_translations SET why_it_matters = 'Vitamin A supports vision, immune function, and skin health. Both deficiency and excess can cause serious health problems.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_a' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B1 is essential for energy metabolism and nervous system function. Deficiency can cause beriberi and neurological damage.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b1' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B2 is needed for energy production, cellular function, and the metabolism of fats and drugs.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b2' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B3 supports energy metabolism, DNA repair, and cholesterol regulation. Severe deficiency causes pellagra.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b3' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B5 is a component of coenzyme A, essential for fatty acid synthesis and energy production from food.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b5' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B6 is involved in over 100 enzyme reactions, particularly amino acid metabolism, neurotransmitter synthesis, and immune function.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b6' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B12 is critical for nerve function, DNA synthesis, and red blood cell formation. Deficiency causes irreversible nerve damage if untreated.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b12' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Holotranscobalamin is the earliest and most specific marker for vitamin B12 deficiency, detecting it before symptoms appear.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'holo_tc' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Folate is essential for DNA synthesis and cell division. Deficiency during pregnancy causes neural tube defects.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'folate' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin E protects cell membranes from oxidative damage and supports immune function and skin health.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_e' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Omega-3
UPDATE marker_translations SET why_it_matters = 'The Omega-3 Index measures EPA+DHA in red blood cell membranes  -  a strong predictor of cardiovascular risk and systemic inflammation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'omega3_index' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'EPA is an omega-3 fatty acid with potent anti-inflammatory effects, particularly beneficial for cardiovascular and joint health.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'epa' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'DHA is the primary structural omega-3 in the brain and retina. Adequate levels support cognitive function and eye health.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'dha' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Complete Blood Count
UPDATE marker_translations SET why_it_matters = 'White blood cells are the foundation of your immune system. Abnormal counts can indicate infection, inflammation, or immune disorders.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'wbc' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Red blood cells carry oxygen from your lungs to every tissue. Low counts cause anemia; high counts can thicken blood.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'rbc' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Platelets enable blood clotting. Too few increases bleeding risk; too many can cause dangerous clots.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'platelets' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'MCV measures the average size of red blood cells, helping classify types of anemia (microcytic vs macrocytic).', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mcv' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'MCH measures the average hemoglobin content per red blood cell, helping diagnose iron deficiency and other anemias.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mch' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'MCHC measures hemoglobin concentration within red blood cells. Abnormal values help differentiate types of anemia.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mchc' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'RDW measures variation in red blood cell size. Elevated values can reveal mixed anemias or early nutritional deficiencies.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'rdw' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- WBC Differential
UPDATE marker_translations SET why_it_matters = 'Neutrophils are the first responders to bacterial infections. Low counts increase infection risk; high counts signal active infection or inflammation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'neutrophils_abs' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Neutrophil percentage shows the proportion of white blood cells that are neutrophils, the primary bacterial defense cells.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'neutrophils_pct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Lymphocytes drive adaptive immunity  -  fighting viruses, producing antibodies, and maintaining immune memory.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lymphocytes_abs' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Lymphocyte percentage reflects the balance between adaptive and innate immunity in your white blood cell population.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lymphocytes_pct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Monocytes mature into macrophages that engulf pathogens and dead cells. They bridge innate and adaptive immunity.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'monocytes_abs' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Monocyte percentage indicates the share of white blood cells involved in tissue repair and chronic immune responses.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'monocytes_pct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Eosinophils respond to parasitic infections and are involved in allergic reactions. Elevated counts may indicate allergies, asthma, or parasites.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'eosinophils_abs' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Eosinophil percentage shows the proportion of white blood cells involved in allergic and parasitic responses.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'eosinophils_pct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Basophils release histamine and play a role in allergic reactions and inflammation. They are the rarest white blood cells.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'basophils_abs' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Basophil percentage reflects the smallest fraction of white blood cells, involved in allergic and inflammatory responses.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'basophils_pct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Cardiovascular
UPDATE marker_translations SET why_it_matters = 'Blood pressure (systolic) measures the force during heartbeats  -  the most important single number for cardiovascular risk assessment.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bp_systolic' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Diastolic blood pressure measures the force between heartbeats. Persistently elevated values damage blood vessels over time.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bp_diastolic' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Heart rate reflects cardiovascular fitness and autonomic nervous system health. A lower resting heart rate generally indicates better fitness.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'heart_rate' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Body Composition
UPDATE marker_translations SET why_it_matters = 'Body weight is a fundamental health metric. Tracking trends over time reveals the impact of nutrition, exercise, and metabolic changes.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'weight' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Body fat percentage distinguishes between fat and lean mass, giving a more complete picture of body composition than weight alone.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'body_fat_pct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Muscle percentage reflects lean body mass, which is crucial for metabolic health, strength, and healthy aging.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'muscle_pct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Body water percentage indicates hydration status. Adequate hydration is essential for organ function, temperature regulation, and joint health.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'body_water_pct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Bone mass reflects skeletal density. Tracking it helps detect early signs of osteoporosis, especially in women post-menopause.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bone_mass_pct' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Waist circumference measures visceral fat distribution  -  a stronger predictor of metabolic syndrome and cardiovascular risk than BMI.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'waist_circumference' AND marker_translations.locale = 'en' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');


-- ============================================================================
-- ENGLISH  -  when_to_worry
-- ============================================================================

-- Liver & Metabolic
UPDATE marker_translations SET when_to_worry = 'See your doctor if albumin is persistently below 35 g/L, which may indicate liver disease, kidney problems, or malnutrition.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'albumin' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'ALP above 130 U/L warrants investigation. Combined with elevated GGT, it suggests liver issues; with normal GGT, consider bone causes.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'alp' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'AST above 40 U/L combined with elevated ALT suggests liver damage. Isolated AST elevation may indicate heart or muscle injury.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ast' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Direct bilirubin above 5 µmol/L may indicate bile duct obstruction or liver disease. Seek medical evaluation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bilirubin_direct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Total bilirubin above 21 µmol/L may cause visible jaundice. See your doctor if you notice yellowing of skin or eyes.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bilirubin_total' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'LDH above 250 U/L can indicate tissue damage. Persistently elevated values should be investigated with additional tests.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ldh' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Total protein below 60 g/L or above 80 g/L may indicate liver disease, kidney loss, or immune disorders.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'total_protein' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Kidney
UPDATE marker_translations SET when_to_worry = 'Cystatin C above 1.0 mg/L may indicate reduced kidney function. Discuss with your doctor, especially if you have diabetes or hypertension.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'cystatin_c' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Lipids
UPDATE marker_translations SET when_to_worry = 'Non-HDL cholesterol above 3.4 mmol/L increases cardiovascular risk. Lifestyle changes and possibly statins should be discussed with your doctor.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'non_hdl_c' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Lp(a) above 75 nmol/L significantly increases cardiovascular risk. Since it''s genetic, discuss targeted prevention strategies with your doctor.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lpa' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Inflammation
UPDATE marker_translations SET when_to_worry = 'Homocysteine above 15 µmol/L is associated with increased cardiovascular and cognitive risk. B6, B12, and folate supplementation often helps.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'homocysteine' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Thyroid
UPDATE marker_translations SET when_to_worry = 'TSH above 4.0 mIU/L suggests hypothyroidism; below 0.4 suggests hyperthyroidism. Both require medical evaluation and possible treatment.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'tsh' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Free T3 outside the range of 3.1–6.8 pmol/L may indicate thyroid dysfunction. Discuss with your doctor alongside TSH results.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ft3' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Free T4 outside 12–22 pmol/L may indicate thyroid over- or underproduction. Always interpret together with TSH.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ft4' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Hormones
UPDATE marker_translations SET when_to_worry = 'Low testosterone with symptoms like fatigue, low libido, or muscle loss warrants evaluation. Optimal ranges vary by age and sex.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'testosterone' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'If free testosterone is low alongside symptoms of androgen deficiency, consult an endocrinologist for further evaluation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'free_testosterone' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Very high SHBG can reduce bioavailable testosterone. Very low SHBG may indicate insulin resistance. Discuss abnormal values with your doctor.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'shbg' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'An elevated Free Androgen Index in women may suggest polycystic ovary syndrome (PCOS). Consult your doctor for further evaluation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'free_androgen_index' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Very low DHEA-S for your age may indicate adrenal insufficiency. Discuss with your doctor before supplementing.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'dheas' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Abnormal estradiol levels can affect bone density, mood, and cardiovascular health. Consult your doctor if values are persistently out of range.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'estradiol' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Abnormal progesterone levels may indicate luteal phase defects or other hormonal imbalances. Discuss with your doctor if you have cycle irregularities.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'progesterone' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Elevated FSH in younger women may indicate diminished ovarian reserve. In men, high FSH may signal testicular issues.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'fsh' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Persistently elevated LH or an abnormal LH/FSH ratio may indicate PCOS or pituitary issues. Consult an endocrinologist.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lh' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Prolactin above 25 mIU/L in non-pregnant, non-nursing individuals may indicate a pituitary issue and should be evaluated.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'prolactin' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Electrolytes & Minerals
UPDATE marker_translations SET when_to_worry = 'Calcium below 2.1 or above 2.6 mmol/L requires investigation. Symptoms include muscle cramps, fatigue, or confusion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'calcium' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Magnesium below 0.7 mmol/L can cause muscle cramps, arrhythmias, and fatigue. Many people are mildly deficient without knowing.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'magnesium' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Phosphate outside 0.8–1.5 mmol/L may indicate kidney problems, parathyroid issues, or nutritional imbalances.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'phosphate' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Potassium below 3.5 or above 5.0 mmol/L can cause dangerous heart rhythm changes. Seek immediate medical attention for extreme values.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'potassium' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Sodium below 135 or above 145 mmol/L can impair brain and muscle function. Severe imbalances require urgent medical care.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'sodium' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Selenium below 70 µg/L may impair thyroid function and immunity. Above 400 µg/L risks toxicity. Stay within the optimal range.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'selenium' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Zinc below 10 µmol/L may impair immune function and wound healing. Supplementation should be guided by testing to avoid copper depletion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'zinc' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Iron Panel
UPDATE marker_translations SET when_to_worry = 'Abnormal transferrin values help identify iron deficiency (high transferrin) or iron overload (low transferrin). Discuss with your doctor.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'transferrin' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Transferrin saturation below 20% suggests iron deficiency; above 45% may indicate iron overload (hemochromatosis risk).', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'transferrin_sat' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Vitamins
UPDATE marker_translations SET when_to_worry = 'Vitamin A below 1.0 µmol/L can impair vision and immunity. Above 3.0 µmol/L risks liver toxicity. Avoid over-supplementation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_a' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin B1 deficiency is common in alcoholism and malnutrition. See your doctor if you have unexplained nerve symptoms or fatigue.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b1' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Low vitamin B2 can cause cracked lips, sore throat, and light sensitivity. Supplementation usually resolves symptoms quickly.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b2' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Low vitamin B3 can cause dermatitis, diarrhea, and cognitive issues. High-dose supplementation can cause flushing and liver stress.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b3' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin B5 deficiency is rare but can cause fatigue and numbness. Most people get adequate amounts from a varied diet.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b5' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin B6 above 200 nmol/L from over-supplementation can cause nerve damage. Deficiency causes anemia and skin disorders.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b6' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin B12 below 150 pmol/L requires treatment to prevent irreversible nerve damage. Vegans and elderly are at highest risk.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b12' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Holotranscobalamin below 35 pmol/L indicates B12 deficiency even when total B12 appears normal. Treat promptly to prevent nerve damage.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'holo_tc' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Folate below 7 µg/L increases risk of anemia and, during pregnancy, neural tube defects. Supplementation is safe and effective.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'folate' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin E deficiency is rare but can cause nerve and muscle damage. Excess supplementation may increase bleeding risk.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_e' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Omega-3
UPDATE marker_translations SET when_to_worry = 'An Omega-3 Index below 4% doubles cardiovascular risk compared to 8%+. Increase fatty fish intake or consider EPA/DHA supplementation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'omega3_index' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Low EPA levels are associated with higher inflammation. Consider increasing fatty fish consumption or supplementing with fish oil.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'epa' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Low DHA may impair cognitive function and mood. Fatty fish 2–3 times per week or algae-based DHA supplements can help.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'dha' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Complete Blood Count
UPDATE marker_translations SET when_to_worry = 'WBC below 4.0 Gpt/L increases infection risk; above 11.0 Gpt/L may signal infection or inflammation. Persistent abnormalities need investigation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'wbc' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'RBC below normal indicates anemia (fatigue, weakness). Above normal may indicate dehydration or polycythemia. See your doctor for persistent changes.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'rbc' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Platelets below 150 Gpt/L increase bleeding risk; above 400 Gpt/L increase clotting risk. Both extremes require medical evaluation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'platelets' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'MCV below 80 fL suggests iron deficiency; above 100 fL suggests B12 or folate deficiency. Both should be investigated.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mcv' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Low MCH typically parallels low MCV and suggests iron deficiency anemia. High MCH may indicate B12 or folate deficiency.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mch' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Low MCHC can indicate iron deficiency anemia. High MCHC is rare and may suggest hereditary spherocytosis.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mchc' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'RDW above 14.5% suggests red blood cells are uneven in size, which can indicate iron deficiency, B12 deficiency, or mixed anemias.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'rdw' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- WBC Differential
UPDATE marker_translations SET when_to_worry = 'Neutrophils below 1.5 Gpt/L (neutropenia) significantly increases infection risk. Above 7.0 Gpt/L usually indicates active infection.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'neutrophils_abs' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Neutrophil percentage outside 40–70% should be interpreted alongside the absolute count and clinical context.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'neutrophils_pct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Lymphocytes below 1.0 Gpt/L may indicate immune suppression. Above 4.0 Gpt/L can signal viral infection or lymphoproliferative disorders.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lymphocytes_abs' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Lymphocyte percentage should be interpreted alongside the absolute count. Relative changes can be misleading without total WBC context.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lymphocytes_pct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Persistently elevated monocytes may indicate chronic infection, autoimmune disease, or blood disorders. Discuss with your doctor.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'monocytes_abs' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Monocyte percentage above 10% may indicate chronic inflammation or infection. Interpret alongside the absolute count.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'monocytes_pct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Eosinophils above 0.5 Gpt/L may indicate allergies, parasitic infection, or eosinophilic disorders. Seek evaluation if persistent.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'eosinophils_abs' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Eosinophil percentage above 5% suggests allergic or parasitic processes. Correlate with symptoms and absolute count.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'eosinophils_pct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Basophils are rarely elevated in isolation. Persistent elevation may be associated with myeloproliferative disorders.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'basophils_abs' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Basophil percentage above 1% is uncommon and may warrant further investigation if persistent.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'basophils_pct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Cardiovascular
UPDATE marker_translations SET when_to_worry = 'Systolic blood pressure consistently above 140 mmHg is stage 2 hypertension. Above 180 mmHg is a hypertensive crisis  -  seek immediate care.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bp_systolic' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Diastolic blood pressure consistently above 90 mmHg indicates hypertension. Above 120 mmHg requires immediate medical attention.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bp_diastolic' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Resting heart rate consistently above 100 bpm (tachycardia) or below 50 bpm with symptoms like dizziness should be evaluated.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'heart_rate' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

-- Body Composition
UPDATE marker_translations SET when_to_worry = 'Unintentional weight loss of more than 5% in 6 months, or rapid gain, should be discussed with your doctor.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'weight' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Very high body fat percentage increases risk for metabolic syndrome, type 2 diabetes, and cardiovascular disease. Consult your doctor for personalized targets.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'body_fat_pct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Declining muscle percentage with age increases fall risk and metabolic slowdown. Resistance training helps preserve muscle mass.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'muscle_pct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Body water below 45% may indicate chronic dehydration, which impairs kidney function and cognitive performance.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'body_water_pct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Declining bone mass over time may indicate osteopenia or osteoporosis risk. Discuss bone density testing with your doctor.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bone_mass_pct' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Waist circumference above 102 cm (men) or 88 cm (women) significantly increases metabolic syndrome and cardiovascular risk.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'waist_circumference' AND marker_translations.locale = 'en' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');


-- ============================================================================
-- GERMAN  -  why_it_matters (all 92 markers, skip the 3 that already have content)
-- ============================================================================

-- Already have DE content: glucose, insulin, ketones  -  skip these

-- Liver & Metabolic
UPDATE marker_translations SET why_it_matters = 'Albumin zeigt die Fähigkeit der Leber, Proteine zu produzieren, und gibt Hinweise auf Ernährungsstatus und Nierenfunktion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'albumin' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Die Alkalische Phosphatase ist ein Enzym aus Leber und Knochen. Erhöhte Werte können auf Lebererkrankungen oder Knochenprobleme hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'alp' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Die ALT ist ein leberspezifisches Enzym. Erhöhte Werte sind ein frühes Zeichen für Leberzellschäden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'alt' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Die AST kommt in Leber, Herz und Muskeln vor. Erhöhte Werte können auf Leber-, Herz- oder Muskelschäden hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ast' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Direktes Bilirubin wird von der Leber verarbeitet. Erhöhte Werte können auf Lebererkrankungen oder Gallengangverschluss hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bilirubin_direct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Gesamtbilirubin ist ein Abbauprodukt roter Blutkörperchen. Hohe Werte verursachen Gelbsucht und können auf Leber- oder Bluterkrankungen hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bilirubin_total' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Die GGT ist ein empfindlicher Marker für Lebererkrankungen und Gallenwegsprobleme, besonders bei Alkoholkonsum.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ggt' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Die LDH ist ein Enzym in fast allen Geweben. Erhöhte Werte können auf Gewebeschäden, Hämolyse oder bestimmte Krebserkrankungen hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ldh' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Gesamtprotein misst alle Blutproteine und gibt Auskunft über Leberfunktion, Ernährungszustand und Immungesundheit.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'total_protein' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Kidney
UPDATE marker_translations SET why_it_matters = 'Kreatinin zeigt an, wie gut die Nieren Abfallstoffe filtern. Es ist der Standardmarker für die Nierenfunktion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'creatinine' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Cystatin C ist ein präziser Nierenfunktionsmarker, der weniger von Muskelmasse beeinflusst wird als Kreatinin.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'cystatin_c' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Die eGFR schätzt die Filterleistung der Nieren und ist der wichtigste Wert zur Beurteilung der Nierenfunktion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'egfr' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Lipids
UPDATE marker_translations SET why_it_matters = 'Gesamtcholesterin gibt einen Überblick über den Fettstoffwechsel, sollte aber immer zusammen mit HDL, LDL und Triglyceriden bewertet werden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'total_cholesterol' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'HDL-Cholesterin transportiert überschüssiges Cholesterin zurück zur Leber und schützt so vor Atherosklerose.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hdl_c' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'LDL-Cholesterin lagert sich in Arterienwänden ab und ist der Haupttreiber von Atherosklerose und Herzinfarktrisiko.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ldl_c' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Non-HDL-Cholesterin erfasst alle atherogenen Lipoproteine in einer Zahl  -  ein starker Prädiktor für kardiovaskuläres Risiko.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'non_hdl_c' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Triglyceride sind Blutfette, die bei Überernährung und Insulinresistenz ansteigen und das Herzinfarktrisiko erhöhen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'triglycerides' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'ApoB ist die Anzahl atherogener Partikel im Blut  -  ein genauerer Risikomarker als LDL-Cholesterin allein.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'apob' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Lp(a) ist genetisch bestimmt und erhöht unabhängig von anderen Cholesterinwerten das Herzinfarkt- und Schlaganfallrisiko.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lpa' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Inflammation
UPDATE marker_translations SET why_it_matters = 'hsCRP ist der empfindlichste Marker für systemische Entzündung und ein unabhängiger Risikofaktor für Herz-Kreislauf-Erkrankungen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hs_crp' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Homocystein ist eine Aminosäure, die bei erhöhten Werten mit Herz-Kreislauf-Erkrankungen und kognitivem Abbau in Verbindung steht.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'homocysteine' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Blood Sugar
UPDATE marker_translations SET why_it_matters = 'HbA1c zeigt den durchschnittlichen Blutzucker der letzten 2–3 Monate und ist der Goldstandard zur Diabetes-Überwachung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hba1c' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Harnsäure ist ein Abbauprodukt von Purinen. Erhöhte Werte können Gicht verursachen und das Risiko für Nieren- und Herzerkrankungen erhöhen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'uric_acid' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Thyroid
UPDATE marker_translations SET why_it_matters = 'TSH ist der wichtigste Schilddrüsenwert. Abweichungen sind das früheste Zeichen einer Über- oder Unterfunktion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'tsh' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Freies T3 ist das aktivste Schilddrüsenhormon und steuert Stoffwechsel, Energie und Körpertemperatur.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ft3' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Freies T4 ist das Haupthormon der Schilddrüse und wird im Körper zu aktivem T3 umgewandelt.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ft4' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Hormones
UPDATE marker_translations SET why_it_matters = 'Testosteron beeinflusst Muskelmasse, Knochendichte, Energie und Libido bei Männern und Frauen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'testosterone' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Freies Testosteron ist der biologisch aktive Anteil und ein besserer Indikator für den Androgenstatus als das Gesamttestosteron.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'free_testosterone' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'SHBG bindet Sexualhormone und reguliert deren Verfügbarkeit. Abweichungen beeinflussen das Gleichgewicht von Testosteron und Östrogen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'shbg' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Freie Androgenindex schätzt das biologisch verfügbare Testosteron im Verhältnis zum SHBG.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'free_androgen_index' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'DHEA-S ist ein Nebennierenhormon und Vorläufer von Testosteron und Östrogen. Es nimmt mit dem Alter ab.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'dheas' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Estradiol ist das wichtigste Östrogen, wesentlich für Knochengesundheit, Herz-Kreislauf-Schutz und Fortpflanzung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'estradiol' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Progesteron unterstützt den Menstruationszyklus und die Schwangerschaft. Bei Männern beeinflusst es die Stimmung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'progesterone' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'FSH reguliert die Fortpflanzung  -  den Eisprung bei Frauen und die Spermienproduktion bei Männern.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'fsh' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'LH löst den Eisprung bei Frauen aus und stimuliert die Testosteronproduktion bei Männern.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lh' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Prolaktin reguliert die Milchproduktion, kann aber bei Erhöhung Fruchtbarkeit und Libido beeinträchtigen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'prolactin' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Electrolytes & Minerals
UPDATE marker_translations SET why_it_matters = 'Kalzium ist essenziell für Knochen, Muskelkontraktion, Nervensignale und Blutgerinnung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'calcium' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Magnesium ist an über 300 Enzymreaktionen beteiligt, darunter Energieproduktion, Muskelfunktion und Blutdruckregulation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'magnesium' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Phosphat arbeitet mit Kalzium für die Knochengesundheit und ist entscheidend für den Energiestoffwechsel (ATP).', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'phosphate' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Kalium reguliert Herzrhythmus, Muskelkontraktionen und Nervenimpulse. Abweichungen können lebensbedrohliche Herzrhythmusstörungen verursachen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'potassium' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Natrium reguliert den Flüssigkeitshaushalt und Blutdruck. Zu viel oder zu wenig stört die Zellfunktion im gesamten Körper.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'sodium' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Selen ist essenziell für den Schilddrüsenhormon-Stoffwechsel, die antioxidative Abwehr und die Immunfunktion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'selenium' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Zink unterstützt Immunfunktion, Wundheilung, DNA-Synthese und Geschmackswahrnehmung. Mangel ist häufig und oft unterdiagnostiziert.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'zinc' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Iron
UPDATE marker_translations SET why_it_matters = 'Eisen ist essenziell für den Sauerstofftransport im Blut. Mangel verursacht Anämie; Überschuss kann Organe schädigen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'iron' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Ferritin zeigt die Eisenspeicher des Körpers. Es ist der empfindlichste Marker für Eisenmangel und Eisenüberladung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ferritin' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Transferrin transportiert Eisen im Blut. Der Wert zeigt die Eisentransportkapazität des Körpers.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'transferrin' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Die Transferrinsättigung zeigt, wie viel der Eisentransportkapazität genutzt wird  -  wichtig zur Unterscheidung von Anämieformen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'transferrin_sat' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Vitamins
UPDATE marker_translations SET why_it_matters = 'Vitamin D ist entscheidend für Knochengesundheit, Immunfunktion und Stimmung. Mangel ist besonders in nördlichen Breitengraden weit verbreitet.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_d' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin A unterstützt Sehkraft, Immunfunktion und Hautgesundheit. Sowohl Mangel als auch Überschuss können ernste Probleme verursachen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_a' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B1 ist essenziell für den Energiestoffwechsel und die Nervenfunktion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b1' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B2 wird für die Energieproduktion, Zellfunktion und den Fettstoffwechsel benötigt.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b2' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B3 unterstützt Energiestoffwechsel, DNA-Reparatur und Cholesterinregulation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b3' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B5 ist Bestandteil von Coenzym A, essenziell für Fettsäuresynthese und Energiegewinnung aus Nahrung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b5' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B6 ist an über 100 Enzymreaktionen beteiligt, besonders am Aminosäurestoffwechsel und der Neurotransmitter-Synthese.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b6' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin B12 ist entscheidend für Nervenfunktion, DNA-Synthese und Blutbildung. Mangel verursacht irreversible Nervenschäden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b12' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Holotranscobalamin ist der früheste und spezifischste Marker für Vitamin-B12-Mangel  -  erkennt ihn vor Auftreten von Symptomen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'holo_tc' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Folsäure ist essenziell für DNA-Synthese und Zellteilung. Mangel in der Schwangerschaft verursacht Neuralrohrdefekte.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'folate' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Vitamin E schützt Zellmembranen vor oxidativem Schaden und unterstützt Immunfunktion und Hautgesundheit.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_e' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Omega-3
UPDATE marker_translations SET why_it_matters = 'Der Omega-3-Index misst EPA+DHA in roten Blutkörperchen  -  ein starker Prädiktor für Herz-Kreislauf-Risiko und systemische Entzündung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'omega3_index' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'EPA ist eine Omega-3-Fettsäure mit starken entzündungshemmenden Effekten, besonders vorteilhaft für Herz und Gelenke.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'epa' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'DHA ist die wichtigste strukturelle Omega-3-Fettsäure in Gehirn und Netzhaut. Ausreichende Werte unterstützen kognitive Funktion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'dha' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- CBC
UPDATE marker_translations SET why_it_matters = 'Weiße Blutkörperchen sind das Fundament des Immunsystems. Abweichungen können auf Infektionen, Entzündungen oder Immunstörungen hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'wbc' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Rote Blutkörperchen transportieren Sauerstoff. Niedrige Werte verursachen Anämie; hohe Werte können das Blut verdicken.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'rbc' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Hämatokrit zeigt den Anteil roter Blutkörperchen am Blutvolumen  -  ein wichtiger Indikator für Sauerstofftransportkapazität.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hematocrit' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Hämoglobin ist das sauerstofftragende Protein in roten Blutkörperchen. Niedrige Werte bedeuten Anämie mit Müdigkeit und Schwäche.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hemoglobin' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Thrombozyten ermöglichen die Blutgerinnung. Zu wenige erhöhen das Blutungsrisiko; zu viele können gefährliche Gerinnsel bilden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'platelets' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'MCV misst die durchschnittliche Größe roter Blutkörperchen und hilft bei der Klassifikation von Anämieformen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mcv' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'MCH misst den durchschnittlichen Hämoglobingehalt pro rotem Blutkörperchen  -  hilft bei der Diagnose von Eisenmangel.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mch' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'MCHC misst die Hämoglobinkonzentration in roten Blutkörperchen und hilft bei der Unterscheidung von Anämieformen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mchc' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'RDW misst die Größenvariation roter Blutkörperchen. Erhöhte Werte können auf gemischte Anämien oder frühe Nährstoffmängel hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'rdw' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- WBC Differential (DE)
UPDATE marker_translations SET why_it_matters = 'Neutrophile sind die erste Abwehr bei bakteriellen Infektionen. Niedrige Werte erhöhen die Infektanfälligkeit.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'neutrophils_abs' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Neutrophilenanteil zeigt den Anteil der bakteriellen Abwehrzellen an den weißen Blutkörperchen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'neutrophils_pct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Lymphozyten steuern die adaptive Immunität  -  Virusabwehr, Antikörperproduktion und Immungedächtnis.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lymphocytes_abs' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Lymphozytenanteil zeigt das Gleichgewicht zwischen adaptiver und angeborener Immunität.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lymphocytes_pct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Monozyten reifen zu Makrophagen heran, die Krankheitserreger und abgestorbene Zellen beseitigen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'monocytes_abs' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Monozytenanteil zeigt den Anteil der Zellen, die für Gewebereparatur und chronische Immunantworten zuständig sind.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'monocytes_pct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Eosinophile reagieren auf Parasiteninfektionen und sind an allergischen Reaktionen beteiligt.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'eosinophils_abs' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Eosinophilenanteil zeigt den Anteil der weißen Blutkörperchen, die an allergischen und parasitären Reaktionen beteiligt sind.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'eosinophils_pct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Basophile setzen Histamin frei und spielen eine Rolle bei allergischen Reaktionen und Entzündungen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'basophils_abs' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Basophilenanteil zeigt den kleinsten Anteil weißer Blutkörperchen, beteiligt an allergischen und entzündlichen Reaktionen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'basophils_pct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Cardiovascular (DE)
UPDATE marker_translations SET why_it_matters = 'Der systolische Blutdruck misst die Kraft während des Herzschlags  -  die wichtigste Einzelzahl zur Beurteilung des Herz-Kreislauf-Risikos.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bp_systolic' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der diastolische Blutdruck misst die Kraft zwischen Herzschlägen. Dauerhaft erhöhte Werte schädigen die Blutgefäße.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bp_diastolic' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Die Herzfrequenz spiegelt die kardiovaskuläre Fitness wider. Ein niedrigerer Ruhepuls deutet auf bessere Fitness hin.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'heart_rate' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

-- Body Composition (DE)
UPDATE marker_translations SET why_it_matters = 'Das Körpergewicht ist ein grundlegender Gesundheitswert. Trends über die Zeit zeigen den Einfluss von Ernährung und Bewegung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'weight' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Körperfettanteil unterscheidet zwischen Fett- und Magermasse  -  ein genaueres Bild als das Gewicht allein.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'body_fat_pct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Muskelanteil spiegelt die Magermasse wider  -  entscheidend für Stoffwechselgesundheit, Kraft und gesundes Altern.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'muscle_pct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Wasseranteil zeigt den Hydratationsstatus. Ausreichende Flüssigkeitszufuhr ist essenziell für Organfunktion und Temperaturregulation.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'body_water_pct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Die Knochenmasse zeigt die Skelettdichte. Tracking hilft, frühe Anzeichen von Osteoporose zu erkennen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bone_mass_pct' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');

UPDATE marker_translations SET why_it_matters = 'Der Bauchumfang misst die viszerale Fettverteilung  -  ein stärkerer Prädiktor für metabolisches Syndrom als der BMI.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'waist_circumference' AND marker_translations.locale = 'de' AND (marker_translations.why_it_matters IS NULL OR marker_translations.why_it_matters = '');


-- ============================================================================
-- GERMAN  -  when_to_worry (all 92 markers)
-- ============================================================================

UPDATE marker_translations SET when_to_worry = 'Albumin dauerhaft unter 35 g/L kann auf Lebererkrankungen, Nierenprobleme oder Mangelernährung hinweisen. Arzt konsultieren.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'albumin' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'ALP über 130 U/L sollte abgeklärt werden. In Kombination mit erhöhter GGT deutet es auf Leberprobleme hin.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'alp' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'ALT über 35 U/L weist auf Leberzellschäden hin. Wiederholte Erhöhungen sollten ärztlich abgeklärt werden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'alt' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'AST über 40 U/L zusammen mit erhöhter ALT deutet auf Leberschäden hin. Isolierte AST-Erhöhung kann Herz- oder Muskelursachen haben.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ast' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'ApoB über 1,0 g/L deutet auf erhöhtes Atherosklerose-Risiko hin. Lebensstiländerungen und ärztliche Beratung empfohlen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'apob' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Direktes Bilirubin über 5 µmol/L kann auf Gallengangverschluss oder Lebererkrankungen hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bilirubin_direct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Gesamtbilirubin über 21 µmol/L kann sichtbare Gelbsucht verursachen. Bei Gelbfärbung von Haut oder Augen Arzt aufsuchen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bilirubin_total' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'GGT über 60 U/L kann auf Leberschäden hinweisen, besonders bei Alkoholkonsum. Ärztliche Abklärung empfohlen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ggt' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'LDH über 250 U/L kann auf Gewebeschäden hinweisen. Dauerhaft erhöhte Werte sollten weiter untersucht werden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ldh' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Gesamtprotein unter 60 g/L oder über 80 g/L kann auf Leber-, Nieren- oder Immunerkrankungen hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'total_protein' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Kreatinin über dem Referenzbereich kann auf eingeschränkte Nierenfunktion hinweisen. Besonders bei Diabetes und Bluthochdruck kontrollieren.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'creatinine' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Cystatin C über 1,0 mg/L kann auf eingeschränkte Nierenfunktion hinweisen. Arzt konsultieren, besonders bei Diabetes oder Bluthochdruck.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'cystatin_c' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'eGFR unter 60 mL/min deutet auf chronische Nierenerkrankung hin. Unter 30 mL/min ist schwerwiegend  -  ärztliche Betreuung notwendig.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'egfr' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Gesamtcholesterin über 5,2 mmol/L sollte zusammen mit HDL und LDL bewertet werden. Allein wenig aussagekräftig.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'total_cholesterol' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'HDL unter 1,0 mmol/L (Männer) oder 1,3 mmol/L (Frauen) erhöht das kardiovaskuläre Risiko. Bewegung und Ernährung helfen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hdl_c' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'LDL über 3,0 mmol/L erhöht das Atherosklerose-Risiko. Bei Vorerkrankungen sollte der Zielwert niedriger sein.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ldl_c' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Non-HDL über 3,4 mmol/L erhöht das kardiovaskuläre Risiko. Lebensstiländerungen und ggf. Statine mit dem Arzt besprechen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'non_hdl_c' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Triglyceride nüchtern über 1,7 mmol/L erhöhen das Herzinfarktrisiko. Ernährungsumstellung ist oft sehr wirksam.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'triglycerides' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Lp(a) über 75 nmol/L erhöht das Herzinfarktrisiko deutlich. Da genetisch bedingt, gezielte Prävention mit dem Arzt besprechen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lpa' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'hsCRP über 3,0 mg/L deutet auf erhöhte systemische Entzündung hin. Ursache abklären lassen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hs_crp' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Homocystein über 15 µmol/L ist mit erhöhtem Herz-Kreislauf- und kognitivem Risiko verbunden. B-Vitamine helfen oft.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'homocysteine' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Nüchternblutzucker über 7,0 mmol/L deutet auf Diabetes hin. Zwischen 5,6–6,9 besteht Prädiabetes. Arzt konsultieren.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'glucose' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'HbA1c über 6,5% bestätigt Diabetes. Zwischen 5,7–6,4% besteht Prädiabetes. Regelmäßige Kontrolle wichtig.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hba1c' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Nüchterninsulin über 25 µIU/mL kann auf Insulinresistenz hinweisen  -  ein Frühzeichen für Typ-2-Diabetes.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'insulin' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Harnsäure über 420 µmol/L (Männer) oder 360 µmol/L (Frauen) erhöht das Gichtrisiko. Ernährung anpassen und Arzt konsultieren.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'uric_acid' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Blutketone über 3,0 mmol/L bei Diabetes können auf Ketoazidose hinweisen  -  sofort Arzt aufsuchen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ketones' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'TSH über 4,0 mIU/L deutet auf Schilddrüsenunterfunktion; unter 0,4 auf Überfunktion. Beides ärztlich abklären.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'tsh' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Freies T3 außerhalb von 3,1–6,8 pmol/L kann auf Schilddrüsenstörungen hinweisen. Zusammen mit TSH beurteilen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ft3' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Freies T4 außerhalb von 12–22 pmol/L kann auf Schilddrüsen-Über- oder -Unterfunktion hinweisen. Immer mit TSH zusammen bewerten.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ft4' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Niedriges Testosteron mit Symptomen wie Müdigkeit, niedrige Libido oder Muskelverlust sollte endokrinologisch abgeklärt werden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'testosterone' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Niedrig freies Testosteron zusammen mit Androgenmangel-Symptomen sollte fachärztlich abgeklärt werden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'free_testosterone' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Sehr hohes SHBG kann bioverfügbares Testosteron senken. Sehr niedriges SHBG kann auf Insulinresistenz hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'shbg' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Ein erhöhter Freier Androgenindex bei Frauen kann auf PCOS hinweisen. Ärztliche Abklärung empfohlen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'free_androgen_index' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Sehr niedriges DHEA-S für das Alter kann auf Nebenniereninsuffizienz hinweisen. Arzt vor Supplementierung konsultieren.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'dheas' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Abweichende Estradiol-Werte können Knochendichte, Stimmung und Herzgesundheit beeinflussen. Ärztlich abklären bei anhaltenden Abweichungen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'estradiol' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Abweichende Progesteron-Werte können auf Lutealphasendefekt oder hormonelle Dysbalance hinweisen. Bei Zyklusstörungen Arzt konsultieren.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'progesterone' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Erhöhtes FSH bei jüngeren Frauen kann auf verminderte Eizellreserve hinweisen. Bei Männern auf Hodenprobleme.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'fsh' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Dauerhaft erhöhtes LH oder ein abnormales LH/FSH-Verhältnis kann auf PCOS oder Hypophysenprobleme hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lh' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Prolaktin über 25 mIU/L bei nicht-schwangeren/stillenden Personen kann auf Hypophysenprobleme hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'prolactin' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Kalzium unter 2,1 oder über 2,6 mmol/L erfordert Abklärung. Symptome: Muskelkrämpfe, Müdigkeit, Verwirrtheit.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'calcium' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Magnesium unter 0,7 mmol/L kann Muskelkrämpfe, Herzrhythmusstörungen und Müdigkeit verursachen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'magnesium' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Phosphat außerhalb von 0,8–1,5 mmol/L kann auf Nieren-, Nebenschilddrüsen- oder Ernährungsprobleme hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'phosphate' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Kalium unter 3,5 oder über 5,0 mmol/L kann gefährliche Herzrhythmusstörungen verursachen. Extreme Werte sofort ärztlich behandeln.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'potassium' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Natrium unter 135 oder über 145 mmol/L kann Hirn- und Muskelfunktion beeinträchtigen. Schwere Abweichungen erfordern sofortige Behandlung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'sodium' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Selen unter 70 µg/L kann Schilddrüse und Immunität beeinträchtigen. Über 400 µg/L droht Vergiftung.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'selenium' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Zink unter 10 µmol/L kann Immunfunktion und Wundheilung beeinträchtigen. Supplementierung nur nach Testung, um Kupfermangel zu vermeiden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'zinc' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Eisen unter dem Referenzbereich verursacht Anämie mit Müdigkeit. Über dem Referenzbereich kann auf Hämochromatose hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'iron' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Ferritin unter 30 µg/L deutet auf Eisenmangel hin. Über 300 µg/L (Männer) kann auf Eisenüberladung hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'ferritin' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Abweichende Transferrin-Werte helfen bei der Identifikation von Eisenmangel (hoch) oder Eisenüberladung (niedrig).', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'transferrin' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Transferrinsättigung unter 20% deutet auf Eisenmangel hin; über 45% kann auf Hämochromatose hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'transferrin_sat' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin D unter 50 nmol/L ist Mangel. Unter 30 nmol/L schwerer Mangel mit erhöhtem Risiko für Knochen- und Immunprobleme.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_d' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin A unter 1,0 µmol/L beeinträchtigt Sehkraft und Immunität. Über 3,0 µmol/L droht Lebertoxizität.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_a' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin-B1-Mangel ist häufig bei Alkoholismus und Mangelernährung. Bei unerklärlichen Nervensymptomen Arzt aufsuchen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b1' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Niedriges Vitamin B2 kann rissige Lippen, Halsschmerzen und Lichtempfindlichkeit verursachen. Supplementierung hilft schnell.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b2' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Niedriges Vitamin B3 kann Dermatitis, Durchfall und kognitive Probleme verursachen. Hochdosierte Supplementierung kann Flush und Leberstress verursachen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b3' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin-B5-Mangel ist selten, kann aber Müdigkeit und Taubheitsgefühle verursachen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b5' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin B6 über 200 nmol/L durch Überdosierung kann Nervenschäden verursachen. Mangel führt zu Anämie und Hautproblemen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b6' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin B12 unter 150 pmol/L erfordert Behandlung zur Vermeidung irreversibler Nervenschäden. Veganer und Ältere sind am stärksten gefährdet.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_b12' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Holotranscobalamin unter 35 pmol/L zeigt B12-Mangel an, selbst wenn Gesamt-B12 normal erscheint. Zeitnah behandeln.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'holo_tc' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Folsäure unter 7 µg/L erhöht das Anämierisiko und in der Schwangerschaft das Risiko für Neuralrohrdefekte.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'folate' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Vitamin-E-Mangel ist selten, kann aber Nerven- und Muskelschäden verursachen. Überdosierung kann das Blutungsrisiko erhöhen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'vitamin_e' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Ein Omega-3-Index unter 4% verdoppelt das Herz-Kreislauf-Risiko. Mehr fetten Fisch essen oder EPA/DHA supplementieren.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'omega3_index' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Niedrige EPA-Werte sind mit höherer Entzündung verbunden. Fetten Fisch oder Fischölpräparate in Betracht ziehen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'epa' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Niedriges DHA kann kognitive Funktion und Stimmung beeinträchtigen. Fetter Fisch 2–3x pro Woche oder Algen-DHA-Präparate helfen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'dha' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Leukozyten unter 4,0 Gpt/L erhöhen die Infektanfälligkeit; über 11,0 Gpt/L weisen auf Infektion oder Entzündung hin.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'wbc' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Erythrozyten unter dem Normbereich weisen auf Anämie hin. Über dem Normbereich kann Dehydrierung oder Polyzythämie anzeigen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'rbc' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Hämatokrit unter dem Normbereich deutet auf Anämie hin; darüber auf Dehydrierung oder Polyzythämie.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hematocrit' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Hämoglobin unter dem Normbereich verursacht Anämie mit Müdigkeit und Schwäche. Ursache abklären lassen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'hemoglobin' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Thrombozyten unter 150 Gpt/L erhöhen Blutungsrisiko; über 400 Gpt/L erhöhen Thromboserisiko. Beides ärztlich abklären.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'platelets' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'MCV unter 80 fL deutet auf Eisenmangel hin; über 100 fL auf B12- oder Folsäuremangel. Beides abklären lassen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mcv' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Niedriges MCH parallel zu niedrigem MCV deutet auf Eisenmangelanämie hin. Hohes MCH kann B12- oder Folsäuremangel anzeigen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mch' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Niedrige MCHC kann auf Eisenmangelanämie hinweisen. Hohe MCHC ist selten und kann auf hereditäre Sphärozytose deuten.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'mchc' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'RDW über 14,5% deutet auf ungleichmäßige Erythrozytengrößen hin  -  mögliche Eisenmangel-, B12-Mangel- oder Mischanämie.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'rdw' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Neutrophile unter 1,5 Gpt/L (Neutropenie) erhöhen die Infektanfälligkeit deutlich. Über 7,0 Gpt/L oft bei aktiver Infektion.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'neutrophils_abs' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Neutrophilenanteil außerhalb von 40–70% sollte zusammen mit dem Absolutwert und klinischem Kontext bewertet werden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'neutrophils_pct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Lymphozyten unter 1,0 Gpt/L können Immunsuppression anzeigen. Über 4,0 Gpt/L kann auf Virusinfektion oder lymphoproliferative Erkrankung hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lymphocytes_abs' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Lymphozytenanteil immer zusammen mit dem Absolutwert interpretieren. Relative Änderungen können ohne Gesamt-Leukozyten irreführend sein.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'lymphocytes_pct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Dauerhaft erhöhte Monozyten können auf chronische Infektion, Autoimmunerkrankung oder Bluterkrankungen hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'monocytes_abs' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Monozytenanteil über 10% kann auf chronische Entzündung oder Infektion hinweisen. Zusammen mit Absolutwert bewerten.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'monocytes_pct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Eosinophile über 0,5 Gpt/L können auf Allergien, Parasiteninfektionen oder eosinophile Erkrankungen hinweisen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'eosinophils_abs' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Eosinophilenanteil über 5% deutet auf allergische oder parasitäre Prozesse hin. Mit Symptomen und Absolutwert korrelieren.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'eosinophils_pct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Basophile sind selten isoliert erhöht. Anhaltende Erhöhung kann mit myeloproliferativen Erkrankungen assoziiert sein.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'basophils_abs' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Basophilenanteil über 1% ist ungewöhnlich und sollte bei Persistenz weiter untersucht werden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'basophils_pct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Systolischer Blutdruck dauerhaft über 140 mmHg ist Hypertonie Grad 2. Über 180 mmHg ist ein hypertensiver Notfall  -  sofort Arzt aufsuchen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bp_systolic' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Diastolischer Blutdruck dauerhaft über 90 mmHg zeigt Hypertonie an. Über 120 mmHg erfordert sofortige ärztliche Hilfe.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bp_diastolic' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Ruhepuls dauerhaft über 100 bpm (Tachykardie) oder unter 50 bpm mit Symptomen wie Schwindel sollte abgeklärt werden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'heart_rate' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Unbeabsichtigter Gewichtsverlust von mehr als 5% in 6 Monaten oder schnelle Zunahme sollte ärztlich abgeklärt werden.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'weight' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Sehr hoher Körperfettanteil erhöht das Risiko für metabolisches Syndrom, Typ-2-Diabetes und Herz-Kreislauf-Erkrankungen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'body_fat_pct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Abnehmender Muskelanteil mit dem Alter erhöht Sturzrisiko und metabolische Verlangsamung. Krafttraining hilft, Muskelmasse zu erhalten.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'muscle_pct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Körperwasser unter 45% kann auf chronische Dehydrierung hinweisen, die Nierenfunktion und kognitive Leistung beeinträchtigt.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'body_water_pct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Abnehmende Knochenmasse über die Zeit kann auf Osteopenie oder Osteoporose hinweisen. Knochendichtemessung mit dem Arzt besprechen.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'bone_mass_pct' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');

UPDATE marker_translations SET when_to_worry = 'Bauchumfang über 102 cm (Männer) oder 88 cm (Frauen) erhöht das Risiko für metabolisches Syndrom und Herz-Kreislauf-Erkrankungen deutlich.', updated_at = NOW()
FROM markers m WHERE marker_translations.marker_id = m.id AND m.marker_slug = 'waist_circumference' AND marker_translations.locale = 'de' AND (marker_translations.when_to_worry IS NULL OR marker_translations.when_to_worry = '');
