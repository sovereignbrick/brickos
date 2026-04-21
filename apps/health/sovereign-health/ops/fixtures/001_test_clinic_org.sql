-- Sprint 048 #048-01: fixture org for localhost testing.
--
-- Creates the "test-clinic" org with deterministic UUIDs so all
-- subsequent fixtures can reference it. Re-runnable (ON CONFLICT DO
-- NOTHING) so seed can be invoked idempotently.

INSERT INTO organizations (
    id,
    name,
    slug,
    org_type,
    billing_email,
    is_active,
    is_deleted,
    branding,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-4001-a001-000000000001',
    'Test Clinic',
    'test-clinic',
    'clinic',
    'billing@test-clinic.local',
    true,
    false,
    '{"app_name": "Test Clinic", "brand_primary": "#1e40af", "footer_text": "Test Clinic -- localhost"}'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO NOTHING;
