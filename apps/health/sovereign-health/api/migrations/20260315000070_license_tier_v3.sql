-- License Tier v3: Rename features, update limits, add influence_factors tables

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Update product_features with renamed features
-- ══════════════════════════════════════════════════════════════════════════════

-- custom_thresholds -> Reference Ranges
UPDATE product_features SET
    name_en = 'Reference Ranges',
    name_de = 'Referenzbereich',
    tooltip_en = 'Set your own reference ranges per marker',
    tooltip_de = 'Eigene Referenzbereiche pro Marker festlegen',
    updated_at = NOW()
WHERE feature_key = 'custom_thresholds';

-- cohort_comparison -> Benchmark
UPDATE product_features SET
    name_en = 'Benchmark',
    name_de = 'Benchmark',
    updated_at = NOW()
WHERE feature_key = 'cohort_comparison';

-- supplement_marker_impact -> Check Influence Factors
UPDATE product_features SET
    name_en = 'Check Influence Factors',
    name_de = 'Check Einflussfaktoren',
    updated_at = NOW()
WHERE feature_key = 'supplement_marker_impact';

-- Add new feature: influence_factors (replacing medications concept)
INSERT INTO product_features (feature_key, name_en, name_de, category, sort_order, status, description_en, description_de)
VALUES (
    'influence_factors',
    'Influence Factors',
    'Einflussfaktoren',
    'data', 55, 'active',
    'Track supplements, medications, and other factors that affect your markers',
    'Nahrungsergaenzungsmittel, Medikamente und andere Einflussfaktoren verfolgen'
)
ON CONFLICT (feature_key) DO NOTHING;

-- Add new feature: influence_factor_import
INSERT INTO product_features (feature_key, name_en, name_de, category, sort_order, status, description_en, description_de)
VALUES (
    'influence_factor_import',
    'Influence Factor Import',
    'Einflussfaktoren-Import',
    'ai', 95, 'active',
    'AI-assisted influence factor list import',
    'KI-gestuetzter Import von Einflussfaktoren'
)
ON CONFLICT (feature_key) DO NOTHING;

-- Seed tier_features for new features
DO $$
DECLARE
  fid UUID;
