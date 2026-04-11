-- Create a service account for Sovereign Voice to call Sovereign Link API.
-- The API key is generated and stored hashed; the plaintext must be
-- configured in the Voice .env as SOVEREIGN_LINK_API_KEY.
--
-- Sprint 041 #491 hardening: this migration is wrapped in a defensive
-- guard so it no-ops when brickos.service_accounts does not exist yet
-- (cold-boot dev DB before the bootstrap migration runs). The same
-- INSERT is also performed by the bootstrap migration
-- 20260411000001_bootstrap_brickos_schema_for_dev.sql so the row ends
-- up present regardless of which path applies first.

DO $outer$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'brickos' AND table_name = 'service_accounts') THEN
        EXECUTE $sql$
            INSERT INTO brickos.service_accounts (
                id, name, display_name, org_id, api_key_hash, scopes,
                rate_limit_daily, is_active, created_by
            )
            VALUES (
                'a0000000-0000-0000-0000-000000000001',
                'sovereign-voice',
                'Sovereign Voice NOSTR Scheduler',
                '00000000-0000-0000-0000-000000000000',
                'pending_setup',
                '{"links:create", "links:read"}',
                1000,
                true,
                NULL
            )
            ON CONFLICT (name) DO NOTHING;
        $sql$;
    END IF;
END $outer$;
