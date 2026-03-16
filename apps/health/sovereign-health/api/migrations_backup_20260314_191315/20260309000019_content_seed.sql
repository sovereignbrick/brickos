-- Migration 019: Seed educational content for 20 biomarkers.
-- Tables created in migration 017 (marker_content, marker_foods, marker_supplements)
-- and migration 018 (marker_references).
-- Uses ON CONFLICT DO NOTHING on marker_content; plain INSERT for other tables.

-- ============================================================
-- GLUCOSE
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$glucose$$, $$what_is$$, $$What Is Blood Glucose?$$, $$Blood glucose (blood sugar) is the concentration of glucose circulating in your bloodstream, expressed in mmol/L or mg/dL. It is your body's primary fuel source and must be kept within a narrow range , too high damages blood vessels and nerves, too low starves the brain.$$, $$en$$, 0),
($$glucose$$, $$did_you_know$$, $$Did You Know?$$, $$Your brain consumes roughly 120 g of glucose per day , about 60 % of your total resting glucose utilisation , yet it makes up only 2 % of your body weight.$$, $$en$$, 1),
($$glucose$$, $$health_facts$$, $$Clinical Significance$$, $$Fasting glucose above 7.0 mmol/L (126 mg/dL) on two occasions is diagnostic for type 2 diabetes. Chronically elevated glucose glycates proteins throughout the body, accelerating atherosclerosis, neuropathy, retinopathy, and kidney disease. Even modestly elevated fasting glucose (5.6–6.9 mmol/L) , the pre-diabetic range , is associated with significantly elevated cardiovascular risk.$$, $$en$$, 2),
($$glucose$$, $$food_for_thought$$, $$Food for Thought$$, $$Low-glycaemic foods such as non-starchy vegetables, legumes, and whole intact grains blunt post-meal glucose spikes, while refined carbohydrates and sugary drinks can raise fasting glucose within weeks of regular consumption.$$, $$en$$, 3),
($$glucose$$, $$fun_facts$$, $$Fun Facts$$, $$The first practical blood glucose meter, the Ames Reflectance Meter, weighed over 1 kg and took 70 seconds to produce a reading when it launched in 1970. Today's continuous glucose monitors update every 5 minutes and weigh less than a coin.$$, $$en$$, 4),
($$glucose$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Eat low-glycaemic-index carbohydrates and pair carbs with protein or fat to blunt spikes
• Walk for 10–15 minutes after meals to accelerate glucose clearance into muscle
• Prioritise 7–9 hours of sleep , even one night of poor sleep raises fasting glucose
• Limit refined sugar, white bread, and sugary beverages
• Resistance training increases GLUT4 transporter expression, improving insulin sensitivity
• Manage chronic stress , cortisol raises hepatic glucose output
• Stay well-hydrated; dehydration concentrates blood glucose$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$glucose$$, $$Broccoli$$, $$vegetable$$, 0),
($$glucose$$, $$Spinach$$, $$vegetable$$, 1),
($$glucose$$, $$Lentils$$, $$legume$$, 2),
($$glucose$$, $$Blueberries$$, $$fruit$$, 3),
($$glucose$$, $$Salmon$$, $$fish$$, 4),
($$glucose$$, $$Almonds$$, $$nut_seed$$, 5),
($$glucose$$, $$Cinnamon$$, $$herb_spice$$, 6),
($$glucose$$, $$Oats (rolled)$$, $$grain$$, 7);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$glucose$$, $$Berberine$$, $$500 mg 2–3× daily with meals$$, $$Activates AMPK similarly to metformin; shown to reduce fasting glucose by 1–2 mmol/L in RCTs.$$, 0),
($$glucose$$, $$Magnesium (glycinate)$$, $$200–400 mg daily$$, $$Magnesium is a cofactor for insulin receptor signalling; deficiency is common in insulin-resistant individuals.$$, 1),
($$glucose$$, $$Alpha-Lipoic Acid$$, $$600 mg daily$$, $$Antioxidant that improves insulin-mediated glucose uptake; evidence strongest for peripheral neuropathy.$$, 2),
($$glucose$$, $$Chromium Picolinate$$, $$200–1000 mcg daily$$, $$Potentiates insulin action; modest but consistent reductions in fasting glucose in meta-analyses.$$, 3);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$glucose$$, $$Classification and Diagnosis of Diabetes: Standards of Medical Care in Diabetes$$, $$Diabetes Care (ADA)$$, 2024, $$https://pubmed.ncbi.nlm.nih.gov/38078589/$$, 0),
($$glucose$$, $$Glycemic index for 60+ foods$$, $$American Journal of Clinical Nutrition$$, 2021, $$https://pubmed.ncbi.nlm.nih.gov/34258626/$$, 1),
($$glucose$$, $$Effect of berberine on fasting plasma glucose: a meta-analysis$$, $$Evidence-Based Complementary and Alternative Medicine$$, 2019, $$https://pubmed.ncbi.nlm.nih.gov/31214246/$$, 2),
($$glucose$$, $$Post-meal walking and glucose control: randomised crossover trial$$, $$Diabetologia$$, 2022, $$https://pubmed.ncbi.nlm.nih.gov/35972522/$$, 3);

-- ============================================================
-- KETONES
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$ketones$$, $$what_is$$, $$What Are Ketones?$$, $$Ketones (beta-hydroxybutyrate, acetoacetate, acetone) are water-soluble molecules produced by the liver when carbohydrate availability is low and fatty acid oxidation is high. Blood ketones are the most accurate measure; breath and urine ketones are proxies. They serve as a premium alternative fuel for the brain, heart, and skeletal muscle.$$, $$en$$, 0),
($$ketones$$, $$did_you_know$$, $$Did You Know?$$, $$The heart preferentially burns beta-hydroxybutyrate over glucose when both are available, extracting more ATP per molecule of oxygen consumed , making nutritional ketosis potentially cardioprotective.$$, $$en$$, 1),
($$ketones$$, $$health_facts$$, $$Clinical Significance$$, $$Nutritional ketosis (0.5–3.0 mmol/L) is a physiological state associated with improved insulin sensitivity, reduced inflammation, and cognitive benefits in some populations. Diabetic ketoacidosis (DKA) is a dangerous pathological state where ketones exceed 3 mmol/L alongside high blood glucose and low insulin , distinct from nutritional ketosis. Therapeutic ketosis is under investigation for epilepsy, Alzheimer''s disease, and certain cancers.$$, $$en$$, 2),
($$ketones$$, $$food_for_thought$$, $$Food for Thought$$, $$Restricting dietary carbohydrates below roughly 20–50 g per day shifts the liver into ketogenesis within 24–72 hours, while medium-chain triglycerides (found in coconut oil) are rapidly converted to ketones independently of carbohydrate intake.$$, $$en$$, 3),
($$ketones$$, $$fun_facts$$, $$Fun Facts$$, $$Newborns are in mild nutritional ketosis immediately after birth because breast milk is high in fat , suggesting the human brain is well-adapted to ketone metabolism from the very start of life.$$, $$en$$, 4),
($$ketones$$, $$how_to_stay_in_range$$, $$How to Stay in Range (Nutritional Ketosis 0.5–3.0 mmol/L)$$, $$• Keep net carbohydrates below 20–50 g per day
• Eat adequate protein (1.2–1.8 g/kg body weight) , excess protein can gluconeogenically suppress ketosis
• Use coconut oil or MCT oil to rapidly boost ketone levels
• Incorporate intermittent fasting or time-restricted eating (16:8 or longer)
• Exercise in a fasted state to deplete glycogen and accelerate ketone production
• Stay well-hydrated and replenish electrolytes (sodium, potassium, magnesium)$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$ketones$$, $$Coconut oil$$, $$other$$, 0),
($$ketones$$, $$Avocado$$, $$fruit$$, 1),
($$ketones$$, $$Beef (grass-fed)$$, $$meat$$, 2),
($$ketones$$, $$Mackerel$$, $$fish$$, 3),
($$ketones$$, $$Eggs$$, $$other$$, 4),
($$ketones$$, $$Butter$$, $$dairy$$, 5),
($$ketones$$, $$Pecans$$, $$nut_seed$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$ketones$$, $$MCT Oil$$, $$1–3 tbsp daily (start low)$$, $$Medium-chain triglycerides bypass normal fat digestion and are directly converted to ketones in the liver; C8 (caprylic acid) is most ketogenic.$$, 0),
($$ketones$$, $$Exogenous Ketones (BHB salts)$$, $$10–12 g per serving$$, $$Raises blood ketone levels acutely; useful for cognitive performance or transitioning into ketosis but does not replace dietary discipline.$$, 1),
($$ketones$$, $$Electrolyte blend (Na/K/Mg)$$, $$Per label, adjusted for sweat loss$$, $$Ketogenic diets increase renal excretion of electrolytes; supplementation reduces "keto flu" and supports energy.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$ketones$$, $$Nutritional ketosis and mitohormesis: potential implications for mitochondrial function and human health$$, $$Journal of Nutrition and Metabolism$$, 2018, $$https://pubmed.ncbi.nlm.nih.gov/29607218/$$, 0),
($$ketones$$, $$The ketogenic diet: metabolic influences on brain excitability and epilepsy$$, $$Trends in Neurosciences$$, 2012, $$https://pubmed.ncbi.nlm.nih.gov/22877646/$$, 1),
($$ketones$$, $$Beta-hydroxybutyrate as an anti-aging metabolite$$, $$Nature Metabolism$$, 2022, $$https://pubmed.ncbi.nlm.nih.gov/35970870/$$, 2);

-- ============================================================
-- INSULIN
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$insulin$$, $$what_is$$, $$What Is Insulin?$$, $$Insulin is a peptide hormone secreted by beta cells of the pancreatic islets of Langerhans in response to rising blood glucose. It facilitates glucose uptake into cells, promotes glycogen synthesis, inhibits fat breakdown, and stimulates protein synthesis. Fasting insulin is one of the earliest markers of insulin resistance.$$, $$en$$, 0),
($$insulin$$, $$did_you_know$$, $$Did You Know?$$, $$Chronically elevated insulin , even when fasting glucose is still normal , can precede type 2 diabetes by 10–15 years, making fasting insulin a far earlier warning signal than HbA1c or fasting glucose.$$, $$en$$, 1),
($$insulin$$, $$health_facts$$, $$Clinical Significance$$, $$Elevated fasting insulin (hyperinsulinaemia) is a hallmark of insulin resistance and is associated with obesity, PCOS, hypertension, dyslipidaemia, and non-alcoholic fatty liver disease. Optimal fasting insulin is generally considered below 8 µIU/mL; values above 15–20 µIU/mL are strongly suggestive of significant insulin resistance. HOMA-IR (derived from fasting glucose and insulin) quantifies resistance non-invasively.$$, $$en$$, 2),
($$insulin$$, $$food_for_thought$$, $$Food for Thought$$, $$Dietary patterns that reduce insulin secretion , low carbohydrate, Mediterranean, or time-restricted eating , consistently lower fasting insulin and improve insulin sensitivity, with effects appearing within 2–4 weeks.$$, $$en$$, 3),
($$insulin$$, $$fun_facts$$, $$Fun Facts$$, $$Insulin was first isolated by Frederick Banting and Charles Best in Toronto in 1921. Before its discovery, a diagnosis of type 1 diabetes was a near-certain death sentence within months; the first patient treated with insulin, Leonard Thompson, survived for 13 more years.$$, $$en$$, 4),
($$insulin$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Adopt a lower-carbohydrate dietary pattern to reduce insulin secretion demand
• Practise time-restricted eating (16:8 or longer) to allow insulin to fall between meals
• Engage in resistance training 2–3× per week to increase muscle glucose disposal
• Prioritise sleep quality , sleep deprivation raises insulin resistance within days
• Lose excess visceral fat , abdominal fat is the strongest driver of insulin resistance
• Reduce fructose intake (added sugars, fruit juice) , fructose drives hepatic lipogenesis and resistance
• Avoid frequent snacking, which keeps insulin chronically elevated$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$insulin$$, $$Leafy greens (kale, spinach)$$, $$vegetable$$, 0),
($$insulin$$, $$Sardines$$, $$fish$$, 1),
($$insulin$$, $$Eggs$$, $$other$$, 2),
($$insulin$$, $$Walnuts$$, $$nut_seed$$, 3),
($$insulin$$, $$Avocado$$, $$fruit$$, 4),
($$insulin$$, $$Apple cider vinegar$$, $$other$$, 5),
($$insulin$$, $$Chickpeas$$, $$legume$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$insulin$$, $$Berberine$$, $$500 mg 2–3× daily with meals$$, $$Reduces hepatic glucose production and improves peripheral insulin sensitivity via AMPK activation.$$, 0),
($$insulin$$, $$Inositol (Myo-inositol)$$, $$2–4 g daily$$, $$Acts as a secondary messenger in insulin signalling; evidence is strongest for PCOS-related insulin resistance.$$, 1),
($$insulin$$, $$Magnesium (glycinate or malate)$$, $$300–400 mg daily$$, $$Required cofactor for over 300 enzymatic reactions including insulin receptor phosphorylation.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$insulin$$, $$Insulin resistance and its role in the pathogenesis of type 2 diabetes$$, $$Lancet$$, 2021, $$https://pubmed.ncbi.nlm.nih.gov/33705687/$$, 0),
($$insulin$$, $$Fasting insulin as a predictor of future diabetes and cardiovascular disease$$, $$Diabetes Care$$, 2020, $$https://pubmed.ncbi.nlm.nih.gov/32540942/$$, 1),
($$insulin$$, $$Time-restricted eating and its effects on insulin sensitivity$$, $$Cell Metabolism$$, 2019, $$https://pubmed.ncbi.nlm.nih.gov/31287898/$$, 2),
($$insulin$$, $$HOMA-IR calculation and clinical utility$$, $$Diabetologia$$, 1985, $$https://pubmed.ncbi.nlm.nih.gov/3899825/$$, 3);

-- ============================================================
-- HBA1C
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$hba1c$$, $$what_is$$, $$What Is HbA1c?$$, $$Haemoglobin A1c (HbA1c) reflects average blood glucose over the preceding 2–3 months by measuring the percentage of haemoglobin that has been glycated (glucose-bound). It is the gold standard for diagnosing and monitoring diabetes, and does not require fasting.$$, $$en$$, 0),
($$hba1c$$, $$did_you_know$$, $$Did You Know?$$, $$HbA1c does not measure the last 90 days equally , recent glucose levels (the past 30 days) contribute roughly 50% of the result, while glucose from 60–90 days ago contributes only about 25%.$$, $$en$$, 1),
($$hba1c$$, $$health_facts$$, $$Clinical Significance$$, $$An HbA1c below 5.7% is considered normal; 5.7–6.4% indicates pre-diabetes; 6.5% or above on two occasions confirms diabetes. Each 1% reduction in HbA1c in diabetic patients reduces microvascular complications by roughly 37% and myocardial infarction risk by 14%. Certain conditions (haemolytic anaemia, sickle cell trait, iron deficiency) can falsely alter HbA1c readings.$$, $$en$$, 2),
($$hba1c$$, $$food_for_thought$$, $$Food for Thought$$, $$Diets high in fibre and low in refined carbohydrates consistently lower HbA1c; meta-analyses show the Mediterranean diet and low-carbohydrate diets each reduce HbA1c by 0.3–0.9% in people with type 2 diabetes.$$, $$en$$, 3),
($$hba1c$$, $$fun_facts$$, $$Fun Facts$$, $$The connection between haemoglobin and glucose was first described by Samuel Rahbar in 1968 when he noticed an unusual haemoglobin fraction in diabetic patients. The clinical test was not widely adopted until the landmark DCCT trial in the late 1980s established it as the definitive monitoring tool.$$, $$en$$, 4),
($$hba1c$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Maintain consistent low-glycaemic eating patterns , HbA1c reflects cumulative habits, not single meals
• Exercise regularly, especially aerobic and resistance training combined
• Monitor fasting glucose regularly to catch upward trends early
• Prioritise 7–9 hours of sleep per night , sleep debt raises average glucose
• Reduce stress chronically, not just acutely , cortisol raises baseline glucose
• Address iron deficiency or haemolytic conditions that can artificially skew the reading
• Work with your doctor on medication optimisation if lifestyle changes are insufficient$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$hba1c$$, $$Barley$$, $$grain$$, 0),
($$hba1c$$, $$Kidney beans$$, $$legume$$, 1),
($$hba1c$$, $$Broccoli$$, $$vegetable$$, 2),
($$hba1c$$, $$Blueberries$$, $$fruit$$, 3),
($$hba1c$$, $$Salmon$$, $$fish$$, 4),
($$hba1c$$, $$Greek yoghurt (plain)$$, $$dairy$$, 5),
($$hba1c$$, $$Chia seeds$$, $$nut_seed$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$hba1c$$, $$Berberine$$, $$500 mg 2–3× daily$$, $$Meta-analyses show berberine reduces HbA1c by 0.5–1.0% in type 2 diabetes patients.$$, 0),
($$hba1c$$, $$Magnesium$$, $$300–400 mg daily$$, $$Low magnesium is associated with higher HbA1c; supplementation modestly improves glycaemic control.$$, 1),
($$hba1c$$, $$Vitamin D3$$, $$2000–4000 IU daily$$, $$Vitamin D deficiency is associated with impaired insulin secretion; correction may improve HbA1c modestly.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$hba1c$$, $$The effect of intensive treatment of diabetes on the development and progression of long-term complications (DCCT)$$, $$New England Journal of Medicine$$, 1993, $$https://pubmed.ncbi.nlm.nih.gov/8366922/$$, 0),
($$hba1c$$, $$Mediterranean diet and glycaemic control in type 2 diabetes: systematic review$$, $$BMJ Open Diabetes Research & Care$$, 2020, $$https://pubmed.ncbi.nlm.nih.gov/33722910/$$, 1),
($$hba1c$$, $$HbA1c as a diagnostic test for diabetes: a systematic review$$, $$Diabetologia$$, 2011, $$https://pubmed.ncbi.nlm.nih.gov/21380479/$$, 2),
($$hba1c$$, $$Low-carbohydrate diets and HbA1c in type 2 diabetes: meta-analysis$$, $$PLOS ONE$$, 2017, $$https://pubmed.ncbi.nlm.nih.gov/28376045/$$, 3);

-- ============================================================
-- TOTAL CHOLESTEROL
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$total_cholesterol$$, $$what_is$$, $$What Is Total Cholesterol?$$, $$Total cholesterol is the sum of all cholesterol-carrying particles in your blood: LDL, HDL, VLDL, and IDL. It is measured in mmol/L (or mg/dL) and is a component of standard lipid panels. While useful for screening, total cholesterol alone is a weak cardiovascular risk predictor , its context (HDL ratio, LDL particle size, ApoB) matters far more.$$, $$en$$, 0),
($$total_cholesterol$$, $$did_you_know$$, $$Did You Know?$$, $$Cholesterol is so vital to life that every cell in your body can synthesise it , your liver alone produces 70–80% of your total circulating cholesterol, largely independent of dietary intake for most people.$$, $$en$$, 1),
($$total_cholesterol$$, $$health_facts$$, $$Clinical Significance$$, $$Total cholesterol above 5.2 mmol/L (200 mg/dL) is considered borderline high, and above 6.2 mmol/L (240 mg/dL) is high. However, research increasingly shows that total cholesterol:HDL ratio (ideally below 4) or ApoB are stronger cardiovascular risk predictors. Some individuals on low-carbohydrate diets have elevated total cholesterol driven by large, buoyant LDL particles , a pattern that may not carry the same risk as small, dense LDL.$$, $$en$$, 2),
($$total_cholesterol$$, $$food_for_thought$$, $$Food for Thought$$, $$Soluble fibre from oats, legumes, and psyllium binds bile acids in the gut and forces the liver to use more cholesterol to make new bile, reducing total and LDL cholesterol by 5–15%.$$, $$en$$, 3),
($$total_cholesterol$$, $$fun_facts$$, $$Fun Facts$$, $$Cholesterol was first crystallised from gallstones in 1769 by François Poulletier de la Salle. Its name comes from the Greek chole (bile) and stereos (solid), reflecting where it was first found.$$, $$en$$, 4),
($$total_cholesterol$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Increase soluble fibre intake (oats, psyllium, legumes, vegetables)
• Replace saturated fat partially with monounsaturated fat (olive oil, avocado, nuts)
• Exercise aerobically 150+ minutes per week , raises HDL and lowers triglycerides
• Avoid trans fats entirely (partially hydrogenated oils)
• Maintain a healthy weight , excess visceral fat drives unfavourable lipid patterns
• Limit refined carbohydrates that elevate triglycerides and lower HDL
• Consider plant sterols/stanols (1.5–3 g daily) as an adjunct$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$total_cholesterol$$, $$Oats$$, $$grain$$, 0),
($$total_cholesterol$$, $$Lentils$$, $$legume$$, 1),
($$total_cholesterol$$, $$Almonds$$, $$nut_seed$$, 2),
($$total_cholesterol$$, $$Olive oil (extra virgin)$$, $$other$$, 3),
($$total_cholesterol$$, $$Avocado$$, $$fruit$$, 4),
($$total_cholesterol$$, $$Eggplant$$, $$vegetable$$, 5),
($$total_cholesterol$$, $$Mackerel$$, $$fish$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$total_cholesterol$$, $$Psyllium husk$$, $$5–10 g daily with water$$, $$Soluble fibre that binds bile acids; reduces LDL by 5–10% in meta-analyses.$$, 0),
($$total_cholesterol$$, $$Red Yeast Rice$$, $$600–1200 mg twice daily$$, $$Contains monacolin K (identical to lovastatin); reduces total cholesterol by 15–25%. Use only under medical supervision.$$, 1),
($$total_cholesterol$$, $$Plant Sterols/Stanols$$, $$1.5–3 g daily with meals$$, $$Competitively inhibit cholesterol absorption; endorsed by the European Atherosclerosis Society.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$total_cholesterol$$, $$2019 ESC/EAS Guidelines for the management of dyslipidaemias$$, $$European Heart Journal$$, 2020, $$https://pubmed.ncbi.nlm.nih.gov/31504418/$$, 0),
($$total_cholesterol$$, $$Dietary fibre and cardiovascular risk: a dose-response meta-analysis$$, $$British Medical Journal$$, 2019, $$https://pubmed.ncbi.nlm.nih.gov/30674467/$$, 1),
($$total_cholesterol$$, $$Plant sterols and cholesterol reduction: meta-analysis of RCTs$$, $$American Journal of Clinical Nutrition$$, 2014, $$https://pubmed.ncbi.nlm.nih.gov/24898232/$$, 2);

-- ============================================================
-- LDL-C
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$ldl_c$$, $$what_is$$, $$What Is LDL Cholesterol?$$, $$Low-density lipoprotein cholesterol (LDL-C) is the cholesterol carried within LDL particles, which transport fats from the liver to peripheral tissues. It is commonly called "bad cholesterol" because elevated levels are strongly associated with atherosclerotic cardiovascular disease. LDL-C is calculated or directly measured in a standard lipid panel.$$, $$en$$, 0),
($$ldl_c$$, $$did_you_know$$, $$Did You Know?$$, $$LDL particle number (LDL-P) and ApoB are stronger predictors of cardiovascular risk than LDL-C itself , two people can have identical LDL-C but very different particle counts, and it is the particles that penetrate arterial walls and seed plaques.$$, $$en$$, 1),
($$ldl_c$$, $$health_facts$$, $$Clinical Significance$$, $$Current guidelines consider LDL-C above 3.4 mmol/L (130 mg/dL) borderline high, and above 4.1 mmol/L (160 mg/dL) high. In individuals with established cardiovascular disease or diabetes, targets are typically below 1.8 mmol/L (70 mg/dL). Small, dense LDL particles are more atherogenic than large, buoyant ones , a distinction LDL-C alone does not capture.$$, $$en$$, 2),
($$ldl_c$$, $$food_for_thought$$, $$Food for Thought$$, $$Replacing saturated fats with polyunsaturated fats (oily fish, walnuts, flaxseed) reduces LDL-C by 8–10%, while dietary soluble fibre from oats and legumes adds a further 5–10% reduction.$$, $$en$$, 3),
($$ldl_c$$, $$fun_facts$$, $$Fun Facts$$, $$The Friedewald equation , used by most labs to calculate LDL-C from total cholesterol, HDL, and triglycerides , was derived in 1972 from only 448 subjects and becomes inaccurate when triglycerides exceed 4.5 mmol/L. Many labs are now moving to the more accurate Martin-Hopkins equation.$$, $$en$$, 4),
($$ldl_c$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Increase dietary soluble fibre (oats, psyllium, legumes, apples)
• Replace saturated fats with olive oil, avocado, and oily fish
• Avoid trans fats completely , they raise LDL and lower HDL simultaneously
• Exercise regularly , aerobic exercise modestly lowers LDL
• Achieve and maintain a healthy body weight
• If genetically elevated (familial hypercholesterolaemia), pharmacotherapy is often essential
• Consider plant sterols/stanols (1.5–3 g/day with meals)$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$ldl_c$$, $$Oats$$, $$grain$$, 0),
($$ldl_c$$, $$Black beans$$, $$legume$$, 1),
($$ldl_c$$, $$Walnuts$$, $$nut_seed$$, 2),
($$ldl_c$$, $$Salmon$$, $$fish$$, 3),
($$ldl_c$$, $$Flaxseed$$, $$nut_seed$$, 4),
($$ldl_c$$, $$Olive oil (extra virgin)$$, $$other$$, 5),
($$ldl_c$$, $$Apples$$, $$fruit$$, 6),
($$ldl_c$$, $$Aubergine$$, $$vegetable$$, 7);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$ldl_c$$, $$Psyllium husk$$, $$7 g 1–3x daily$$, $$Best-evidenced soluble fibre supplement; reduces LDL-C by 5–10% when taken consistently.$$, 0),
($$ldl_c$$, $$Plant Sterols$$, $$2 g daily with meals$$, $$Block intestinal cholesterol absorption; endorsed by European Atherosclerosis Society guidelines.$$, 1),
($$ldl_c$$, $$Omega-3 (EPA+DHA)$$, $$1–4 g EPA+DHA daily$$, $$Primarily lowers triglycerides; at high doses may modestly reduce cardiovascular events independent of LDL.$$, 2),
($$ldl_c$$, $$Bergamot extract$$, $$500–1000 mg daily$$, $$Citrus polyphenol with statin-like HMG-CoA reductase inhibition; emerging evidence for LDL reduction.$$, 3);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$ldl_c$$, $$LDL particle number and risk of future cardiovascular disease: meta-analysis$$, $$Journal of the American College of Cardiology$$, 2019, $$https://pubmed.ncbi.nlm.nih.gov/30765040/$$, 0),
($$ldl_c$$, $$Dietary fat and cardiovascular disease: replacement of saturated fat$$, $$Circulation$$, 2017, $$https://pubmed.ncbi.nlm.nih.gov/28620111/$$, 1),
($$ldl_c$$, $$Friedewald vs Martin-Hopkins equation for LDL calculation$$, $$JAMA Internal Medicine$$, 2013, $$https://pubmed.ncbi.nlm.nih.gov/23400949/$$, 2),
($$ldl_c$$, $$ESC/EAS 2019 dyslipidaemia guidelines$$, $$European Heart Journal$$, 2020, $$https://pubmed.ncbi.nlm.nih.gov/31504418/$$, 3);

-- ============================================================
-- HDL-C
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$hdl_c$$, $$what_is$$, $$What Is HDL Cholesterol?$$, $$High-density lipoprotein cholesterol (HDL-C) is the cholesterol carried by HDL particles, which perform reverse cholesterol transport , collecting cholesterol from peripheral tissues and artery walls and returning it to the liver for recycling or excretion. Higher HDL is generally associated with lower cardiovascular risk.$$, $$en$$, 0),
($$hdl_c$$, $$did_you_know$$, $$Did You Know?$$, $$Not all HDL is protective , HDL function (its ability to efflux cholesterol from macrophages) matters more than the raw HDL-C number. Dysfunctional HDL can even become pro-inflammatory in chronic disease states.$$, $$en$$, 1),
($$hdl_c$$, $$health_facts$$, $$Clinical Significance$$, $$HDL-C below 1.0 mmol/L (40 mg/dL) in men or 1.2 mmol/L (50 mg/dL) in women is a cardiovascular risk factor and a component of metabolic syndrome criteria. Optimal HDL is generally above 1.5 mmol/L (60 mg/dL). Clinical trials of HDL-raising drugs (niacin, CETP inhibitors) have largely failed to reduce cardiovascular events, reinforcing that function matters more than the number.$$, $$en$$, 2),
($$hdl_c$$, $$food_for_thought$$, $$Food for Thought$$, $$Olive oil, oily fish, avocado, and moderate whole-food fat intake raise HDL, while refined carbohydrates and sugar actively suppress it , making dietary fat quality a key lever for HDL optimisation.$$, $$en$$, 3),
($$hdl_c$$, $$fun_facts$$, $$Fun Facts$$, $$Aerobic exercise is one of the most reliable non-pharmacological ways to raise HDL. A meta-analysis found regular aerobic training raises HDL by an average of 2.5 mg/dL, with effects proportional to total exercise volume per week.$$, $$en$$, 4),
($$hdl_c$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Exercise aerobically for at least 150 minutes per week , the most effective natural HDL raiser
• Eat monounsaturated fats (olive oil, avocado, macadamia nuts)
• Include oily fish 2–3x per week for EPA/DHA
• Quit smoking , smoking actively lowers HDL-C
• Lose excess body fat , visceral adiposity suppresses HDL
• Avoid refined carbohydrates and sugar, which lower HDL
• Maintain low triglycerides , high triglycerides and low HDL commonly co-occur$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$hdl_c$$, $$Olive oil (extra virgin)$$, $$other$$, 0),
($$hdl_c$$, $$Mackerel$$, $$fish$$, 1),
($$hdl_c$$, $$Avocado$$, $$fruit$$, 2),
($$hdl_c$$, $$Macadamia nuts$$, $$nut_seed$$, 3),
($$hdl_c$$, $$Sardines$$, $$fish$$, 4),
($$hdl_c$$, $$Coconut oil$$, $$other$$, 5),
($$hdl_c$$, $$Eggs$$, $$other$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$hdl_c$$, $$Omega-3 (EPA+DHA)$$, $$2–4 g EPA+DHA daily$$, $$Modestly raises HDL and significantly lowers triglycerides; improves HDL function and reduces inflammation.$$, 0),
($$hdl_c$$, $$Niacin (B3)$$, $$1000–2000 mg extended-release daily$$, $$Most potent HDL-raising agent (+20–30%) but cardiovascular outcome trials showed no benefit over statin alone; flushing is a major side effect.$$, 1),
($$hdl_c$$, $$Resveratrol$$, $$150–500 mg daily$$, $$May improve HDL function and reduce oxidative stress; evidence is preliminary but promising.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$hdl_c$$, $$HDL cholesterol efflux capacity and incident cardiovascular events$$, $$New England Journal of Medicine$$, 2014, $$https://pubmed.ncbi.nlm.nih.gov/24678929/$$, 0),
($$hdl_c$$, $$Exercise and HDL-C: a systematic review and meta-analysis$$, $$Archives of Internal Medicine$$, 2007, $$https://pubmed.ncbi.nlm.nih.gov/17353496/$$, 1),
($$hdl_c$$, $$HPS2-THRIVE: niacin in high-risk patients$$, $$New England Journal of Medicine$$, 2014, $$https://pubmed.ncbi.nlm.nih.gov/24552320/$$, 2);

-- ============================================================
-- TRIGLYCERIDES
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$triglycerides$$, $$what_is$$, $$What Are Triglycerides?$$, $$Triglycerides are the most common form of fat in your body, consisting of a glycerol backbone esterified with three fatty acid chains. In the blood they are transported within VLDL and chylomicron particles. Fasting triglycerides reflect both dietary fat intake and the liver's conversion of excess carbohydrates into fat via de novo lipogenesis.$$, $$en$$, 0),
($$triglycerides$$, $$did_you_know$$, $$Did You Know?$$, $$Dietary carbohydrates , especially fructose and refined sugars , are the primary driver of elevated fasting triglycerides in most people, not dietary fat. This is why low-carbohydrate diets reliably and rapidly lower triglycerides, often within 1–2 weeks.$$, $$en$$, 1),
($$triglycerides$$, $$health_facts$$, $$Clinical Significance$$, $$Optimal fasting triglycerides are below 1.7 mmol/L (150 mg/dL); 1.7–5.6 mmol/L is borderline to high; above 5.6 mmol/L (500 mg/dL) carries acute pancreatitis risk. Elevated triglycerides are a core component of metabolic syndrome and correlate strongly with insulin resistance, visceral adiposity, and non-alcoholic fatty liver disease.$$, $$en$$, 2),
($$triglycerides$$, $$food_for_thought$$, $$Food for Thought$$, $$Eliminating sugary drinks, fruit juice, and refined carbohydrates can reduce fasting triglycerides by 30–50% within weeks; simultaneously increasing omega-3 intake from oily fish provides further meaningful reduction.$$, $$en$$, 3),
($$triglycerides$$, $$fun_facts$$, $$Fun Facts$$, $$After a very fatty meal, triglycerides in the blood can rise so dramatically that plasma turns visibly milky , a condition called lipaemia. This is why triglyceride testing requires a 10–12 hour fast for an accurate baseline reading.$$, $$en$$, 4),
($$triglycerides$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Eliminate sugary drinks, fruit juice, and foods with added fructose
• Reduce refined carbohydrates , bread, pasta, white rice, pastries
• Limit alcohol, which directly stimulates hepatic triglyceride synthesis
• Eat oily fish (salmon, mackerel, sardines) 2–3x per week
• Exercise regularly , aerobic exercise is particularly effective
• Lose excess body fat, especially visceral fat
• Consider prescription omega-3 (icosapent ethyl) for severe hypertriglyceridaemia$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$triglycerides$$, $$Salmon$$, $$fish$$, 0),
($$triglycerides$$, $$Mackerel$$, $$fish$$, 1),
($$triglycerides$$, $$Sardines$$, $$fish$$, 2),
($$triglycerides$$, $$Walnuts$$, $$nut_seed$$, 3),
($$triglycerides$$, $$Flaxseed$$, $$nut_seed$$, 4),
($$triglycerides$$, $$Leafy greens$$, $$vegetable$$, 5),
($$triglycerides$$, $$Garlic$$, $$herb_spice$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$triglycerides$$, $$Omega-3 (EPA+DHA)$$, $$2–4 g EPA+DHA daily$$, $$Reduces triglycerides by 20–50% dose-dependently; prescription icosapent ethyl also reduces MACE at 4 g/day.$$, 0),
($$triglycerides$$, $$Berberine$$, $$500 mg 2–3x daily$$, $$Reduces triglycerides by activating AMPK and inhibiting hepatic lipogenesis.$$, 1),
($$triglycerides$$, $$Niacin (B3)$$, $$1000–2000 mg extended-release daily$$, $$Reduces triglycerides by 20–50% and raises HDL; use under medical supervision.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$triglycerides$$, $$REDUCE-IT: cardiovascular outcomes with icosapent ethyl$$, $$New England Journal of Medicine$$, 2019, $$https://pubmed.ncbi.nlm.nih.gov/30145941/$$, 0),
($$triglycerides$$, $$Dietary carbohydrate and triglyceride metabolism$$, $$American Journal of Clinical Nutrition$$, 2016, $$https://pubmed.ncbi.nlm.nih.gov/27534632/$$, 1),
($$triglycerides$$, $$Omega-3 and triglycerides: dose-response meta-analysis$$, $$Mayo Clinic Proceedings$$, 2018, $$https://pubmed.ncbi.nlm.nih.gov/30392594/$$, 2);

-- ============================================================
-- APOB
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$apob$$, $$what_is$$, $$What Is ApoB?$$, $$Apolipoprotein B (ApoB) is the primary structural protein of atherogenic lipoproteins , LDL, VLDL, IDL, and Lp(a). Each of these particles contains exactly one ApoB molecule, so ApoB directly counts the total number of atherogenic particles circulating in your blood. It is considered by many lipidologists to be the single best lipid marker for cardiovascular risk.$$, $$en$$, 0),
($$apob$$, $$did_you_know$$, $$Did You Know?$$, $$ApoB predicts cardiovascular events better than LDL-C, non-HDL cholesterol, or total cholesterol:HDL ratio in head-to-head comparisons , yet it is still underordered in routine clinical practice in many countries.$$, $$en$$, 1),
($$apob$$, $$health_facts$$, $$Clinical Significance$$, $$Optimal ApoB is below 0.7 g/L for very high cardiovascular risk individuals (established disease or diabetes with organ damage) and below 1.0 g/L for general primary prevention. Because each atherogenic particle carries exactly one ApoB, the test is unaffected by carbohydrate intake or triglyceride levels that can distort calculated LDL-C.$$, $$en$$, 2),
($$apob$$, $$food_for_thought$$, $$Food for Thought$$, $$The same dietary strategies that lower LDL-C , soluble fibre, plant sterols, replacing saturated fat with unsaturated fat , also reduce ApoB, but the magnitude of particle reduction can differ from cholesterol reduction, making ApoB the more meaningful target to track.$$, $$en$$, 3),
($$apob$$, $$fun_facts$$, $$Fun Facts$$, $$The INTERHEART study, enrolling 27,098 participants across 52 countries, found the ApoB:ApoA1 ratio to be a better predictor of myocardial infarction than any other lipid measure , stronger than LDL, total cholesterol, or HDL alone.$$, $$en$$, 4),
($$apob$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Focus on lowering LDL particle number, not just LDL cholesterol concentration
• Increase soluble fibre (psyllium, oats, legumes) to reduce particle count
• Replace saturated and trans fats with mono- and polyunsaturated fats
• Manage triglycerides , high VLDL raises total ApoB particle burden
• Lose excess visceral fat , reduces VLDL secretion from the liver
• If indicated, statins are highly effective at reducing ApoB
• Test ApoB rather than relying solely on LDL-C for risk assessment$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$apob$$, $$Oats$$, $$grain$$, 0),
($$apob$$, $$Lentils$$, $$legume$$, 1),
($$apob$$, $$Olive oil (extra virgin)$$, $$other$$, 2),
($$apob$$, $$Salmon$$, $$fish$$, 3),
($$apob$$, $$Almonds$$, $$nut_seed$$, 4),
($$apob$$, $$Avocado$$, $$fruit$$, 5),
($$apob$$, $$Brussels sprouts$$, $$vegetable$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$apob$$, $$Plant Sterols/Stanols$$, $$2 g daily with meals$$, $$Reduce intestinal cholesterol absorption, lowering LDL-C and ApoB by 8–10%.$$, 0),
($$apob$$, $$Psyllium husk$$, $$7 g 1–3x daily$$, $$Soluble fibre reduces both LDL-C and ApoB particle number.$$, 1),
($$apob$$, $$Omega-3 (EPA+DHA)$$, $$2–4 g daily$$, $$Reduces VLDL-ApoB specifically; lowers total atherogenic particle burden.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$apob$$, $$ApoB vs LDL-C in cardiovascular risk prediction: the INTERHEART study$$, $$Lancet$$, 2004, $$https://pubmed.ncbi.nlm.nih.gov/15364185/$$, 0),
($$apob$$, $$Comparison of ApoB and LDL-C for cardiovascular risk prediction$$, $$Journal of the American College of Cardiology$$, 2021, $$https://pubmed.ncbi.nlm.nih.gov/33602466/$$, 1),
($$apob$$, $$ESC/EAS 2019 Guidelines: ApoB as a treatment target$$, $$European Heart Journal$$, 2020, $$https://pubmed.ncbi.nlm.nih.gov/31504418/$$, 2),
($$apob$$, $$ApoB as the superior lipid biomarker for cardiovascular risk$$, $$Nature Reviews Cardiology$$, 2022, $$https://pubmed.ncbi.nlm.nih.gov/35974096/$$, 3);

-- ============================================================
-- HS_CRP
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$hs_crp$$, $$what_is$$, $$What Is hs-CRP?$$, $$High-sensitivity C-reactive protein (hs-CRP) is an acute-phase inflammatory protein produced by the liver in response to cytokines, particularly IL-6. The high-sensitivity assay detects very low levels (below 3 mg/L) that the standard CRP test misses, making it useful for cardiovascular risk stratification in otherwise healthy individuals.$$, $$en$$, 0),
($$hs_crp$$, $$did_you_know$$, $$Did You Know?$$, $$The JUPITER trial demonstrated that people with normal LDL but elevated hs-CRP (above 2 mg/L) had significantly reduced cardiovascular events when treated with rosuvastatin , establishing inflammation as an independent, druggable cardiovascular risk factor.$$, $$en$$, 1),
($$hs_crp$$, $$health_facts$$, $$Clinical Significance$$, $$hs-CRP below 1 mg/L indicates low cardiovascular risk; 1–3 mg/L is intermediate; above 3 mg/L is high risk (when acute illness or injury is excluded). Values above 10 mg/L typically indicate acute infection, injury, or autoimmune disease. Elevated hs-CRP also predicts future diabetes, and high post-MI levels predict recurrence.$$, $$en$$, 2),
($$hs_crp$$, $$food_for_thought$$, $$Food for Thought$$, $$The Mediterranean diet consistently lowers hs-CRP by 20–30% in clinical trials, driven by anti-inflammatory polyphenols, omega-3 fatty acids, and fibre , while ultra-processed foods, trans fats, and excess sugar raise it.$$, $$en$$, 3),
($$hs_crp$$, $$fun_facts$$, $$Fun Facts$$, $$CRP was first isolated from the blood of pneumonia patients in 1930 by Tillett and Francis at Rockefeller University. They named it C-reactive protein because it reacted with the C-polysaccharide of Streptococcus pneumoniae , before its broader role as a general inflammatory marker was understood.$$, $$en$$, 4),
($$hs_crp$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Follow a Mediterranean-style diet rich in vegetables, olive oil, oily fish, and legumes
• Achieve and maintain a healthy body weight , adipose tissue secretes pro-inflammatory cytokines
• Exercise regularly: both aerobic and resistance training reduce hs-CRP
• Prioritise 7–9 hours of quality sleep , sleep deprivation acutely raises CRP
• Quit smoking , a major chronic inflammatory stimulus
• Manage gum disease (periodontitis) , a significant but underappreciated hs-CRP driver
• Limit alcohol to moderate intake or avoid entirely
• Address gut dysbiosis , intestinal permeability drives systemic inflammation$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$hs_crp$$, $$Salmon$$, $$fish$$, 0),
($$hs_crp$$, $$Turmeric$$, $$herb_spice$$, 1),
($$hs_crp$$, $$Blueberries$$, $$fruit$$, 2),
($$hs_crp$$, $$Olive oil (extra virgin)$$, $$other$$, 3),
($$hs_crp$$, $$Walnuts$$, $$nut_seed$$, 4),
($$hs_crp$$, $$Broccoli$$, $$vegetable$$, 5),
($$hs_crp$$, $$Ginger$$, $$herb_spice$$, 6),
($$hs_crp$$, $$Tart cherries$$, $$fruit$$, 7);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$hs_crp$$, $$Omega-3 (EPA+DHA)$$, $$2–4 g EPA+DHA daily$$, $$Most consistently reduces hs-CRP; meta-analyses show reductions of 0.3–0.5 mg/L.$$, 0),
($$hs_crp$$, $$Curcumin (with piperine)$$, $$500–1000 mg curcumin + 5–10 mg piperine daily$$, $$Strong anti-inflammatory; piperine increases bioavailability 20-fold; reduces IL-6 and TNF-alpha.$$, 1),
($$hs_crp$$, $$Magnesium$$, $$300–400 mg daily$$, $$Low magnesium is associated with higher CRP; supplementation modestly reduces inflammatory markers.$$, 2),
($$hs_crp$$, $$Vitamin D3$$, $$2000–4000 IU daily$$, $$Deficiency is associated with elevated hs-CRP; correction reduces inflammatory markers in deficient individuals.$$, 3);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$hs_crp$$, $$JUPITER trial: rosuvastatin in elevated hs-CRP$$, $$New England Journal of Medicine$$, 2008, $$https://pubmed.ncbi.nlm.nih.gov/18997196/$$, 0),
($$hs_crp$$, $$hs-CRP as a cardiovascular risk marker: a critical appraisal$$, $$Circulation$$, 2016, $$https://pubmed.ncbi.nlm.nih.gov/27143685/$$, 1),
($$hs_crp$$, $$Mediterranean diet and inflammation: the PREDIMED trial$$, $$JAMA Internal Medicine$$, 2013, $$https://pubmed.ncbi.nlm.nih.gov/23786810/$$, 2),
($$hs_crp$$, $$Omega-3 supplementation and CRP: systematic review and meta-analysis$$, $$PLoS ONE$$, 2012, $$https://pubmed.ncbi.nlm.nih.gov/22715362/$$, 3);

-- ============================================================
-- HEMOGLOBIN
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$hemoglobin$$, $$what_is$$, $$What Is Haemoglobin?$$, $$Haemoglobin (Hb) is the iron-containing protein inside red blood cells that binds and transports oxygen from the lungs to every cell in the body, and carries carbon dioxide back for exhalation. It is measured in g/dL or g/L and is a core component of the full blood count. Low haemoglobin defines anaemia; elevated levels can indicate dehydration or polycythaemia.$$, $$en$$, 0),
($$hemoglobin$$, $$did_you_know$$, $$Did You Know?$$, $$A single red blood cell contains approximately 270 million haemoglobin molecules, each capable of carrying four oxygen molecules , meaning one red blood cell can carry over one billion oxygen molecules simultaneously.$$, $$en$$, 1),
($$hemoglobin$$, $$health_facts$$, $$Clinical Significance$$, $$Normal haemoglobin ranges are 130–175 g/L in men and 120–160 g/L in women. Anaemia (low Hb) causes fatigue, impaired cognition, reduced exercise capacity, and increased cardiovascular workload. Iron-deficiency anaemia is the most common type globally; B12 and folate deficiency cause macrocytic anaemia. Elevated Hb can indicate dehydration, sleep apnoea-driven polycythaemia, or smoking-related erythrocytosis.$$, $$en$$, 2),
($$hemoglobin$$, $$food_for_thought$$, $$Food for Thought$$, $$Haem iron from red meat and organ meats is absorbed at 15–35%, far more efficiently than non-haem iron from plants (2–20%); combining non-haem iron sources with vitamin C-rich foods significantly improves absorption.$$, $$en$$, 3),
($$hemoglobin$$, $$fun_facts$$, $$Fun Facts$$, $$Blood appears red because oxyhaemoglobin absorbs blue and green light, reflecting red. Deoxygenated blood is actually dark red , not blue , despite veins often appearing blue through skin due to how light penetrates tissue.$$, $$en$$, 4),
($$hemoglobin$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Eat iron-rich foods: red meat, liver, oysters, dark leafy greens, legumes
• Pair plant-based iron sources with vitamin C (lemon juice, capsicum) to enhance absorption
• Avoid consuming tea or coffee with iron-rich meals , tannins inhibit iron absorption
• Ensure adequate vitamin B12 (meat, fish, eggs, dairy or supplementation for vegans)
• Ensure adequate folate (leafy greens, legumes, fortified foods)
• Stay well-hydrated to avoid haemoconcentration falsely elevating readings
• If anaemia is confirmed, identify the underlying cause before supplementing$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$hemoglobin$$, $$Beef liver$$, $$meat$$, 0),
($$hemoglobin$$, $$Oysters$$, $$fish$$, 1),
($$hemoglobin$$, $$Spinach$$, $$vegetable$$, 2),
($$hemoglobin$$, $$Lentils$$, $$legume$$, 3),
($$hemoglobin$$, $$Beef (grass-fed)$$, $$meat$$, 4),
($$hemoglobin$$, $$Pumpkin seeds$$, $$nut_seed$$, 5),
($$hemoglobin$$, $$Bell pepper (red)$$, $$vegetable$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$hemoglobin$$, $$Iron bisglycinate$$, $$25–50 mg elemental iron daily$$, $$Gentler on the gut than ferrous sulphate; take on an empty stomach with vitamin C for best absorption.$$, 0),
($$hemoglobin$$, $$Vitamin B12 (methylcobalamin)$$, $$1000 mcg daily (sublingual)$$, $$Essential for red blood cell maturation; critical for vegans and elderly (who have reduced gastric acid).$$, 1),
($$hemoglobin$$, $$Folate (methylfolate)$$, $$400–800 mcg daily$$, $$Required for DNA synthesis in erythropoiesis; MTHFR variants may require the methylated form.$$, 2),
($$hemoglobin$$, $$Vitamin C$$, $$200–500 mg with meals$$, $$Reduces dietary iron from Fe3+ to Fe2+, substantially increasing non-haem iron absorption from plant foods.$$, 3);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$hemoglobin$$, $$WHO haemoglobin thresholds for anaemia diagnosis$$, $$World Health Organization$$, 2011, $$https://pubmed.ncbi.nlm.nih.gov/21086091/$$, 0),
($$hemoglobin$$, $$Iron deficiency anaemia: pathophysiology, diagnosis and treatment$$, $$Lancet$$, 2021, $$https://pubmed.ncbi.nlm.nih.gov/33065031/$$, 1),
($$hemoglobin$$, $$Dietary strategies to improve iron bioavailability$$, $$American Journal of Clinical Nutrition$$, 2010, $$https://pubmed.ncbi.nlm.nih.gov/20200266/$$, 2);

-- ============================================================
-- HEMATOCRIT
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$hematocrit$$, $$what_is$$, $$What Is Haematocrit?$$, $$Haematocrit (HCT) is the percentage of total blood volume occupied by red blood cells. It provides a rapid estimate of red cell mass and oxygen-carrying capacity. Normal ranges are approximately 40–52% in men and 36–48% in women. Haematocrit is closely related to haemoglobin , HCT in % is roughly 3 times the Hb in g/dL.$$, $$en$$, 0),
($$hematocrit$$, $$did_you_know$$, $$Did You Know?$$, $$Elite endurance athletes can legally have a haematocrit up to 50% in cycling (per UCI rules), because values above this threshold were historically associated with EPO doping , even before direct EPO testing was available.$$, $$en$$, 1),
($$hematocrit$$, $$health_facts$$, $$Clinical Significance$$, $$Low haematocrit indicates anaemia and reduced oxygen delivery to tissues. Elevated haematocrit (above 52% in men, 48% in women) can indicate polycythaemia vera, dehydration, sleep apnoea, or EPO doping in athletes. Very high haematocrit increases blood viscosity, raising thrombosis and stroke risk. Altitude acclimatisation physiologically raises haematocrit as a compensatory response to lower oxygen availability.$$, $$en$$, 2),
($$hematocrit$$, $$food_for_thought$$, $$Food for Thought$$, $$Haematocrit tracks closely with haemoglobin and responds to the same nutritional drivers: iron, vitamin B12, and folate for production; adequate hydration to avoid false elevation from haemoconcentration.$$, $$en$$, 3),
($$hematocrit$$, $$fun_facts$$, $$Fun Facts$$, $$The haematocrit test was developed in the 1920s using a centrifuge to physically spin blood and measure the packed red cell layer. The name comes from the Greek haima (blood) and kritos (to separate) , it is literally a measurement of separated blood.$$, $$en$$, 4),
($$hematocrit$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Maintain iron, B12, and folate status to support adequate red cell production
• Stay well-hydrated , dehydration concentrates blood and raises haematocrit artificially
• Treat sleep apnoea if present , chronic hypoxia drives compensatory erythrocytosis
• Avoid smoking , carbon monoxide binding reduces oxygen delivery and stimulates erythropoiesis
• Exercise regularly to optimise red cell health and turnover
• If haematocrit is consistently elevated, investigate for polycythaemia vera or secondary causes$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$hematocrit$$, $$Beef liver$$, $$meat$$, 0),
($$hematocrit$$, $$Spinach$$, $$vegetable$$, 1),
($$hematocrit$$, $$Sardines$$, $$fish$$, 2),
($$hematocrit$$, $$Eggs$$, $$other$$, 3),
($$hematocrit$$, $$Lentils$$, $$legume$$, 4),
($$hematocrit$$, $$Pumpkin seeds$$, $$nut_seed$$, 5),
($$hematocrit$$, $$Beetroot$$, $$vegetable$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$hematocrit$$, $$Iron bisglycinate$$, $$25–50 mg elemental iron daily$$, $$Supports haemoglobin synthesis and therefore haematocrit; use only when deficiency is confirmed.$$, 0),
($$hematocrit$$, $$Vitamin B12 (methylcobalamin)$$, $$1000 mcg daily$$, $$Deficiency causes macrocytic anaemia with low haematocrit despite normal iron.$$, 1),
($$hematocrit$$, $$Folate (methylfolate)$$, $$400–800 mcg daily$$, $$Required alongside B12 for erythropoiesis; deficiency reduces red cell production.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$hematocrit$$, $$Reference intervals for haematology in adults$$, $$International Journal of Laboratory Hematology$$, 2019, $$https://pubmed.ncbi.nlm.nih.gov/30900382/$$, 0),
($$hematocrit$$, $$Polycythaemia vera: diagnosis and management$$, $$Blood$$, 2021, $$https://pubmed.ncbi.nlm.nih.gov/33512506/$$, 1),
($$hematocrit$$, $$Sleep apnoea and secondary erythrocytosis$$, $$Chest$$, 2018, $$https://pubmed.ncbi.nlm.nih.gov/29223279/$$, 2);

-- ============================================================
-- URIC ACID
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$uric_acid$$, $$what_is$$, $$What Is Uric Acid?$$, $$Uric acid is the final metabolic product of purine catabolism in humans. Unlike most mammals, humans lack uricase (the enzyme that breaks down uric acid further), so it accumulates in the blood. It is filtered by the kidneys and excreted in urine. Elevated serum uric acid (hyperuricaemia) is associated with gout, kidney stones, hypertension, and metabolic syndrome.$$, $$en$$, 0),
($$uric_acid$$, $$did_you_know$$, $$Did You Know?$$, $$Fructose , found in table sugar, high-fructose corn syrup, and fruit juice , is the only carbohydrate that raises uric acid, because its metabolism in the liver directly generates uric acid as a byproduct via ATP degradation to AMP.$$, $$en$$, 1),
($$uric_acid$$, $$health_facts$$, $$Clinical Significance$$, $$Normal serum uric acid is 200–430 µmol/L (3.4–7.2 mg/dL); above 360 µmol/L (6 mg/dL) crystals begin to form in joints, with gout attacks typically triggered above 420 µmol/L (7 mg/dL). Hyperuricaemia is also associated with hypertension (uric acid inhibits nitric oxide production), non-alcoholic fatty liver disease, insulin resistance, and chronic kidney disease.$$, $$en$$, 2),
($$uric_acid$$, $$food_for_thought$$, $$Food for Thought$$, $$Reducing fructose (added sugars, fruit juice, high-fructose corn syrup) has a stronger effect on lowering uric acid than reducing high-purine foods like meat; limiting alcohol , especially beer , is also highly effective.$$, $$en$$, 3),
($$uric_acid$$, $$fun_facts$$, $$Fun Facts$$, $$Gout was historically called the "disease of kings" because it was associated with rich foods and wine affordable only to the wealthy. King Henry VIII, Isaac Newton, and Benjamin Franklin all reportedly suffered from gout.$$, $$en$$, 4),
($$uric_acid$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Eliminate sugary drinks, fruit juice, and foods with added fructose or high-fructose corn syrup
• Limit or avoid alcohol, especially beer (high in purines and inhibits renal urate excretion)
• Stay well-hydrated (2–3 L water daily) to support renal urate excretion
• Limit very high-purine foods (organ meats, anchovies) if already hyperuricaemic
• Eat cherries or tart cherry extract , clinical trials show reductions in gout attack frequency
• Maintain a healthy weight , obesity reduces renal urate clearance
• Vitamin C supplementation (500–1500 mg) modestly lowers serum uric acid$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$uric_acid$$, $$Tart cherries$$, $$fruit$$, 0),
($$uric_acid$$, $$Celery$$, $$vegetable$$, 1),
($$uric_acid$$, $$Cucumber$$, $$vegetable$$, 2),
($$uric_acid$$, $$Low-fat dairy (milk, yoghurt)$$, $$dairy$$, 3),
($$uric_acid$$, $$Eggs$$, $$other$$, 4),
($$uric_acid$$, $$Coffee$$, $$other$$, 5),
($$uric_acid$$, $$Tofu$$, $$legume$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$uric_acid$$, $$Vitamin C$$, $$500–1500 mg daily$$, $$Competes with uric acid for renal tubular reabsorption, increasing uric acid excretion; reduces serum levels by ~20 µmol/L.$$, 0),
($$uric_acid$$, $$Tart Cherry Extract$$, $$480 mg concentrate or 240 mL juice daily$$, $$Anthocyanins inhibit xanthine oxidase and have anti-inflammatory effects; RCTs show reduced gout attack frequency.$$, 1),
($$uric_acid$$, $$Quercetin$$, $$500 mg daily$$, $$Xanthine oxidase inhibitor (same mechanism as allopurinol); modest evidence for uric acid reduction.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$uric_acid$$, $$Fructose consumption and gout: prospective study$$, $$British Medical Journal$$, 2008, $$https://pubmed.ncbi.nlm.nih.gov/18244959/$$, 0),
($$uric_acid$$, $$Uric acid and cardiovascular risk$$, $$New England Journal of Medicine$$, 2008, $$https://pubmed.ncbi.nlm.nih.gov/18768946/$$, 1),
($$uric_acid$$, $$Tart cherry supplementation and gout attacks: randomised trial$$, $$Arthritis and Rheumatism$$, 2012, $$https://pubmed.ncbi.nlm.nih.gov/22622336/$$, 2),
($$uric_acid$$, $$Vitamin C supplementation and serum uric acid: meta-analysis$$, $$Arthritis and Rheumatism$$, 2009, $$https://pubmed.ncbi.nlm.nih.gov/19479696/$$, 3);

-- ============================================================
-- ALT
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$alt$$, $$what_is$$, $$What Is ALT?$$, $$Alanine aminotransferase (ALT) is an enzyme found predominantly in liver cells. When hepatocytes are damaged or inflamed, ALT leaks into the bloodstream, making it the most specific serum marker of liver injury. It is measured in U/L (units per litre) and is part of standard liver function tests (LFTs).$$, $$en$$, 0),
($$alt$$, $$did_you_know$$, $$Did You Know?$$, $$Strenuous exercise , particularly resistance training or marathon running , can temporarily raise ALT (and AST) for 24–72 hours due to muscle damage, not liver damage. This can lead to false alarms on routine blood tests taken after intense workouts.$$, $$en$$, 1),
($$alt$$, $$health_facts$$, $$Clinical Significance$$, $$Normal ALT is typically below 40–56 U/L (lab-dependent), though some researchers argue the upper limit should be 19–25 U/L for a genuinely healthy liver. Persistently elevated ALT is most commonly caused by non-alcoholic fatty liver disease (NAFLD), alcohol overuse, medications (statins, paracetamol), or viral hepatitis. ALT elevation is an early warning for metabolic liver disease, often preceding clinical symptoms by years.$$, $$en$$, 2),
($$alt$$, $$food_for_thought$$, $$Food for Thought$$, $$A low-carbohydrate or Mediterranean diet reduces hepatic fat (steatosis) within weeks, reliably lowering ALT; even modest weight loss of 5–7% of body weight reduces ALT significantly in NAFLD patients.$$, $$en$$, 3),
($$alt$$, $$fun_facts$$, $$Fun Facts$$, $$The liver is remarkably regenerative , it can regrow to full size after losing up to 75% of its mass within 6–8 weeks. This extraordinary regenerative capacity is exploited in living-donor liver transplantation, where a donor donates a portion of their liver.$$, $$en$$, 4),
($$alt$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Eliminate or sharply reduce alcohol , a major direct hepatotoxin
• Adopt a low-carbohydrate or Mediterranean diet to reduce hepatic fat
• Achieve and maintain a healthy weight , even 5% weight loss improves NAFLD
• Avoid unnecessary use of hepatotoxic medications (paracetamol overuse, NSAIDs)
• Exercise regularly , both aerobic and resistance training reduce hepatic steatosis
• Avoid taking blood tests within 48 hours of intense exercise to avoid false elevation
• Limit fructose and added sugars , primary drivers of de novo hepatic lipogenesis$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$alt$$, $$Coffee (unsweetened)$$, $$other$$, 0),
($$alt$$, $$Broccoli$$, $$vegetable$$, 1),
($$alt$$, $$Olive oil (extra virgin)$$, $$other$$, 2),
($$alt$$, $$Walnuts$$, $$nut_seed$$, 3),
($$alt$$, $$Green tea$$, $$other$$, 4),
($$alt$$, $$Garlic$$, $$herb_spice$$, 5),
($$alt$$, $$Blueberries$$, $$fruit$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$alt$$, $$Milk Thistle (Silymarin)$$, $$140–420 mg silymarin daily$$, $$Most studied hepatoprotective supplement; meta-analyses show modest ALT reduction and anti-inflammatory/antifibrotic effects.$$, 0),
($$alt$$, $$Vitamin E (alpha-tocopherol)$$, $$800 IU daily$$, $$Shown in the PIVENS trial to reduce ALT and liver inflammation in non-diabetic NAFLD; use with caution at high doses.$$, 1),
($$alt$$, $$NAC (N-Acetyl Cysteine)$$, $$600–1200 mg daily$$, $$Precursor to glutathione; standard treatment for paracetamol overdose; may protect against general liver oxidative stress.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$alt$$, $$PIVENS trial: vitamin E vs pioglitazone for non-alcoholic steatohepatitis$$, $$New England Journal of Medicine$$, 2010, $$https://pubmed.ncbi.nlm.nih.gov/20427778/$$, 0),
($$alt$$, $$Coffee consumption and liver disease: a systematic review$$, $$Hepatology$$, 2017, $$https://pubmed.ncbi.nlm.nih.gov/27194895/$$, 1),
($$alt$$, $$Weight loss and ALT in NAFLD: meta-analysis$$, $$Journal of Hepatology$$, 2015, $$https://pubmed.ncbi.nlm.nih.gov/25623903/$$, 2),
($$alt$$, $$Silymarin in liver disease: systematic review$$, $$American Journal of Gastroenterology$$, 2005, $$https://pubmed.ncbi.nlm.nih.gov/15984977/$$, 3);

-- ============================================================
-- GGT
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$ggt$$, $$what_is$$, $$What Is GGT?$$, $$Gamma-glutamyl transferase (GGT) is an enzyme involved in glutathione metabolism and amino acid transport across cell membranes, found in the liver, bile ducts, kidneys, and pancreas. Elevated serum GGT is a sensitive but non-specific marker of hepatobiliary stress , it rises with alcohol consumption, fatty liver, bile duct obstruction, and oxidative stress.$$, $$en$$, 0),
($$ggt$$, $$did_you_know$$, $$Did You Know?$$, $$GGT is one of the most sensitive biochemical markers of alcohol consumption , even moderate regular drinking raises GGT within weeks. Forensic medicine uses GGT to help assess drinking patterns, though it normalises within 2–6 weeks of abstinence.$$, $$en$$, 1),
($$ggt$$, $$health_facts$$, $$Clinical Significance$$, $$Normal GGT is typically 8–61 U/L (lab and sex-dependent). Persistently elevated GGT predicts cardiovascular disease, type 2 diabetes, and all-cause mortality independently of alcohol consumption , it appears to be a marker of systemic oxidative stress and mitochondrial dysfunction. GGT elevation alongside elevated ALP suggests bile duct pathology; with elevated ALT it suggests hepatocellular damage.$$, $$en$$, 2),
($$ggt$$, $$food_for_thought$$, $$Food for Thought$$, $$Alcohol is the most potent dietary GGT inducer; even 2–3 standard drinks daily can raise GGT above the normal range in sensitive individuals, while complete abstinence for 4–6 weeks consistently lowers it.$$, $$en$$, 3),
($$ggt$$, $$fun_facts$$, $$Fun Facts$$, $$GGT was first used clinically in the 1960s as a liver marker, but researchers later discovered it plays a role in cysteine and glutathione cycling , making it a window into the body's master antioxidant system rather than just a liver enzyme.$$, $$en$$, 4),
($$ggt$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Reduce or eliminate alcohol , by far the most effective intervention
• Reduce body weight and hepatic fat through diet and exercise
• Avoid unnecessary medications and supplements that are metabolised by the liver
• Eat a Mediterranean-style diet rich in antioxidants to reduce oxidative stress
• Address NAFLD , hepatic steatosis independently elevates GGT
• Ensure adequate magnesium and B vitamins to support glutathione synthesis
• Coffee (2–3 cups/day) is associated with lower GGT in epidemiological studies$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$ggt$$, $$Coffee (unsweetened)$$, $$other$$, 0),
($$ggt$$, $$Cruciferous vegetables (broccoli, kale)$$, $$vegetable$$, 1),
($$ggt$$, $$Garlic$$, $$herb_spice$$, 2),
($$ggt$$, $$Avocado$$, $$fruit$$, 3),
($$ggt$$, $$Walnuts$$, $$nut_seed$$, 4),
($$ggt$$, $$Olive oil (extra virgin)$$, $$other$$, 5),
($$ggt$$, $$Turmeric$$, $$herb_spice$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$ggt$$, $$NAC (N-Acetyl Cysteine)$$, $$600–1200 mg daily$$, $$Directly supports glutathione synthesis, addressing a key metabolic pathway involving GGT.$$, 0),
($$ggt$$, $$Milk Thistle (Silymarin)$$, $$140–420 mg silymarin daily$$, $$Hepatoprotective and antioxidant; reduces GGT in chronic liver disease and alcoholic liver disease trials.$$, 1),
($$ggt$$, $$Alpha-Lipoic Acid$$, $$300–600 mg daily$$, $$Broad-spectrum antioxidant that regenerates glutathione; associated with lower GGT in metabolic syndrome.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$ggt$$, $$Serum GGT as a predictor of cardiometabolic disease: meta-analysis$$, $$Diabetes Care$$, 2012, $$https://pubmed.ncbi.nlm.nih.gov/22315315/$$, 0),
($$ggt$$, $$GGT and all-cause mortality: 17-year follow-up$$, $$Annals of Internal Medicine$$, 2005, $$https://pubmed.ncbi.nlm.nih.gov/16027452/$$, 1),
($$ggt$$, $$Coffee intake and liver enzymes: dose-response analysis$$, $$Alimentary Pharmacology and Therapeutics$$, 2016, $$https://pubmed.ncbi.nlm.nih.gov/27111890/$$, 2);

-- ============================================================
-- CREATININE
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$creatinine$$, $$what_is$$, $$What Is Creatinine?$$, $$Creatinine is a waste product generated from the breakdown of creatine phosphate in muscle. It is produced at a relatively constant rate proportional to muscle mass, filtered freely by the glomeruli, and excreted in urine. Serum creatinine is a widely used, inexpensive marker of kidney filtration function, though it lags behind actual kidney function changes.$$, $$en$$, 0),
($$creatinine$$, $$did_you_know$$, $$Did You Know?$$, $$Serum creatinine does not rise above the normal range until approximately 50% of kidney function is already lost , making it a late marker. This is why eGFR and cystatin C are preferred for detecting early chronic kidney disease.$$, $$en$$, 1),
($$creatinine$$, $$health_facts$$, $$Clinical Significance$$, $$Normal creatinine is roughly 53–106 µmol/L (0.6–1.2 mg/dL) in men and 44–97 µmol/L in women, though ranges vary with muscle mass. Elevated creatinine indicates reduced glomerular filtration rate (GFR) from CKD, acute kidney injury, dehydration, or very high muscle mass/meat intake. Low creatinine may indicate sarcopenia, malnutrition, or liver disease.$$, $$en$$, 2),
($$creatinine$$, $$food_for_thought$$, $$Food for Thought$$, $$A single high-protein meat meal can transiently raise serum creatinine by 15–20%, and cooked meat contains preformed creatinine that is absorbed directly , which is why labs sometimes recommend avoiding large meat meals before kidney function tests.$$, $$en$$, 3),
($$creatinine$$, $$fun_facts$$, $$Fun Facts$$, $$The Jaffe reaction , the colorimetric test used to measure creatinine for over 100 years , is notoriously non-specific and can be falsely elevated by ketones, bilirubin, and certain drugs. Modern enzymatic creatinine assays are more accurate but more expensive.$$, $$en$$, 4),
($$creatinine$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Stay well-hydrated , even mild dehydration raises creatinine transiently
• Avoid nephrotoxic medications and supplements (NSAIDs, high-dose protein supplements, certain herbs)
• Control blood pressure , hypertension is the second leading cause of CKD
• Control blood glucose , diabetic nephropathy is the leading cause of CKD
• Avoid very high protein intakes chronically if GFR is already reduced
• Do not test creatinine within 24 hours of a large meat meal or intense exercise
• Monitor trends over time , single readings are less informative than trajectory$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$creatinine$$, $$Cauliflower$$, $$vegetable$$, 0),
($$creatinine$$, $$Cabbage$$, $$vegetable$$, 1),
($$creatinine$$, $$Blueberries$$, $$fruit$$, 2),
($$creatinine$$, $$Egg whites$$, $$other$$, 3),
($$creatinine$$, $$Skinless chicken$$, $$meat$$, 4),
($$creatinine$$, $$Salmon$$, $$fish$$, 5),
($$creatinine$$, $$Olive oil (extra virgin)$$, $$other$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$creatinine$$, $$Omega-3 (EPA+DHA)$$, $$2–4 g daily$$, $$Anti-inflammatory; may slow CKD progression and reduce proteinuria in early kidney disease.$$, 0),
($$creatinine$$, $$Astragalus (Huang Qi)$$, $$15–60 g dried root or standardised extract$$, $$Traditional Chinese herb with RCT evidence for reducing proteinuria and slowing CKD progression.$$, 1),
($$creatinine$$, $$CoQ10 (Ubiquinol)$$, $$200–300 mg daily$$, $$Renal cells have high mitochondrial density; CoQ10 may support kidney energy metabolism and reduce oxidative stress.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$creatinine$$, $$KDIGO 2022 clinical practice guidelines for chronic kidney disease$$, $$Kidney International$$, 2022, $$https://pubmed.ncbi.nlm.nih.gov/36410084/$$, 0),
($$creatinine$$, $$Dietary protein and progression of CKD: systematic review$$, $$American Journal of Clinical Nutrition$$, 2017, $$https://pubmed.ncbi.nlm.nih.gov/28500415/$$, 1),
($$creatinine$$, $$Cooked meat intake and creatinine levels$$, $$Clinical Nephrology$$, 2005, $$https://pubmed.ncbi.nlm.nih.gov/16086487/$$, 2);

-- ============================================================
-- EGFR
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$egfr$$, $$what_is$$, $$What Is eGFR?$$, $$Estimated glomerular filtration rate (eGFR) is a calculated measure of how many millilitres of blood the kidneys filter per minute per 1.73 m² body surface area. It is derived from serum creatinine (and sometimes cystatin C) using validated equations (CKD-EPI). eGFR is the primary metric for staging chronic kidney disease (CKD).$$, $$en$$, 0),
($$egfr$$, $$did_you_know$$, $$Did You Know?$$, $$eGFR naturally declines with age , an average of about 1 mL/min/1.73m² per year after age 40, even in healthy individuals without kidney disease. By age 80, a person can have an eGFR of 60–65 mL/min/1.73m² and not have CKD , they may simply have age-related decline.$$, $$en$$, 1),
($$egfr$$, $$health_facts$$, $$Clinical Significance$$, $$eGFR above 90 mL/min/1.73m² is normal; 60–89 is mildly reduced; 30–59 is moderately reduced (CKD stage 3); 15–29 is severely reduced (CKD stage 4); below 15 is kidney failure. Diabetes and hypertension together account for over 70% of CKD cases globally. Early detection through eGFR monitoring is critical as CKD is largely asymptomatic until advanced stages.$$, $$en$$, 2),
($$egfr$$, $$food_for_thought$$, $$Food for Thought$$, $$In established CKD (eGFR below 30), dietary protein restriction to 0.6–0.8 g/kg body weight per day and low phosphorus intake slow disease progression, whereas in early CKD (eGFR above 60), aggressive management of glucose and blood pressure matters most.$$, $$en$$, 3),
($$egfr$$, $$fun_facts$$, $$Fun Facts$$, $$The kidneys filter approximately 180 litres of blood per day but produce only 1–2 litres of urine , meaning they reabsorb over 99% of the filtered volume. This extraordinary tubular reabsorption capacity is what sustains life.$$, $$en$$, 4),
($$egfr$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Control blood pressure , target below 130/80 mmHg in CKD patients
• Control blood glucose rigorously if diabetic , HbA1c below 7%
• Avoid NSAIDs and other nephrotoxic drugs
• Stay well-hydrated without excessive fluid intake
• Reduce sodium intake to lower blood pressure and proteinuria
• Moderate protein intake if eGFR is declining
• Do not smoke , smoking accelerates CKD progression
• Monitor eGFR and urine albumin:creatinine ratio (ACR) at least annually$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$egfr$$, $$Cauliflower$$, $$vegetable$$, 0),
($$egfr$$, $$Cabbage$$, $$vegetable$$, 1),
($$egfr$$, $$Cranberries$$, $$fruit$$, 2),
($$egfr$$, $$Egg whites$$, $$other$$, 3),
($$egfr$$, $$Garlic$$, $$herb_spice$$, 4),
($$egfr$$, $$Olive oil (extra virgin)$$, $$other$$, 5),
($$egfr$$, $$Blueberries$$, $$fruit$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$egfr$$, $$Omega-3 (EPA+DHA)$$, $$2–4 g daily$$, $$Reduces proteinuria and inflammation; some RCTs show slowed eGFR decline in IgA nephropathy.$$, 0),
($$egfr$$, $$CoQ10 (Ubiquinol)$$, $$200–300 mg daily$$, $$Supports renal mitochondrial function; early evidence for benefit in CKD-related oxidative stress.$$, 1),
($$egfr$$, $$Sodium Bicarbonate$$, $$0.5–1 g twice daily (under medical supervision)$$, $$Corrects metabolic acidosis common in CKD stages 3–4; slows disease progression in RCTs.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$egfr$$, $$KDIGO 2022 CKD guidelines$$, $$Kidney International$$, 2022, $$https://pubmed.ncbi.nlm.nih.gov/36410084/$$, 0),
($$egfr$$, $$CKD-EPI 2021 creatinine equation$$, $$New England Journal of Medicine$$, 2021, $$https://pubmed.ncbi.nlm.nih.gov/34554658/$$, 1),
($$egfr$$, $$Sodium bicarbonate and CKD progression: RCT$$, $$Journal of the American Society of Nephrology$$, 2009, $$https://pubmed.ncbi.nlm.nih.gov/19608703/$$, 2),
($$egfr$$, $$Age-related decline in eGFR in healthy populations$$, $$American Journal of Kidney Diseases$$, 2019, $$https://pubmed.ncbi.nlm.nih.gov/30954171/$$, 3);

-- ============================================================
-- IRON
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$iron$$, $$what_is$$, $$What Is Serum Iron?$$, $$Serum iron measures the amount of iron bound to transferrin (the transport protein) circulating in the blood, expressed in µmol/L or µg/dL. It is just one component of iron status assessment , best interpreted alongside transferrin saturation, ferritin, and TIBC. Serum iron is highly variable throughout the day (diurnal variation of up to 30%) and is affected by recent dietary intake.$$, $$en$$, 0),
($$iron$$, $$did_you_know$$, $$Did You Know?$$, $$Serum iron is lowest in the morning and highest in the afternoon , a diurnal variation driven by cortisol and hepcidin rhythms. For consistent results, iron studies should ideally be drawn fasting in the morning.$$, $$en$$, 1),
($$iron$$, $$health_facts$$, $$Clinical Significance$$, $$Normal serum iron is roughly 11–32 µmol/L (60–180 µg/dL). Low serum iron alongside low ferritin and high TIBC confirms iron-deficiency; low serum iron with high ferritin and low TIBC suggests anaemia of chronic disease (inflammation). Elevated serum iron with high saturation can indicate haemochromatosis or iron overload, which is toxic to the liver, heart, and joints.$$, $$en$$, 2),
($$iron$$, $$food_for_thought$$, $$Food for Thought$$, $$Haem iron from meat and offal is absorbed at 15–35%, while non-haem iron from plants absorbs at only 2–20%; inhibitors such as phytates (grains, legumes), calcium, and tannins (tea, coffee) can reduce plant iron absorption by up to 50–60%.$$, $$en$$, 3),
($$iron$$, $$fun_facts$$, $$Fun Facts$$, $$The entire adult human body contains only about 3–5 grams of iron , roughly the weight of two small paper clips. Yet this tiny amount is so critical that the body has evolved a complex recycling system that reuses 95% of its iron daily.$$, $$en$$, 4),
($$iron$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Eat haem iron sources (red meat, liver, dark poultry) for best bioavailability
• Combine plant-based iron sources with vitamin C to enhance non-haem iron absorption
• Avoid tea, coffee, and calcium supplements within 1–2 hours of iron-rich meals
• Cook in cast-iron cookware , it can significantly add dietary iron
• Test iron alongside ferritin and TIBC for a complete picture
• Do not supplement iron without confirmed deficiency , excess iron is toxic
• Screen first-degree relatives of haemochromatosis patients (hereditary condition)$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$iron$$, $$Beef liver$$, $$meat$$, 0),
($$iron$$, $$Oysters$$, $$fish$$, 1),
($$iron$$, $$Beef (grass-fed)$$, $$meat$$, 2),
($$iron$$, $$Spinach$$, $$vegetable$$, 3),
($$iron$$, $$Lentils$$, $$legume$$, 4),
($$iron$$, $$Pumpkin seeds$$, $$nut_seed$$, 5),
($$iron$$, $$Tofu$$, $$legume$$, 6),
($$iron$$, $$Dark chocolate (70%+)$$, $$other$$, 7);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$iron$$, $$Iron bisglycinate$$, $$25–50 mg elemental iron daily$$, $$Better tolerated than ferrous sulphate; high bioavailability; take with vitamin C, away from calcium and tannins.$$, 0),
($$iron$$, $$Ferrous sulphate$$, $$200 mg (65 mg elemental iron) daily$$, $$Standard first-line supplement; effective but frequently causes constipation and GI upset.$$, 1),
($$iron$$, $$Vitamin C$$, $$200–500 mg with each iron dose$$, $$Reduces Fe3+ to the more absorbable Fe2+ form; increases non-haem iron absorption by 3–6-fold.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$iron$$, $$Iron deficiency anaemia: pathophysiology and treatment$$, $$Lancet$$, 2021, $$https://pubmed.ncbi.nlm.nih.gov/33065031/$$, 0),
($$iron$$, $$Bioavailability of iron from plant foods$$, $$American Journal of Clinical Nutrition$$, 2010, $$https://pubmed.ncbi.nlm.nih.gov/20200266/$$, 1),
($$iron$$, $$Hereditary haemochromatosis$$, $$Nature Reviews Disease Primers$$, 2018, $$https://pubmed.ncbi.nlm.nih.gov/29855577/$$, 2);

-- ============================================================
-- FERRITIN
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$ferritin$$, $$what_is$$, $$What Is Ferritin?$$, $$Ferritin is the primary iron storage protein, found mainly in the liver, spleen, and bone marrow. A small amount circulates in the blood, and serum ferritin concentration reflects total body iron stores with reasonable accuracy. It is the most reliable single marker of iron status , low ferritin confirms iron depletion before anaemia develops.$$, $$en$$, 0),
($$ferritin$$, $$did_you_know$$, $$Did You Know?$$, $$Ferritin is an acute-phase reactant , it rises during inflammation, infection, and liver disease independent of actual iron stores. This means ferritin can appear "normal" or even "high" in someone who is actually iron-deficient but has concurrent inflammation, masking the deficiency.$$, $$en$$, 1),
($$ferritin$$, $$health_facts$$, $$Clinical Significance$$, $$Normal ferritin ranges are approximately 30–300 µg/L in men and 15–200 µg/L in women (lab-dependent). Ferritin below 30 µg/L indicates depleted stores; below 12 µg/L is diagnostic of iron deficiency even without anaemia. Elevated ferritin (above 300 µg/L in men, 200 µg/L in women) warrants investigation for haemochromatosis, inflammatory conditions, liver disease, or malignancy.$$, $$en$$, 2),
($$ferritin$$, $$food_for_thought$$, $$Food for Thought$$, $$Regular consumption of haem iron from red meat and organ meats is the most effective dietary strategy to raise ferritin; vegan and vegetarian diets have significantly lower ferritin on average due to the lower bioavailability of non-haem plant iron.$$, $$en$$, 3),
($$ferritin$$, $$fun_facts$$, $$Fun Facts$$, $$A single ferritin protein shell can store up to 4,500 iron atoms , making it nature's own nanocage for iron storage. Its spherical protein structure, about 12 nanometres in diameter, is so elegant that bioengineers have studied it as a template for drug delivery nanoparticles.$$, $$en$$, 4),
($$ferritin$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Eat iron-rich foods regularly, especially haem iron sources (liver, red meat)
• Pair plant iron sources with vitamin C to improve non-haem iron absorption
• Investigate causes of blood loss if ferritin is falling (menorrhagia, GI bleeding)
• Supplement with iron bisglycinate if ferritin is confirmed low
• If ferritin is elevated, rule out haemochromatosis with transferrin saturation testing
• Reduce alcohol intake , alcohol elevates ferritin through liver inflammation
• Regular blood donation modestly lowers elevated ferritin in haemochromatosis carriers$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$ferritin$$, $$Beef liver$$, $$meat$$, 0),
($$ferritin$$, $$Oysters$$, $$fish$$, 1),
($$ferritin$$, $$Beef (grass-fed)$$, $$meat$$, 2),
($$ferritin$$, $$Spinach$$, $$vegetable$$, 3),
($$ferritin$$, $$Lentils$$, $$legume$$, 4),
($$ferritin$$, $$Pumpkin seeds$$, $$nut_seed$$, 5),
($$ferritin$$, $$Dark chocolate (70%+)$$, $$other$$, 6),
($$ferritin$$, $$Quinoa$$, $$grain$$, 7);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$ferritin$$, $$Iron bisglycinate$$, $$25–50 mg elemental iron daily$$, $$Best-tolerated oral iron form; raises ferritin effectively with minimal GI side effects.$$, 0),
($$ferritin$$, $$Vitamin C$$, $$200–500 mg with each iron dose$$, $$Enhances absorption of supplemental and dietary non-haem iron; important for vegetarians and vegans.$$, 1),
($$ferritin$$, $$Lactoferrin$$, $$100–300 mg daily$$, $$Iron-binding protein that may enhance iron absorption and reduce inflammation-related ferritin elevation.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$ferritin$$, $$Serum ferritin as a marker of iron stores: a systematic review$$, $$American Journal of Clinical Nutrition$$, 2010, $$https://pubmed.ncbi.nlm.nih.gov/20200263/$$, 0),
($$ferritin$$, $$Elevated ferritin and risk of metabolic syndrome$$, $$Diabetes Care$$, 2012, $$https://pubmed.ncbi.nlm.nih.gov/22466350/$$, 1),
($$ferritin$$, $$Hereditary haemochromatosis: a systematic review$$, $$JAMA$$, 2006, $$https://pubmed.ncbi.nlm.nih.gov/16788129/$$, 2);

-- ============================================================
-- VITAMIN D
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$vitamin_d$$, $$what_is$$, $$What Is Vitamin D?$$, $$Vitamin D (measured as 25-hydroxyvitamin D, or 25(OH)D) is a fat-soluble secosteroid that functions more like a hormone than a classic vitamin. It is synthesised in the skin upon UVB exposure and converted in the liver to 25(OH)D , the storage and measurement form. The active hormone form, 1,25(OH)2D (calcitriol), is produced in the kidneys and regulates calcium absorption, immune function, cell differentiation, and gene expression across nearly every tissue.$$, $$en$$, 0),
($$vitamin_d$$, $$did_you_know$$, $$Did You Know?$$, $$Vitamin D receptors (VDRs) have been found in virtually every cell type in the human body , including immune cells, neurons, cardiac muscle, and pancreatic beta cells , suggesting vitamin D regulates far more than just calcium and bone metabolism.$$, $$en$$, 1),
($$vitamin_d$$, $$health_facts$$, $$Clinical Significance$$, $$Deficiency (below 50 nmol/L / 20 ng/mL) is pandemic, affecting an estimated 40–50% of the global population. It is associated with osteoporosis, increased fracture risk, immune dysfunction, autoimmune disease, depression, increased infection susceptibility, and all-cause mortality. Optimal levels are debated but most functional medicine practitioners target 75–150 nmol/L (30–60 ng/mL). Toxicity occurs above 250 nmol/L (100 ng/mL) from excessive supplementation.$$, $$en$$, 2),
($$vitamin_d$$, $$food_for_thought$$, $$Food for Thought$$, $$Diet contributes only 10–20% of vitamin D status in most people , sun exposure and supplementation are the primary determinants; oily fish (salmon, mackerel, herring) and egg yolks are the best dietary sources, but even daily consumption cannot fully compensate for inadequate sun exposure.$$, $$en$$, 3),
($$vitamin_d$$, $$fun_facts$$, $$Fun Facts$$, $$Humans living at latitudes above 37 degrees north (roughly the latitude of Rome or San Francisco) cannot synthesise any vitamin D from sunlight for 4–6 months of the year , because the sun angle is too low for UVB to penetrate the atmosphere. This explains the high rates of deficiency in northern Europe, Canada, and northern USA.$$, $$en$$, 4),
($$vitamin_d$$, $$how_to_stay_in_range$$, $$How to Stay in Range$$, $$• Get 15–30 minutes of midday sun exposure on arms and legs when possible (season and latitude permitting)
• Supplement with vitamin D3 (cholecalciferol), not D2 , D3 is 87% more potent at raising 25(OH)D
• Take vitamin D with a fat-containing meal for best absorption
• Co-supplement with vitamin K2 (MK-7, 100–200 mcg) to ensure calcium is directed to bones, not arteries
• Retest 25(OH)D after 3 months of supplementation to confirm adequacy
• Maintain magnesium sufficiency , magnesium is required for vitamin D metabolism
• Target 25(OH)D of 75–125 nmol/L (30–50 ng/mL) for general health$$, $$en$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

INSERT INTO marker_foods (marker_id, food_name, food_category, display_order) VALUES
($$vitamin_d$$, $$Salmon$$, $$fish$$, 0),
($$vitamin_d$$, $$Mackerel$$, $$fish$$, 1),
($$vitamin_d$$, $$Herring$$, $$fish$$, 2),
($$vitamin_d$$, $$Sardines$$, $$fish$$, 3),
($$vitamin_d$$, $$Egg yolks$$, $$other$$, 4),
($$vitamin_d$$, $$Beef liver$$, $$meat$$, 5),
($$vitamin_d$$, $$Mushrooms (UV-exposed)$$, $$vegetable$$, 6);

INSERT INTO marker_supplements (marker_id, supplement_name, typical_dose, notes, display_order) VALUES
($$vitamin_d$$, $$Vitamin D3 (Cholecalciferol)$$, $$2000–5000 IU daily (adjust per testing)$$, $$D3 is the most effective form for raising serum 25(OH)D; always test before and after to personalise dose.$$, 0),
($$vitamin_d$$, $$Vitamin K2 (MK-7)$$, $$100–200 mcg daily$$, $$Activates osteocalcin and matrix Gla protein to direct calcium to bones rather than arteries; synergistic with vitamin D3.$$, 1),
($$vitamin_d$$, $$Magnesium (glycinate or malate)$$, $$300–400 mg daily$$, $$Required cofactor for vitamin D hydroxylation in the liver and kidneys; deficiency impairs vitamin D activation.$$, 2);

INSERT INTO marker_references (marker_id, title, source, year, url, display_order) VALUES
($$vitamin_d$$, $$Vitamin D deficiency: global pandemic and public health implications$$, $$Reviews in Endocrine and Metabolic Disorders$$, 2017, $$https://pubmed.ncbi.nlm.nih.gov/28817231/$$, 0),
($$vitamin_d$$, $$VITAL trial: vitamin D supplementation and cardiovascular and cancer outcomes$$, $$New England Journal of Medicine$$, 2019, $$https://pubmed.ncbi.nlm.nih.gov/30415629/$$, 1),
($$vitamin_d$$, $$Vitamin D and immune function$$, $$Nutrients$$, 2020, $$https://pubmed.ncbi.nlm.nih.gov/32340216/$$, 2),
($$vitamin_d$$, $$Vitamin D3 vs D2 for raising serum 25(OH)D: meta-analysis$$, $$American Journal of Clinical Nutrition$$, 2012, $$https://pubmed.ncbi.nlm.nih.gov/22552031/$$, 3);
