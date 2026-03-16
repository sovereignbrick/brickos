-- Migration 017: Marker detail page content tables.
-- Schema only — content will be populated in a later migration.
-- All tables use UUID PKs and marker_id as TEXT slug (no FK — covers both
-- markers and calculated_markers tables).

-- ============================================================
-- marker_content: editorial copy per marker (what_is, facts, tips, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS marker_content (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id    VARCHAR(50)  NOT NULL,
    content_type VARCHAR(30)  NOT NULL,
    -- values: 'what_is' | 'did_you_know' | 'health_facts' |
    --         'food_for_thought' | 'fun_facts' | 'how_to_stay_in_range'
    title        VARCHAR(200) NOT NULL,
    body_text    TEXT         NOT NULL,
    language     VARCHAR(5)   NOT NULL DEFAULT 'en',
    display_order INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(marker_id, content_type, language)
);

CREATE INDEX IF NOT EXISTS idx_marker_content_marker ON marker_content(marker_id);

-- ============================================================
-- marker_foods: foods that support / improve a marker
-- ============================================================
CREATE TABLE IF NOT EXISTS marker_foods (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id     VARCHAR(50)  NOT NULL,
    food_name     VARCHAR(100) NOT NULL,
    food_name_de  VARCHAR(100),
    image_path    VARCHAR(255),
    food_category VARCHAR(50),
    -- values: 'meat' | 'fish' | 'vegetable' | 'fruit' |
    --         'dairy' | 'legume' | 'grain' | 'nut_seed' | 'herb_spice' | 'other'
    display_order INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marker_foods_marker ON marker_foods(marker_id);

-- ============================================================
-- marker_supplements: supplements relevant to a marker
-- ============================================================
CREATE TABLE IF NOT EXISTS marker_supplements (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id       VARCHAR(50)  NOT NULL,
    supplement_name VARCHAR(100) NOT NULL,
    supplement_name_de VARCHAR(100),
    image_path      VARCHAR(255),
    typical_dose    VARCHAR(100),
    notes           TEXT,
    display_order   INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marker_supplements_marker ON marker_supplements(marker_id);

-- ============================================================
-- marker_tests: lab tests / panels that measure a marker
-- ============================================================
CREATE TABLE IF NOT EXISTS marker_tests (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id     VARCHAR(50)  NOT NULL,
    test_name     VARCHAR(150) NOT NULL,
    test_name_de  VARCHAR(150),
    panel_name    VARCHAR(150),
    notes         TEXT,
    display_order INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marker_tests_marker ON marker_tests(marker_id);
