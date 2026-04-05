-- Migration: Full-text search index for global search
-- Creates search_index (public content) and user_search_index (per-user content),
-- then seeds search_index from all source tables for both EN and DE locales.

-- ── 1. Public search index ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    title TEXT NOT NULL,
    subtitle TEXT,
    snippet TEXT,
    url_path TEXT,
    external_url TEXT,
    category_weight NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    tsv_document tsvector NOT NULL,
    metadata JSONB,
    parent_marker_slug VARCHAR(50),
    requires_auth BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(entity_type, entity_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_search_index_tsv ON search_index USING GIN (tsv_document);
CREATE INDEX IF NOT EXISTS idx_search_index_entity_type ON search_index (entity_type);
CREATE INDEX IF NOT EXISTS idx_search_index_locale ON search_index (locale);
CREATE INDEX IF NOT EXISTS idx_search_index_parent_marker ON search_index (parent_marker_slug);
CREATE INDEX IF NOT EXISTS idx_search_index_requires_auth ON search_index (requires_auth);

-- ── 2. Per-user search index ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(30) NOT NULL,
    entity_id UUID NOT NULL,
    title TEXT NOT NULL,
    snippet TEXT,
    url_path TEXT,
    tsv_document tsvector NOT NULL,
    source_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_search_index_tsv ON user_search_index USING GIN (tsv_document);
CREATE INDEX IF NOT EXISTS idx_user_search_index_user ON user_search_index (user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_index_type_user ON user_search_index (entity_type, user_id);

-- ── 3. Seed: Markers (weight 1.5) ──────────────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, subtitle, snippet, url_path, category_weight, tsv_document, metadata, parent_marker_slug)
SELECT 'marker', m.marker_slug, mt.locale, mt.name,
  (SELECT zt.name FROM zone_translations zt
   JOIN zones z ON z.id = zt.zone_id
   JOIN zone_markers zm ON zm.zone_slug = z.zone_slug
   WHERE zm.marker_slug = m.marker_slug AND zt.locale = mt.locale LIMIT 1),
  COALESCE(mt.description, mt.tooltip, ''),
  '/markers/' || m.marker_slug,
  1.5,
  setweight(to_tsvector(CASE WHEN mt.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(mt.name, '')), 'A') ||
  setweight(to_tsvector(CASE WHEN mt.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(mt.description, '') || ' ' || COALESCE(mt.tooltip, '')), 'B') ||
  setweight(to_tsvector(CASE WHEN mt.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(mt.why_it_matters, '') || ' ' || COALESCE(mt.when_to_worry, '')), 'C'),
  jsonb_build_object('source_type', m.source_type, 'unit_canonical', m.unit_canonical, 'loinc_code', m.loinc_code, 'zone_id', m.zone_id::text),
  m.marker_slug
FROM markers m
JOIN marker_translations mt ON mt.marker_id = m.id
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 4. Seed: Calculated markers (weight 1.5) ───────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, subtitle, snippet, url_path, category_weight, tsv_document, metadata)
SELECT 'calculated_marker', cm.marker_slug, t.locale,
  COALESCE(t.name, cm.marker_name),
  (SELECT zt.name FROM zone_translations zt
   JOIN zones z ON z.id = zt.zone_id
   JOIN zone_markers zm ON zm.zone_slug = z.zone_slug
   WHERE zm.marker_slug = cm.marker_slug AND zt.locale = t.locale LIMIT 1),
  cm.formula_description,
  '/markers/' || cm.marker_slug,
  1.5,
  setweight(to_tsvector(CASE WHEN t.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(t.name, cm.marker_name, '')), 'A') ||
  setweight(to_tsvector(CASE WHEN t.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(cm.formula_description, '')), 'B') ||
  setweight(to_tsvector(CASE WHEN t.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(t.description, '')), 'C'),
  jsonb_build_object('source_type', cm.source_type, 'base_markers', cm.base_markers_required, 'formula', cm.formula_description)
