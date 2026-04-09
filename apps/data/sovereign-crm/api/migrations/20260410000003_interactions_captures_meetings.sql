-- Sovereign CRM: Interactions, captures, meetings
-- Phase 2+3 tables for the camera-to-CRM pipeline and meeting intelligence
-- Note: FK constraints omitted intentionally -- app-layer enforces integrity,
-- and cross-schema FKs cause issues with sqlx migrate.

-- Interactions: immutable records of communication events
CREATE TABLE IF NOT EXISTS crm_interactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    contact_id          UUID,
    interaction_type    TEXT NOT NULL,
    subject             TEXT,
    body                TEXT,
    source_type         TEXT,
    source_image_ref    TEXT,
    ai_provider         TEXT,
    ai_model            TEXT,
    processing_ms       INTEGER,
    project_id          UUID,
    interaction_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_org ON crm_interactions(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_contact ON crm_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_project ON crm_interactions(project_id);

-- Captures: quick ingestion inbox (photo, audio, text, file)
CREATE TABLE IF NOT EXISTS crm_captures (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    user_id             UUID NOT NULL,
    capture_type        TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending',
    image_encrypted     TEXT,
    audio_encrypted     TEXT,
    text_content        TEXT,
    extracted_text      TEXT,
    project_id          UUID,
    processing_metadata JSONB,
    error_message       TEXT,
    attempts            INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_captures_org ON crm_captures(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_captures_status ON crm_captures(org_id, status);

-- Meetings: recorded and transcribed events
CREATE TABLE IF NOT EXISTS crm_meetings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    title               TEXT NOT NULL,
    project_id          UUID,
    summary             TEXT,
    transcript          TEXT,
    audio_blob_ref      TEXT,
    duration_secs       INTEGER,
    status              TEXT NOT NULL DEFAULT 'draft',
    recorded_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_meetings_org ON crm_meetings(org_id);

-- Meeting attendees (M:N)
CREATE TABLE IF NOT EXISTS crm_meeting_attendees (
    meeting_id          UUID NOT NULL,
    contact_id          UUID NOT NULL,
    PRIMARY KEY (meeting_id, contact_id)
);

-- Action items extracted from meetings
CREATE TABLE IF NOT EXISTS crm_action_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    meeting_id          UUID,
    assignee_contact_id UUID,
    description         TEXT NOT NULL,
    due_date            DATE,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_action_items_meeting ON crm_action_items(meeting_id);

-- Smart lists: saved filters
CREATE TABLE IF NOT EXISTS crm_smart_lists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    name                TEXT NOT NULL,
    filter_spec         JSONB NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_smart_lists_org ON crm_smart_lists(org_id);

-- Enrichment cache: web profile lookups
CREATE TABLE IF NOT EXISTS crm_enrichment_cache (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type         TEXT NOT NULL,
    entity_id           UUID NOT NULL,
    linkedin_url        TEXT,
    github_url          TEXT,
    nostr_nip05         TEXT,
    website_url         TEXT,
    ai_summary          TEXT,
    cached_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(entity_type, entity_id)
);

-- Ingestion log: append-only audit trail
CREATE TABLE IF NOT EXISTS crm_ingestion_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL,
    user_id             UUID NOT NULL,
    source_type         TEXT NOT NULL,
    contacts_created    INTEGER NOT NULL DEFAULT 0,
    contacts_enriched   INTEGER NOT NULL DEFAULT 0,
    companies_created   INTEGER NOT NULL DEFAULT 0,
    ai_provider         TEXT,
    ai_model            TEXT,
    processing_ms       INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add lightning_address to contacts (Phase 6)
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS lightning_address TEXT;
