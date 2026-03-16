-- Migration: German translations for all markers and health zones
-- Populates marker_translations (locale='de') and updates zone_translations (locale='de')
-- with descriptions and short_descriptions.

-- ============================================================================
-- 1. Zone translations: fill in German descriptions and short_descriptions
-- ============================================================================

UPDATE zone_translations SET
    description = 'Kannst du den ganzen Tag über Energie aufrechterhalten, ohne Einbrüche? Diese Zone verfolgt deinen Glukose-, Insulin-, Keton- und Schilddrüsenstatus. Diese Marker bilden den Motor deiner Stoffwechselgesundheit. Bringe diese Zone zuerst in Ordnung, und der Rest wird einfacher.',
    short_description = 'Glukose, Insulin, Ketone und Schilddrüsenfunktion',
    updated_at = NOW()
WHERE locale = 'de' AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'energy_metabolic');

UPDATE zone_translations SET
    description = 'Sind deine Knochen, Muskeln und dein Bindegewebe stark? Kalzium, Magnesium, Protein und Vitamin D bilden dein strukturelles Gerüst. In dieser Zone geht es um Langlebigkeit und körperliche Belastbarkeit.',
    short_description = 'Knochen-, Muskel- und Bindegewebsstärke',
    updated_at = NOW()
WHERE locale = 'de' AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'structural');

UPDATE zone_translations SET
    description = 'Wie stark ist dein Herz und dein Kreislauf? Diese Zone konzentriert sich auf das tatsächliche kardiovaskuläre Risiko durch Partikelanzahl (ApoB), Blutdruck und Lipidverhältnisse. Nicht nur Cholesterinwerte, sondern was Herzerkrankungen wirklich vorhersagt.',
    short_description = 'Herzgesundheit und Kreislaufmarker',
    updated_at = NOW()
WHERE locale = 'de' AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'cardiovascular');

UPDATE zone_translations SET
    description = 'Ist dein Gehirn scharf, dein Gedächtnis klar und deine Stimmung stabil? B-Vitamine, Magnesium, Schilddrüsenhormone und Sexualhormone beeinflussen direkt Kognition, Gedächtnis und Stimmung. Diese Zone dient der Prävention von kognitivem Abbau.',
    short_description = 'Gehirnfunktion, Gedächtnis und Stimmung',
    updated_at = NOW()
WHERE locale = 'de' AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'cognitive');

UPDATE zone_translations SET
    description = 'Ist dein Immunsystem im Gleichgewicht? Zu viel Entzündung verursacht Krankheit, zu wenig Immunität bedeutet Infektionen. Weiße Blutkörperchen, Vitamin D, Zink und Selen bestimmen deine Immunresilienz.',
    short_description = 'Immunbalance und Entzündungsmarker',
    updated_at = NOW()
WHERE locale = 'de' AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'immune');

UPDATE zone_translations SET
    description = 'Hast du genug Mikronährstoffe, um deine Zellen optimal zu betreiben? Vitamine und Mineralstoffe sind Kofaktoren für Tausende von Enzymen. Mängel kaskadieren leise zu Müdigkeit, schwacher Immunität und langsamer Erholung.',
    short_description = 'Vitamin- und Mineralstoffspiegel',
    updated_at = NOW()
WHERE locale = 'de' AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'nutritional');

UPDATE zone_translations SET
    description = 'Sind deine Hormone für dein Alter optimiert? Sexualhormone, Stresshormone und Reproduktionsmarker orchestrieren Stoffwechsel, Stimmung, Libido und Erholung. In dieser Zone geht es darum, zu blühen, nicht nur zu überleben.',
    short_description = 'Sexualhormone, Stresshormone und Reproduktionsmarker',
    updated_at = NOW()
WHERE locale = 'de' AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'hormonal');

UPDATE zone_translations SET
    description = 'Kann dein Körper Abfallprodukte effizient verarbeiten und ausscheiden? Leber und Nieren bilden das Filtersystem. ALT, GGT, Kreatinin, eGFR und Harnsäure zeigen, wie gut deine Entgiftungswege funktionieren.',
    short_description = 'Leber- und Nierenfiltration',
    updated_at = NOW()
WHERE locale = 'de' AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'detoxification');

-- ============================================================================
-- 2. Marker translations: insert German for all standard markers
-- ============================================================================

