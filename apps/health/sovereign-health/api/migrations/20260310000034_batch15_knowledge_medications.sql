-- Batch 15: Knowledge Engine + Medication Tracking + Anonymous Comparison

-- ============================================================================
-- TASK 2: Marker Relations
-- ============================================================================

CREATE TABLE IF NOT EXISTS marker_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_slug_a VARCHAR(50) NOT NULL,
    marker_slug_b VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL DEFAULT 'correlated',
    description TEXT NOT NULL,
    clinical_significance VARCHAR(10) NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(marker_slug_a, marker_slug_b)
);
CREATE INDEX IF NOT EXISTS idx_marker_relations_a ON marker_relations(marker_slug_a);
CREATE INDEX IF NOT EXISTS idx_marker_relations_b ON marker_relations(marker_slug_b);

INSERT INTO marker_relations (marker_slug_a, marker_slug_b, direction, description, clinical_significance) VALUES
-- Glucose cluster
('glucose', 'insulin', 'correlated', 'Insulin is released in response to rising blood glucose. Higher glucose triggers more insulin secretion. Chronically elevated glucose with high insulin suggests developing insulin resistance.', 'high'),
('glucose', 'hba1c', 'correlated', 'HbA1c reflects the average blood glucose level over the past 2-3 months. Elevated glucose consistently leads to higher HbA1c through glycation of hemoglobin.', 'high'),
('glucose', 'ketones', 'inverse', 'Glucose and ketones have an inverse relationship. When glucose is low (fasting, keto diet), the liver produces ketone bodies as alternative fuel. High glucose suppresses ketogenesis.', 'high'),
('glucose', 'triglycerides', 'correlated', 'Excess glucose is converted to triglycerides via de novo lipogenesis in the liver. High-carbohydrate diets that raise glucose also tend to raise triglycerides.', 'high'),
-- Insulin cluster
('insulin', 'triglycerides', 'correlated', 'Insulin promotes triglyceride synthesis and inhibits lipolysis. Hyperinsulinemia drives elevated triglycerides through increased hepatic VLDL production.', 'high'),
('insulin', 'hdl_c', 'inverse', 'Insulin resistance is associated with lower HDL-C. The mechanism involves increased CETP activity and altered lipoprotein metabolism when insulin signaling is impaired.', 'high'),
('insulin', 'uric_acid', 'correlated', 'Insulin reduces renal uric acid excretion. Hyperinsulinemia promotes uric acid reabsorption in the kidneys, often leading to elevated serum uric acid.', 'medium'),
('insulin', 'testosterone', 'contextual', 'In males, insulin resistance can lower testosterone via reduced Leydig cell function. In females with PCOS, hyperinsulinemia drives excess androgen production.', 'medium'),
-- Lipid panel
('ldl_c', 'apob', 'correlated', 'Each LDL particle carries one ApoB molecule. LDL-C and ApoB generally move together, but can diverge when LDL particles are small and dense (more particles per unit of cholesterol).', 'high'),
('ldl_c', 'hdl_c', 'contextual', 'LDL and HDL cholesterol should be interpreted together. The ratio reflects cardiovascular risk better than either alone. HDL performs reverse cholesterol transport.', 'high'),
('triglycerides', 'hdl_c', 'inverse', 'High triglycerides are strongly associated with low HDL-C. This dyslipidemia pattern is a hallmark of metabolic syndrome and insulin resistance.', 'high'),
('total_cholesterol', 'ldl_c', 'correlated', 'LDL-C is the largest component of total cholesterol. Total cholesterol rises primarily when LDL-C increases, though HDL and VLDL also contribute.', 'medium'),
('apob', 'lpa', 'contextual', 'Lp(a) particles carry one ApoB each and contribute to the total ApoB count. Elevated Lp(a) can make ApoB appear high even when LDL particle count is normal.', 'medium'),
-- Liver panel
('alt', 'ast', 'correlated', 'Both are liver enzymes released during hepatocyte damage. ALT is more liver-specific, while AST is also found in muscle and heart. Their ratio helps distinguish liver conditions.', 'medium'),
('alt', 'ggt', 'correlated', 'Both rise with liver stress. GGT is particularly sensitive to alcohol use and biliary obstruction. Elevated GGT with normal ALT may indicate oxidative stress or medication effects.', 'medium'),
('ggt', 'insulin', 'correlated', 'GGT is an independent marker of insulin resistance and metabolic syndrome. Elevated GGT often precedes diabetes diagnosis, reflecting hepatic fat accumulation.', 'medium'),
-- Kidney
('creatinine', 'egfr', 'inverse', 'eGFR is calculated from creatinine (and sometimes cystatin C). As kidney function declines, creatinine rises and eGFR falls. Note: creatine supplementation raises creatinine without affecting kidney function.', 'high'),
('uric_acid', 'egfr', 'inverse', 'Elevated uric acid is associated with declining kidney function. The kidneys excrete uric acid, so impaired filtration leads to accumulation. Uric acid may also directly damage renal tubules.', 'medium'),
-- Iron/Blood
('iron', 'ferritin', 'correlated', 'Ferritin reflects total body iron stores. Low ferritin indicates iron depletion even before serum iron drops. However, ferritin is also an acute phase reactant and rises with inflammation.', 'high'),
('iron', 'hemoglobin', 'correlated', 'Iron is essential for hemoglobin synthesis. Iron deficiency leads to decreased hemoglobin production and eventually iron-deficiency anemia.', 'high'),
('iron', 'transferrin_sat', 'correlated', 'Transferrin saturation indicates what percentage of iron-binding sites are occupied. It reflects current iron availability more acutely than ferritin.', 'high'),
('ferritin', 'hs_crp', 'contextual', 'Both ferritin and CRP rise during inflammation. Elevated ferritin with elevated CRP may reflect acute phase response rather than true iron overload. Interpret ferritin in context of inflammatory markers.', 'medium'),
-- Thyroid
('tsh', 'ft4', 'inverse', 'TSH and free T4 have a log-linear inverse relationship. When T4 drops, the pituitary increases TSH production. Elevated TSH with low FT4 indicates hypothyroidism.', 'high'),
('tsh', 'ft3', 'inverse', 'TSH rises when T3 is insufficient. T3 is the active thyroid hormone. Poor T4-to-T3 conversion can cause elevated TSH with normal FT4 but low FT3.', 'high'),
('ft4', 'ft3', 'correlated', 'T3 is produced primarily by peripheral conversion of T4. They generally move together, but conversion can be impaired by selenium deficiency, inflammation, or stress.', 'medium'),
-- Inflammation
('hs_crp', 'wbc', 'correlated', 'Both are markers of systemic inflammation. CRP is produced by the liver in response to IL-6, while elevated WBC indicates immune system activation. Chronic elevation of both suggests ongoing inflammatory processes.', 'medium'),
('hs_crp', 'insulin', 'correlated', 'Chronic low-grade inflammation (elevated CRP) is associated with insulin resistance. Adipose tissue inflammation produces cytokines that impair insulin signaling.', 'medium'),
-- Hormones
('testosterone', 'shbg', 'contextual', 'SHBG binds testosterone, reducing its bioavailability. High SHBG can cause symptoms of low testosterone despite normal total testosterone. Free testosterone is what matters clinically.', 'high'),
('testosterone', 'free_testosterone', 'correlated', 'Free testosterone is the unbound, bioactive fraction. It depends on both total testosterone and SHBG levels. Low free testosterone with normal total may indicate high SHBG.', 'high'),
('testosterone', 'estradiol', 'contextual', 'Testosterone is converted to estradiol by aromatase enzyme, primarily in adipose tissue. Higher body fat can shift the ratio toward estradiol. Both are important for bone health in both sexes.', 'medium'),
-- Vitamins/Minerals
('vitamin_d', 'calcium', 'correlated', 'Vitamin D enhances intestinal calcium absorption. Deficiency leads to reduced calcium absorption, triggering PTH release to maintain serum calcium by pulling from bones.', 'medium'),
('magnesium', 'potassium', 'correlated', 'Magnesium is required for the Na/K-ATPase pump that maintains potassium balance. Magnesium deficiency can cause refractory hypokalemia that does not respond to potassium supplementation alone.', 'medium'),
('vitamin_b12', 'folate', 'contextual', 'B12 and folate work together in the methionine cycle and DNA synthesis. Deficiency of either can cause megaloblastic anemia. B12 deficiency can mask folate deficiency and vice versa.', 'medium'),
('homocysteine', 'vitamin_b12', 'inverse', 'B12 is a cofactor for methionine synthase, which converts homocysteine to methionine. B12 deficiency leads to homocysteine accumulation, increasing cardiovascular risk.', 'high'),
('homocysteine', 'folate', 'inverse', 'Folate donates the methyl group needed to convert homocysteine back to methionine. Low folate is one of the most common causes of elevated homocysteine.', 'high')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TASK 2: Protocol Effects
-- ============================================================================

