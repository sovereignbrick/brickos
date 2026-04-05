-- Fix web content external URLs to use actual website page URLs from sitemap.
-- Maps DB page slugs to real website paths and resolves known section keys
-- to their dedicated pages (e.g., footer_privacy -> /privacy/).

-- Map page slug "homepage" -> root "/"
UPDATE search_index
SET external_url = 'https://sovereignhealth.io/'
WHERE entity_type = 'web_content'
  AND external_url LIKE '%/homepage#%';

-- Map page slug "homepage" without anchor
UPDATE search_index
SET external_url = 'https://sovereignhealth.io/'
WHERE entity_type = 'web_content'
  AND external_url = 'https://sovereignhealth.io/homepage';

-- Fix known section keys that map to dedicated pages
UPDATE search_index
SET external_url = 'https://sovereignhealth.io/privacy/'
WHERE entity_type = 'web_content'
  AND (external_url LIKE '%footer_privacy%' OR title ILIKE '%privacy policy%' OR title ILIKE '%Datenschutz%');

UPDATE search_index
SET external_url = 'https://sovereignhealth.io/terms/'
WHERE entity_type = 'web_content'
  AND (external_url LIKE '%footer_terms%' OR title ILIKE '%terms of%' OR title ILIKE '%Nutzungsbedingungen%');

UPDATE search_index
SET external_url = 'https://sovereignhealth.io/impressum/'
WHERE entity_type = 'web_content'
  AND (external_url LIKE '%footer_impressum%' OR title ILIKE '%impressum%' OR title ILIKE '%imprint%');

-- Map other known page slugs to their actual website paths
UPDATE search_index
SET external_url = REPLACE(external_url, '/features#', '/features/#')
WHERE entity_type = 'web_content'
  AND external_url LIKE '%/features#%';

UPDATE search_index
SET external_url = REPLACE(external_url, '/pricing#', '/pricing/#')
WHERE entity_type = 'web_content'
  AND external_url LIKE '%/pricing#%';

UPDATE search_index
SET external_url = REPLACE(external_url, '/about#', '/about/#')
WHERE entity_type = 'web_content'
  AND external_url LIKE '%/about#%';

-- Ensure trailing slash on page-level URLs (website convention)
UPDATE search_index
SET external_url = REPLACE(external_url, '/open-source#', '/open-source/#')
WHERE entity_type = 'web_content'
  AND external_url LIKE '%/open-source#%';
