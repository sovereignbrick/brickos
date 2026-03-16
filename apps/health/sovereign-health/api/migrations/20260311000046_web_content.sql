-- Website pages
CREATE TABLE IF NOT EXISTS web_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website content sections
CREATE TABLE IF NOT EXISTS web_content_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES web_pages(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    section_type VARCHAR(20) DEFAULT 'text',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(page_id, key)
);

-- Website content translations
CREATE TABLE IF NOT EXISTS web_content_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES web_content_sections(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL DEFAULT 'en',
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(section_id, locale)
);

-- Seed pages
INSERT INTO web_pages (slug, title, sort_order) VALUES
    ('homepage', 'Homepage', 1),
    ('features', 'Features', 2),
    ('pricing', 'Pricing', 3),
    ('open-source', 'Open Source', 4),
    ('about', 'About', 5),
    ('global', 'Global (Nav/Footer)', 6)
ON CONFLICT (slug) DO NOTHING;

-- Seed homepage content sections
INSERT INTO web_content_sections (page_id, key, section_type, sort_order)
SELECT p.id, s.key, s.section_type, s.sort_order
FROM web_pages p,
(VALUES
    ('hero_title', 'text', 1),
    ('hero_description', 'text', 2),
    ('hero_cta_primary', 'text', 3),
    ('hero_cta_secondary', 'text', 4),
    ('trust_encryption', 'text', 10),
    ('trust_tls', 'text', 11),
    ('trust_gdpr', 'text', 12),
    ('trust_tracking', 'text', 13),
    ('trust_oss', 'text', 14),
    ('section_zones_title', 'text', 20),
    ('section_zones_description', 'text', 21),
    ('section_how_title', 'text', 30),
    ('section_cta_title', 'text', 40),
    ('section_cta_description', 'text', 41)
) AS s(key, section_type, sort_order)
WHERE p.slug = 'homepage'
ON CONFLICT (page_id, key) DO NOTHING;

-- Seed homepage EN translations
INSERT INTO web_content_translations (section_id, locale, value)
SELECT wcs.id, 'en', t.value
FROM web_content_sections wcs
JOIN web_pages wp ON wp.id = wcs.page_id
JOIN (VALUES
    ('homepage', 'hero_title', 'Privacy-First Metabolic Health Tracking'),
    ('homepage', 'hero_description', 'Track 75+ biomarkers across 8 health zones. Protocol-aware thresholds for your diet. AI-powered insights with Dr. Alex.'),
    ('homepage', 'hero_cta_primary', 'Get Started Free'),
    ('homepage', 'hero_cta_secondary', 'View Features'),
    ('homepage', 'trust_encryption', 'AES-256 Encryption'),
    ('homepage', 'trust_tls', 'TLS 1.3'),
    ('homepage', 'trust_gdpr', 'GDPR Compliant'),
    ('homepage', 'trust_tracking', 'No Tracking'),
    ('homepage', 'trust_oss', 'Open Source Auditable'),
    ('homepage', 'section_zones_title', '8 Health Zones'),
    ('homepage', 'section_zones_description', 'Your markers organized into functional zones that reflect how your body actually works.'),
    ('homepage', 'section_how_title', 'How It Works'),
    ('homepage', 'section_cta_title', 'Start Tracking Your Health Today'),
    ('homepage', 'section_cta_description', 'Join thousands taking control of their metabolic health with privacy-first tracking.')
) AS t(page_slug, section_key, value) ON wp.slug = t.page_slug AND wcs.key = t.section_key
ON CONFLICT (section_id, locale) DO NOTHING;

-- Seed homepage DE translations
INSERT INTO web_content_translations (section_id, locale, value)
SELECT wcs.id, 'de', t.value
FROM web_content_sections wcs
JOIN web_pages wp ON wp.id = wcs.page_id
JOIN (VALUES
    ('homepage', 'hero_title', 'Datenschutz-zuerst Metabolische Gesundheitsverfolgung'),
    ('homepage', 'hero_description', 'Verfolgen Sie 75+ Biomarker in 8 Gesundheitszonen. Protokollbewusste Schwellenwerte. KI-gestützte Einblicke mit Dr. Alex.'),
    ('homepage', 'hero_cta_primary', 'Kostenlos starten'),
    ('homepage', 'hero_cta_secondary', 'Funktionen ansehen'),
    ('homepage', 'trust_encryption', 'AES-256-Verschlüsselung'),
    ('homepage', 'trust_tls', 'TLS 1.3'),
    ('homepage', 'trust_gdpr', 'DSGVO-konform'),
    ('homepage', 'trust_tracking', 'Kein Tracking'),
    ('homepage', 'trust_oss', 'Open Source prüfbar'),
    ('homepage', 'section_zones_title', '8 Gesundheitszonen'),
    ('homepage', 'section_zones_description', 'Ihre Marker in funktionale Zonen organisiert, die widerspiegeln, wie Ihr Körper tatsächlich arbeitet.'),
    ('homepage', 'section_how_title', 'So funktioniert es'),
    ('homepage', 'section_cta_title', 'Beginnen Sie heute mit dem Tracking'),
    ('homepage', 'section_cta_description', 'Schließen Sie sich Tausenden an, die ihre metabolische Gesundheit mit datenschutzfreundlichem Tracking kontrollieren.')
) AS t(page_slug, section_key, value) ON wp.slug = t.page_slug AND wcs.key = t.section_key
ON CONFLICT (section_id, locale) DO NOTHING;

