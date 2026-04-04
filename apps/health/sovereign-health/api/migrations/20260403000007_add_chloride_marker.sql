-- Add chloride marker (common electrolyte on lab reports)
-- LOINC: 2075-0 (Chloride [Moles/volume] in Serum or Plasma)

INSERT INTO markers (
    id, marker_slug, marker_name, unit_canonical, source_type,
    zone_id, display_order, loinc_code, loinc_system, loinc_class, created_at
)
SELECT
    gen_random_uuid(), 'chloride', 'Chloride', 'mmol/L', 'lab',
    z.id, 100, '2075-0', 'Serum', 'CHEM', now()
FROM zones z WHERE z.zone_slug = 'detoxification'
ON CONFLICT DO NOTHING;

-- Reference ranges: 96-106 mmol/L
INSERT INTO reference_ranges (id, marker_id, protocol_context, green_min, green_max, orange_min, orange_max)
SELECT gen_random_uuid(), mk.id, 'standard', 96.0, 106.0, 90.0, 110.0
FROM markers mk WHERE mk.marker_slug = 'chloride'
ON CONFLICT DO NOTHING;

-- i18n
INSERT INTO marker_translations (marker_id, locale, name, description)
SELECT mk.id, 'en', 'Chloride', 'Chloride is an electrolyte that helps maintain fluid balance and acid-base equilibrium.'
FROM markers mk WHERE mk.marker_slug = 'chloride'
ON CONFLICT DO NOTHING;

INSERT INTO marker_translations (marker_id, locale, name, description)
SELECT mk.id, 'de', 'Chlorid', 'Chlorid ist ein Elektrolyt, das den Flüssigkeitshaushalt und das Säure-Basen-Gleichgewicht reguliert.'
FROM markers mk WHERE mk.marker_slug = 'chloride'
ON CONFLICT DO NOTHING;
