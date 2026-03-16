-- Migration: Content translation tables for multi-language support
-- Adds _translations companion tables to existing content tables
-- Seeds English content from existing hardcoded data

-- ============================================================================
-- 1. Zone translations
-- ============================================================================

CREATE TABLE IF NOT EXISTS zone_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    name TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(zone_id, locale)
);

-- Seed English zone translations from existing data
INSERT INTO zone_translations (zone_id, locale, name, description, short_description)
SELECT z.id, 'en', z.zone_name,
  CASE z.zone_slug
    WHEN 'energy_metabolic' THEN 'Can you sustain energy throughout the day without crashes? This zone tracks your glucose, insulin, ketones, and thyroid function. These markers form the engine of your metabolic health. Fix this zone first, and the rest becomes easier.'
    WHEN 'structural' THEN 'Are your bones, muscles, and connective tissues strong? Calcium, magnesium, protein, and vitamin D build your structural scaffolding. This zone is about durability and physical resilience.'
    WHEN 'cardiovascular' THEN 'How strong is your heart and circulation? This zone focuses on true cardiovascular risk through particle count (ApoB), blood pressure, and lipid ratios. Not just cholesterol numbers, but what actually predicts heart disease.'
    WHEN 'cognitive' THEN 'Is your brain sharp, memory clear, and mood stable? B vitamins, magnesium, thyroid hormones, and sex hormones directly impact cognition, memory, and mood. This zone is prevention for cognitive decline.'
    WHEN 'immune' THEN 'Is your immune system balanced? Too much inflammation causes disease, too little immunity means infections. White blood cells, vitamin D, zinc, and selenium determine your immune resilience.'
    WHEN 'nutritional' THEN 'Do you have enough micronutrients to run your cells optimally? Vitamins and minerals are cofactors for thousands of enzymes. Deficiencies cascade quietly into fatigue, poor immunity, and slow recovery.'
    WHEN 'hormonal' THEN 'Are your hormones optimized for your age? Sex hormones, stress hormones, and reproductive markers orchestrate metabolism, mood, libido, and recovery. This zone is about thriving, not just surviving.'
    WHEN 'detoxification' THEN 'Can your body efficiently process and eliminate waste? Your liver and kidneys are the filtration system. ALT, GGT, creatinine, eGFR, and uric acid reveal how well your detox pathways work.'
    ELSE ''
  END,
  CASE z.zone_slug
    WHEN 'energy_metabolic' THEN 'Glucose, insulin, ketones, and thyroid function'
    WHEN 'structural' THEN 'Bones, muscles, and connective tissue strength'
    WHEN 'cardiovascular' THEN 'Heart health and circulation markers'
    WHEN 'cognitive' THEN 'Brain function, memory, and mood'
    WHEN 'immune' THEN 'Immune balance and inflammation'
    WHEN 'nutritional' THEN 'Vitamins and mineral levels'
    WHEN 'hormonal' THEN 'Sex hormones, stress hormones, and reproductive markers'
    WHEN 'detoxification' THEN 'Liver and kidney filtration'
    ELSE ''
  END
FROM zones z
WHERE NOT EXISTS (SELECT 1 FROM zone_translations zt WHERE zt.zone_id = z.id AND zt.locale = 'en');

-- Seed German zone translations
INSERT INTO zone_translations (zone_id, locale, name, description, short_description)
SELECT z.id, 'de',
  CASE z.zone_slug
    WHEN 'energy_metabolic' THEN 'Energie & Stoffwechsel'
    WHEN 'structural' THEN 'Strukturell'
    WHEN 'cardiovascular' THEN 'Herz-Kreislauf'
    WHEN 'cognitive' THEN 'Kognitiv'
    WHEN 'immune' THEN 'Immunsystem'
    WHEN 'nutritional' THEN 'Ernährung'
    WHEN 'hormonal' THEN 'Hormonell'
    WHEN 'detoxification' THEN 'Entgiftung'
    ELSE z.zone_name
  END,
  NULL, -- German descriptions to be added by admin
  NULL  -- German short descriptions to be added by admin