-- Energy & Metabolic markers (from initial migration)
INSERT INTO marker_translations (marker_id, locale, name, description)
SELECT m.id, 'de', v.name_de, v.desc_de
FROM (VALUES
    ('glucose',           'Glukose',                'Blutzucker ist die primäre Energiequelle des Körpers. Erhöhte Nüchternwerte können auf Insulinresistenz oder Diabetes hinweisen.'),
    ('ketones',           'Ketone (BHB)',            'Beta-Hydroxybutyrat ist der Hauptketonkörper im Blut. Erhöhte Werte zeigen Fettverbrennung an, typisch bei Fasten oder ketogener Ernährung.'),
    ('insulin',           'Insulin (Nüchtern)',      'Insulin reguliert den Blutzuckerspiegel. Erhöhte Nüchternwerte deuten auf Insulinresistenz hin, oft lange bevor der Blutzucker steigt.'),
    ('hba1c',             'HbA1c',                   'Glykiertes Hämoglobin zeigt den durchschnittlichen Blutzucker der letzten 2–3 Monate. Werte über 5,7 % weisen auf Prädiabetes hin.'),
    ('tsh',               'TSH',                     'Thyreoidea-stimulierendes Hormon steuert die Schilddrüse. Erhöhte Werte deuten auf eine Unterfunktion hin, niedrige auf eine Überfunktion.'),
    ('ft4',               'Freies T4',               'Freies Thyroxin ist das Haupthormon der Schilddrüse. Es wird in das aktivere T3 umgewandelt und beeinflusst den gesamten Stoffwechsel.'),
    ('ft3',               'Freies T3',               'Freies Trijodthyronin ist das biologisch aktivste Schilddrüsenhormon. Es bestimmt die Stoffwechselrate auf zellulärer Ebene.'),
    -- Cardiovascular markers
    ('total_cholesterol',  'Gesamtcholesterin',       'Gesamtcholesterin umfasst HDL, LDL und VLDL. Als Einzelwert wenig aussagekräftig — die Verhältnisse und Partikelgrößen sind entscheidender.'),
    ('ldl_c',              'LDL-Cholesterin',         'Low-Density-Lipoprotein transportiert Cholesterin zu den Zellen. Erhöhte Werte korrelieren mit Arterioskleroserisiko, besonders in Kombination mit hohem ApoB.'),
    ('hdl_c',              'HDL-Cholesterin',          'High-Density-Lipoprotein transportiert überschüssiges Cholesterin zur Leber zurück. Höhere Werte gelten als kardiovaskulär schützend.'),
    ('triglycerides',      'Triglyzeride',             'Triglyzeride sind Blutfette, die aus der Nahrung stammen. Erhöhte Nüchternwerte weisen auf metabolisches Syndrom und Insulinresistenz hin.'),
    ('apob',               'ApoB',                    'Apolipoprotein B ist der beste Einzelmarker für atherogenes Risiko. Jedes LDL-, VLDL- und Lp(a)-Partikel trägt genau ein ApoB-Molekül.'),
    ('lpa',                'Lp(a)',                    'Lipoprotein(a) ist genetisch bestimmt und ein unabhängiger Risikofaktor für Herzerkrankungen. Er lässt sich durch Lebensstil kaum beeinflussen.'),
    ('hs_crp',             'hs-CRP',                   'Hochsensitives C-reaktives Protein misst systemische Entzündung. Dauerhaft erhöhte Werte erhöhen das kardiovaskuläre und metabolische Risiko.'),
    ('non_hdl_c',          'Non-HDL-Cholesterin',      'Non-HDL-Cholesterin umfasst alle atherogenen Lipoproteine. Es ist ein besserer Risikoprediktor als LDL-Cholesterin allein.'),
    ('bp_systolic',        'Systolischer Blutdruck',   'Der systolische Blutdruck misst den Druck beim Herzschlag. Dauerhaft erhöhte Werte schädigen Blutgefäße und erhöhen das Risiko für Herzinfarkt und Schlaganfall.'),
    ('bp_diastolic',       'Diastolischer Blutdruck',  'Der diastolische Blutdruck misst den Druck zwischen den Herzschlägen. Erhöhte Werte deuten auf erhöhten Gefäßwiderstand hin.'),
    ('heart_rate',         'Herzfrequenz',             'Die Ruheherzfrequenz spiegelt die kardiovaskuläre Fitness wider. Niedrigere Werte in Ruhe deuten auf ein effizienteres Herz hin.'),
    -- Structural markers
    ('hemoglobin',         'Hämoglobin',               'Hämoglobin transportiert Sauerstoff im Blut. Niedrige Werte deuten auf Anämie hin, hohe können auf Dehydration oder andere Ursachen hinweisen.'),
    ('hematocrit',         'Hämatokrit',               'Der Hämatokrit gibt den Anteil der roten Blutkörperchen am Gesamtblutvolumen an. Veränderte Werte können auf Dehydration, Anämie oder Bluterkrankungen hinweisen.'),
    ('weight',             'Gewicht',                  'Das Körpergewicht allein sagt wenig über die Gesundheit aus. In Kombination mit Körperzusammensetzung und WHtR wird es aussagekräftiger.'),
    ('waist_circumference','Taillenumfang',            'Der Taillenumfang ist ein direktes Maß für viszerales Fett. Er korreliert stärker mit metabolischem Risiko als BMI allein.'),
    ('albumin',            'Albumin',                  'Albumin ist das häufigste Blutprotein und ein Marker für Ernährungsstatus und Leberfunktion. Niedrige Werte können auf Mangelernährung oder chronische Erkrankungen hinweisen.'),
    ('total_protein',      'Gesamtprotein',            'Gesamtprotein im Blut umfasst Albumin und Globuline. Es gibt Aufschluss über Ernährungs- und Immunstatus.'),
    ('calcium',            'Kalzium',                  'Kalzium ist essentiell für Knochen, Muskelfunktion und Nervenleitung. Der Blutspiegel wird streng reguliert — Abweichungen können auf Nebenschilddrüsen- oder Knochenprobleme hinweisen.'),
    ('magnesium',          'Magnesium',                'Magnesium ist an über 300 enzymatischen Reaktionen beteiligt. Mangel ist weit verbreitet und kann Muskelkrämpfe, Schlafstörungen und Herzrhythmusstörungen verursachen.'),
    ('potassium',          'Kalium',                   'Kalium ist entscheidend für Herzfunktion und Muskelkontraktionen. Sowohl zu hohe als auch zu niedrige Werte können gefährlich sein.'),
    ('phosphate',          'Phosphat',                 'Phosphat ist wichtig für Knochen, Energiestoffwechsel und DNA-Synthese. Abweichungen können auf Nieren- oder Nebenschilddrüsenprobleme hinweisen.'),
    -- Detoxification markers
    ('uric_acid',          'Harnsäure',                'Harnsäure entsteht beim Abbau von Purinen. Erhöhte Werte können Gicht auslösen und korrelieren mit metabolischem Syndrom und Nierensteinen.'),
    ('creatinine',         'Kreatinin',                'Kreatinin ist ein Abbauprodukt des Muskelstoffwechsels und wird über die Nieren ausgeschieden. Erhöhte Werte deuten auf eingeschränkte Nierenfunktion hin.'),
    ('egfr',               'eGFR',                     'Die geschätzte glomeruläre Filtrationsrate zeigt, wie gut die Nieren Abfallstoffe filtern. Niedrige Werte weisen auf Niereninsuffizienz hin.'),
    ('cystatin_c',         'Cystatin C',               'Cystatin C ist ein präziserer Marker für die Nierenfunktion als Kreatinin, da er weniger von Muskelmasse beeinflusst wird.'),
    ('alt',                'ALT (GPT)',                 'Alanin-Aminotransferase ist ein Leberenzym. Erhöhte Werte deuten auf Leberzellschäden hin, z. B. durch Fettleber, Medikamente oder Alkohol.'),
    ('ast',                'AST (GOT)',                 'Aspartat-Aminotransferase kommt in Leber, Herz und Muskeln vor. Erhöhte Werte können auf Leber- oder Muskelschäden hinweisen.'),
    ('ggt',                'GGT',                      'Gamma-Glutamyltransferase ist ein empfindlicher Lebermarker. Erhöhte Werte deuten auf Gallenstau, Alkoholkonsum oder oxidativen Stress hin.'),
    ('alp',                'AP (Alkalische Phosphatase)', 'Alkalische Phosphatase findet sich in Leber, Knochen und Darm. Erhöhte Werte können auf Knochenerkrankungen oder Gallenwegsprobleme hinweisen.'),
    ('ldh',                'LDH',                      'Laktatdehydrogenase ist ein unspezifischer Marker für Gewebeschäden. Erhöhte Werte können auf Zellzerfall in verschiedenen Organen hinweisen.'),
    ('bilirubin_total',    'Bilirubin (Gesamt)',        'Gesamtbilirubin entsteht beim Abbau roter Blutkörperchen. Leicht erhöhte Werte können antioxidativ wirken, stark erhöhte deuten auf Leberprobleme hin.'),
    ('bilirubin_direct',   'Bilirubin (Direkt)',        'Direktes Bilirubin ist die wasserlösliche Form, die von der Leber verarbeitet wurde. Erhöhte Werte weisen auf Gallenwegsprobleme hin.'),
    -- Hormonal markers
    ('testosterone',       'Testosteron',               'Testosteron beeinflusst Muskelmasse, Knochendichte, Stimmung und Libido. Sowohl bei Männern als auch Frauen ein wichtiger Gesundheitsmarker.'),
    ('free_testosterone',  'Freies Testosteron',        'Freies Testosteron ist die biologisch aktive Form. Nur 1–3 % des Gesamttestosterons zirkulieren ungebunden und sind sofort wirksam.'),
    ('free_androgen_index','Freier Androgenindex',      'Der freie Androgenindex berechnet sich aus Testosteron und SHBG. Er gibt Aufschluss über die tatsächliche Androgenwirkung im Körper.'),
    ('shbg',               'SHBG',                      'Sexualhormon-bindendes Globulin bindet Testosteron und Östradiol im Blut. Hohe Werte reduzieren die Verfügbarkeit freier Hormone.'),
    ('estradiol',          'Östradiol (E2)',             'Östradiol ist das wichtigste Östrogen. Es beeinflusst Knochendichte, Gehirnfunktion und kardiovaskuläre Gesundheit bei beiden Geschlechtern.'),
    ('progesterone',       'Progesteron',               'Progesteron ist wichtig für den Menstruationszyklus und die Schwangerschaft. Es wirkt auch beruhigend auf das Nervensystem.'),
    ('prolactin',          'Prolaktin',                 'Prolaktin reguliert die Milchproduktion. Erhöhte Werte außerhalb der Stillzeit können auf Hypophysenprobleme oder Medikamentenwirkungen hinweisen.'),
    ('fsh',                'FSH',                       'Follikelstimulierendes Hormon steuert die Reifung von Eizellen und Spermien. Erhöhte Werte bei Frauen können auf nahende Menopause hinweisen.'),
    ('lh',                 'LH',                        'Luteinisierendes Hormon löst den Eisprung aus und stimuliert die Testosteronproduktion. Das LH/FSH-Verhältnis ist diagnostisch relevant.'),
    ('dheas',              'DHEA-S',                    'DHEA-Sulfat ist eine Vorstufe von Sexualhormonen und ein Marker für Nebennierengesundheit. Die Produktion nimmt mit dem Alter ab.'),
    -- Iron panel
    ('iron',               'Eisen',                     'Eisen ist essentiell für den Sauerstofftransport im Blut. Sowohl Mangel als auch Überladung können gesundheitsschädlich sein.'),
    ('ferritin',           'Ferritin',                  'Ferritin spiegelt die Eisenspeicher des Körpers wider. Niedrige Werte deuten auf Eisenmangel hin, hohe können auf Entzündung oder Eisenüberladung hinweisen.'),
    ('transferrin',        'Transferrin',               'Transferrin transportiert Eisen im Blut. Erhöhte Werte können auf Eisenmangel hinweisen, da der Körper mehr Transportprotein produziert.'),
    ('transferrin_sat',    'Transferrinsättigung',      'Die Transferrinsättigung zeigt, wie viel des Transportproteins mit Eisen beladen ist. Werte unter 20 % deuten auf Eisenmangel hin.'),
    -- Vitamins
    ('vitamin_d',          'Vitamin D (25-OH)',          'Vitamin D ist eigentlich ein Hormon und beeinflusst Knochen, Immunsystem und Stimmung. Mangel ist in nördlichen Breiten weit verbreitet.'),
    ('vitamin_b12',        'Vitamin B12',               'Vitamin B12 ist essentiell für Nervenfunktion und Blutbildung. Mangel verursacht Anämie und neurologische Symptome. Besonders Veganer sind gefährdet.'),
    ('holo_tc',            'Holotranscobalamin (HoloTC)', 'Holotranscobalamin ist der aktivste B12-Marker und zeigt den tatsächlich verfügbaren B12-Anteil. Er erkennt Mangel früher als Gesamt-B12.'),
    ('vitamin_b1',         'Vitamin B1 (Thiamin)',       'Thiamin ist entscheidend für den Energiestoffwechsel und die Nervenfunktion. Schwerer Mangel kann zu Beriberi oder Wernicke-Enzephalopathie führen.'),
    ('vitamin_b2',         'Vitamin B2 (Riboflavin)',    'Riboflavin ist wichtig für den Energiestoffwechsel und wirkt als Antioxidans. Mangel kann sich durch rissige Mundwinkel und Lichtempfindlichkeit äußern.'),
    ('vitamin_b3',         'Vitamin B3 (Niacin)',        'Niacin ist an über 400 enzymatischen Reaktionen beteiligt. Es spielt eine Rolle im Energie- und Fettstoffwechsel und bei der DNA-Reparatur.'),
    ('vitamin_b5',         'Vitamin B5 (Pantothensäure)','Pantothensäure ist ein Bestandteil von Coenzym A und damit an zahllosen Stoffwechselwegen beteiligt. Mangel ist selten, aber möglich.'),
    ('vitamin_b6',         'Vitamin B6',                'Vitamin B6 ist wichtig für Aminosäurestoffwechsel, Neurotransmitterproduktion und Immunfunktion. Mangel kann Stimmungsschwankungen und Anämie verursachen.'),
    ('folate',             'Folat',                     'Folat (Vitamin B9) ist essentiell für Zellteilung und DNA-Synthese. Mangel erhöht das Homocystein und ist in der Schwangerschaft besonders riskant.'),
    ('vitamin_a',          'Vitamin A (Retinol)',        'Vitamin A ist wichtig für Sehkraft, Immunfunktion und Hautgesundheit. Sowohl Mangel als auch Überdosierung können schädlich sein.'),
    ('vitamin_e',          'Vitamin E (Alpha-Tocopherol)', 'Vitamin E ist ein starkes Antioxidans, das Zellmembranen vor oxidativem Stress schützt. Es wird am besten über die Nahrung aufgenommen.'),
    -- Electrolytes / Minerals
    ('sodium',             'Natrium',                   'Natrium reguliert den Flüssigkeitshaushalt und den Blutdruck. Sowohl Hypo- als auch Hypernatriämie können gefährlich sein.'),
    ('zinc',               'Zink',                      'Zink ist entscheidend für Immunfunktion, Wundheilung und Testosteronproduktion. Mangel ist häufig und beeinträchtigt über 300 Enzyme.'),
    ('selenium',           'Selen',                     'Selen ist ein essentielles Spurenelement für die Schilddrüsenfunktion und das Immunsystem. Es wirkt als Bestandteil von Selenoproteinen antioxidativ.'),
    ('homocysteine',       'Homocystein',               'Homocystein ist eine Aminosäure, deren erhöhte Werte auf B-Vitamin-Mangel und erhöhtes kardiovaskuläres Risiko hinweisen.'),
    -- Omega-3
    ('epa',                'EPA',                       'Eicosapentaensäure ist eine entzündungshemmende Omega-3-Fettsäure. Sie kommt hauptsächlich in fettem Fisch vor und schützt das Herz-Kreislauf-System.'),
    ('dha',                'DHA',                       'Docosahexaensäure ist die wichtigste Omega-3-Fettsäure für das Gehirn. Sie macht einen großen Teil der Gehirnfettmasse aus und unterstützt die kognitive Funktion.'),
    ('omega3_index',       'Omega-3-Index',             'Der Omega-3-Index misst den EPA+DHA-Anteil in den Erythrozytenmembranen. Ein Index über 8 % gilt als kardiovaskulär schützend.'),
    -- Full Blood Count / Immune
    ('wbc',                'Leukozyten (WBC)',           'Weiße Blutkörperchen sind die Hauptakteure des Immunsystems. Erhöhte Werte deuten auf Infektionen oder Entzündungen hin, niedrige auf Immunschwäche.'),
    ('rbc',                'Erythrozyten (RBC)',         'Rote Blutkörperchen transportieren Sauerstoff zu den Geweben. Abweichungen können auf Anämie, Dehydration oder Knochenmarkprobleme hinweisen.'),
    ('platelets',          'Thrombozyten',               'Blutplättchen sind für die Blutgerinnung verantwortlich. Zu niedrige Werte erhöhen das Blutungsrisiko, zu hohe das Thromboserisiko.'),
    ('neutrophils_pct',    'Neutrophile %',              'Neutrophile Granulozyten sind die häufigsten weißen Blutkörperchen und die erste Verteidigungslinie gegen bakterielle Infektionen.'),
    ('neutrophils_abs',    'Neutrophile (Absolut)',      'Die absolute Neutrophilenzahl zeigt die tatsächliche Anzahl im Blut. Niedrige Werte (Neutropenie) erhöhen das Infektionsrisiko erheblich.'),
    ('lymphocytes_pct',    'Lymphozyten %',              'Lymphozyten umfassen T-Zellen, B-Zellen und NK-Zellen. Sie sind zentral für die adaptive Immunantwort und das immunologische Gedächtnis.'),
    ('lymphocytes_abs',    'Lymphozyten (Absolut)',      'Die absolute Lymphozytenzahl gibt Aufschluss über die Stärke der adaptiven Immunabwehr. Niedrige Werte können auf Immunschwäche hinweisen.'),
    ('monocytes_pct',      'Monozyten %',                'Monozyten sind Vorläufer von Makrophagen und dendritischen Zellen. Sie spielen eine wichtige Rolle bei der Abwehr und Gewebereparatur.'),
    ('monocytes_abs',      'Monozyten (Absolut)',        'Die absolute Monozytenzahl hilft bei der Beurteilung chronischer Entzündungen und Infektionen. Erhöhte Werte können auf aktive Immunprozesse hinweisen.'),
    ('eosinophils_pct',    'Eosinophile %',              'Eosinophile Granulozyten bekämpfen Parasiten und sind an allergischen Reaktionen beteiligt. Erhöhte Werte deuten auf Allergien oder parasitäre Infektionen hin.'),
    ('eosinophils_abs',    'Eosinophile (Absolut)',      'Die absolute Eosinophilenzahl ist aussagekräftiger als der Prozentanteil. Dauerhaft erhöhte Werte erfordern weitere Abklärung.'),
    ('basophils_pct',      'Basophile %',                'Basophile Granulozyten sind die seltensten weißen Blutkörperchen. Sie spielen eine Rolle bei allergischen Reaktionen und der Immunregulation.'),
    ('basophils_abs',      'Basophile (Absolut)',        'Die absolute Basophilenzahl ist normalerweise sehr gering. Erhöhungen können bei allergischen Reaktionen oder bestimmten Bluterkrankungen auftreten.'),
    -- Body composition
    ('body_fat_pct',       'Körperfettanteil',           'Der Körperfettanteil zeigt den prozentualen Fettanteil am Gesamtgewicht. Er ist aussagekräftiger als das Gewicht allein und unterscheidet zwischen Fett- und Magermasse.'),
    ('body_water_pct',     'Körperwasseranteil',         'Der Körperwasseranteil gibt an, wie viel Prozent des Körpergewichts Wasser ist. Ausreichende Hydration ist essentiell für Zellfunktion und Stoffwechsel.'),
    ('muscle_pct',         'Muskelmasse',                'Der Muskelmasseanteil zeigt den Anteil der Skelettmuskulatur am Körpergewicht. Höhere Muskelmasse verbessert Insulinsensitivität und Stoffwechselgesundheit.'),
    ('bone_mass_pct',      'Knochenmasse',               'Der Knochenmasseanteil zeigt den mineralischen Knochenanteil am Körpergewicht. Ausreichende Knochendichte schützt vor Osteoporose und Frakturen.')
) AS v(marker_slug, name_de, desc_de)
JOIN markers m ON m.marker_slug = v.marker_slug
WHERE NOT EXISTS (SELECT 1 FROM marker_translations mt WHERE mt.marker_id = m.id AND mt.locale = 'de');