BEGIN
  -- ── influence_factors ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'influence_factors';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, true,  2,    '2 factors', '2 Faktoren'),
      ('focus',   fid, true,  10,   '10 factors', '10 Faktoren'),
      ('insight', fid, true,  25,   '25 factors', '25 Faktoren'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;

  -- ── influence_factor_import ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'influence_factor_import';
  IF fid IS NOT NULL THEN
    INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de) VALUES
      ('core',    fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('glimpse', fid, false, 0,    NULL, NULL),
      ('focus',   fid, false, 0,    NULL, NULL),
      ('insight', fid, true,  1,    '1/month', '1/Monat'),
      ('clarity', fid, true,  NULL, 'Unlimited', 'Unbegrenzt'),
      ('horizon', fid, true,  NULL, 'Unlimited', 'Unbegrenzt')
    ON CONFLICT (tier_key, feature_id) DO NOTHING;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Update license_tiers limits
-- ══════════════════════════════════════════════════════════════════════════════

-- Glimpse
UPDATE license_tiers SET
    max_markers = 8,
    max_history_days = 30,
    max_calculated_markers = 1,
    max_templates = 1,
    max_medications = 2,
    max_measurements = 100,
    chat_general_monthly = 2,
    updated_at = NOW()
WHERE slug = 'glimpse';

-- Focus
UPDATE license_tiers SET
    max_markers = 20,
    max_history_days = 365,
    max_calculated_markers = 3,
    max_templates = 3,
    max_medications = 10,
    max_measurements = 250,
    chat_general_monthly = 5,
    updated_at = NOW()
WHERE slug = 'focus';

-- Insight
UPDATE license_tiers SET
    max_markers = 50,
    max_history_days = NULL,
    max_calculated_markers = 8,
    max_templates = 5,
    max_medications = 25,
    max_measurements = 500,
    chat_general_monthly = 30,
    updated_at = NOW()
WHERE slug = 'insight';

-- Clarity (all unlimited)
UPDATE license_tiers SET
    max_markers = NULL,
    max_history_days = NULL,
    max_calculated_markers = NULL,
    max_templates = NULL,
    max_medications = NULL,
    max_measurements = NULL,
    chat_general_monthly = NULL,
    updated_at = NOW()
WHERE slug = 'clarity';

-- Also update tier_features labels to match the new limits
DO $$
DECLARE
  fid UUID;
BEGIN
  -- ── markers ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'markers';
  IF fid IS NOT NULL THEN
    UPDATE tier_features SET limit_value = 8,  limit_label_en = '8 markers',  limit_label_de = '8 Marker',   updated_at = NOW() WHERE tier_key = 'glimpse' AND feature_id = fid;
    UPDATE tier_features SET limit_value = 20, limit_label_en = '20 markers', limit_label_de = '20 Marker',  updated_at = NOW() WHERE tier_key = 'focus'   AND feature_id = fid;
    UPDATE tier_features SET limit_value = 50, limit_label_en = '50 markers', limit_label_de = '50 Marker',  updated_at = NOW() WHERE tier_key = 'insight'  AND feature_id = fid;
    UPDATE tier_features SET limit_value = NULL, limit_label_en = 'Unlimited', limit_label_de = 'Unbegrenzt', updated_at = NOW() WHERE tier_key = 'clarity'  AND feature_id = fid;
  END IF;

  -- ── history ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'history';
  IF fid IS NOT NULL THEN
    UPDATE tier_features SET limit_value = 30,  limit_label_en = '30 days',    limit_label_de = '30 Tage',     updated_at = NOW() WHERE tier_key = 'glimpse' AND feature_id = fid;
    UPDATE tier_features SET limit_value = 365, limit_label_en = '365 days',   limit_label_de = '365 Tage',    updated_at = NOW() WHERE tier_key = 'focus'   AND feature_id = fid;
    UPDATE tier_features SET limit_value = NULL, limit_label_en = 'Unlimited', limit_label_de = 'Unbegrenzt',  updated_at = NOW() WHERE tier_key = 'insight'  AND feature_id = fid;
  END IF;

  -- ── calculated_markers ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'calculated_markers';
  IF fid IS NOT NULL THEN
    UPDATE tier_features SET limit_value = 1, limit_label_en = '1 marker',   limit_label_de = '1 Marker',    updated_at = NOW() WHERE tier_key = 'glimpse' AND feature_id = fid;
    UPDATE tier_features SET limit_value = 3, limit_label_en = '3 markers',  limit_label_de = '3 Marker',    updated_at = NOW() WHERE tier_key = 'focus'   AND feature_id = fid;
    UPDATE tier_features SET limit_value = 8, limit_label_en = '8 markers',  limit_label_de = '8 Marker',    updated_at = NOW() WHERE tier_key = 'insight'  AND feature_id = fid;
    UPDATE tier_features SET limit_value = NULL, limit_label_en = 'All 22+', limit_label_de = 'Alle 22+',    updated_at = NOW() WHERE tier_key = 'clarity'  AND feature_id = fid;
  END IF;

  -- ── measurement_templates ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'measurement_templates';
  IF fid IS NOT NULL THEN
    UPDATE tier_features SET limit_value = 1, limit_label_en = '1 template',   limit_label_de = '1 Vorlage',   updated_at = NOW() WHERE tier_key = 'glimpse' AND feature_id = fid;
    UPDATE tier_features SET limit_value = 3, limit_label_en = '3 templates',  limit_label_de = '3 Vorlagen',  updated_at = NOW() WHERE tier_key = 'focus'   AND feature_id = fid;
    UPDATE tier_features SET limit_value = 5, limit_label_en = '5 templates',  limit_label_de = '5 Vorlagen',  updated_at = NOW() WHERE tier_key = 'insight'  AND feature_id = fid;
    UPDATE tier_features SET limit_value = NULL, limit_label_en = 'Unlimited', limit_label_de = 'Unbegrenzt',  updated_at = NOW() WHERE tier_key = 'clarity'  AND feature_id = fid;
  END IF;

  -- ── medications (keep synced with influence_factors) ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'medications';
  IF fid IS NOT NULL THEN
    UPDATE tier_features SET limit_value = 2,  limit_label_en = '2 factors',    limit_label_de = '2 Faktoren',   updated_at = NOW() WHERE tier_key = 'glimpse' AND feature_id = fid;
    UPDATE tier_features SET limit_value = 10, limit_label_en = '10 factors',   limit_label_de = '10 Faktoren',  updated_at = NOW() WHERE tier_key = 'focus'   AND feature_id = fid;
    UPDATE tier_features SET limit_value = 25, limit_label_en = '25 factors',   limit_label_de = '25 Faktoren',  updated_at = NOW() WHERE tier_key = 'insight'  AND feature_id = fid;
    UPDATE tier_features SET limit_value = NULL, limit_label_en = 'Unlimited',  limit_label_de = 'Unbegrenzt',   updated_at = NOW() WHERE tier_key = 'clarity'  AND feature_id = fid;
  END IF;

  -- ── chat_general ──
  SELECT id INTO fid FROM product_features WHERE feature_key = 'chat_general';
  IF fid IS NOT NULL THEN
    UPDATE tier_features SET limit_value = 2,  limit_label_en = '2/month',     limit_label_de = '2/Monat',     updated_at = NOW() WHERE tier_key = 'glimpse' AND feature_id = fid;
    UPDATE tier_features SET limit_value = 5,  limit_label_en = '5/month',     limit_label_de = '5/Monat',     updated_at = NOW() WHERE tier_key = 'focus'   AND feature_id = fid;
    UPDATE tier_features SET limit_value = 30, limit_label_en = '30/month',    limit_label_de = '30/Monat',    updated_at = NOW() WHERE tier_key = 'insight'  AND feature_id = fid;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Create influence_factors and influence_factor_ingredients tables
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS influence_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'supplement',
    factor_type VARCHAR(30) NOT NULL DEFAULT 'medication',
    dosage VARCHAR(50),
    frequency VARCHAR(50),
    form VARCHAR(50),
    timing VARCHAR(50),
    prescriber VARCHAR(200),
    start_date DATE,
    end_date DATE,
    reason TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    source VARCHAR(20) DEFAULT 'manual',
    original_images JSONB,
    ai_extracted_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_influence_factors_user ON influence_factors(user_id);
CREATE INDEX IF NOT EXISTS idx_influence_factors_active ON influence_factors(user_id, is_active);

CREATE TABLE IF NOT EXISTS influence_factor_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    factor_id UUID NOT NULL REFERENCES influence_factors(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    amount VARCHAR(100),
    unit VARCHAR(50),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_influence_factor_ingredients_factor ON influence_factor_ingredients(factor_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Migrate data from user_medications to influence_factors
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO influence_factors (id, user_id, name, category, factor_type, dosage, frequency, form, prescriber, start_date, end_date, reason, notes, is_active, source, original_images, ai_extracted_data, created_at, updated_at)
SELECT
    id,
    user_id,
    COALESCE(name, custom_name, 'Unnamed'),
    COALESCE(category, 'supplement'),
    'medication',
    dosage,
    frequency,
    form,
    prescriber,
    start_date,
    end_date,
    reason,
    notes,
    is_active,
    COALESCE(source, 'manual'),
    original_images,
    ai_extracted_data,
    created_at,
    updated_at
FROM user_medications
ON CONFLICT (id) DO NOTHING;