FROM zones z
WHERE NOT EXISTS (SELECT 1 FROM zone_translations zt WHERE zt.zone_id = z.id AND zt.locale = 'de');

-- ============================================================================
-- 2. Marker translations
-- ============================================================================

CREATE TABLE IF NOT EXISTS marker_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id UUID NOT NULL REFERENCES markers(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    name TEXT NOT NULL,
    description TEXT,
    tooltip TEXT,
    why_it_matters TEXT,
    when_to_worry TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(marker_id, locale)
);

-- Seed English marker translations from existing marker_name
INSERT INTO marker_translations (marker_id, locale, name, description)
SELECT m.id, 'en', m.marker_name, NULL
FROM markers m
WHERE NOT EXISTS (SELECT 1 FROM marker_translations mt WHERE mt.marker_id = m.id AND mt.locale = 'en');

-- ============================================================================
-- 3. License tier translations
-- ============================================================================

CREATE TABLE IF NOT EXISTS license_tier_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_id UUID NOT NULL REFERENCES license_tiers(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    name VARCHAR(100) NOT NULL,
    tagline VARCHAR(200),
    description TEXT,
    features_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tier_id, locale)
);

-- Seed English tier translations from existing data
INSERT INTO license_tier_translations (tier_id, locale, name, tagline, description)
SELECT lt.id, 'en', lt.name, lt.tagline, lt.description
FROM license_tiers lt
WHERE NOT EXISTS (SELECT 1 FROM license_tier_translations ltt WHERE ltt.tier_id = lt.id AND ltt.locale = 'en');

-- ============================================================================
-- 4. Diet protocols
-- ============================================================================

CREATE TABLE IF NOT EXISTS diet_protocols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'balanced',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diet_protocol_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id UUID NOT NULL REFERENCES diet_protocols(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    name TEXT NOT NULL,
    category_label TEXT,
    short_description TEXT,
    long_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(protocol_id, locale)
);

-- Seed diet protocols
INSERT INTO diet_protocols (slug, category, sort_order) VALUES
    ('standard', 'balanced', 1),
    ('carnivore', 'animal_based', 2),
    ('keto', 'low_carb', 3),
    ('low_carb', 'low_carb', 4),
    ('paleo', 'evolutionary', 5),
    ('primal', 'evolutionary', 6),
    ('mediterranean', 'balanced', 7),
    ('vegan', 'plant_based', 8),
    ('vegetarian', 'plant_forward', 9),
    ('pescatarian', 'plant_forward', 10),
    ('only_fish', 'plant_forward', 11),
    ('mixed', 'balanced', 12),
    ('custom', 'alternative', 13)
ON CONFLICT (slug) DO NOTHING;

