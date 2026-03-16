-- M03: Health zones — the 8 functional categories that group all markers.
-- Seed data is inline; ON CONFLICT (zone_slug) makes this idempotent.

CREATE TABLE IF NOT EXISTS zones (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_slug    TEXT        NOT NULL UNIQUE,
    zone_name    TEXT        NOT NULL,
    zone_icon    TEXT        NOT NULL,
    zone_color   TEXT        NOT NULL,   -- hex colour used in UI
    display_order INT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: 8 health zones
INSERT INTO zones (id, zone_slug, zone_name, zone_icon, zone_color, display_order) VALUES
    (gen_random_uuid(), 'energy_metabolic',  'Energy & Metabolic',    '⚡', '#FF9500', 1),
    (gen_random_uuid(), 'structural',         'Structural',            '💪', '#2196F3', 2),
    (gen_random_uuid(), 'cardiovascular',     'Cardiovascular',        '🫀', '#E91E63', 3),
    (gen_random_uuid(), 'cognitive',          'Cognitive',             '🧠', '#7C4DFF', 4),
    (gen_random_uuid(), 'immune',             'Immune',                '🛡️', '#009688', 5),
    (gen_random_uuid(), 'detoxification',     'Detoxification',        '🔄', '#00BCD4', 6),
    (gen_random_uuid(), 'hormonal',           'Hormonal',              '🎯', '#AB47BC', 7),
    (gen_random_uuid(), 'nutritional',        'Nutritional',           '🌱', '#8BC34A', 8)
ON CONFLICT (zone_slug) DO NOTHING;