CREATE TABLE IF NOT EXISTS protocol_effects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_slug VARCHAR(30) NOT NULL,
    protocol_name VARCHAR(50) NOT NULL,
    protocol_description TEXT,
    marker_slug VARCHAR(50) NOT NULL,
    effect VARCHAR(20) NOT NULL,
    detail TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(protocol_slug, marker_slug)
);

-- Carnivore
INSERT INTO protocol_effects (protocol_slug, protocol_name, marker_slug, effect, detail) VALUES
('carnivore', 'Carnivore', 'glucose', 'stable', 'Glucose typically stabilizes in the 4.0-5.5 mmol/L range on carnivore due to absence of dietary carbohydrates. Gluconeogenesis provides steady glucose.'),
('carnivore', 'Carnivore', 'ketones', 'higher', 'Moderate ketosis (0.5-2.0 mmol/L) is common on carnivore, especially in the first 2-4 weeks. Levels often settle lower than strict keto.'),
('carnivore', 'Carnivore', 'insulin', 'lower', 'Fasting insulin typically drops significantly due to low carbohydrate intake. Protein stimulates insulin less than carbohydrates.'),
('carnivore', 'Carnivore', 'triglycerides', 'lower', 'Triglycerides often drop substantially (20-40%) as the liver reduces VLDL production without excess carbohydrate substrate.'),
('carnivore', 'Carnivore', 'hdl_c', 'higher', 'HDL-C tends to increase on carnivore diets, reflecting improved reverse cholesterol transport and higher saturated fat intake.'),
('carnivore', 'Carnivore', 'ldl_c', 'may_increase', 'LDL-C often increases on carnivore, sometimes dramatically (lean mass hyper-responder pattern). ApoB is a better risk marker in this context.'),
('carnivore', 'Carnivore', 'total_cholesterol', 'may_increase', 'Total cholesterol often rises, driven primarily by LDL and HDL increases. The triglyceride/HDL ratio is more informative than total cholesterol alone.'),
('carnivore', 'Carnivore', 'hs_crp', 'lower', 'CRP often decreases due to reduced systemic inflammation from eliminating seed oils, processed foods, and potentially inflammatory plant compounds.'),
('carnivore', 'Carnivore', 'uric_acid', 'may_increase', 'Initial uric acid spike is common in the first weeks as the body adapts to higher purine intake. Usually normalizes within 4-8 weeks.'),
('carnivore', 'Carnivore', 'hba1c', 'lower', 'HbA1c typically improves (drops) over 3 months as average glucose levels decrease with carbohydrate elimination.'),
('carnivore', 'Carnivore', 'alt', 'stable', 'Liver enzymes generally remain stable or improve. Reduced hepatic fat from carbohydrate restriction often lowers ALT.'),
('carnivore', 'Carnivore', 'iron', 'higher', 'Heme iron from red meat is highly bioavailable. Serum iron and ferritin often increase. Monitor ferritin to avoid excess accumulation.'),
('carnivore', 'Carnivore', 'ferritin', 'higher', 'Ferritin may rise significantly with high red meat intake. Consider periodic monitoring and blood donation if levels exceed 300 ng/mL.'),
('carnivore', 'Carnivore', 'vitamin_d', 'stable', 'Vitamin D is obtained from fatty fish and animal fats. Levels may be adequate but supplementation is still often recommended.'),
('carnivore', 'Carnivore', 'magnesium', 'may_decrease', 'Magnesium intake may be lower without plant sources. Red meat provides some, but supplementation is often beneficial.'),
-- Keto
('keto', 'Keto', 'glucose', 'lower', 'Fasting glucose typically drops to 3.9-5.2 mmol/L. Carbohydrate restriction limits glucose spikes and improves glycemic variability.'),
('keto', 'Keto', 'ketones', 'higher', 'Nutritional ketosis produces ketones in the 0.5-3.0 mmol/L range. Deeper ketosis possible with stricter carb limits (under 20g/day).'),
('keto', 'Keto', 'insulin', 'lower', 'Fasting insulin decreases as the body shifts to fat metabolism. Lower carb intake means less insulin stimulation.'),
('keto', 'Keto', 'triglycerides', 'lower', 'Triglycerides typically decrease 20-40% on keto as the liver reduces de novo lipogenesis from carbohydrate overflow.'),
('keto', 'Keto', 'hdl_c', 'higher', 'HDL-C generally improves on keto diets, partly due to increased fat intake and improved insulin sensitivity.'),
('keto', 'Keto', 'ldl_c', 'may_increase', 'LDL-C response is variable. Some see increases (especially lean individuals), others see decreases. ApoB provides better risk assessment.'),
('keto', 'Keto', 'hba1c', 'lower', 'HbA1c typically decreases as average glucose levels drop. May take 2-3 months to see full effect due to red blood cell turnover.'),
('keto', 'Keto', 'hs_crp', 'lower', 'Ketones have anti-inflammatory properties. CRP often drops on well-formulated keto diets with whole food focus.'),
('keto', 'Keto', 'uric_acid', 'may_increase', 'Temporary uric acid elevation is common during keto adaptation (weeks 1-4). Ketones compete with uric acid for renal excretion.'),
('keto', 'Keto', 'sodium', 'may_decrease', 'Sodium excretion increases on keto due to lower insulin (insulin causes sodium retention). Supplementation is often needed.'),
('keto', 'Keto', 'potassium', 'may_decrease', 'Increased excretion during keto adaptation. Adequate intake from avocados, leafy greens, or supplementation recommended.'),
('keto', 'Keto', 'magnesium', 'may_decrease', 'Magnesium needs increase on keto. Nuts, seeds, and dark chocolate help, but supplementation is often beneficial.'),
('keto', 'Keto', 'iron', 'stable', 'Iron levels generally remain stable on keto. Meat-based keto provides good heme iron. Plant-based keto may need attention to iron intake.'),
('keto', 'Keto', 'alt', 'lower', 'Keto often improves liver enzymes as hepatic steatosis (fatty liver) resolves with carbohydrate restriction and reduced de novo lipogenesis.'),
-- Fasting
('fasting', 'Fasting', 'glucose', 'lower', 'Glucose drops progressively during fasting. Day 1-2: 4.0-5.0 mmol/L. Day 3+: 3.5-4.5 mmol/L. Gluconeogenesis maintains minimum levels.'),
('fasting', 'Fasting', 'ketones', 'higher', 'Ketones rise as fasting deepens. Day 1: 0.5-1.0 mmol/L. Day 2-3: 1.0-3.0 mmol/L. Day 4+: 3.0-6.0+ mmol/L depending on individual.'),
('fasting', 'Fasting', 'insulin', 'lower', 'Insulin drops to baseline levels (2-5 uIU/mL) within 12-24 hours. This is the primary metabolic switch that enables fat oxidation.'),
('fasting', 'Fasting', 'triglycerides', 'lower', 'Triglycerides drop as VLDL production decreases and fatty acids are directly oxidized for energy rather than re-packaged.'),
('fasting', 'Fasting', 'hs_crp', 'lower', 'Extended fasting reduces systemic inflammation. CRP may drop 20-50% during a 3-5 day fast through reduced NF-kB activation.'),
('fasting', 'Fasting', 'uric_acid', 'may_increase', 'Uric acid commonly spikes during fasting as ketone bodies compete with uric acid for renal excretion. Normalizes upon refeeding.'),
('fasting', 'Fasting', 'creatinine', 'may_increase', 'Mild creatinine increase during extended fasts reflects dehydration and muscle protein turnover, not kidney damage.'),
('fasting', 'Fasting', 'alt', 'may_increase', 'Brief ALT elevations during extended fasts reflect autophagy-related hepatocyte turnover, not liver damage. Returns to normal post-fast.'),
('fasting', 'Fasting', 'sodium', 'may_decrease', 'Sodium excretion increases without food intake. Electrolyte supplementation is essential during fasts longer than 24 hours.'),
('fasting', 'Fasting', 'potassium', 'may_decrease', 'Potassium can drop during extended fasting. Supplementation recommended to prevent cardiac rhythm issues.'),
('fasting', 'Fasting', 'magnesium', 'may_decrease', 'Magnesium depletion accelerates during fasting. Supplement with magnesium glycinate or citrate during longer fasts.'),
('fasting', 'Fasting', 'iron', 'stable', 'Iron levels remain relatively stable during fasting as there is minimal iron loss without food intake.'),
('fasting', 'Fasting', 'cortisol', 'higher', 'Cortisol increases during fasting as a counter-regulatory hormone to maintain glucose. This is a normal adaptive response.'),
('fasting', 'Fasting', 'hba1c', 'lower', 'Regular intermittent fasting can lower HbA1c over months by reducing average glucose exposure.'),
-- Vegan
('vegan', 'Vegan', 'glucose', 'variable', 'Glucose response on vegan diets is highly variable, depending on carbohydrate sources. Whole food plant-based tends to improve glucose. High-processed vegan may worsen it.'),
('vegan', 'Vegan', 'insulin', 'variable', 'Insulin levels depend on carbohydrate type and quantity. Whole food vegan with high fiber may improve insulin sensitivity. High-sugar vegan may worsen it.'),
('vegan', 'Vegan', 'vitamin_b12', 'lower', 'B12 is exclusively found in animal products. Supplementation is essential on a vegan diet to prevent deficiency, neuropathy, and elevated homocysteine.'),
('vegan', 'Vegan', 'iron', 'may_decrease', 'Plant iron (non-heme) has lower bioavailability than heme iron. Combining with vitamin C improves absorption. Monitor ferritin regularly.'),
('vegan', 'Vegan', 'ferritin', 'may_decrease', 'Iron stores may decline over time without heme iron sources. Regular monitoring recommended, especially for menstruating individuals.'),
('vegan', 'Vegan', 'homocysteine', 'may_increase', 'Without B12 supplementation, homocysteine rises due to impaired methionine cycle. This is a significant cardiovascular risk factor.'),
('vegan', 'Vegan', 'zinc', 'may_decrease', 'Plant-based zinc has lower bioavailability due to phytates. Soaking, sprouting, and fermenting grains can improve absorption.'),
('vegan', 'Vegan', 'triglycerides', 'variable', 'Depends on carbohydrate quality. Whole food plant-based may lower TG. High-carb processed vegan may raise TG.'),
('vegan', 'Vegan', 'hdl_c', 'may_decrease', 'HDL-C may be lower on vegan diets due to reduced saturated fat intake. Clinical significance depends on other risk factors.'),
('vegan', 'Vegan', 'hs_crp', 'lower', 'Plant-based diets rich in anti-inflammatory compounds (polyphenols, fiber) can reduce CRP levels.'),
('vegan', 'Vegan', 'vitamin_d', 'may_decrease', 'Vitamin D3 (cholecalciferol) is primarily from animal sources. Vegan D2 (ergocalciferol) is less potent. Supplementation recommended.'),
('vegan', 'Vegan', 'testosterone', 'may_decrease', 'Some studies show lower testosterone on vegan diets, possibly due to higher SHBG from increased fiber intake. Cholesterol is a testosterone precursor.'),
-- Omnivore
('omnivore', 'Omnivore', 'glucose', 'variable', 'Glucose levels depend heavily on carbohydrate quality and quantity. A balanced omnivore diet with whole foods generally maintains healthy glucose.'),
('omnivore', 'Omnivore', 'insulin', 'variable', 'Insulin response depends on meal composition. Balanced meals with protein, fat, and fiber moderate insulin spikes.'),
('omnivore', 'Omnivore', 'vitamin_b12', 'stable', 'B12 needs are easily met through meat, fish, eggs, and dairy on an omnivore diet.'),
('omnivore', 'Omnivore', 'iron', 'stable', 'Both heme (animal) and non-heme (plant) iron sources available. Generally adequate iron status without supplementation.'),
('omnivore', 'Omnivore', 'triglycerides', 'variable', 'Depends on refined carbohydrate and sugar intake. Processed food-heavy omnivore diets tend to raise TG.'),
('omnivore', 'Omnivore', 'hs_crp', 'variable', 'CRP depends on food quality. Processed food raises inflammation. Whole food omnivore can achieve low CRP.'),
-- Mediterranean
('mediterranean', 'Mediterranean', 'glucose', 'lower', 'Mediterranean diet improves glycemic control through high fiber, healthy fats (olive oil), and moderate carbohydrate intake from whole grains.'),
('mediterranean', 'Mediterranean', 'insulin', 'lower', 'Improved insulin sensitivity from high monounsaturated fat intake (olive oil) and polyphenol-rich foods.'),
('mediterranean', 'Mediterranean', 'triglycerides', 'lower', 'Mediterranean diet consistently reduces triglycerides through moderate carbohydrate restriction and high omega-3 intake from fish.'),
('mediterranean', 'Mediterranean', 'hdl_c', 'higher', 'Olive oil and fatty fish intake tends to raise HDL-C. Regular wine consumption (if included) may also contribute.'),
('mediterranean', 'Mediterranean', 'ldl_c', 'may_decrease', 'LDL-C may decrease modestly due to reduced saturated fat and increased fiber from vegetables, legumes, and whole grains.'),
('mediterranean', 'Mediterranean', 'hs_crp', 'lower', 'Strong anti-inflammatory effect from polyphenols, omega-3 fatty acids, and high vegetable intake. One of the best-studied anti-inflammatory diets.'),
('mediterranean', 'Mediterranean', 'homocysteine', 'lower', 'Abundant folate from leafy greens and legumes supports healthy homocysteine metabolism.'),
('mediterranean', 'Mediterranean', 'vitamin_d', 'stable', 'Fish intake provides some vitamin D. Mediterranean lifestyle with outdoor activity supports endogenous production.'),
('mediterranean', 'Mediterranean', 'alt', 'lower', 'Mediterranean diet is associated with reduced hepatic steatosis and improved liver enzymes through reduced processed food intake.'),
('mediterranean', 'Mediterranean', 'vitamin_b12', 'stable', 'Adequate B12 from fish, poultry, and eggs. Not a concern on a well-balanced Mediterranean diet.')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TASK 3: Medication Catalog + Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS medication_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(30) NOT NULL,
    description TEXT,
    common_dosages TEXT[],
    common_frequencies TEXT[],
    affected_markers TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_marker_effects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_slug VARCHAR(100) NOT NULL REFERENCES medication_catalog(slug),
    marker_slug VARCHAR(50) NOT NULL,
    effect VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'moderate',
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(medication_slug, marker_slug)
);

