-- Fix web content search index: use actual content as title (not raw key),
-- and add section anchor to external_url for deep linking.

UPDATE search_index si
SET
  title = LEFT(wct.value, 100),
  snippet = LEFT(wct.value, 300),
  external_url = 'https://sovereignhealth.io/' || wp.slug || '#' || wcs.key,
  updated_at = now()
FROM web_content_translations wct
JOIN web_content_sections wcs ON wcs.id = wct.section_id
JOIN web_pages wp ON wp.id = wcs.page_id
WHERE si.entity_type = 'web_content'
  AND si.entity_id = wct.id::text
  AND si.locale = wct.locale;

-- Also add url_path for relation results so they link to one of their markers
UPDATE search_index si
SET
  url_path = '/markers/' || (si.metadata->>'marker_slug_a'),
  updated_at = now()
WHERE si.entity_type = 'relation'
  AND si.url_path IS NULL
  AND si.metadata->>'marker_slug_a' IS NOT NULL;

-- Add url_path for protocol_effect results
UPDATE search_index si
SET
  url_path = '/markers/' || (si.metadata->>'marker_slug'),
  updated_at = now()
WHERE si.entity_type = 'protocol_effect'
  AND si.url_path IS NULL
  AND si.metadata->>'marker_slug' IS NOT NULL;

-- Add url_path for supplement results (link to parent marker)
UPDATE search_index si
SET
  url_path = '/markers/' || si.parent_marker_slug || '#supplements',
  updated_at = now()
WHERE si.entity_type = 'supplement'
  AND si.url_path IS NULL
  AND si.parent_marker_slug IS NOT NULL;

-- Add url_path for reference results
UPDATE search_index si
SET
  url_path = '/markers/' || si.parent_marker_slug || '#references',
  updated_at = now()
WHERE si.entity_type = 'reference'
  AND si.url_path IS NULL
  AND si.parent_marker_slug IS NOT NULL;

-- Add url_path for lab_test results
UPDATE search_index si
SET
  url_path = '/markers/' || si.parent_marker_slug || '#tests',
  updated_at = now()
WHERE si.entity_type = 'lab_test'
  AND si.url_path IS NULL
  AND si.parent_marker_slug IS NOT NULL;
