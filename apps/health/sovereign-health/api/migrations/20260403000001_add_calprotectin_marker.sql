-- Add calprotectin marker (fecal inflammation marker, common on German lab reports)
-- Zone: immune (inflammation marker)
-- LOINC: 53796-5 (Calprotectin [Mass/volume] in Stool)

INSERT INTO markers (
    id, marker_slug, marker_name, unit_canonical, source_type,
    zone_id, display_order, loinc_code, loinc_system, loinc_class,
    created_at
)
SELECT
    gen_random_uuid(),
    'calprotectin',
    'Calprotectin',
    'µg/g',
    'lab',
    z.id,
    99,
    '53796-5',
    'Stool',
    'CHEM',
    now()
FROM zones z
WHERE z.zone_slug = 'immune'
ON CONFLICT DO NOTHING;

-- Reference ranges: <50 µg/g normal, 50-200 borderline, >200 elevated
INSERT INTO reference_ranges (
    id, marker_id, protocol_context,
    green_min, green_max, orange_min, orange_max
)
SELECT
    gen_random_uuid(),
    mk.id,
    'standard',
    0.0,    -- green_min
    50.0,   -- green_max
    50.0,   -- orange_min (borderline)
    200.0   -- orange_max (above = red)
FROM markers mk
WHERE mk.marker_slug = 'calprotectin'
ON CONFLICT DO NOTHING;

-- i18n: marker_translations
INSERT INTO marker_translations (id, marker_id, locale, name, description, created_at)
SELECT gen_random_uuid(), mk.id, 'en', 'Calprotectin', 'Fecal calprotectin — inflammation marker for intestinal health', now()
FROM markers mk WHERE mk.marker_slug = 'calprotectin'
ON CONFLICT DO NOTHING;

INSERT INTO marker_translations (id, marker_id, locale, name, description, created_at)
SELECT gen_random_uuid(), mk.id, 'de', 'Calprotectin', 'Fäkales Calprotectin — Entzündungsmarker für die Darmgesundheit', now()
FROM markers mk WHERE mk.marker_slug = 'calprotectin'
ON CONFLICT DO NOTHING;
