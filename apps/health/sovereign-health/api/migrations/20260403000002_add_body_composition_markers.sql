-- Sprint 019 / Issue #304: Add 9 body composition markers for smart scale imports (Renpho)
-- All markers: structural zone, source_type: home

-- ============================================================
-- 1. Create marker definitions
-- ============================================================

INSERT INTO markers (id, marker_slug, marker_name, zone_id, unit_canonical, source_type, display_order, loinc_code, loinc_system, loinc_class)
SELECT
    gen_random_uuid(),
    v.slug,
    v.name,
    z.id,
    v.unit,
    'home',
    v.display_order,
    v.loinc_code,
    v.loinc_system,
    v.loinc_class
FROM (VALUES
    ('skeletal_muscle_pct',   'Skeletal Muscle',      '%',     94, '73965-6', 'Patient', 'PHYSIOL'),
    ('muscle_mass_kg',        'Muscle Mass',          'kg',    95, '73964-9', 'Patient', 'PHYSIOL'),
    ('subcutaneous_fat_pct',  'Subcutaneous Fat',     '%',     96, '41982-0', 'Patient', 'PHYSIOL'),
    ('visceral_fat',          'Visceral Fat',         'level', 97, NULL,      NULL,      NULL),
    ('fat_free_mass',         'Fat-Free Mass',        'kg',    98, '8342-8',  'Patient', 'PHYSIOL'),
    ('bmr',                   'Basal Metabolic Rate', 'kcal',  99, NULL,      NULL,      NULL),
    ('metabolic_age',         'Metabolic Age',        'years', 100, NULL,     NULL,      NULL),
    ('body_protein_pct',      'Body Protein',         '%',     101, NULL,     NULL,      NULL),
    ('bone_mass_kg',          'Bone Mass',            'kg',    102, '101686-4', 'Patient', 'PHYSIOL')
) AS v(slug, name, unit, display_order, loinc_code, loinc_system, loinc_class)
JOIN zones z ON z.zone_slug = 'structural'
WHERE NOT EXISTS (
    SELECT 1 FROM markers m WHERE m.marker_slug = v.slug
);

-- ============================================================
-- 2. Zone marker assignments
-- ============================================================

INSERT INTO zone_markers (zone_slug, marker_slug, marker_type, display_order)
VALUES
    ('structural', 'skeletal_muscle_pct',  'standard', 16),
    ('structural', 'muscle_mass_kg',       'standard', 17),
    ('structural', 'subcutaneous_fat_pct', 'standard', 18),
    ('structural', 'visceral_fat',         'standard', 19),
    ('structural', 'fat_free_mass',        'standard', 20),
    ('structural', 'bmr',                  'standard', 21),
    ('structural', 'metabolic_age',        'standard', 22),
    ('structural', 'body_protein_pct',     'standard', 23),
    ('structural', 'bone_mass_kg',         'standard', 24)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Reference ranges (standard protocol, system-wide)
-- ============================================================
-- Male ranges first, then female
-- trend-only markers (muscle_mass_kg, fat_free_mass) have no fixed ranges

