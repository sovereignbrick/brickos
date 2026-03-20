-- Sprint 004: Sync marker_translations from marker_content
--
-- marker_content has rich EN + DE content (description, what_is, etc.)
-- marker_translations (used by admin panel) has names but empty description/tooltip/why fields.
-- This migration populates marker_translations from marker_content so the admin panel
-- shows existing content and allows editing.

-- Populate EN descriptions from marker_content.description where marker_translations.description is empty
UPDATE marker_translations mt
SET description = mc.body_text,
    updated_at = NOW()
FROM markers m, marker_content mc
WHERE mt.marker_id = m.id
  AND mc.marker_id = m.marker_slug
  AND mc.language = mt.locale
  AND mc.content_type = 'description'
  AND (mt.description IS NULL OR mt.description = '');

-- Populate tooltip from marker_content.what_is where marker_translations.tooltip is empty
UPDATE marker_translations mt
SET tooltip = mc.body_text,
    updated_at = NOW()
FROM markers m, marker_content mc
WHERE mt.marker_id = m.id
  AND mc.marker_id = m.marker_slug
  AND mc.language = mt.locale
  AND mc.content_type = 'what_is'
  AND (mt.tooltip IS NULL OR mt.tooltip = '');

-- Populate why_it_matters from marker_content.health_facts
UPDATE marker_translations mt
SET why_it_matters = mc.body_text,
    updated_at = NOW()
FROM markers m, marker_content mc
WHERE mt.marker_id = m.id
  AND mc.marker_id = m.marker_slug
  AND mc.language = mt.locale
  AND mc.content_type = 'health_facts'
  AND (mt.why_it_matters IS NULL OR mt.why_it_matters = '');

-- Populate when_to_worry from marker_content.how_to_stay_in_range
UPDATE marker_translations mt
SET when_to_worry = mc.body_text,
    updated_at = NOW()
FROM markers m, marker_content mc
WHERE mt.marker_id = m.id
  AND mc.marker_id = m.marker_slug
  AND mc.language = mt.locale
  AND mc.content_type = 'how_to_stay_in_range'
  AND (mt.when_to_worry IS NULL OR mt.when_to_worry = '');
