-- Sovereign CRM: Core entity tables
-- All tables org-scoped (org_id NOT NULL, no FK to platform DB)
-- PII fields (email, phone, notes) stored as encrypted text by app layer

CREATE TABLE IF NOT EXISTS crm_contacts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            UUID NOT NULL,
    email             TEXT,
    name              TEXT NOT NULL,
    phone             TEXT,
    role              TEXT,
    notes             TEXT,
    lead_stage        TEXT NOT NULL DEFAULT 'new',
    first_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen         TIMESTAMPTZ NOT NULL DEFAULT now(),
    interaction_count INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_org ON crm_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org_email ON crm_contacts(org_id, email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_org_name ON crm_contacts(org_id, name);

CREATE TABLE IF NOT EXISTS crm_companies (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            UUID NOT NULL,
    name              TEXT NOT NULL,
    domain            TEXT,
    website           TEXT,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_crm_companies_org ON crm_companies(org_id);

CREATE TABLE IF NOT EXISTS crm_projects (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id            UUID NOT NULL,
    name              TEXT NOT NULL,
    description       TEXT,
    color             TEXT NOT NULL DEFAULT '#6366f1',
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_projects_org ON crm_projects(org_id);

-- M:N junction: contacts belong to companies with role history
CREATE TABLE IF NOT EXISTS crm_contact_company (
    contact_id        UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    company_id        UUID NOT NULL REFERENCES crm_companies(id) ON DELETE CASCADE,
    role_title        TEXT,
    is_primary        BOOLEAN NOT NULL DEFAULT false,
    started_at        TIMESTAMPTZ,
    ended_at          TIMESTAMPTZ,
    PRIMARY KEY (contact_id, company_id)
);

-- M:N junction: contacts assigned to projects
CREATE TABLE IF NOT EXISTS crm_contact_project (
    contact_id        UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    project_id        UUID NOT NULL REFERENCES crm_projects(id) ON DELETE CASCADE,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (contact_id, project_id)
);
