-- Migration 077: German translations for marker_content (carousel tiles,
-- checklists, supplement names) for all seeded markers.
-- Uses ON CONFLICT DO NOTHING to be safely re-runnable.

-- ============================================================
-- GLUCOSE — German content
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$glucose$$, $$what_is$$, $$Was ist Blutzucker?$$, $$Blutzucker (Blutglukose) ist die Konzentration von Glukose in Ihrem Blutkreislauf, angegeben in mmol/L oder mg/dL. Er ist die wichtigste Energiequelle Ihres Körpers und muss in einem engen Bereich gehalten werden – zu hoch schädigt Blutgefäße und Nerven, zu niedrig hungert das Gehirn aus.$$, $$de$$, 0),
($$glucose$$, $$did_you_know$$, $$Wussten Sie?$$, $$Ihr Gehirn verbraucht täglich etwa 120 g Glukose – rund 60 % Ihres gesamten Ruhe-Glukoseverbrauchs – obwohl es nur 2 % Ihres Körpergewichts ausmacht.$$, $$de$$, 1),
($$glucose$$, $$health_facts$$, $$Klinische Bedeutung$$, $$Ein Nüchternblutzucker über 7,0 mmol/L (126 mg/dL) bei zwei Messungen ist diagnostisch für Typ-2-Diabetes. Chronisch erhöhter Blutzucker glykiert Proteine im ganzen Körper und beschleunigt Atherosklerose, Neuropathie, Retinopathie und Nierenerkrankungen. Selbst leicht erhöhter Nüchternblutzucker (5,6–6,9 mmol/L) – der prädiabetische Bereich – ist mit deutlich erhöhtem kardiovaskulärem Risiko verbunden.$$, $$de$$, 2),
($$glucose$$, $$food_for_thought$$, $$Denkanstöße$$, $$Lebensmittel mit niedrigem glykämischen Index wie stärkefreies Gemüse, Hülsenfrüchte und ganze Körner dämpfen postprandiale Blutzuckerspitzen, während raffinierte Kohlenhydrate und zuckerhaltige Getränke den Nüchternblutzucker innerhalb weniger Wochen erhöhen können.$$, $$de$$, 3),
($$glucose$$, $$fun_facts$$, $$Wissenswertes$$, $$Das erste praktische Blutzuckermessgerät, das Ames Reflectance Meter, wog über 1 kg und brauchte 70 Sekunden für eine Messung, als es 1970 auf den Markt kam. Heutige kontinuierliche Glukosemessgeräte aktualisieren alle 5 Minuten und wiegen weniger als eine Münze.$$, $$de$$, 4),
($$glucose$$, $$how_to_stay_in_range$$, $$Glukose im Bereich halten$$, $$• Kohlenhydrate mit niedrigem glykämischen Index essen und Kohlenhydrate mit Protein oder Fett kombinieren
• 10–15 Minuten nach dem Essen spazieren gehen, um die Glukoseaufnahme in die Muskeln zu beschleunigen
• 7–9 Stunden Schlaf priorisieren – schon eine Nacht schlechter Schlaf erhöht den Nüchternblutzucker
• Raffinierten Zucker, Weißbrot und zuckerhaltige Getränke einschränken
• Krafttraining erhöht die GLUT4-Transporter-Expression und verbessert die Insulinempfindlichkeit
• Chronischen Stress bewältigen – Cortisol erhöht die hepatische Glukoseproduktion
• Ausreichend trinken; Dehydration konzentriert den Blutzucker$$, $$de$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

-- ============================================================
-- KETONES — German content
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$ketones$$, $$what_is$$, $$Was sind Ketone?$$, $$Ketone (Beta-Hydroxybutyrat, Acetoacetat, Aceton) sind wasserlösliche Moleküle, die von der Leber produziert werden, wenn die Kohlenhydratverfügbarkeit gering ist und die Fettsäureoxidation hoch. Blutketone sind die genaueste Messung; Atem- und Urinketone sind Näherungswerte. Sie dienen als hochwertiger Alternativbrennstoff für Gehirn, Herz und Skelettmuskulatur.$$, $$de$$, 0),
($$ketones$$, $$did_you_know$$, $$Wussten Sie?$$, $$Das Herz verbrennt bevorzugt Beta-Hydroxybutyrat statt Glukose, wenn beides verfügbar ist, und gewinnt mehr ATP pro Sauerstoffmolekül – was Ernährungsketose potenziell kardioprotektiv macht.$$, $$de$$, 1),
($$ketones$$, $$health_facts$$, $$Klinische Bedeutung$$, $$Ernährungsketose (0,5–3,0 mmol/L) ist ein physiologischer Zustand, der mit verbesserter Insulinempfindlichkeit, reduzierter Entzündung und kognitiven Vorteilen verbunden ist. Diabetische Ketoazidose (DKA) ist ein gefährlicher pathologischer Zustand, bei dem Ketone über 3 mmol/L steigen – deutlich verschieden von Ernährungsketose. Therapeutische Ketose wird bei Epilepsie, Alzheimer und bestimmten Krebsarten untersucht.$$, $$de$$, 2),
($$ketones$$, $$food_for_thought$$, $$Denkanstöße$$, $$Die Einschränkung der Kohlenhydratzufuhr auf unter 20–50 g pro Tag versetzt die Leber innerhalb von 24–72 Stunden in die Ketogenese, während mittelkettige Triglyceride (in Kokosöl) unabhängig von der Kohlenhydratzufuhr schnell in Ketone umgewandelt werden.$$, $$de$$, 3),
($$ketones$$, $$fun_facts$$, $$Wissenswertes$$, $$Neugeborene befinden sich unmittelbar nach der Geburt in milder Ernährungsketose, da Muttermilch fettreich ist – was darauf hindeutet, dass das menschliche Gehirn von Geburt an gut an den Ketonstoffwechsel angepasst ist.$$, $$de$$, 4),
($$ketones$$, $$how_to_stay_in_range$$, $$Ketone im Bereich halten (Ernährungsketose 0,5–3,0 mmol/L)$$, $$• Netto-Kohlenhydrate unter 20–50 g pro Tag halten
• Ausreichend Protein essen (1,2–1,8 g/kg Körpergewicht) – überschüssiges Protein kann die Ketose durch Glukoneogenese unterdrücken
• Kokosöl oder MCT-Öl verwenden, um den Ketonspiegel schnell zu erhöhen
• Intermittierendes Fasten oder zeitbeschränktes Essen (16:8 oder länger) einbauen
• Nüchtern trainieren, um Glykogen zu verbrauchen und die Ketonproduktion zu beschleunigen
• Gut hydriert bleiben und Elektrolyte (Natrium, Kalium, Magnesium) auffüllen$$, $$de$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

-- ============================================================
-- INSULIN — German content
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$insulin$$, $$what_is$$, $$Was ist Insulin?$$, $$Insulin ist ein Hormon, das von den Betazellen der Bauchspeicheldrüse produziert wird. Es reguliert den Blutzuckerspiegel, indem es Zellen signalisiert, Glukose aus dem Blut aufzunehmen. Nüchtern-Insulinwerte zeigen, wie hart Ihre Bauchspeicheldrüse arbeiten muss, um den Blutzucker normal zu halten.$$, $$de$$, 0),
($$insulin$$, $$did_you_know$$, $$Wussten Sie?$$, $$Insulin wurde 1921 entdeckt und seine erste therapeutische Anwendung 1922 rettete einem 14-jährigen Jungen das Leben. Es war eines der ersten Proteine, dessen Struktur vollständig aufgeklärt wurde.$$, $$de$$, 1),
($$insulin$$, $$health_facts$$, $$Klinische Bedeutung$$, $$Erhöhtes Nüchterninsulin (Hyperinsulinämie) ist oft der früheste Marker für Insulinresistenz – Jahre bevor der Blutzucker steigt. Chronisch hohe Insulinspiegel fördern Fetteinlagerung, Entzündung und erhöhen das Risiko für Typ-2-Diabetes, Herz-Kreislauf-Erkrankungen und bestimmte Krebsarten.$$, $$de$$, 2),
($$insulin$$, $$fun_facts$$, $$Wissenswertes$$, $$Die Bauchspeicheldrüse eines gesunden Erwachsenen produziert täglich etwa 40–50 Einheiten Insulin. Bei Insulinresistenz kann die Produktion auf das Zwei- bis Dreifache ansteigen, bevor die Betazellen erschöpft sind.$$, $$de$$, 4),
($$insulin$$, $$how_to_stay_in_range$$, $$Insulin im Bereich halten$$, $$• Raffinierte Kohlenhydrate und Zucker reduzieren
• Regelmäßige Bewegung – besonders Krafttraining verbessert die Insulinempfindlichkeit
• Intermittierendes Fasten kann die Insulinsensitivität verbessern
• Ausreichend Schlaf – Schlafmangel verschlechtert die Insulinempfindlichkeit
• Stressmanagement – Cortisol antagonisiert die Insulinwirkung
• Ballaststoffreiche Ernährung verlangsamt die Glukoseaufnahme$$, $$de$$, 5)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

