-- Remove embedded abbreviations from marker_translations.name
-- where the abbreviation already exists in markers.abbreviation.
-- e.g. "Ketone (BHB)" → "Ketone" since abbreviation = "BHB"

UPDATE marker_translations mt
SET name = TRIM(REGEXP_REPLACE(mt.name, '\s*\(' || m.abbreviation || '\)\s*$', '')),
    updated_at = NOW()
FROM markers m
WHERE mt.marker_id = m.id
  AND m.abbreviation IS NOT NULL
  AND mt.name LIKE '%(' || m.abbreviation || ')%';

-- Remove misleading "Wt" abbreviation from body weight marker
UPDATE markers SET abbreviation = NULL WHERE marker_slug = 'weight' AND abbreviation = 'Wt';