FROM calculated_markers cm
LEFT JOIN marker_translations t ON t.marker_id = cm.id
WHERE t.locale IS NOT NULL
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 5. Seed: Zones (weight 1.3) ────────────────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, url_path, category_weight, tsv_document)
SELECT 'zone', z.zone_slug, zt.locale, zt.name,
  COALESCE(zt.short_description, zt.description, ''),
  '/dashboard#' || z.zone_slug,
  1.3,
  setweight(to_tsvector(CASE WHEN zt.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(zt.name, '')), 'A') ||
  setweight(to_tsvector(CASE WHEN zt.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(zt.description, '') || ' ' || COALESCE(zt.short_description, '')), 'B')
FROM zones z
JOIN zone_translations zt ON zt.zone_id = z.id
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, updated_at = now();

-- ── 6. Seed: Marker content tiles (weight 1.0) ─────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, url_path, category_weight, tsv_document, parent_marker_slug)
SELECT 'content', mc.marker_id || '-' || mc.content_type, mc.language, mc.title,
  LEFT(mc.body_text, 300),
  '/markers/' || mc.marker_id || '#' || mc.content_type,
  1.0,
  setweight(to_tsvector(CASE WHEN mc.language = 'de' THEN 'german' ELSE 'english' END, COALESCE(mc.title, '')), 'A') ||
  setweight(to_tsvector(CASE WHEN mc.language = 'de' THEN 'german' ELSE 'english' END, COALESCE(mc.body_text, '')), 'B'),
  mc.marker_id
FROM marker_content mc
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, parent_marker_slug = EXCLUDED.parent_marker_slug, updated_at = now();

-- ── 7. Seed: Foods -- English (weight 1.2) ──────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, url_path, category_weight, tsv_document, metadata, parent_marker_slug)
SELECT 'food', mf.id::text, 'en', mf.food_name,
  '/markers/' || mf.marker_id || '#foods',
  1.2,
  setweight(to_tsvector('english', COALESCE(mf.food_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(mf.food_category, '')), 'B'),
  jsonb_build_object('food_category', mf.food_category),
  mf.marker_id
FROM marker_foods mf
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 7b. Seed: Foods -- German (weight 1.2) ──────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, url_path, category_weight, tsv_document, metadata, parent_marker_slug)
SELECT 'food', mf.id::text, 'de', mf.food_name_de,
  '/markers/' || mf.marker_id || '#foods',
  1.2,
  setweight(to_tsvector('german', COALESCE(mf.food_name_de, '')), 'A') ||
  setweight(to_tsvector('german', COALESCE(mf.food_category, '')), 'B'),
  jsonb_build_object('food_category', mf.food_category),
  mf.marker_id
