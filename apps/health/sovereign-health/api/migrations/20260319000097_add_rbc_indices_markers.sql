-- Add missing CBC index markers: MCV, MCH, MCHC, RDW
-- These are standard red blood cell indices reported on every CBC panel.

INSERT INTO markers (id, marker_slug, marker_name, zone_id, unit_canonical, display_order, source_type, display_name, abbreviation, loinc_code, loinc_system, loinc_class)
SELECT gen_random_uuid(), v.slug, v.name, z.id, v.unit, v.ord, 'lab', v.display_name, v.abbr, v.loinc, v.system, v.class
FROM (VALUES
  ('mcv',  'MCV',  'Mean Corpuscular Volume',        'MCV',  'fL',   41, '787-2', 'Blood', 'HEMAT'),
  ('mch',  'MCH',  'Mean Corpuscular Hemoglobin',    'MCH',  'pg',   42, '785-6', 'Blood', 'HEMAT'),
  ('mchc', 'MCHC', 'Mean Corpuscular Hb Concentration','MCHC','g/dL', 43, '786-4', 'Blood', 'HEMAT'),
  ('rdw',  'RDW',  'Red Cell Distribution Width',    'RDW',  '%',    44, '788-0', 'Blood', 'HEMAT')
) AS v(slug, name, display_name, abbr, unit, ord, loinc, system, class)
JOIN zones z ON z.zone_slug = 'immune'
WHERE NOT EXISTS (SELECT 1 FROM markers WHERE marker_slug = v.slug);

-- Add zone_markers associations
INSERT INTO zone_markers (marker_slug, zone_slug, marker_type)
SELECT v.slug, 'immune', 'standard'
FROM (VALUES ('mcv'), ('mch'), ('mchc'), ('rdw')) AS v(slug)
WHERE NOT EXISTS (SELECT 1 FROM zone_markers WHERE marker_slug = v.slug AND zone_slug = 'immune');

-- Add English translations
INSERT INTO marker_translations (id, marker_id, locale, name, description)
SELECT gen_random_uuid(), m.id, 'en', v.name, v.descr
FROM (VALUES
  ('mcv',  'Mean Corpuscular Volume',         'Average volume of red blood cells. Helps classify anemia as microcytic or macrocytic.'),
  ('mch',  'Mean Corpuscular Hemoglobin',     'Average amount of hemoglobin per red blood cell. Low values suggest iron deficiency.'),
  ('mchc', 'Mean Corpuscular Hb Concentration','Average concentration of hemoglobin in red blood cells. Helps distinguish types of anemia.'),
  ('rdw',  'Red Cell Distribution Width',     'Measures variation in red blood cell size. Elevated in iron, B12, or folate deficiency.')
) AS v(slug, name, descr)
JOIN markers m ON m.marker_slug = v.slug
ON CONFLICT (marker_id, locale) DO NOTHING;

-- Add German translations
INSERT INTO marker_translations (id, marker_id, locale, name, description)
SELECT gen_random_uuid(), m.id, 'de', v.name, v.descr
FROM (VALUES
  ('mcv',  'Mittleres Zellvolumen',            'Durchschnittliches Volumen der roten Blutkörperchen. Hilft bei der Klassifizierung von Anämien.'),
  ('mch',  'Mittleres Zellhämoglobin',         'Durchschnittliche Hämoglobinmenge pro rotem Blutkörperchen. Niedrige Werte deuten auf Eisenmangel hin.'),
  ('mchc', 'Mittlere Hämoglobinkonzentration',  'Durchschnittliche Hämoglobinkonzentration in roten Blutkörperchen. Hilft bei der Unterscheidung von Anämietypen.'),
  ('rdw',  'Erythrozytenverteilungsbreite',     'Misst die Variation der Größe roter Blutkörperchen. Erhöht bei Eisen-, B12- oder Folatmangel.')
) AS v(slug, name, descr)
JOIN markers m ON m.marker_slug = v.slug
ON CONFLICT (marker_id, locale) DO NOTHING;
