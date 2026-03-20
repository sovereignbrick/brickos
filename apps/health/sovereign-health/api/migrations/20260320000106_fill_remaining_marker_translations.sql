-- Sprint 004: Fill remaining empty marker_translations fields
--
-- For markers that have description but empty tooltip: copy description to tooltip
-- (tooltip is a short version shown on hover — description serves this purpose)
--
-- For why_it_matters and when_to_worry: only fill from marker_content if available.
-- We cannot auto-generate medical advice — leave empty for admin to fill manually.

-- EN: Copy description to tooltip where tooltip is empty
UPDATE marker_translations
SET tooltip = description,
    updated_at = NOW()
WHERE locale = 'en'
  AND description IS NOT NULL AND description != ''
  AND (tooltip IS NULL OR tooltip = '');

-- DE: Copy description to tooltip where tooltip is empty
UPDATE marker_translations
SET tooltip = description,
    updated_at = NOW()
WHERE locale = 'de'
  AND description IS NOT NULL AND description != ''
  AND (tooltip IS NULL OR tooltip = '');

-- For EN markers that still have no description: use marker_name as minimal content
-- (This ensures the admin panel shows something editable rather than blank)
UPDATE marker_translations mt
SET description = m.display_name || ' — edit this description in the admin panel.',
    tooltip = m.display_name || ' — edit this tooltip in the admin panel.',
    updated_at = NOW()
FROM markers m
WHERE mt.marker_id = m.id
  AND mt.locale = 'en'
  AND (mt.description IS NULL OR mt.description = '');