FROM marker_foods mf
WHERE mf.food_name_de IS NOT NULL
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 8. Seed: Supplements -- English (weight 1.2) ────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
SELECT 'supplement', ms.id::text, 'en', ms.supplement_name,
  ms.notes,
  1.2,
  setweight(to_tsvector('english', COALESCE(ms.supplement_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(ms.typical_dose, '') || ' ' || COALESCE(ms.notes, '')), 'B'),
  jsonb_build_object('typical_dose', ms.typical_dose),
  ms.marker_id
FROM marker_supplements ms
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 8b. Seed: Supplements -- German (weight 1.2) ────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
SELECT 'supplement', ms.id::text, 'de', ms.supplement_name_de,
  ms.notes,
  1.2,
  setweight(to_tsvector('german', COALESCE(ms.supplement_name_de, '')), 'A') ||
  setweight(to_tsvector('german', COALESCE(ms.typical_dose, '') || ' ' || COALESCE(ms.notes, '')), 'B'),
  jsonb_build_object('typical_dose', ms.typical_dose),
  ms.marker_id
FROM marker_supplements ms
WHERE ms.supplement_name_de IS NOT NULL
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 9. Seed: Lab tests -- English (weight 0.9) ─────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
SELECT 'lab_test', mt.id::text, 'en', mt.test_name,
  mt.notes,
  0.9,
  setweight(to_tsvector('english', COALESCE(mt.test_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(mt.panel_name, '') || ' ' || COALESCE(mt.notes, '')), 'B'),
  jsonb_build_object('panel_name', mt.panel_name),
  mt.marker_id
FROM marker_tests mt
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 9b. Seed: Lab tests -- German (weight 0.9) ─────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
SELECT 'lab_test', mt.id::text, 'de', mt.test_name_de,
  mt.notes,
  0.9,
  setweight(to_tsvector('german', COALESCE(mt.test_name_de, '')), 'A') ||
  setweight(to_tsvector('german', COALESCE(mt.panel_name, '') || ' ' || COALESCE(mt.notes, '')), 'B'),
  jsonb_build_object('panel_name', mt.panel_name),
  mt.marker_id
FROM marker_tests mt
WHERE mt.test_name_de IS NOT NULL
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 10. Seed: References (weight 0.8) ───────────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata, parent_marker_slug)
SELECT 'reference', mr.id::text, 'en', mr.title,
  mr.source,
  0.8,
  setweight(to_tsvector('english', COALESCE(mr.title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(mr.source, '')), 'B'),
  jsonb_build_object('year', mr.year, 'url', mr.url),
  mr.marker_id
FROM marker_references mr
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 11. Seed: Relations (weight 1.0) ────────────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata)
SELECT 'relation', mr.id::text, 'en',
  mr.marker_slug_a || ' <-> ' || mr.marker_slug_b,
  mr.description,
  1.0,
  setweight(to_tsvector('english', COALESCE(mr.marker_slug_a, '') || ' ' || COALESCE(mr.marker_slug_b, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(mr.description, '')), 'B'),
  jsonb_build_object('marker_slug_a', mr.marker_slug_a, 'marker_slug_b', mr.marker_slug_b, 'direction', mr.direction, 'clinical_significance', mr.clinical_significance)
FROM marker_relations mr
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 12. Seed: Protocol effects (weight 0.7) ────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document, metadata)
SELECT 'protocol_effect', pe.id::text, 'en',
  pe.protocol_name || ' - ' || pe.marker_slug,
  pe.detail,
  0.7,
  setweight(to_tsvector('english', COALESCE(pe.protocol_name, '') || ' ' || COALESCE(pe.marker_slug, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(pe.detail, '')), 'B'),
  jsonb_build_object('protocol_slug', pe.protocol_slug, 'marker_slug', pe.marker_slug, 'effect', pe.effect)
FROM protocol_effects pe
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, metadata = EXCLUDED.metadata, updated_at = now();

-- ── 13. Seed: Web content (weight 0.5) ──────────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, external_url, category_weight, tsv_document)
SELECT 'web_content', wct.id::text, wct.locale,
  wcs.key,
  LEFT(wct.value, 300),
  'https://sovereignhealth.io/' || wp.slug,
  0.5,
  to_tsvector(CASE WHEN wct.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(wct.value, ''))
FROM web_content_translations wct
JOIN web_content_sections wcs ON wcs.id = wct.section_id
JOIN web_pages wp ON wp.id = wcs.page_id
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet, external_url = EXCLUDED.external_url,
  tsv_document = EXCLUDED.tsv_document, updated_at = now();

-- ── 14. Seed: Diet protocols (weight 0.8) ───────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document)
SELECT 'diet_protocol', dp.slug, dpt.locale, dpt.name,
  COALESCE(dpt.short_description, dpt.long_description, ''),
  0.8,
  setweight(to_tsvector(CASE WHEN dpt.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(dpt.name, '')), 'A') ||
  setweight(to_tsvector(CASE WHEN dpt.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(dpt.short_description, '') || ' ' || COALESCE(dpt.long_description, '')), 'B')
FROM diet_protocols dp
JOIN diet_protocol_translations dpt ON dpt.protocol_id = dp.id
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, updated_at = now();

-- ── 15. Seed: Eating patterns (weight 0.8) ──────────────────────────────────────

INSERT INTO search_index (entity_type, entity_id, locale, title, snippet, category_weight, tsv_document)
SELECT 'eating_pattern', ep.slug, ept.locale, ept.name,
  ept.description,
  0.8,
  setweight(to_tsvector(CASE WHEN ept.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(ept.name, '')), 'A') ||
  setweight(to_tsvector(CASE WHEN ept.locale = 'de' THEN 'german' ELSE 'english' END, COALESCE(ept.description, '')), 'B')
FROM eating_patterns ep
JOIN eating_pattern_translations ept ON ept.pattern_id = ep.id
ON CONFLICT (entity_type, entity_id, locale) DO UPDATE SET
  title = EXCLUDED.title, snippet = EXCLUDED.snippet,
  tsv_document = EXCLUDED.tsv_document, updated_at = now();
