-- Add weight to structural zone (was only in energy_metabolic via zone_markers).
-- Weight belongs in both: energy_metabolic (metabolic burden) + structural (body composition).
INSERT INTO zone_markers (marker_slug, zone_slug, marker_type)
VALUES ('weight', 'structural', 'standard')
ON CONFLICT DO NOTHING;