-- Seed English diet protocol translations
INSERT INTO diet_protocol_translations (protocol_id, locale, name, category_label, short_description)
SELECT dp.id, 'en',
  CASE dp.slug
    WHEN 'standard' THEN 'Standard'
    WHEN 'carnivore' THEN 'Carnivore'
    WHEN 'keto' THEN 'Ketogenic'
    WHEN 'low_carb' THEN 'Low Carb'
    WHEN 'paleo' THEN 'Paleo'
    WHEN 'primal' THEN 'Primal'
    WHEN 'mediterranean' THEN 'Mediterranean'
    WHEN 'vegan' THEN 'Vegan'
    WHEN 'vegetarian' THEN 'Vegetarian'
    WHEN 'pescatarian' THEN 'Pescatarian'
    WHEN 'only_fish' THEN 'Only Fish'
    WHEN 'mixed' THEN 'Mixed'
    WHEN 'custom' THEN 'Custom'
    ELSE dp.slug
  END,
  CASE dp.category
    WHEN 'animal_based' THEN 'Animal-Based'
    WHEN 'low_carb' THEN 'Low Carb'
    WHEN 'evolutionary' THEN 'Evolutionary'
    WHEN 'plant_forward' THEN 'Plant-Forward'
    WHEN 'plant_based' THEN 'Plant-Based'
    WHEN 'balanced' THEN 'Balanced'
    WHEN 'medical' THEN 'Medical'
    WHEN 'alternative' THEN 'Alternative'
    ELSE dp.category
  END,
  CASE dp.slug
    WHEN 'standard' THEN 'Normal eating without specific dietary restrictions'
    WHEN 'carnivore' THEN 'Animal products only — meat, fish, eggs, dairy'
    WHEN 'keto' THEN 'Very low carb, high fat — typically under 20-50g carbs/day'
    WHEN 'low_carb' THEN 'Reduced carbohydrate intake — typically under 100g carbs/day'
    WHEN 'paleo' THEN 'Whole foods based on what our ancestors ate — no grains, legumes, dairy'
    WHEN 'primal' THEN 'Similar to Paleo but allows some dairy and more flexibility'
    WHEN 'mediterranean' THEN 'Rich in olive oil, fish, vegetables, and whole grains'
    WHEN 'vegan' THEN 'No animal products of any kind'
    WHEN 'vegetarian' THEN 'No meat or fish, but includes eggs and dairy'
    WHEN 'pescatarian' THEN 'Vegetarian plus fish and seafood'
    WHEN 'only_fish' THEN 'Fish as primary animal protein source'
    WHEN 'mixed' THEN 'Flexible eating combining multiple dietary approaches'
    WHEN 'custom' THEN 'A personalized dietary approach'
    ELSE ''
  END
FROM diet_protocols dp
WHERE NOT EXISTS (SELECT 1 FROM diet_protocol_translations dpt WHERE dpt.protocol_id = dp.id AND dpt.locale = 'en');

-- German diet protocol translations
INSERT INTO diet_protocol_translations (protocol_id, locale, name, category_label, short_description)
SELECT dp.id, 'de',
  CASE dp.slug
    WHEN 'standard' THEN 'Standard'
    WHEN 'carnivore' THEN 'Karnivor'
    WHEN 'keto' THEN 'Ketogen'
    WHEN 'low_carb' THEN 'Low Carb'
    WHEN 'paleo' THEN 'Paleo'
    WHEN 'primal' THEN 'Primal'
    WHEN 'mediterranean' THEN 'Mediterran'
    WHEN 'vegan' THEN 'Vegan'
    WHEN 'vegetarian' THEN 'Vegetarisch'
    WHEN 'pescatarian' THEN 'Pescetarisch'
    WHEN 'only_fish' THEN 'Nur Fisch'
    WHEN 'mixed' THEN 'Gemischt'
    WHEN 'custom' THEN 'Individuell'
    ELSE dp.slug
  END,
  NULL, NULL
FROM diet_protocols dp
WHERE NOT EXISTS (SELECT 1 FROM diet_protocol_translations dpt WHERE dpt.protocol_id = dp.id AND dpt.locale = 'de');

-- ============================================================================
-- 5. Eating patterns (fasting protocols)
-- ============================================================================

CREATE TABLE IF NOT EXISTS eating_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eating_pattern_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES eating_patterns(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(pattern_id, locale)
);

