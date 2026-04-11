-- Platform-wide tier system: 5 platform tiers with app-specific display names.
--
-- Platform tiers: free, starter, pro, premium, enterprise
-- Each app maps these to its own naming (e.g., SHI: Glimpse/Focus/Insight/Clarity/Horizon)
--
-- The tier_features table (already exists) gets app_key awareness.
-- New table: app_tier_names maps platform tier -> app display name + price.
--
-- Sprint 041 #491 hardening: this migration referenced public.tier_features.app_key
-- without ever adding the column. The "added in 20260406000001" comment was wrong --
-- no migration ever created it. This was masked by the previous spawn-and-swallow
-- migration runner. Now that #522 hard-fails on errors, we add the column inline.

ALTER TABLE tier_features ADD COLUMN IF NOT EXISTS app_key TEXT;

-- 1. Create app_tier_names table
CREATE TABLE IF NOT EXISTS app_tier_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_key TEXT NOT NULL,
    tier_slug TEXT NOT NULL,
    display_name TEXT NOT NULL,
    tagline TEXT,
    price_eur_cents INT NOT NULL DEFAULT 0,
    price_btc_sats INT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(app_key, tier_slug)
);

-- 2. Seed SHI tier names (maps to existing tier slugs)
INSERT INTO app_tier_names (app_key, tier_slug, display_name, tagline, price_eur_cents, sort_order)
VALUES
    ('shi', 'glimpse',  'Glimpse',  'Start your health journey',          0, 1),
    ('shi', 'focus',    'Focus',    'For committed self-trackers',       999, 2),
    ('shi', 'insight',  'Insight',  'Deep understanding',               2499, 3),
    ('shi', 'clarity',  'Clarity',  'Complete picture',                 4999, 4),
    ('shi', 'horizon',  'Horizon',  'Maximum sovereignty',                 0, 5)
ON CONFLICT (app_key, tier_slug) DO NOTHING;

-- 3. Seed Sovereign Link tier names
INSERT INTO app_tier_names (app_key, tier_slug, display_name, tagline, price_eur_cents, sort_order)
VALUES
    ('sovereign-link', 'glimpse',  'Basic',       'Get started with short links',   0, 1),
    ('sovereign-link', 'focus',    'Growth',      'Scale your link management',    999, 2),
    ('sovereign-link', 'insight',  'Scale',       'Advanced analytics',           2499, 3),
    ('sovereign-link', 'clarity',  'Agency',      'Multi-client link management', 4999, 4),
    ('sovereign-link', 'horizon',  'Self-hosted', 'Full sovereignty',                0, 5)
ON CONFLICT (app_key, tier_slug) DO NOTHING;

-- 4. Seed Sovereign Voice tier names
INSERT INTO app_tier_names (app_key, tier_slug, display_name, tagline, price_eur_cents, sort_order)
VALUES
    ('sovereign-voice', 'glimpse',  'Free',     'Publish to NOSTR',            0, 1),
    ('sovereign-voice', 'focus',    'Creator',  'Scheduled publishing',       999, 2),
    ('sovereign-voice', 'insight',  'Pro',      'Advanced scheduling',       2499, 3),
    ('sovereign-voice', 'clarity',  'Studio',   'Multi-account publishing',  4999, 4),
    ('sovereign-voice', 'horizon',  'Self-hosted', 'Full sovereignty',          0, 5)
ON CONFLICT (app_key, tier_slug) DO NOTHING;

-- 5. Add app_key to tier_features if not already present
-- (The column was added in migration 20260406000001 as part of platform schema elevation)
-- Ensure existing tier_features rows have app_key = 'shi' as default
UPDATE tier_features SET app_key = 'shi' WHERE app_key IS NULL OR app_key = '';

-- 6. Seed Sovereign Link tier features
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de, app_key)
SELECT t.tier_key,
       (SELECT id FROM product_features WHERE feature_key = 'vanity_links'),
       t.included, NULL, t.label_en, t.label_de, 'sovereign-link'
FROM (VALUES
    ('glimpse',  false, 'No', 'Nein'),
    ('focus',    true,  '1 code', '1 Code'),
    ('insight',  true,  '5 codes', '5 Codes'),
    ('clarity',  true,  'Unlimited', 'Unbegrenzt'),
    ('horizon',  true,  'Unlimited', 'Unbegrenzt')
) AS t(tier_key, included, label_en, label_de)
WHERE EXISTS (SELECT 1 FROM product_features WHERE feature_key = 'vanity_links')
ON CONFLICT DO NOTHING;

-- 7. Create a platform tier check API function
-- Apps can call: SELECT check_tier_feature('shi', 'glimpse', 'biomarkers') -> '8'
CREATE OR REPLACE FUNCTION check_tier_limit(
    p_app_key TEXT,
    p_tier_slug TEXT,
    p_feature_key TEXT
) RETURNS TEXT AS $$
DECLARE
    v_limit TEXT;
BEGIN
    SELECT tf.limit_value INTO v_limit
    FROM tier_features tf
    JOIN product_features pf ON pf.id = tf.feature_id
    WHERE tf.tier_key = p_tier_slug
      AND pf.feature_key = p_feature_key
      AND (tf.app_key = p_app_key OR tf.app_key IS NULL)
    ORDER BY CASE WHEN tf.app_key = p_app_key THEN 0 ELSE 1 END
    LIMIT 1;
    RETURN COALESCE(v_limit, '0');
END;
$$ LANGUAGE plpgsql STABLE;