CREATE TABLE IF NOT EXISTS user_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    medication_slug VARCHAR(100) REFERENCES medication_catalog(slug),
    custom_name VARCHAR(200),
    category VARCHAR(30) NOT NULL DEFAULT 'supplement',
    dosage VARCHAR(50),
    frequency VARCHAR(50),
    timing VARCHAR(50),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_medications_user ON user_medications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_medications_active ON user_medications(user_id, is_active);

CREATE TABLE IF NOT EXISTS medication_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_slug_a VARCHAR(100) NOT NULL,
    medication_slug_b VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(medication_slug_a, medication_slug_b)
);

-- Seed medication catalog
INSERT INTO medication_catalog (slug, name, category, description, common_dosages, common_frequencies, affected_markers) VALUES
('vitamin_d3', 'Vitamin D3 (Cholecalciferol)', 'vitamin', 'Supports bone health, immune function, and mood', ARRAY['1000 IU', '2000 IU', '5000 IU', '10000 IU'], ARRAY['once daily'], ARRAY['vitamin_d', 'calcium']),
('magnesium_glycinate', 'Magnesium Glycinate', 'mineral', 'Highly bioavailable form of magnesium. Supports sleep, muscle recovery, and metabolic function', ARRAY['200mg', '400mg', '600mg'], ARRAY['once daily', 'before bed'], ARRAY['magnesium', 'potassium', 'glucose']),
('omega3_fish_oil', 'Omega-3 Fish Oil (EPA/DHA)', 'supplement', 'Supports cardiovascular health and reduces inflammation', ARRAY['1000mg', '2000mg', '3000mg', '4000mg'], ARRAY['once daily', 'twice daily', 'with meals'], ARRAY['triglycerides', 'hdl_c', 'hs_crp', 'omega3_index']),
('vitamin_k2_mk7', 'Vitamin K2 (MK-7)', 'vitamin', 'Directs calcium to bones and away from arteries', ARRAY['100mcg', '200mcg'], ARRAY['once daily'], ARRAY['calcium', 'vitamin_d']),
('zinc_picolinate', 'Zinc Picolinate', 'mineral', 'Supports immune function, testosterone, and wound healing', ARRAY['15mg', '30mg', '50mg'], ARRAY['once daily'], ARRAY['zinc', 'testosterone']),
('selenium', 'Selenium (Selenomethionine)', 'mineral', 'Supports thyroid function and acts as antioxidant', ARRAY['100mcg', '200mcg'], ARRAY['once daily'], ARRAY['selenium', 'tsh', 'ft4']),
('berberine', 'Berberine', 'herb', 'Supports glucose metabolism and lipid levels', ARRAY['500mg', '1000mg', '1500mg'], ARRAY['once daily', 'twice daily', 'three times daily'], ARRAY['glucose', 'insulin', 'hba1c', 'triglycerides', 'ldl_c']),
('creatine', 'Creatine Monohydrate', 'amino_acid', 'Supports muscle strength, cognitive function, and energy', ARRAY['3g', '5g'], ARRAY['once daily'], ARRAY['creatinine']),
('vitamin_b_complex', 'Vitamin B Complex', 'vitamin', 'Supports energy metabolism, nerve function, and red blood cell production', ARRAY['1 capsule'], ARRAY['once daily'], ARRAY['vitamin_b12', 'vitamin_b6', 'folate', 'homocysteine']),
('iron_bisglycinate', 'Iron Bisglycinate', 'mineral', 'Gentle form of iron supplementation', ARRAY['25mg', '36mg', '50mg'], ARRAY['once daily', 'every other day'], ARRAY['iron', 'ferritin', 'hemoglobin', 'transferrin_sat']),
('ashwagandha', 'Ashwagandha (KSM-66)', 'herb', 'Adaptogen that may reduce cortisol and support testosterone', ARRAY['300mg', '600mg'], ARRAY['once daily', 'twice daily'], ARRAY['testosterone', 'tsh']),
('coq10', 'CoQ10 (Ubiquinol)', 'supplement', 'Supports cellular energy production and heart health', ARRAY['100mg', '200mg', '300mg'], ARRAY['once daily'], ARRAY['ldh']),
('nac', 'NAC (N-Acetyl Cysteine)', 'amino_acid', 'Supports liver detox, glutathione production, and respiratory health', ARRAY['600mg', '1200mg'], ARRAY['once daily', 'twice daily'], ARRAY['alt', 'ast', 'ggt']),
('psyllium_husk', 'Psyllium Husk', 'supplement', 'Soluble fiber that binds bile acids and supports cholesterol', ARRAY['5g', '10g'], ARRAY['once daily', 'twice daily'], ARRAY['total_cholesterol', 'ldl_c']),
('red_yeast_rice', 'Red Yeast Rice', 'supplement', 'Contains natural lovastatin. Discuss with doctor before use', ARRAY['600mg', '1200mg'], ARRAY['once daily', 'twice daily'], ARRAY['total_cholesterol', 'ldl_c', 'alt']),
('probiotics', 'Probiotics (Multi-Strain)', 'probiotic', 'Supports gut health and immune function', ARRAY['10B CFU', '30B CFU', '50B CFU'], ARRAY['once daily'], ARRAY['hs_crp', 'glucose']),
('tudca', 'TUDCA (Tauroursodeoxycholic Acid)', 'supplement', 'Supports liver and bile acid health', ARRAY['250mg', '500mg'], ARRAY['once daily'], ARRAY['alt', 'ast', 'ggt', 'bilirubin_total']),
('electrolyte_mix', 'Electrolyte Mix (Na/K/Mg)', 'mineral', 'Sodium, potassium, magnesium blend for hydration', ARRAY['1 scoop', '2 scoops'], ARRAY['once daily', 'twice daily'], ARRAY['sodium', 'potassium', 'magnesium']),
('melatonin', 'Melatonin', 'supplement', 'Supports sleep onset and circadian rhythm', ARRAY['0.5mg', '1mg', '3mg', '5mg'], ARRAY['before bed'], ARRAY[]::TEXT[]),
('boron', 'Boron', 'mineral', 'Trace mineral supporting testosterone and bone health', ARRAY['3mg', '6mg', '9mg'], ARRAY['once daily'], ARRAY['testosterone', 'free_testosterone', 'vitamin_d', 'calcium'])
ON CONFLICT DO NOTHING;