INSERT INTO eating_patterns (slug, sort_order) VALUES
    ('16_8', 1),
    ('omad', 2),
    ('36h', 3),
    ('48h', 4),
    ('72h', 5),
    ('extended', 6),
    ('custom', 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO eating_pattern_translations (pattern_id, locale, name, description)
SELECT ep.id, 'en',
  CASE ep.slug
    WHEN '16_8' THEN '16:8 Intermittent Fasting'
    WHEN 'omad' THEN 'OMAD (One Meal a Day)'
    WHEN '36h' THEN '36-Hour Fast'
    WHEN '48h' THEN '48-Hour Fast'
    WHEN '72h' THEN '72-Hour Fast'
    WHEN 'extended' THEN 'Extended Fast (72h+)'
    WHEN 'custom' THEN 'Custom Fasting Protocol'
    ELSE ep.slug
  END,
  CASE ep.slug
    WHEN '16_8' THEN 'Fast for 16 hours, eat within an 8-hour window'
    WHEN 'omad' THEN 'Eat one large meal per day, fast the rest'
    WHEN '36h' THEN 'A day-and-a-half fast for deeper metabolic benefits'
    WHEN '48h' THEN 'A two-day fast for autophagy and metabolic reset'
    WHEN '72h' THEN 'A three-day fast for immune system regeneration'
    WHEN 'extended' THEN 'Fasts longer than 72 hours — for experienced fasters only'
    WHEN 'custom' THEN 'A personalized fasting schedule'
    ELSE ''
  END
FROM eating_patterns ep
WHERE NOT EXISTS (SELECT 1 FROM eating_pattern_translations ept WHERE ept.pattern_id = ep.id AND ept.locale = 'en');

INSERT INTO eating_pattern_translations (pattern_id, locale, name, description)
SELECT ep.id, 'de',
  CASE ep.slug
    WHEN '16_8' THEN '16:8 Intervallfasten'
    WHEN 'omad' THEN 'OMAD (Eine Mahlzeit pro Tag)'
    WHEN '36h' THEN '36-Stunden-Fasten'
    WHEN '48h' THEN '48-Stunden-Fasten'
    WHEN '72h' THEN '72-Stunden-Fasten'
    WHEN 'extended' THEN 'Langzeitfasten (72h+)'
    WHEN 'custom' THEN 'Individuelles Fastenprotokoll'
    ELSE ep.slug
  END,
  NULL
FROM eating_patterns ep
WHERE NOT EXISTS (SELECT 1 FROM eating_pattern_translations ept WHERE ept.pattern_id = ep.id AND ept.locale = 'de');

-- ============================================================================
-- 6. Device types (reference catalogue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    manufacturer VARCHAR(100),
    device_category VARCHAR(30) NOT NULL DEFAULT 'manual',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_type_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    name TEXT NOT NULL,
    description TEXT,
    measures_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(device_type_id, locale)
);

INSERT INTO device_types (slug, manufacturer, device_category, sort_order) VALUES
    ('fora_6', 'ForaCare', 'blood_analyzer', 1),
    ('qardio_arm', 'Qardio', 'bp_monitor', 2),
    ('qardiobase_2', 'Qardio', 'scale', 3),
    ('manual', NULL, 'manual', 4),
    ('lab', NULL, 'lab', 5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO device_type_translations (device_type_id, locale, name, description, measures_summary)
SELECT dt.id, 'en',
  CASE dt.slug
    WHEN 'fora_6' THEN 'Fora 6 Connect'
    WHEN 'qardio_arm' THEN 'Qardio Arm'
    WHEN 'qardiobase_2' THEN 'Qardiobase 2'
    WHEN 'manual' THEN 'Manual Entry'
    WHEN 'lab' THEN 'Lab Test'
    ELSE dt.slug
  END,
  CASE dt.slug
    WHEN 'fora_6' THEN 'Multi-parameter blood analyzer for glucose, ketones, cholesterol, uric acid, hemoglobin, and hematocrit'
    WHEN 'qardio_arm' THEN 'Wireless blood pressure monitor with heart rate tracking'
    WHEN 'qardiobase_2' THEN 'Smart body composition scale'
    WHEN 'manual' THEN 'Manually entered measurements'
    WHEN 'lab' THEN 'Professional laboratory blood work results'
    ELSE ''
  END,
  CASE dt.slug
    WHEN 'fora_6' THEN 'Glucose, Ketones, Cholesterol, Uric Acid, Hemoglobin, Hematocrit'
    WHEN 'qardio_arm' THEN 'Blood Pressure (Systolic/Diastolic), Heart Rate'
    WHEN 'qardiobase_2' THEN 'Weight, Body Fat %, Muscle Mass, Water %, BMI'
    WHEN 'manual' THEN 'Any marker'
    WHEN 'lab' THEN 'All lab markers'
    ELSE ''
  END
FROM device_types dt
WHERE NOT EXISTS (SELECT 1 FROM device_type_translations dtt WHERE dtt.device_type_id = dt.id AND dtt.locale = 'en');

-- ============================================================================
-- 7. Food categories & food translations
-- ============================================================================

CREATE TABLE IF NOT EXISTS food_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    icon VARCHAR(10),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_category_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES food_categories(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_id, locale)
);

INSERT INTO food_categories (slug, icon, sort_order) VALUES
    ('meat', '🥩', 1),
    ('poultry', '🍗', 2),
    ('fish', '🐟', 3),
    ('seafood', '🦐', 4),
    ('organ_meat', '🫀', 5),
    ('egg', '🥚', 6),
    ('dairy', '🧀', 7),
    ('vegetable', '🥬', 8),
    ('fruit', '🍎', 9),
    ('nut_seed', '🥜', 10),
    ('legume', '🫘', 11),
    ('grain', '🌾', 12),
    ('fermented', '🫙', 13),
    ('herb_spice', '🌿', 14),
    ('oil_fat', '🫒', 15),
    ('beverage', '☕', 16),
    ('other', '🍽️', 17)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO food_category_translations (category_id, locale, name)
SELECT fc.id, 'en',
  CASE fc.slug
    WHEN 'meat' THEN 'Red Meat'
    WHEN 'poultry' THEN 'Poultry'
    WHEN 'fish' THEN 'Fish'
    WHEN 'seafood' THEN 'Seafood'
    WHEN 'organ_meat' THEN 'Organ Meats'
    WHEN 'egg' THEN 'Eggs'
    WHEN 'dairy' THEN 'Dairy'
    WHEN 'vegetable' THEN 'Vegetables'
    WHEN 'fruit' THEN 'Fruits'
    WHEN 'nut_seed' THEN 'Nuts & Seeds'
    WHEN 'legume' THEN 'Legumes'
    WHEN 'grain' THEN 'Grains'
    WHEN 'fermented' THEN 'Fermented Foods'
    WHEN 'herb_spice' THEN 'Herbs & Spices'
    WHEN 'oil_fat' THEN 'Oils & Fats'
    WHEN 'beverage' THEN 'Beverages'
    WHEN 'other' THEN 'Other'
    ELSE fc.slug
  END
FROM food_categories fc
WHERE NOT EXISTS (SELECT 1 FROM food_category_translations fct WHERE fct.category_id = fc.id AND fct.locale = 'en');

INSERT INTO food_category_translations (category_id, locale, name)
SELECT fc.id, 'de',
  CASE fc.slug
    WHEN 'meat' THEN 'Rotes Fleisch'
    WHEN 'poultry' THEN 'Geflügel'
    WHEN 'fish' THEN 'Fisch'
    WHEN 'seafood' THEN 'Meeresfrüchte'
    WHEN 'organ_meat' THEN 'Innereien'
    WHEN 'egg' THEN 'Eier'
    WHEN 'dairy' THEN 'Milchprodukte'
    WHEN 'vegetable' THEN 'Gemüse'
    WHEN 'fruit' THEN 'Obst'
    WHEN 'nut_seed' THEN 'Nüsse & Samen'
    WHEN 'legume' THEN 'Hülsenfrüchte'
    WHEN 'grain' THEN 'Getreide'
    WHEN 'fermented' THEN 'Fermentierte Lebensmittel'
    WHEN 'herb_spice' THEN 'Kräuter & Gewürze'
    WHEN 'oil_fat' THEN 'Öle & Fette'
    WHEN 'beverage' THEN 'Getränke'
    WHEN 'other' THEN 'Sonstiges'
    ELSE fc.slug
  END
FROM food_categories fc
WHERE NOT EXISTS (SELECT 1 FROM food_category_translations fct WHERE fct.category_id = fc.id AND fct.locale = 'de');

-- ============================================================================
-- 8. UI Strings (catch-all for interface text)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ui_strings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(150) UNIQUE NOT NULL,
    context VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ui_string_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    string_id UUID NOT NULL REFERENCES ui_strings(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(string_id, locale)
);

-- Seed core UI strings
INSERT INTO ui_strings (key, context) VALUES
    ('nav.overview', 'nav'),
    ('nav.doctor_chat', 'nav'),
    ('nav.trends', 'nav'),
    ('nav.settings', 'nav'),
    ('nav.admin', 'nav'),
    ('nav.logout', 'nav'),
    ('nav.login', 'nav'),
    ('nav.signup', 'nav'),
    ('common.save', 'common'),
    ('common.cancel', 'common'),
    ('common.loading', 'common'),
    ('common.error', 'common'),
    ('common.success', 'common'),
    ('common.delete', 'common'),
    ('common.edit', 'common'),
    ('common.search', 'common'),
    ('common.back', 'common'),
    ('common.next', 'common'),
    ('common.previous', 'common'),
    ('dashboard.welcome_title', 'dashboard'),
    ('dashboard.health_zones', 'dashboard'),
    ('dashboard.explore', 'dashboard'),
    ('dashboard.no_measurements', 'dashboard'),
    ('dashboard.add_measurement', 'dashboard'),
    ('settings.save_success', 'settings'),
    ('settings.save_error', 'settings'),
    ('settings.profile', 'settings'),
    ('settings.language', 'settings'),
    ('doctor_chat.upgrade_prompt', 'doctor_chat'),
    ('doctor_chat.ask_question', 'doctor_chat'),
    ('status.optimal', 'status'),
    ('status.borderline', 'status'),
    ('status.out_of_range', 'status'),
    ('status.no_data', 'status')
ON CONFLICT (key) DO NOTHING;

-- Seed English UI string values
INSERT INTO ui_string_translations (string_id, locale, value)
SELECT us.id, 'en',
  CASE us.key
    WHEN 'nav.overview' THEN 'Overview'
    WHEN 'nav.doctor_chat' THEN 'Doctor Chat'
    WHEN 'nav.trends' THEN 'Trends'
    WHEN 'nav.settings' THEN 'Settings'
    WHEN 'nav.admin' THEN 'Admin'
    WHEN 'nav.logout' THEN 'Log Out'
    WHEN 'nav.login' THEN 'Sign In'
    WHEN 'nav.signup' THEN 'Sign Up'
    WHEN 'common.save' THEN 'Save'
    WHEN 'common.cancel' THEN 'Cancel'
    WHEN 'common.loading' THEN 'Loading...'
    WHEN 'common.error' THEN 'Error'
    WHEN 'common.success' THEN 'Success'
    WHEN 'common.delete' THEN 'Delete'
    WHEN 'common.edit' THEN 'Edit'
    WHEN 'common.search' THEN 'Search'
    WHEN 'common.back' THEN 'Back'
    WHEN 'common.next' THEN 'Next'
    WHEN 'common.previous' THEN 'Previous'
    WHEN 'dashboard.welcome_title' THEN 'Your Health Overview'
    WHEN 'dashboard.health_zones' THEN 'Health Zones'
    WHEN 'dashboard.explore' THEN 'Explore'
    WHEN 'dashboard.no_measurements' THEN 'No measurements yet'
    WHEN 'dashboard.add_measurement' THEN 'Record your first measurement'
    WHEN 'settings.save_success' THEN 'Settings saved'
    WHEN 'settings.save_error' THEN 'Failed to save settings'
    WHEN 'settings.profile' THEN 'Profile'
    WHEN 'settings.language' THEN 'Language'
    WHEN 'doctor_chat.upgrade_prompt' THEN 'Upgrade your plan for more Doctor Chat sessions'
    WHEN 'doctor_chat.ask_question' THEN 'Ask a question...'
    WHEN 'status.optimal' THEN 'Optimal'
    WHEN 'status.borderline' THEN 'Borderline'
    WHEN 'status.out_of_range' THEN 'Out of Range'
    WHEN 'status.no_data' THEN 'No data'
    ELSE us.key
  END
FROM ui_strings us
WHERE NOT EXISTS (SELECT 1 FROM ui_string_translations ust WHERE ust.string_id = us.id AND ust.locale = 'en');

-- Seed German UI string values
INSERT INTO ui_string_translations (string_id, locale, value)
SELECT us.id, 'de',
  CASE us.key
    WHEN 'nav.overview' THEN 'Übersicht'
    WHEN 'nav.doctor_chat' THEN 'Arztgespräch'
    WHEN 'nav.trends' THEN 'Trends'
    WHEN 'nav.settings' THEN 'Einstellungen'
    WHEN 'nav.admin' THEN 'Admin'
    WHEN 'nav.logout' THEN 'Abmelden'
    WHEN 'nav.login' THEN 'Anmelden'
    WHEN 'nav.signup' THEN 'Registrieren'
    WHEN 'common.save' THEN 'Speichern'
    WHEN 'common.cancel' THEN 'Abbrechen'
    WHEN 'common.loading' THEN 'Laden...'
    WHEN 'common.error' THEN 'Fehler'
    WHEN 'common.success' THEN 'Erfolg'
    WHEN 'common.delete' THEN 'Löschen'
    WHEN 'common.edit' THEN 'Bearbeiten'
    WHEN 'common.search' THEN 'Suchen'
    WHEN 'common.back' THEN 'Zurück'
    WHEN 'common.next' THEN 'Weiter'
    WHEN 'common.previous' THEN 'Zurück'
    WHEN 'dashboard.welcome_title' THEN 'Ihre Gesundheitsübersicht'
    WHEN 'dashboard.health_zones' THEN 'Gesundheitszonen'
    WHEN 'dashboard.explore' THEN 'Entdecken'
    WHEN 'dashboard.no_measurements' THEN 'Noch keine Messungen'
    WHEN 'dashboard.add_measurement' THEN 'Erste Messung aufzeichnen'
    WHEN 'settings.save_success' THEN 'Einstellungen gespeichert'
    WHEN 'settings.save_error' THEN 'Einstellungen konnten nicht gespeichert werden'
    WHEN 'settings.profile' THEN 'Profil'
    WHEN 'settings.language' THEN 'Sprache'
    WHEN 'doctor_chat.upgrade_prompt' THEN 'Upgrade für mehr Arztgespräche'
    WHEN 'doctor_chat.ask_question' THEN 'Stellen Sie eine Frage...'
    WHEN 'status.optimal' THEN 'Optimal'
    WHEN 'status.borderline' THEN 'Grenzwertig'
    WHEN 'status.out_of_range' THEN 'Außerhalb des Bereichs'
    WHEN 'status.no_data' THEN 'Keine Daten'
    ELSE us.key
  END
FROM ui_strings us
WHERE NOT EXISTS (SELECT 1 FROM ui_string_translations ust WHERE ust.string_id = us.id AND ust.locale = 'de');

-- ============================================================================
-- 9. Content audit log
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES users(id),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    locale VARCHAR(5),
    action VARCHAR(20) NOT NULL,  -- 'create', 'update', 'delete'
    changes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_audit_created ON content_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_audit_table ON content_audit_log(table_name, record_id);

-- ============================================================================
-- 10. Add locale preference to users
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'locale') THEN
        ALTER TABLE users ADD COLUMN locale VARCHAR(5) NOT NULL DEFAULT 'en';
    END IF;
END $$;

-- ============================================================================
-- Indexes for translations
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_zone_translations_locale ON zone_translations(zone_id, locale);
CREATE INDEX IF NOT EXISTS idx_marker_translations_locale ON marker_translations(marker_id, locale);
CREATE INDEX IF NOT EXISTS idx_tier_translations_locale ON license_tier_translations(tier_id, locale);
CREATE INDEX IF NOT EXISTS idx_diet_protocol_translations_locale ON diet_protocol_translations(protocol_id, locale);
CREATE INDEX IF NOT EXISTS idx_eating_pattern_translations_locale ON eating_pattern_translations(pattern_id, locale);
CREATE INDEX IF NOT EXISTS idx_device_type_translations_locale ON device_type_translations(device_type_id, locale);
CREATE INDEX IF NOT EXISTS idx_food_category_translations_locale ON food_category_translations(category_id, locale);
CREATE INDEX IF NOT EXISTS idx_ui_string_translations_locale ON ui_string_translations(string_id, locale);
