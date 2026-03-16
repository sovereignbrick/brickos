-- M03: Measurement markers — the 12 biomarkers captured by Fora 6, Qardio, and manual entry.
-- Seed uses subqueries to look up zone_id by slug (safe for any run order after zones migration).

CREATE TABLE IF NOT EXISTS markers (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_slug    TEXT        NOT NULL UNIQUE,
    marker_name    TEXT        NOT NULL,
    zone_id        UUID        NOT NULL REFERENCES zones(id),
    unit_canonical TEXT        NOT NULL,   -- the unit values are stored in
    display_order  INT         NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: 12 markers (Fora 6 + Qardio Arm + Qardiobase + manual tape + lab insulin)
INSERT INTO markers (id, marker_slug, marker_name, zone_id, unit_canonical, display_order)
SELECT gen_random_uuid(), m.marker_slug, m.marker_name, z.id, m.unit_canonical, m.display_order
FROM (VALUES
    -- Fora 6 Connect blood analyser
    ('glucose',             'Glucose',               'energy_metabolic',  'mmol/L',  1),
    ('ketones',             'Ketones',               'energy_metabolic',  'mmol/L',  2),
    ('total_cholesterol',   'Total Cholesterol',     'cardiovascular',    'mmol/L',  3),
    ('uric_acid',           'Uric Acid',             'detoxification',    'µmol/L',  4),
    ('hemoglobin',          'Hemoglobin',            'structural',        'mmol/L',  5),  -- Fora 6 reports in mmol/L
    ('hematocrit',          'Hematocrit',            'structural',        '%',       6),
    -- Qardio Arm blood pressure monitor
    ('bp_systolic',         'BP Systolic',           'cardiovascular',    'mmHg',    7),
    ('bp_diastolic',        'BP Diastolic',          'cardiovascular',    'mmHg',    8),
    ('heart_rate',          'Heart Rate',            'cardiovascular',    'bpm',     9),
    -- Qardiobase 2 scale
    ('weight',              'Weight',                'structural',        'kg',      10),
    -- Manual tape measure
    ('waist_circumference', 'Waist Circumference',   'structural',        'cm',      11),
    -- Lab (enables HOMA-IR calculated marker)
    ('insulin',             'Insulin (Fasting)',     'energy_metabolic',  'µIU/mL',  12)
) AS m(marker_slug, marker_name, zone_slug, unit_canonical, display_order)
JOIN zones z ON z.zone_slug = m.zone_slug
ON CONFLICT (marker_slug) DO NOTHING;
