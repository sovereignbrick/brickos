-- Migration: Add total_fatty_acids marker
-- LOINC 2571-8: Fatty acids.total [Mass/volume] in Serum or Plasma

INSERT INTO markers (id, marker_slug, marker_name, zone_id, unit_canonical, source_type, display_order,
                     loinc_code, loinc_system, loinc_class)
SELECT gen_random_uuid(), 'total_fatty_acids', 'Total Fatty Acids', z.id, 'mg/L', 'lab', 90,
       '2571-8', 'Serum', 'CHEM'
FROM zones z WHERE z.zone_slug = 'nutritional'
ON CONFLICT (marker_slug) DO NOTHING;

INSERT INTO zone_markers (zone_slug, marker_slug, marker_type, display_order) VALUES
('nutritional', 'total_fatty_acids', 'standard', 25)
ON CONFLICT (zone_slug, marker_slug) DO NOTHING;
