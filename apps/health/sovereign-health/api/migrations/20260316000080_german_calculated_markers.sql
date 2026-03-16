-- Migration 080: German descriptions and fasting explanations for calculated markers.

INSERT INTO marker_content (marker_id, content_type, title, body_text, language, display_order) VALUES
-- Dr. Boz Ratio
($$dr_boz_ratio$$, $$description$$, $$Dr. Boz Ratio$$, $$Das Dr. Boz Verhältnis ist eine beliebte Alternative zum GKI in der ketogenen Gemeinschaft, entwickelt von Dr. Annette Bosworth. Niedrigere Werte zeigen tiefere Ketose an.
Formula: Glukose (mg/dL) / Ketone (mmol/L)
Based on: Glukose (glucose), Ketone (ketones)$$, $$de$$, 0),
($$dr_boz_ratio$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Das Dr. Boz Verhältnis (Glukose in mg/dL geteilt durch Ketone in mmol/L) sinkt während des Fastens deutlich, da die Glukose fällt und die Ketone steigen. Ein Verhältnis unter 80 zeigt Ernährungsketose an, unter 40 therapeutische Werte. Dies ist eine beliebte Methode zur Fastenüberwachung.$$, $$de$$, 0),

-- GKI
($$gki$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Der GKI sinkt während des Fastens deutlich, da die Glukose fällt und die Ketone steigen. Ein GKI unter 9 zeigt niedrige Ketose an, unter 3 hohe therapeutische Ketose. Dies ist einer der besten Marker zur Überwachung des Fastenerfolgs.$$, $$de$$, 0),

-- HOMA-IR (description already added in migration 078)

-- BMI
($$bmi$$, $$description$$, $$BMI$$, $$Der BMI (Body-Mass-Index) schätzt Körperfett basierend auf Ihrem Gewicht und Ihrer Größe. Er ist ein grobes Screening-Tool — er unterscheidet nicht zwischen Muskelmasse und Fettmasse.
Formula: Gewicht (kg) / Größe (m)²
Based on: Gewicht (weight), Größe (height)$$, $$de$$, 0),

-- WHtR
($$whtr$$, $$description$$, $$WHtR$$, $$Das Taille-zu-Größe-Verhältnis ist eines der zuverlässigsten einfachen Maße für viszerales Fett und metabolisches Risiko. Es ist aussagekräftiger als der BMI allein.
Formula: Taillenumfang / Körpergröße
Based on: Taillenumfang (waist_circumference), Größe (height)$$, $$de$$, 0),

-- TG/HDL Ratio
($$tg_hdl_ratio$$, $$description$$, $$TG/HDL-Verhältnis$$, $$Das TG/HDL-Verhältnis ist ein einfacher Proxy für Insulinresistenz und kardiovaskuläres Risiko. Ein niedrigeres Verhältnis deutet auf bessere Insulinsensitivität und geringeres Risiko hin.
Formula: Triglyceride / HDL-Cholesterin
Based on: Triglyceride (triglycerides), HDL-Cholesterin (hdl_c)$$, $$de$$, 0),
($$tg_hdl_ratio$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Das TG/HDL-Verhältnis verbessert sich oft während des Fastens, da die Triglyceride sinken. Dies spiegelt verbesserte Insulinsensitivität wider.$$, $$de$$, 0),

-- TyG Index
($$tyg_index$$, $$description$$, $$TyG-Index$$, $$Der TyG-Index schätzt die Insulinresistenz anhand von Nüchtern-Triglyceriden und Glukose. Er benötigt keinen Insulintest und ist daher als Screening-Tool zugänglicher.
Formula: ln(Triglyceride × Glukose / 2)
Based on: Triglyceride (triglycerides), Glukose (glucose)$$, $$de$$, 0),
($$tyg_index$$, $$fasting_explanation$$, $$Fastenprotokoll-Bereich$$, $$Der TyG-Index sinkt während des Fastens, da sowohl Triglyceride als auch Glukose fallen. Dies zeigt verbesserte Insulinsensitivität an.$$, $$de$$, 0),

-- HCT/HB Ratio
($$hct_hb_ratio$$, $$description$$, $$HCT/HB-Verhältnis$$, $$Das HCT/HB-Verhältnis schätzt das mittlere korpuskuläre Volumen (MCV) und hilft, Hydratationsänderungen während des Fastens zu erkennen.
Formula: Hämatokrit / Hämoglobin
Based on: Hämatokrit (hematocrit), Hämoglobin (hemoglobin)$$, $$de$$, 0)
ON CONFLICT (marker_id, content_type, language) DO NOTHING;
