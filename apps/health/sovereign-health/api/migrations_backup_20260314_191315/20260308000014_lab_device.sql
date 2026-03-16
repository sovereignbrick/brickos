-- Migration 014: Lab device for catalogue + demo user
-- Adds lab device template (insulin) and manual tape measure

-- Catalogue template: Lab
INSERT INTO devices (user_id, device_name, device_type, status, markers_measured, is_template)
VALUES (NULL, 'Lab', 'lab', 'active', ARRAY['insulin'], true)
ON CONFLICT DO NOTHING;

-- Demo user: Lab XYZ (fixed UUID for idempotency)
INSERT INTO devices (id, user_id, device_name, device_type, status, markers_measured, is_template)
VALUES (
    '00000000-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000001',
    'Lab XYZ', 'lab', 'active', ARRAY['insulin'], false
)
ON CONFLICT (id) DO NOTHING;

-- Demo user: Tape Measure (waist)
INSERT INTO devices (id, user_id, device_name, device_type, status, markers_measured, is_template)
VALUES (
    '00000000-0000-0000-0000-000000000015',
    '00000000-0000-0000-0000-000000000001',
    'Tape Measure', 'manual', 'active', ARRAY['waist_circumference'], false
)
ON CONFLICT (id) DO NOTHING;
