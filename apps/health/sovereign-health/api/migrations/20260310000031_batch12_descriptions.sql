-- Migration: batch12_descriptions
-- Insert 'description' content_type rows for all standard and calculated markers

-- ============================================================================
-- HOME DEVICE MARKERS (12)
-- ============================================================================

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('glucose', 'description', 'Blood Glucose', 'Blood glucose is the sugar in your blood that your cells use for energy. Your body tightly regulates it with insulin. Fasting glucose is one of the best indicators of metabolic health.

This marker is affected by fasting. See the fasting protocol range below.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ketones', 'description', 'Blood Ketones (BHB)', 'Beta-hydroxybutyrate (BHB) is a ketone body your liver produces when burning fat for fuel. Higher levels indicate your body is in ketosis, using fat instead of glucose for energy.

This marker is affected by fasting. See the fasting protocol range below.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('hemoglobin', 'description', 'Hemoglobin', 'Hemoglobin is the protein in red blood cells that carries oxygen from your lungs to every tissue in your body. Low hemoglobin means less oxygen delivery, causing fatigue and weakness.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('hematocrit', 'description', 'Hematocrit', 'Hematocrit is the percentage of your blood volume made up of red blood cells. It reflects your blood''s oxygen-carrying capacity and hydration status.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('bp_systolic', 'description', 'Systolic Blood Pressure', 'Systolic blood pressure is the top number in a blood pressure reading. It measures the pressure in your arteries when your heart beats and pushes blood out.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('bp_diastolic', 'description', 'Diastolic Blood Pressure', 'Diastolic blood pressure is the bottom number in a blood pressure reading. It measures the pressure in your arteries between heartbeats, when your heart is resting and refilling.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('heart_rate', 'description', 'Resting Heart Rate', 'Heart rate is the number of times your heart beats per minute at rest. A lower resting heart rate generally indicates better cardiovascular fitness.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('uric_acid', 'description', 'Uric Acid', 'Uric acid is a waste product from breaking down purines found in certain foods and your own cells. High levels can cause gout and kidney stones, and may signal metabolic stress.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('weight', 'description', 'Body Weight', 'Body weight is your total mass including muscle, fat, bone, water, and organs. While useful for tracking trends, it does not distinguish between lean mass and body fat.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('waist_circumference', 'description', 'Waist Circumference', 'Waist circumference measures the distance around your midsection at the navel. It is one of the best simple indicators of visceral (belly) fat, which is strongly linked to metabolic disease risk.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('total_cholesterol', 'description', 'Total Cholesterol', 'Total cholesterol is the sum of all cholesterol in your blood, including HDL, LDL, and VLDL fractions. By itself it is a poor predictor of cardiovascular risk.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('insulin', 'description', 'Fasting Insulin', 'Fasting insulin measures how much insulin your pancreas produces when you have not eaten. High fasting insulin is one of the earliest signs of insulin resistance, often appearing years before blood sugar rises.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

-- ============================================================================
-- LAB MARKERS (72)
-- ============================================================================

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('hba1c', 'description', 'HbA1c (Glycated Hemoglobin)', 'HbA1c (glycated hemoglobin) reflects your average blood sugar over the past 2-3 months. It shows what percentage of hemoglobin in your red blood cells has glucose attached to it.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('hdl_c', 'description', 'HDL Cholesterol', 'HDL cholesterol carries excess cholesterol from your arteries back to your liver for recycling. Higher HDL is generally protective against heart disease.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ldl_c', 'description', 'LDL Cholesterol', 'LDL cholesterol delivers cholesterol to your cells and artery walls. When LDL particles are elevated, especially small dense ones, they contribute to plaque buildup in arteries.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('non_hdl_c', 'description', 'Non-HDL Cholesterol', 'Non-HDL cholesterol includes all cholesterol-carrying particles except HDL. It captures LDL plus VLDL and remnant particles, making it a better risk marker than LDL alone.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('triglycerides', 'description', 'Triglycerides', 'Triglycerides are fats in your blood that your body uses for energy storage. Elevated triglycerides, especially when combined with low HDL, are a strong signal of insulin resistance.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('apob', 'description', 'Apolipoprotein B (ApoB)', 'Apolipoprotein B (ApoB) counts the number of potentially harmful cholesterol particles in your blood. Each LDL, VLDL, and Lp(a) particle carries exactly one ApoB molecule, making it the best single marker for cardiovascular risk.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('lpa', 'description', 'Lipoprotein(a)', 'Lipoprotein(a) is a genetically determined cholesterol particle similar to LDL but with an extra protein attached. Elevated Lp(a) significantly increases cardiovascular and stroke risk regardless of other lipid levels.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('tsh', 'description', 'TSH (Thyroid-Stimulating Hormone)', 'Thyroid-stimulating hormone (TSH) tells your thyroid gland how much thyroid hormone to produce. High TSH means your thyroid is underactive; low TSH means it is overactive.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ft4', 'description', 'Free T4 (Thyroxine)', 'Free T4 (thyroxine) is the main hormone your thyroid releases into your blood. Your body converts T4 into the more active T3 form in your tissues.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ft3', 'description', 'Free T3 (Triiodothyronine)', 'Free T3 (triiodothyronine) is the most active thyroid hormone. It directly controls your metabolic rate, body temperature, heart rate, and energy production.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('dheas', 'description', 'DHEA-S', 'DHEA-S is a precursor hormone made by your adrenal glands. Your body converts it into testosterone and estrogen. Levels naturally decline with age and can reflect adrenal function and biological aging.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ferritin', 'description', 'Ferritin', 'Ferritin is the protein that stores iron inside your cells. It is the most reliable single test for iron status. Low ferritin is the earliest sign of iron depletion, well before anemia develops.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('iron', 'description', 'Serum Iron', 'Serum iron measures the amount of iron circulating in your blood. Low iron can cause fatigue, weakness, and poor concentration. High iron can damage your liver and heart over time.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('transferrin', 'description', 'Transferrin', 'Transferrin is the protein that transports iron through your bloodstream to where it is needed. High transferrin can indicate iron deficiency as your body tries harder to capture scarce iron.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('transferrin_sat', 'description', 'Transferrin Saturation', 'Transferrin saturation shows what percentage of your transferrin is carrying iron. It helps distinguish between iron deficiency and iron overload more accurately than iron levels alone.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('vitamin_d', 'description', 'Vitamin D', 'Vitamin D is both a vitamin and a hormone that regulates calcium absorption, immune function, and mood. Most people in northern climates are deficient, especially in winter.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('vitamin_b12', 'description', 'Vitamin B12', 'Vitamin B12 is essential for nerve function, DNA synthesis, and red blood cell formation. Deficiency can cause fatigue, numbness, memory problems, and irreversible nerve damage if left untreated.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('folate', 'description', 'Folate (Vitamin B9)', 'Folate (vitamin B9) is critical for DNA synthesis, cell division, and red blood cell formation. It works closely with B12. Deficiency is especially dangerous during pregnancy.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('vitamin_b6', 'description', 'Vitamin B6', 'Vitamin B6 is involved in over 100 enzyme reactions, including protein metabolism, neurotransmitter synthesis, and immune function. Deficiency can cause nerve damage and confusion.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('vitamin_b1', 'description', 'Vitamin B1 (Thiamine)', 'Vitamin B1 (thiamine) is essential for converting food into energy and proper nerve function. Deficiency is rare on a varied diet but common with high alcohol intake.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('vitamin_b2', 'description', 'Vitamin B2 (Riboflavin)', 'Vitamin B2 (riboflavin) helps your body convert food into energy and acts as an antioxidant. It is important for red blood cell production and maintaining healthy skin.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('vitamin_b3', 'description', 'Vitamin B3 (Niacin)', 'Vitamin B3 (niacin) supports energy metabolism, DNA repair, and cholesterol regulation. Severe deficiency causes pellagra, with symptoms of dermatitis, diarrhea, and dementia.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('vitamin_b5', 'description', 'Vitamin B5 (Pantothenic Acid)', 'Vitamin B5 (pantothenic acid) is needed to make coenzyme A, which is central to energy metabolism. It is found in nearly all foods, so deficiency is extremely rare.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('vitamin_a', 'description', 'Vitamin A', 'Vitamin A is essential for vision, immune function, and cell growth. It exists as retinol (animal sources) and beta-carotene (plant sources). Both excess and deficiency can cause health problems.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('vitamin_e', 'description', 'Vitamin E', 'Vitamin E is a fat-soluble antioxidant that protects cell membranes from oxidative damage. It also supports immune function and helps prevent excessive blood clotting.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('calcium', 'description', 'Calcium', 'Calcium is the most abundant mineral in your body, critical for strong bones, muscle contraction, nerve signaling, and blood clotting. Most calcium is stored in your bones and teeth.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('magnesium', 'description', 'Magnesium', 'Magnesium is involved in over 300 enzyme reactions including energy production, muscle function, and nerve signaling. It is one of the most common deficiencies and is hard to detect with blood tests alone.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('potassium', 'description', 'Potassium', 'Potassium is an electrolyte that regulates fluid balance, nerve signals, and muscle contractions including your heartbeat. Both high and low levels can cause dangerous heart rhythm problems.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('sodium', 'description', 'Sodium', 'Sodium is an essential electrolyte that controls fluid balance, nerve impulses, and muscle function. High sodium intake is linked to high blood pressure in salt-sensitive individuals.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('phosphate', 'description', 'Phosphate', 'Phosphate works with calcium to build strong bones and teeth. It is also part of DNA, cell membranes, and the ATP molecules your cells use for energy.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('zinc', 'description', 'Zinc', 'Zinc supports immune function, wound healing, taste, and smell. It is essential for over 300 enzymes and plays a key role in testosterone production and thyroid function.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('selenium', 'description', 'Selenium', 'Selenium is a trace mineral vital for thyroid hormone conversion, antioxidant defense, and immune function. Brazil nuts are the richest dietary source.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('creatinine', 'description', 'Creatinine', 'Creatinine is a waste product from normal muscle metabolism filtered out by your kidneys. Rising levels suggest your kidneys may not be filtering as efficiently as they should.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('egfr', 'description', 'eGFR (Estimated Glomerular Filtration Rate)', 'eGFR (estimated glomerular filtration rate) estimates how well your kidneys filter waste from your blood. It is calculated from creatinine, age, and sex. Higher values indicate better kidney function.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('cystatin_c', 'description', 'Cystatin C', 'Cystatin C is a protein produced by all cells that is filtered by your kidneys. It provides a more accurate estimate of kidney function than creatinine, especially in people with high or low muscle mass.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('alt', 'description', 'ALT (Alanine Aminotransferase)', 'ALT (alanine aminotransferase) is an enzyme found mainly in your liver. Elevated ALT is one of the earliest signs of liver inflammation or damage.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ast', 'description', 'AST (Aspartate Aminotransferase)', 'AST (aspartate aminotransferase) is an enzyme found in your liver, heart, and muscles. Elevated AST can indicate liver damage, but also heart or muscle injury.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ggt', 'description', 'GGT (Gamma-Glutamyl Transferase)', 'GGT (gamma-glutamyl transferase) is a liver enzyme that rises with alcohol use, fatty liver, and bile duct problems. It is a sensitive early marker for liver stress.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('alp', 'description', 'ALP (Alkaline Phosphatase)', 'ALP (alkaline phosphatase) is an enzyme found in your liver and bones. Elevated levels can indicate liver disease, bile duct obstruction, or increased bone turnover.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('bilirubin_total', 'description', 'Total Bilirubin', 'Total bilirubin is a yellow pigment produced when red blood cells break down. Your liver processes it for excretion. High levels cause jaundice and may indicate liver problems or excessive red blood cell destruction.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('bilirubin_direct', 'description', 'Direct Bilirubin', 'Direct (conjugated) bilirubin is the form processed by your liver for excretion in bile. Elevated direct bilirubin specifically points to liver or bile duct obstruction.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('ldh', 'description', 'LDH (Lactate Dehydrogenase)', 'LDH (lactate dehydrogenase) is an enzyme present in almost all body tissues. Elevated levels indicate tissue damage somewhere in the body but do not pinpoint the location.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('albumin', 'description', 'Albumin', 'Albumin is the most abundant protein in your blood, made by your liver. It maintains fluid balance, transports hormones and nutrients, and reflects overall nutritional status and liver function.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('total_protein', 'description', 'Total Protein', 'Total protein measures albumin plus globulins in your blood. It reflects your nutritional status, immune function, and liver and kidney health.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('homocysteine', 'description', 'Homocysteine', 'Homocysteine is an amino acid that, when elevated, damages blood vessel walls and increases cardiovascular risk. B vitamins (B6, B12, folate) help keep it in check.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('hs_crp', 'description', 'High-Sensitivity CRP', 'High-sensitivity CRP measures low-level inflammation throughout your body. Chronic elevation is linked to increased cardiovascular disease risk, even when cholesterol is normal.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('wbc', 'description', 'White Blood Cells (WBC)', 'White blood cells are your immune system''s defense force. A high count may signal infection or inflammation. A low count may indicate immune suppression or bone marrow problems.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('rbc', 'description', 'Red Blood Cells (RBC)', 'Red blood cells carry oxygen from your lungs to your entire body. Low RBC counts can cause anemia and fatigue. High counts may indicate dehydration or a bone marrow disorder.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('platelets', 'description', 'Platelets', 'Platelets are small cell fragments that help your blood clot to stop bleeding. Abnormal counts can cause excessive bleeding or dangerous clot formation.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('neutrophils_pct', 'description', 'Neutrophils (%)', 'Neutrophils are the most common white blood cells and your first line of defense against bacterial infections. This marker shows their percentage of total white blood cells.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('neutrophils_abs', 'description', 'Neutrophils (Absolute)', 'Neutrophil absolute count measures the actual number of neutrophils per liter of blood. It is more clinically useful than the percentage for assessing infection risk.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('lymphocytes_pct', 'description', 'Lymphocytes (%)', 'Lymphocytes include T cells, B cells, and natural killer cells. They handle viral infections and produce antibodies. This marker shows their percentage of total white blood cells.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('lymphocytes_abs', 'description', 'Lymphocytes (Absolute)', 'Lymphocyte absolute count measures the actual number of lymphocytes in your blood. Low counts can indicate immune deficiency.

This marker is affected by fasting. See the fasting protocol range below.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('monocytes_pct', 'description', 'Monocytes (%)', 'Monocytes are white blood cells that become macrophages in your tissues, engulfing and destroying pathogens and dead cells. This marker shows their percentage of total white blood cells.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('monocytes_abs', 'description', 'Monocytes (Absolute)', 'Monocyte absolute count measures the actual number of monocytes per liter of blood. Elevated counts can indicate chronic infection or inflammatory conditions.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('eosinophils_pct', 'description', 'Eosinophils (%)', 'Eosinophils are white blood cells that fight parasites and play a role in allergic responses. This marker shows their percentage of total white blood cells.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('eosinophils_abs', 'description', 'Eosinophils (Absolute)', 'Eosinophil absolute count measures the actual number of eosinophils in your blood. Elevated counts can indicate allergies, parasitic infections, or certain autoimmune conditions.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('basophils_pct', 'description', 'Basophils (%)', 'Basophils are the rarest white blood cells, involved in allergic reactions and inflammation. This marker shows their percentage of total white blood cells.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('basophils_abs', 'description', 'Basophils (Absolute)', 'Basophil absolute count measures the actual number of basophils per liter of blood. Significant elevation is rare and may indicate an allergic reaction or blood disorder.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('testosterone', 'description', 'Testosterone', 'Testosterone is the primary male sex hormone but is important for both sexes. It regulates muscle mass, bone density, fat distribution, mood, energy, and libido.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('free_testosterone', 'description', 'Free Testosterone', 'Free testosterone is the small fraction of testosterone not bound to proteins. It is the biologically active form that directly affects your tissues and symptoms.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('estradiol', 'description', 'Estradiol (E2)', 'Estradiol (E2) is the primary form of estrogen. In women it regulates the menstrual cycle and bone health. In men, balanced estradiol is important for bone density and cardiovascular health.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('progesterone', 'description', 'Progesterone', 'Progesterone balances estrogen and prepares the uterus for pregnancy. In both sexes it has calming effects on the nervous system and supports sleep quality.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('fsh', 'description', 'FSH (Follicle-Stimulating Hormone)', 'FSH (follicle-stimulating hormone) regulates reproductive function. In women it controls egg development. In men it supports sperm production. Levels change significantly with age and menopause.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('lh', 'description', 'LH (Luteinizing Hormone)', 'LH (luteinizing hormone) triggers ovulation in women and stimulates testosterone production in men. The LH-to-FSH ratio helps diagnose reproductive and hormonal conditions.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('shbg', 'description', 'SHBG (Sex Hormone-Binding Globulin)', 'SHBG (sex hormone-binding globulin) is a protein that binds testosterone and estrogen, controlling how much is available for your tissues. Higher SHBG means less free hormone activity.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('prolactin', 'description', 'Prolactin', 'Prolactin is a hormone best known for stimulating breast milk production. In non-pregnant individuals, elevated prolactin can cause menstrual irregularities and reduced libido.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('free_androgen_index', 'description', 'Free Androgen Index', 'The free androgen index estimates the percentage of testosterone that is biologically active. It is calculated from total testosterone and SHBG levels.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('omega3_index', 'description', 'Omega-3 Index', 'The Omega-3 Index measures the percentage of EPA and DHA in your red blood cell membranes. A higher index is associated with reduced cardiovascular risk and better brain health.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('epa', 'description', 'EPA (Eicosapentaenoic Acid)', 'EPA (eicosapentaenoic acid) is an omega-3 fatty acid with strong anti-inflammatory effects. It is found primarily in fatty fish and fish oil supplements.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('dha', 'description', 'DHA (Docosahexaenoic Acid)', 'DHA (docosahexaenoic acid) is an omega-3 fatty acid critical for brain structure and function. It makes up a significant portion of brain and retinal tissue.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('holo_tc', 'description', 'Holotranscobalamin', 'Holotranscobalamin is the fraction of vitamin B12 that is actively available for your cells to use. It is a more sensitive and earlier marker of B12 deficiency than total B12.', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

-- ============================================================================
-- CALCULATED MARKERS (8)
-- ============================================================================

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('gki', 'description', 'Glucose-Ketone Index (GKI)', 'The Glucose-Ketone Index measures the ratio between your blood glucose and ketone levels. A lower GKI indicates deeper ketosis and more effective fat burning. It was developed by Dr. Thomas Seyfried.

Formula: Glucose (mmol/L) / Ketones (mmol/L)
Based on: Glucose (glucose), Ketones (ketones)', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('dr_boz_ratio', 'description', 'Dr. Boz Ratio', 'The Dr. Boz Ratio is a popular alternative to GKI used in the ketogenic community, developed by Dr. Annette Bosworth. Lower values indicate deeper ketosis.

Formula: Glucose (mg/dL) / Ketones (mmol/L)
Based on: Glucose (glucose), Ketones (ketones)', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('whtr', 'description', 'Waist-to-Height Ratio (WHtR)', 'Waist-to-Height Ratio is one of the most reliable simple measures of visceral fat and metabolic risk. A ratio under 0.5 is considered healthy for most adults.

Formula: Waist Circumference (cm) / Height (cm)
Based on: Waist Circumference (waist_circumference), Height (from profile)', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('bmi', 'description', 'BMI (Body Mass Index)', 'BMI (Body Mass Index) estimates body fat based on your weight and height. It is a rough screening tool, not a direct measure of body composition.

Formula: Weight (kg) / Height (m)^2
Based on: Weight (weight), Height (from profile)', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('hct_hb_ratio', 'description', 'HCT/HB Ratio', 'The HCT/HB Ratio estimates mean corpuscular volume (MCV) and helps detect hydration changes during fasting. Abnormal values can signal dehydration or blood cell size issues.

Formula: Hematocrit (%) / Hemoglobin (g/dL)
Based on: Hematocrit (hematocrit), Hemoglobin (hemoglobin)', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('tg_hdl_ratio', 'description', 'TG/HDL Ratio', 'The TG/HDL Ratio is a simple proxy for insulin resistance and cardiovascular risk. A lower ratio suggests better metabolic health. Values under 1.5 (mmol/L) are considered optimal.

Formula: Triglycerides / HDL Cholesterol
Based on: Triglycerides (triglycerides), HDL Cholesterol (hdl_c)', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('homa_ir', 'description', 'HOMA-IR', 'HOMA-IR estimates how resistant your cells are to insulin. Lower values mean better insulin sensitivity. A value under 1.0 is considered optimal for metabolic health.

Formula: (Fasting Glucose mg/dL x Fasting Insulin uIU/mL) / 405
Based on: Glucose (glucose), Insulin (insulin)', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_content (marker_id, content_type, title, body_text, display_order)
VALUES ('tyg_index', 'description', 'TyG Index', 'The TyG Index estimates insulin resistance using fasting triglycerides and glucose. It does not require an insulin test, making it more accessible. A lower value indicates better insulin sensitivity.

Formula: ln(Triglycerides mg/dL x Glucose mg/dL / 2)
Based on: Triglycerides (triglycerides), Glucose (glucose)', -1)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;
