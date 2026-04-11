-- Per-org app enablement (#0393)
-- Each organization can have a configurable list of enabled apps.
--
-- Sprint 041 #491 hardening: wrapped in a defensive guard so the entire
-- body no-ops when brickos.organizations does not exist yet (cold-boot
-- dev DB before the bootstrap migration runs). The bootstrap migration
-- 20260411000001_bootstrap_brickos_schema_for_dev.sql creates the same
-- table and seeds the same rows, so the result is identical regardless
-- of which path applies first.

DO $outer$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'brickos' AND table_name = 'organizations') THEN
        EXECUTE $sql$
            CREATE TABLE IF NOT EXISTS brickos.org_apps (
                org_id UUID NOT NULL REFERENCES brickos.organizations(id) ON DELETE CASCADE,
                app_key VARCHAR(50) NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (org_id, app_key)
            );

            INSERT INTO brickos.org_apps (org_id, app_key, enabled)
            SELECT id, 'sovereign-health', true FROM brickos.organizations
            ON CONFLICT (org_id, app_key) DO NOTHING;

            INSERT INTO brickos.org_apps (org_id, app_key, enabled)
            VALUES ('00000000-0000-0000-0000-000000000000', 'sovereign-link', true)
            ON CONFLICT (org_id, app_key) DO NOTHING;
        $sql$;
    END IF;
END $outer$;