-- Seed features page sections
INSERT INTO web_content_sections (page_id, key, section_type, sort_order)
SELECT p.id, s.key, 'text', s.sort_order
FROM web_pages p,
(VALUES
    ('hero_title', 1),
    ('feature_zones_title', 10),
    ('feature_zones_desc', 11),
    ('feature_markers_title', 20),
    ('feature_markers_desc', 21),
    ('feature_protocol_title', 30),
    ('feature_protocol_desc', 31),
    ('feature_doctor_title', 40),
    ('feature_doctor_desc', 41)
) AS s(key, sort_order)
WHERE p.slug = 'features'
ON CONFLICT (page_id, key) DO NOTHING;

INSERT INTO web_content_translations (section_id, locale, value)
SELECT wcs.id, 'en', t.value
FROM web_content_sections wcs
JOIN web_pages wp ON wp.id = wcs.page_id
JOIN (VALUES
    ('features', 'hero_title', 'Everything You Need to Understand Your Health'),
    ('features', 'feature_zones_title', '8 Health Zones'),
    ('features', 'feature_zones_desc', 'Your markers organized into functional zones that reflect how your body actually works.'),
    ('features', 'feature_markers_title', '75+ Biomarkers'),
    ('features', 'feature_markers_desc', 'Track everything from basic glucose to advanced hormones, with protocol-aware reference ranges.'),
    ('features', 'feature_protocol_title', 'Protocol-Aware Thresholds'),
    ('features', 'feature_protocol_desc', 'Your diet and fasting pattern change what normal means. We adjust automatically.'),
    ('features', 'feature_doctor_title', 'Dr. Alex AI Chat'),
    ('features', 'feature_doctor_desc', 'Ask Dr. Alex about your blood work, trends, and what to do next.')
) AS t(page_slug, section_key, value) ON wp.slug = t.page_slug AND wcs.key = t.section_key
ON CONFLICT (section_id, locale) DO NOTHING;

-- Seed global sections (nav/footer)
INSERT INTO web_content_sections (page_id, key, section_type, sort_order)
SELECT p.id, s.key, 'text', s.sort_order
FROM web_pages p,
(VALUES
    ('nav_home', 1),
    ('nav_features', 2),
    ('nav_pricing', 3),
    ('nav_open_source', 4),
    ('nav_about', 5),
    ('nav_login', 6),
    ('nav_signup', 7),
    ('footer_copyright', 10),
    ('footer_terms', 11),
    ('footer_privacy', 12),
    ('footer_impressum', 13),
    ('footer_contact', 14)
) AS s(key, sort_order)
WHERE p.slug = 'global'
ON CONFLICT (page_id, key) DO NOTHING;

INSERT INTO web_content_translations (section_id, locale, value)
SELECT wcs.id, t.locale, t.value
FROM web_content_sections wcs
JOIN web_pages wp ON wp.id = wcs.page_id
JOIN (VALUES
    ('global', 'nav_home', 'en', 'Home'),
    ('global', 'nav_features', 'en', 'Features'),
    ('global', 'nav_pricing', 'en', 'Pricing'),
    ('global', 'nav_open_source', 'en', 'Open Source'),
    ('global', 'nav_about', 'en', 'About'),
    ('global', 'nav_login', 'en', 'Log In'),
    ('global', 'nav_signup', 'en', 'Sign Up'),
    ('global', 'footer_copyright', 'en', '© 2026 Sovereign Health Intelligence'),
    ('global', 'footer_terms', 'en', 'Terms of Service'),
    ('global', 'footer_privacy', 'en', 'Privacy Policy'),
    ('global', 'footer_impressum', 'en', 'Impressum'),
    ('global', 'footer_contact', 'en', 'Contact'),
    ('global', 'nav_home', 'de', 'Startseite'),
    ('global', 'nav_features', 'de', 'Funktionen'),
    ('global', 'nav_pricing', 'de', 'Preise'),
    ('global', 'nav_open_source', 'de', 'Open Source'),
    ('global', 'nav_about', 'de', 'Über uns'),
    ('global', 'nav_login', 'de', 'Anmelden'),
    ('global', 'nav_signup', 'de', 'Registrieren'),
    ('global', 'footer_copyright', 'de', '© 2026 Sovereign Health Intelligence'),
    ('global', 'footer_terms', 'de', 'Nutzungsbedingungen'),
    ('global', 'footer_privacy', 'de', 'Datenschutz'),
    ('global', 'footer_impressum', 'de', 'Impressum'),
    ('global', 'footer_contact', 'de', 'Kontakt')
) AS t(page_slug, section_key, locale, value) ON wp.slug = t.page_slug AND wcs.key = t.section_key
ON CONFLICT (section_id, locale) DO NOTHING;
