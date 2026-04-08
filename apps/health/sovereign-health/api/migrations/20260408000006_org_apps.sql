-- Per-org app enablement (#0393)
-- Each organization can have a configurable list of enabled apps.

CREATE TABLE IF NOT EXISTS brickos.org_apps (
    org_id UUID NOT NULL REFERENCES brickos.organizations(id) ON DELETE CASCADE,
    app_key VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (org_id, app_key)
);

-- Seed: enable 'sovereign-health' for all existing orgs
INSERT INTO brickos.org_apps (org_id, app_key, enabled)
SELECT id, 'sovereign-health', true FROM brickos.organizations
ON CONFLICT (org_id, app_key) DO NOTHING;

-- Also enable 'sovereign-link' for the platform org
INSERT INTO brickos.org_apps (org_id, app_key, enabled)
VALUES ('00000000-0000-0000-0000-000000000000', 'sovereign-link', true)
ON CONFLICT (org_id, app_key) DO NOTHING;
