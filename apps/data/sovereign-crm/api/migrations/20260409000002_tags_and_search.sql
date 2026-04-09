-- Sovereign CRM: Universal tagging + full-text search
-- Tags are first-class objects, polymorphic across all entity types
-- Search uses PostgreSQL tsvector (SHI pattern, bilingual EN/DE)

CREATE TABLE IF NOT EXISTS crm_tags (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            UUID NOT NULL,
    name              TEXT NOT NULL,
    color             TEXT,
    usage_count       INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_crm_tags_org ON crm_tags(org_id);

CREATE TABLE IF NOT EXISTS crm_taggings (
    tag_id            UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
    entity_type       TEXT NOT NULL,
    entity_id         UUID NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tag_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_taggings_entity ON crm_taggings(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS crm_search_index (
    entity_type       TEXT NOT NULL,
    entity_id         UUID NOT NULL,
    org_id            UUID NOT NULL,
    locale            TEXT NOT NULL DEFAULT 'en',
    title             TEXT NOT NULL,
    subtitle          TEXT,
    snippet           TEXT,
    url_path          TEXT NOT NULL,
    category_weight   REAL NOT NULL DEFAULT 1.0,
    tsv_document      tsvector NOT NULL,
    metadata          JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(entity_type, entity_id, org_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_crm_search_tsv ON crm_search_index USING GIN(tsv_document);
CREATE INDEX IF NOT EXISTS idx_crm_search_org ON crm_search_index(org_id, entity_type);