-- Seed medication-marker effects
INSERT INTO medication_marker_effects (medication_slug, marker_slug, effect, description, severity) VALUES
('omega3_fish_oil', 'triglycerides', 'lower', 'EPA/DHA at 2-4g/day reduces triglycerides 15-30%', 'significant'),
('omega3_fish_oil', 'hs_crp', 'lower', 'Anti-inflammatory effect reduces CRP levels', 'moderate'),
('omega3_fish_oil', 'hdl_c', 'may_increase', 'May modestly raise HDL cholesterol', 'mild'),
('berberine', 'glucose', 'lower', 'Activates AMPK, reduces hepatic glucose output', 'significant'),
('berberine', 'hba1c', 'lower', 'Long-term glucose reduction lowers HbA1c', 'significant'),
('berberine', 'insulin', 'lower', 'Improves insulin sensitivity', 'moderate'),
('berberine', 'triglycerides', 'lower', 'Reduces triglyceride synthesis', 'moderate'),
('berberine', 'ldl_c', 'lower', 'Upregulates LDL receptors', 'moderate'),
('vitamin_d3', 'vitamin_d', 'higher', 'Direct supplementation raises 25-OH Vitamin D levels', 'significant'),
('vitamin_d3', 'calcium', 'may_increase', 'Vitamin D enhances calcium absorption', 'mild'),
('magnesium_glycinate', 'magnesium', 'higher', 'Direct supplementation raises serum magnesium', 'significant'),
('magnesium_glycinate', 'glucose', 'may_decrease', 'Magnesium improves insulin sensitivity', 'mild'),
('magnesium_glycinate', 'potassium', 'may_increase', 'Magnesium helps retain potassium', 'mild'),
('iron_bisglycinate', 'iron', 'higher', 'Direct supplementation raises serum iron', 'significant'),
('iron_bisglycinate', 'ferritin', 'higher', 'Replenishes iron stores over weeks', 'significant'),
('iron_bisglycinate', 'hemoglobin', 'higher', 'More iron available for hemoglobin synthesis', 'moderate'),
('creatine', 'creatinine', 'higher', 'Creatine supplementation raises creatinine as a byproduct. This is NOT kidney damage. eGFR may appear falsely low.', 'moderate'),
('nac', 'alt', 'lower', 'Supports glutathione production, reduces liver enzyme elevation', 'moderate'),
('nac', 'ggt', 'lower', 'Antioxidant effect supports liver health', 'moderate'),
('ashwagandha', 'testosterone', 'may_increase', 'Some studies show modest testosterone increase in men', 'mild'),
('ashwagandha', 'tsh', 'may_increase', 'Can stimulate thyroid function. Monitor if hypothyroid.', 'mild'),
('red_yeast_rice', 'ldl_c', 'lower', 'Contains monacolin K (natural lovastatin)', 'significant'),
('red_yeast_rice', 'alt', 'may_increase', 'Monitor liver enzymes as with any statin-like compound', 'mild'),
('selenium', 'tsh', 'may_decrease', 'Supports thyroid peroxidase function', 'mild'),
('zinc_picolinate', 'zinc', 'higher', 'Direct supplementation', 'significant'),
('zinc_picolinate', 'testosterone', 'may_increase', 'Zinc is required for testosterone synthesis', 'mild'),
('boron', 'testosterone', 'may_increase', 'May reduce SHBG, increasing free testosterone', 'mild'),
('boron', 'free_testosterone', 'may_increase', 'Reduces SHBG binding', 'mild'),
('vitamin_b_complex', 'homocysteine', 'lower', 'B6, B12, and folate are co-factors in homocysteine metabolism', 'significant'),
('vitamin_b_complex', 'vitamin_b12', 'higher', 'Direct supplementation', 'significant'),
('vitamin_b_complex', 'folate', 'higher', 'Direct supplementation', 'significant')
ON CONFLICT DO NOTHING;

