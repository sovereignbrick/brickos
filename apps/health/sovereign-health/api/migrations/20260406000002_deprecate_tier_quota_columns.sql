-- Deprecation markers for legacy per-agent chat quota columns on license_tiers.
-- These columns are superseded by the tier_features + product_features SSoT
-- (see migration 20260312000053). The AI credit pool (Sprint 019) already reads
-- from tier_features. These columns remain for backward compatibility during
-- the transition period and will be dropped in a future sprint.
--
-- Tracking issue: #237 (license tier single source of truth)

-- ── Mark columns as deprecated via SQL COMMENTs ─────────────────────────────

COMMENT ON COLUMN license_tiers.chat_general_monthly IS
  'DEPRECATED (Sprint 024): Use tier_features with feature_key=chat_general instead. Will be removed in a future sprint.';

COMMENT ON COLUMN license_tiers.chat_trends_monthly IS
  'DEPRECATED (Sprint 024): Use tier_features with feature_key=chat_trends instead. Will be removed in a future sprint.';

COMMENT ON COLUMN license_tiers.chat_labs_monthly IS
  'DEPRECATED (Sprint 024): Use tier_features with feature_key=chat_labs instead. Will be removed in a future sprint.';

COMMENT ON COLUMN license_tiers.chat_diet_monthly IS
  'DEPRECATED (Sprint 024): Use tier_features with feature_key=chat_diet instead. Will be removed in a future sprint.';

COMMENT ON COLUMN license_tiers.chat_supplements_monthly IS
  'DEPRECATED (Sprint 024): Use tier_features with feature_key=chat_supplements instead. Will be removed in a future sprint.';

COMMENT ON COLUMN license_tiers.chat_protocols_monthly IS
  'DEPRECATED (Sprint 024): Use tier_features with feature_key=chat_protocols instead. Will be removed in a future sprint.';

COMMENT ON COLUMN license_tiers.chat_lab_import_monthly IS
  'DEPRECATED (Sprint 024): Use tier_features with feature_key=lab_import instead. Will be removed in a future sprint.';

COMMENT ON COLUMN license_tiers.chat_med_import_monthly IS
  'DEPRECATED (Sprint 024): Use tier_features with feature_key=med_import instead. Will be removed in a future sprint.';

-- ── Canonical view: tier limits from tier_features SSoT ─────────────────────
-- This view replaces the need to read the deprecated license_tiers columns.
-- Frontend and admin tooling should migrate to this view or the /api/tiers/features endpoint.

CREATE OR REPLACE VIEW v_tier_feature_limits AS
SELECT
    lt.slug AS tier_slug,
    lt.name AS tier_name,
    lt.display_order,
    pf.feature_key,
    pf.name_en AS feature_name_en,
    pf.name_de AS feature_name_de,
    pf.category,
    tf.included,
    tf.limit_value,
    tf.limit_label_en,
    tf.limit_label_de
FROM license_tiers lt
CROSS JOIN product_features pf
LEFT JOIN tier_features tf
    ON tf.tier_key = lt.slug AND tf.feature_id = pf.id
WHERE lt.is_active = true
  AND pf.status != 'deprecated'
ORDER BY lt.display_order, pf.category, pf.sort_order;

-- ── Pivot view: one row per tier with AI quotas from tier_features ──────────
-- This mirrors the shape of the deprecated columns for easy comparison.

CREATE OR REPLACE VIEW v_tier_ai_quotas AS
SELECT
    lt.slug AS tier_slug,
    lt.name AS tier_name,
    -- From tier_features SSoT (canonical)
    MAX(CASE WHEN pf.feature_key = 'chat_general' THEN tf.limit_value END) AS tf_chat_general,
    MAX(CASE WHEN pf.feature_key = 'chat_trends' THEN tf.limit_value END) AS tf_chat_trends,
    MAX(CASE WHEN pf.feature_key = 'chat_labs' THEN tf.limit_value END) AS tf_chat_labs,
    MAX(CASE WHEN pf.feature_key = 'chat_diet' THEN tf.limit_value END) AS tf_chat_diet,
    MAX(CASE WHEN pf.feature_key = 'chat_supplements' THEN tf.limit_value END) AS tf_chat_supplements,
    MAX(CASE WHEN pf.feature_key = 'chat_protocols' THEN tf.limit_value END) AS tf_chat_protocols,
    MAX(CASE WHEN pf.feature_key = 'lab_import' THEN tf.limit_value END) AS tf_lab_import,
    MAX(CASE WHEN pf.feature_key = 'med_import' THEN tf.limit_value END) AS tf_med_import,
    -- From deprecated license_tiers columns (for comparison during transition)
    lt.chat_general_monthly AS legacy_chat_general,
    lt.chat_trends_monthly AS legacy_chat_trends,
    lt.chat_labs_monthly AS legacy_chat_labs,
    lt.chat_diet_monthly AS legacy_chat_diet,
    lt.chat_supplements_monthly AS legacy_chat_supplements,
    lt.chat_protocols_monthly AS legacy_chat_protocols,
    lt.chat_lab_import_monthly AS legacy_lab_import,
    lt.chat_med_import_monthly AS legacy_med_import
FROM license_tiers lt
LEFT JOIN tier_features tf ON tf.tier_key = lt.slug
LEFT JOIN product_features pf ON pf.id = tf.feature_id
    AND pf.feature_key IN (
        'chat_general', 'chat_trends', 'chat_labs',
        'chat_diet', 'chat_supplements', 'chat_protocols',
        'lab_import', 'med_import'
    )
WHERE lt.is_active = true
GROUP BY lt.slug, lt.name, lt.display_order,
         lt.chat_general_monthly, lt.chat_trends_monthly, lt.chat_labs_monthly,
         lt.chat_diet_monthly, lt.chat_supplements_monthly, lt.chat_protocols_monthly,
         lt.chat_lab_import_monthly, lt.chat_med_import_monthly
ORDER BY lt.display_order;