-- Male reference ranges
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', v.orange_min, v.green_min, v.green_max, v.orange_max
FROM (VALUES
    ('skeletal_muscle_pct',   28.0,  33.0, 43.0, 48.0),
    ('subcutaneous_fat_pct',   4.0,   8.0, 20.0, 28.0),
    ('visceral_fat',          NULL,   1.0, 12.0, 20.0),
    ('bmr',                 1200.0, 1500.0, 1900.0, 2200.0),
    ('body_protein_pct',      14.0,  16.0, 20.0, NULL),
    ('bone_mass_kg',           2.2,  2.65, 3.69, NULL)
) AS v(slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = v.slug
WHERE NOT EXISTS (
    SELECT 1 FROM reference_ranges rr
    WHERE rr.marker_id = m.id AND rr.protocol_context = 'standard' AND rr.user_id IS NULL
);

-- ============================================================
-- 4. Marker translations (EN + DE)
-- ============================================================

INSERT INTO marker_translations (marker_id, locale, name, description)
SELECT m.id, 'en', v.name_en, v.desc_en
FROM (VALUES
    ('skeletal_muscle_pct',  'Skeletal Muscle',      'Percentage of body weight made up of skeletal muscle. Higher values indicate better physical fitness and metabolic health.'),
    ('muscle_mass_kg',       'Muscle Mass',          'Absolute skeletal muscle mass in kilograms. Track trends over time — absolute values depend heavily on body size.'),
    ('subcutaneous_fat_pct', 'Subcutaneous Fat',     'Fat stored under the skin. While excess is undesirable, subcutaneous fat is less metabolically harmful than visceral fat.'),
    ('visceral_fat',         'Visceral Fat',         'Fat surrounding internal organs, measured as a level (1-59). Levels above 12 indicate elevated health risk regardless of total body fat.'),
    ('fat_free_mass',        'Fat-Free Mass',        'Total body weight minus fat mass, including muscle, bone, water, and organs. Track trends rather than absolute values.'),
    ('bmr',                  'Basal Metabolic Rate', 'Calories your body burns at rest to maintain basic functions. Higher BMR generally indicates more metabolically active tissue (muscle).'),
    ('metabolic_age',        'Metabolic Age',        'Estimated biological age based on BMR compared to age-group averages. A metabolic age lower than your chronological age indicates good metabolic health.'),
    ('body_protein_pct',     'Body Protein',         'Percentage of body weight from protein. Adequate protein levels support muscle maintenance, immune function, and tissue repair.'),
    ('bone_mass_kg',         'Bone Mass',            'Absolute bone mineral mass in kilograms. Important for fracture risk assessment. Weight-bearing exercise and adequate calcium/vitamin D support bone health.')
) AS v(slug, name_en, desc_en)
JOIN markers m ON m.marker_slug = v.slug
ON CONFLICT DO NOTHING;

INSERT INTO marker_translations (marker_id, locale, name, description)
SELECT m.id, 'de', v.name_de, v.desc_de
FROM (VALUES
    ('skeletal_muscle_pct',  'Skelettmuskel',        'Anteil der Skelettmuskulatur am Körpergewicht. Höhere Werte deuten auf bessere Fitness und metabolische Gesundheit hin.'),
    ('muscle_mass_kg',       'Muskelmasse',          'Absolute Skelettmuskelmasse in Kilogramm. Verfolgen Sie den Trend — absolute Werte hängen stark von der Körpergröße ab.'),
    ('subcutaneous_fat_pct', 'Subkutanes Fett',      'Fett unter der Haut. Überschuss ist unerwünscht, aber subkutanes Fett ist weniger schädlich als viszerales Fett.'),
    ('visceral_fat',         'Viszeralfett',         'Fett um die inneren Organe, gemessen als Stufe (1-59). Werte über 12 weisen auf ein erhöhtes Gesundheitsrisiko hin.'),
    ('fat_free_mass',        'Fettfreie Masse',      'Gesamtkörpergewicht minus Fettmasse, einschließlich Muskeln, Knochen, Wasser und Organe. Verfolgen Sie den Trend.'),
    ('bmr',                  'Grundumsatz',          'Kalorien, die Ihr Körper in Ruhe verbrennt. Ein höherer Grundumsatz deutet auf mehr stoffwechselaktives Gewebe (Muskeln) hin.'),
    ('metabolic_age',        'Stoffwechselalter',    'Geschätztes biologisches Alter basierend auf dem Grundumsatz im Vergleich zu Altersgruppen-Durchschnittswerten. Niedriger als Ihr tatsächliches Alter ist gut.'),
    ('body_protein_pct',     'Körperprotein',        'Anteil des Körpergewichts aus Protein. Ausreichende Proteinwerte unterstützen Muskelerhalt, Immunfunktion und Gewebereparatur.'),
    ('bone_mass_kg',         'Knochenmasse',         'Absolute Knochenmineralmasse in Kilogramm. Wichtig für die Frakturrisikobewertung. Gewichtstragende Übungen und Kalzium/Vitamin D unterstützen die Knochengesundheit.')
) AS v(slug, name_de, desc_de)
JOIN markers m ON m.marker_slug = v.slug
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. Marker content (descriptions for detail view)
-- ============================================================

INSERT INTO marker_content (id, marker_id, content_type, title, body_text, display_order)
SELECT gen_random_uuid(), v.slug, 'description', v.title, v.body, 1
FROM (VALUES
    ('skeletal_muscle_pct',  'What is Skeletal Muscle Percentage?',
     'Skeletal muscle percentage measures the proportion of your body weight that is skeletal muscle. Unlike total muscle mass, this focuses on the muscles you can voluntarily control. It is a key indicator of physical fitness and metabolic health, as skeletal muscle is the primary site for glucose uptake and fat oxidation.'),
    ('muscle_mass_kg',       'What is Muscle Mass?',
     'Muscle mass in kilograms represents the absolute weight of your skeletal muscles. This value varies significantly based on height, frame size, and genetics. Rather than comparing to fixed ranges, track your trend over time. Resistance training and adequate protein intake (1.6-2.2 g/kg) help maintain and build muscle mass.'),
    ('subcutaneous_fat_pct', 'What is Subcutaneous Fat?',
     'Subcutaneous fat is the fat stored directly beneath your skin. It accounts for roughly 80% of total body fat. While excess subcutaneous fat is associated with health risks, it is considered less metabolically dangerous than visceral fat. Subcutaneous fat provides insulation, energy storage, and cushioning.'),
    ('visceral_fat',         'What is Visceral Fat?',
     'Visceral fat surrounds your internal organs in the abdominal cavity. Consumer scales report it as a level from 1-59. Levels 1-12 are considered healthy; 13+ indicates elevated risk for metabolic syndrome, type 2 diabetes, and cardiovascular disease. Visceral fat is more metabolically active than subcutaneous fat and responds well to aerobic exercise and dietary improvements.'),
    ('fat_free_mass',        'What is Fat-Free Mass?',
     'Fat-free mass (also called lean body mass) is your total body weight minus all fat tissue. It includes muscle, bone, water, and organ weight. This metric helps contextualize body fat percentage — two people with identical body fat percentages can have very different fat-free mass values depending on their muscle and bone density.'),
    ('bmr',                  'What is Basal Metabolic Rate (BMR)?',
     'BMR is the number of calories your body burns at complete rest to maintain vital functions like breathing, circulation, and cell production. It typically accounts for 60-75% of total daily energy expenditure. Higher muscle mass increases BMR. BMR naturally declines 1-2% per decade after age 20, primarily due to muscle loss.'),
    ('metabolic_age',        'What is Metabolic Age?',
     'Metabolic age is a proprietary calculation from your scale that compares your BMR to average BMR values for different age groups. If your metabolic age is lower than your chronological age, it suggests your metabolism is functioning better than average for your age. This is not a clinical metric but a useful motivational indicator.'),
    ('body_protein_pct',     'What is Body Protein Percentage?',
     'Body protein percentage indicates how much of your total body weight comes from protein (primarily in muscles, but also in skin, blood, and organs). A healthy range is 16-20%. This should not be confused with serum total protein, which is a blood test measuring proteins dissolved in your blood plasma.'),
    ('bone_mass_kg',         'What is Bone Mass?',
     'Bone mass in kilograms estimates the weight of your bone mineral content. Healthy ranges vary by body weight: males under 65 kg should have at least 2.65 kg bone mass, 65-95 kg at least 3.29 kg, and over 95 kg at least 3.69 kg. Weight-bearing exercise, adequate vitamin D, calcium, and protein intake support bone mineral density.')
) AS v(slug, title, body)
WHERE NOT EXISTS (
    SELECT 1 FROM marker_content mc
    WHERE mc.marker_id = v.slug AND mc.content_type = 'description'
);