-- Seed medication interactions
INSERT INTO medication_interactions (medication_slug_a, medication_slug_b, severity, description) VALUES
('iron_bisglycinate', 'vitamin_d3', 'info', 'No significant interaction. Can be taken together.'),
('iron_bisglycinate', 'zinc_picolinate', 'caution', 'Iron and zinc compete for absorption. Take at least 2 hours apart.'),
('iron_bisglycinate', 'magnesium_glycinate', 'caution', 'Minerals compete for absorption. Take at different times of day.'),
('vitamin_k2_mk7', 'vitamin_d3', 'info', 'Synergistic. K2 directs D3-absorbed calcium to bones. Take together.'),
('red_yeast_rice', 'coq10', 'info', 'Red yeast rice depletes CoQ10 (like statins). Co-supplementation recommended.'),
('red_yeast_rice', 'berberine', 'caution', 'Both lower cholesterol through different mechanisms. Combined effect may be stronger than expected. Monitor liver enzymes.'),
('ashwagandha', 'selenium', 'caution', 'Both stimulate thyroid. Monitor TSH if combining, especially if hypothyroid or on thyroid medication.'),
('nac', 'vitamin_b_complex', 'info', 'No interaction. Complementary for methylation and detox support.'),
('melatonin', 'ashwagandha', 'info', 'Both support sleep. Some users find the combination effective. Start with low doses.')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TASK 4: Doctor Chat agent_type column
-- ============================================================================

ALTER TABLE doctor_chat_conversations ADD COLUMN IF NOT EXISTS agent_type VARCHAR(30) DEFAULT 'general';

-- ============================================================================
-- TASK 6: Anonymous Comparison Foundation
-- ============================================================================

CREATE TABLE IF NOT EXISTS anonymous_cohort_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    age_bucket VARCHAR(10) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    diet_protocol VARCHAR(30),
    marker_slug VARCHAR(50) NOT NULL,
    sample_count INT NOT NULL DEFAULT 0,
    avg_value FLOAT,
    median_value FLOAT,
    p25_value FLOAT,
    p75_value FLOAT,
    min_value FLOAT,
    max_value FLOAT,
    period VARCHAR(20) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(age_bucket, gender, diet_protocol, marker_slug, period)
);

-- Add anonymous data sharing opt-in to user_preferences
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS share_anonymous_data BOOLEAN NOT NULL DEFAULT false;