-- ============================================================
-- Supplement German names (update existing rows)
-- ============================================================
UPDATE marker_supplements SET supplement_name_de = 'Berberin' WHERE supplement_name = 'Berberine' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Magnesium (Glycinat)' WHERE supplement_name = 'Magnesium (glycinate)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Alpha-Liponsäure' WHERE supplement_name = 'Alpha-Lipoic Acid' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Chrom-Picolinat' WHERE supplement_name = 'Chromium Picolinate' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Omega-3-Fettsäuren (EPA/DHA)' WHERE supplement_name = 'Omega-3 (EPA/DHA)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Vitamin D3' WHERE supplement_name = 'Vitamin D3' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Zink' WHERE supplement_name = 'Zinc' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Selen' WHERE supplement_name = 'Selenium' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Eisen (Bisglycinat)' WHERE supplement_name = 'Iron (bisglycinate)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Vitamin C' WHERE supplement_name = 'Vitamin C' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Vitamin B12 (Methylcobalamin)' WHERE supplement_name = 'Vitamin B12 (methylcobalamin)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Folsäure (Methylfolat)' WHERE supplement_name = 'Folate (methylfolate)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Coenzym Q10' WHERE supplement_name = 'CoQ10 (ubiquinol)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Kreatin-Monohydrat' WHERE supplement_name = 'Creatine Monohydrate' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Kurkumin' WHERE supplement_name = 'Curcumin (with piperine)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Ashwagandha' WHERE supplement_name = 'Ashwagandha (KSM-66)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'N-Acetylcystein (NAC)' WHERE supplement_name = 'NAC (N-acetylcysteine)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Mariendistel' WHERE supplement_name = 'Milk Thistle (silymarin)' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Kollagenpeptide' WHERE supplement_name = 'Collagen Peptides' AND supplement_name_de IS NULL;
UPDATE marker_supplements SET supplement_name_de = 'Kalzium (Citrat)' WHERE supplement_name = 'Calcium (citrate)' AND supplement_name_de IS NULL;
