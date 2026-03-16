-- Migration 078: German descriptions and fasting explanations for key markers.
-- Uses ON CONFLICT DO NOTHING to be safely re-runnable.

-- ============================================================
-- German descriptions (content_type = 'description')
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$glucose$$, $$description$$, $$Blutzucker$$, $$Blutzucker ist der Zucker in Ihrem Blut, den Ihre Zellen als Energie nutzen. Ihr Körper reguliert ihn streng mit Insulin. Nüchternglukose ist einer der besten Indikatoren für die Stoffwechselgesundheit. Dieser Marker wird durch Fasten beeinflusst. Siehe den Fastenprotokoll-Bereich unten.$$, $$de$$, 0),
($$ketones$$, $$description$$, $$Ketone$$, $$Beta-Hydroxybutyrat (BHB) ist ein Ketonkörper, den Ihre Leber bei der Fettverbrennung produziert. Höhere Werte zeigen stärkere Ketose an. Dieser Marker wird durch Fasten beeinflusst — längeres Fasten erhöht die Ketonproduktion natürlich.$$, $$de$$, 0),
($$insulin$$, $$description$$, $$Nüchterninsulin$$, $$Nüchterninsulin misst, wie viel Insulin Ihre Bauchspeicheldrüse produziert, wenn Sie nicht gegessen haben. Hohe Nüchternwerte deuten auf Insulinresistenz hin — Ihre Zellen brauchen mehr Insulin, um Glukose aufzunehmen. Dieser Marker wird durch Fasten beeinflusst.$$, $$de$$, 0),
($$hba1c$$, $$description$$, $$HbA1c$$, $$HbA1c (glykiertes Hämoglobin) spiegelt Ihren durchschnittlichen Blutzucker der letzten 2-3 Monate wider. Es zeigt, welcher Anteil Ihres Hämoglobins mit Zucker überzogen ist und ist der Goldstandard zur Diabetesdiagnose und -überwachung.$$, $$de$$, 0),
($$homa_ir$$, $$description$$, $$HOMA-IR$$, $$HOMA-IR schätzt, wie resistent Ihre Zellen gegenüber Insulin sind. Niedrigere Werte bedeuten bessere Insulinsensitivität. Er wird aus Nüchternglukose und Nüchterninsulin berechnet.$$, $$de$$, 0),
($$gki$$, $$description$$, $$GKI$$, $$Der Glukose-Keton-Index misst das Verhältnis zwischen Ihrem Blutzucker und Ihren Ketonwerten. Ein niedrigerer GKI deutet auf tiefere Ketose und bessere metabolische Flexibilität hin.$$, $$de$$, 0),
($$triglycerides$$, $$description$$, $$Triglyceride$$, $$Triglyceride sind Fette in Ihrem Blut, die Ihr Körper zur Energiespeicherung nutzt. Erhöhte Triglyceride, besonders nüchtern, sind ein starker Marker für Insulinresistenz und kardiovaskuläres Risiko.$$, $$de$$, 0),
($$total_cholesterol$$, $$description$$, $$Gesamtcholesterin$$, $$Gesamtcholesterin ist die Summe allen Cholesterins in Ihrem Blut, einschließlich HDL, LDL und VLDL. Der Gesamtwert allein sagt wenig über das Risiko aus — die Zusammensetzung ist entscheidend.$$, $$de$$, 0),
($$hdl_c$$, $$description$$, $$HDL-Cholesterin$$, $$HDL-Cholesterin transportiert überschüssiges Cholesterin aus Ihren Arterien zurück zur Leber zum Recycling. Hohe HDL-Werte gelten als schützend gegen Herz-Kreislauf-Erkrankungen.$$, $$de$$, 0),
($$ldl_c$$, $$description$$, $$LDL-Cholesterin$$, $$LDL-Cholesterin liefert Cholesterin an Ihre Zellen und Arterienwände. Wenn die LDL-Partikel erhöht sind, können sie in die Arterienwände eindringen und Plaque bilden.$$, $$de$$, 0),
($$apob$$, $$description$$, $$ApoB$$, $$Apolipoprotein B (ApoB) zählt die Anzahl potenziell schädlicher Cholesterin-Partikel in Ihrem Blut. Jedes LDL-, VLDL- und Lp(a)-Partikel trägt genau ein ApoB-Molekül, was es zum genauesten einzelnen Marker für kardiovaskuläres Risiko macht.$$, $$de$$, 0),
($$vitamin_d$$, $$description$$, $$Vitamin D$$, $$Vitamin D ist sowohl Vitamin als auch Hormon und reguliert die Kalziumaufnahme, Immunfunktion und Stimmung. Es wird hauptsächlich durch Sonneneinstrahlung produziert und ist in nördlichen Breitengraden häufig mangelhaft.$$, $$de$$, 0),
($$iron$$, $$description$$, $$Eisen$$, $$Serumeisen misst die Menge an Eisen, die in Ihrem Blut zirkuliert. Niedriges Eisen kann Müdigkeit, Schwäche und kognitive Probleme verursachen, während überschüssiges Eisen Organschäden verursachen kann.$$, $$de$$, 0),
($$ferritin$$, $$description$$, $$Ferritin$$, $$Ferritin ist das Protein, das Eisen in Ihren Zellen speichert. Es ist der zuverlässigste Einzeltest für Eisenmangelanämie und Eisenüberladung. Niedrige Werte bedeuten erschöpfte Speicher, hohe Werte können Entzündung oder Hämochromatose anzeigen.$$, $$de$$, 0),
($$tsh$$, $$description$$, $$TSH$$, $$Thyreoidea-stimulierendes Hormon (TSH) sagt Ihrer Schilddrüse, wie viel Schilddrüsenhormon sie produzieren soll. Hohe TSH-Werte deuten auf Hypothyreose hin, niedrige auf Hyperthyreose.$$, $$de$$, 0),
($$testosterone$$, $$description$$, $$Testosteron$$, $$Testosteron ist das primäre männliche Sexualhormon, aber für beide Geschlechter wichtig. Es reguliert Muskelmasse, Knochendichte, Fettverteilung, Stimmung und Libido.$$, $$de$$, 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;

-- ============================================================
-- German fasting explanations
-- ============================================================
INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
($$glucose$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Glukose sinkt, wenn die Glykogenspeicher während des Fastens erschöpft werden. Längeres Fasten kann den Blutzucker unter den Standardbereich drücken, da der Körper auf Fettverbrennung und Ketogenese umschaltet. Dies ist eine normale physiologische Anpassung.$$, $$de$$, 0),
($$ketones$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Die Ketonproduktion steigt während des Fastens deutlich an, da Ihr Körper von Glukose auf Fettverbrennung umschaltet. Dies ist ein normaler und gewünschter Effekt des Fastens.$$, $$de$$, 0),
($$insulin$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Insulin sinkt während des Fastens erheblich, da keine nahrungsbedingte Sekretion stattfindet. Niedrigere Nüchterninsulinwerte zeigen verbesserte Insulinsensitivität an.$$, $$de$$, 0),
($$triglycerides$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Triglyceride sinken während des Fastens, da Ihr Körper gespeichertes Fett zur Energiegewinnung verbrennt, anstatt Nahrungsfette zu verarbeiten.$$, $$de$$, 0),
($$homa_ir$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$HOMA-IR sinkt während des Fastens deutlich aufgrund niedrigerer Insulin- und Glukosewerte. Dies spiegelt eine verbesserte Insulinsensitivität wider.$$, $$de$$, 0),
($$uric_acid$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Harnsäure steigt während des Fastens an, da Ketone mit Urat um die Nierenausscheidung konkurrieren. Dies ist ein vorübergehender und erwarteter Effekt.$$, $$de$$, 0),
($$total_cholesterol$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Gesamtcholesterin kann während des Fastens durch verstärkte Fettmobilisierung und erhöhten Lipidtransport ansteigen.$$, $$de$$, 0),
($$ldl_c$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$LDL-Cholesterin steigt oft während des Fastens und bei kohlenhydratarmen Zuständen an, da der Körper Fett als primäre Energiequelle nutzt.$$, $$de$$, 0),
($$hdl_c$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$HDL-Cholesterin kann während des Fastens leicht ansteigen, da der reverse Cholesterintransport bei niedrigem Insulin aktiver wird.$$, $$de$$, 0),
($$iron$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Serumeisen folgt einem natürlichen Tagesrhythmus und kann in nüchternen Morgenproben höher sein als am Nachmittag.$$, $$de$$, 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;
