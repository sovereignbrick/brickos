-- Create a service account for Sovereign Voice to call Sovereign Link API.
-- The API key is generated and stored hashed; the plaintext must be
-- configured in the Voice .env as SOVEREIGN_LINK_API_KEY.

INSERT INTO brickos.service_accounts (
    id, name, display_name, org_id, api_key_hash, scopes,
    rate_limit_daily, is_active, created_by
)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'sovereign-voice',
    'Sovereign Voice NOSTR Scheduler',
    '00000000-0000-0000-0000-000000000000', -- BrickOS platform org
    -- Placeholder hash; real key set via admin panel or manual UPDATE
    'pending_setup',
    '{"links:create", "links:read"}',
    1000,
    true,
    NULL
)
ON CONFLICT (name) DO NOTHING;
