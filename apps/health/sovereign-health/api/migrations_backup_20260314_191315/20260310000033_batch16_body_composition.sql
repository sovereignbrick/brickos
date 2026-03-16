-- Batch 16: Body Composition Markers + Zone Assignments

-- Task 5: Add body composition markers
INSERT INTO markers (id, marker_slug, marker_name, zone_id, unit_canonical, source_type, display_order)
SELECT
    gen_random_uuid(),
    v.slug,
    v.name,
    z.id,
    v.unit,
    v.source_type,
    v.display_order
FROM (VALUES
    ('body_fat_pct',   'Body Fat',    'structural', '%', 'home', 90),
    ('body_water_pct', 'Body Water',  'structural', '%', 'home', 91),
    ('muscle_pct',     'Muscle Mass', 'structural', '%', 'home', 92),
    ('bone_mass_pct',  'Bone Mass',   'structural', '%', 'home', 93)
) AS v(slug, name, zone_slug, unit, source_type, display_order)
JOIN zones z ON z.zone_slug = v.zone_slug
WHERE NOT EXISTS (
    SELECT 1 FROM markers m WHERE m.marker_slug = v.slug
);

-- Add to zone_markers (structural zone)
INSERT INTO zone_markers (zone_slug, marker_slug, marker_type, display_order)
VALUES
    ('structural', 'body_fat_pct',   'standard', 12),
    ('structural', 'body_water_pct', 'standard', 13),
    ('structural', 'muscle_pct',     'standard', 14),
    ('structural', 'bone_mass_pct',  'standard', 15)
ON CONFLICT DO NOTHING;

-- Add standard reference ranges for body composition markers
-- Based on male 50-59 ranges from spec
INSERT INTO reference_ranges (id, user_id, marker_id, protocol_context, orange_min, green_min, green_max, orange_max)
SELECT gen_random_uuid(), NULL, m.id, 'standard', v.orange_min, v.green_min, v.green_max, v.orange_max
FROM (VALUES
    ('body_fat_pct',   8.0,  11.0, 22.0, 28.0),
    ('body_water_pct', NULL, 50.0, 65.0, NULL),
    ('muscle_pct',     NULL, 33.0, 40.0, NULL),
    ('bone_mass_pct',  NULL,  3.0,  5.0, NULL)
) AS v(slug, orange_min, green_min, green_max, orange_max)
JOIN markers m ON m.marker_slug = v.slug
WHERE NOT EXISTS (
    SELECT 1 FROM reference_ranges rr
    WHERE rr.marker_id = m.id AND rr.protocol_context = 'standard' AND rr.user_id IS NULL
);

-- Add descriptions for body composition markers
-- marker_content.marker_id is VARCHAR(50) storing the marker slug, not UUID
INSERT INTO marker_content (id, marker_id, content_type, title, body_text, display_order)
SELECT gen_random_uuid(), v.slug, 'description', v.title, v.body, 1
FROM (VALUES
    ('body_fat_pct',   'What is Body Fat Percentage?',
     'Body fat percentage measures the proportion of your total body weight that is adipose (fat) tissue. It is a more meaningful indicator of health than weight alone, as it distinguishes between fat mass and lean mass. Values are typically measured using bioelectrical impedance scales like the Qardiobase 2.'),
    ('body_water_pct', 'What is Body Water Percentage?',
     'Body water percentage indicates how much of your total body weight is water. Adequate hydration is essential for cellular function, temperature regulation, and nutrient transport. Dehydration or overhydration both affect this reading. Bioelectrical impedance scales estimate this by measuring how electrical current passes through body tissues.'),
    ('muscle_pct',     'What is Muscle Mass Percentage?',
     'Muscle mass percentage reflects the proportion of your body weight made up of skeletal muscle tissue. Higher muscle mass is associated with better metabolic health, insulin sensitivity, and physical function. Resistance training and adequate protein intake help maintain and build muscle mass.'),
    ('bone_mass_pct',  'What is Bone Mass Percentage?',
     'Bone mass percentage indicates the proportion of your body weight attributed to bone mineral content. Healthy bone density is crucial for preventing fractures and osteoporosis. Weight-bearing exercise, vitamin D, and adequate calcium intake support bone health.')
) AS v(slug, title, body)
WHERE NOT EXISTS (
    SELECT 1 FROM marker_content mc
    WHERE mc.marker_id = v.slug AND mc.content_type = 'description'
);
