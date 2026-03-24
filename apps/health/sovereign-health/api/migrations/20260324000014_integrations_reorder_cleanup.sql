-- Sprint 013: Integrations section — reorder, cleanup, improve descriptions
--
-- 1. Active features first, coming_soon at end
-- 2. Remove Priority Support (duplicate of Dedicated Support)
-- 3. Standard Support + Dedicated Support together
-- 4. Self-Hosted Hybrid: Core ✓ (no text), Horizon ✓ (no text)
-- 5. Add LOINC Integration for Horizon
-- 6. Improve all tooltips and descriptions

-- =========================================================================
-- 1. Reorder Integrations — active first, coming_soon at end
-- =========================================================================

-- Active features (top)
-- Standard Support
UPDATE product_features SET
    sort_order = 50,
    description_en = 'Community forum and email support. We typically respond within 24 hours on business days.',
    description_de = 'Community-Forum und E-Mail-Support. Wir antworten in der Regel innerhalb von 24 Stunden an Werktagen.',
    tooltip_en = 'Get help via our community forum or email. Our team monitors support requests daily and responds within 24 hours. Access to documentation, FAQ, and community discussions included for all plans.',
    tooltip_de = 'Erhalte Hilfe über unser Community-Forum oder per E-Mail. Unser Team bearbeitet Support-Anfragen täglich und antwortet innerhalb von 24 Stunden. Zugang zu Dokumentation, FAQ und Community-Diskussionen für alle Pläne.'
WHERE feature_key = 'standard_support';

-- Dedicated Support (right after Standard)
UPDATE product_features SET
    sort_order = 51,
    description_en = 'Personal email support with guaranteed 4-hour response time. Direct access to the development team.',
    description_de = 'Persönlicher E-Mail-Support mit garantierter 4-Stunden-Antwortzeit. Direkter Zugang zum Entwicklerteam.',
    tooltip_en = 'Priority support channel with guaranteed 4-hour response during business hours. Direct communication with the development team for technical questions, integration help, and feature requests. Includes onboarding assistance and quarterly health-check calls.',
    tooltip_de = 'Prioritäts-Support-Kanal mit garantierter 4-Stunden-Antwort während der Geschäftszeiten. Direkte Kommunikation mit dem Entwicklerteam für technische Fragen, Integrationshilfe und Feature-Anfragen. Beinhaltet Onboarding-Unterstützung und vierteljährliche Check-in-Gespräche.'
WHERE feature_key = 'dedicated_support';

-- Progressive Web App
UPDATE product_features SET
    sort_order = 52,
    description_en = 'Install Sovereign Health on your phone or desktop. Works offline with cached data and syncs when you reconnect.',
    description_de = 'Installiere Sovereign Health auf deinem Handy oder Desktop. Funktioniert offline mit gespeicherten Daten und synchronisiert bei Verbindung.',
    tooltip_en = 'Install the app directly from your browser — no app store needed. Works on Android, iOS, Windows, macOS, and Linux. Offline mode caches your data so you can view measurements and trends without internet. New measurements sync automatically when you reconnect.',
    tooltip_de = 'Installiere die App direkt aus deinem Browser — kein App Store nötig. Funktioniert auf Android, iOS, Windows, macOS und Linux. Offline-Modus speichert deine Daten, sodass du Messungen und Trends ohne Internet ansehen kannst. Neue Messungen werden bei Verbindung automatisch synchronisiert.'
WHERE feature_key = 'pwa';

-- Custom Short Links
UPDATE product_features SET
    sort_order = 53,
    description_en = 'Choose a custom vanity URL for your referral link. Share brickos.io/r/yourname instead of a random code.',
    description_de = 'Wähle eine eigene URL für deinen Empfehlungslink. Teile brickos.io/r/deinname statt eines zufälligen Codes.',
    tooltip_en = 'Create a memorable custom short link for your affiliate referral URL. Choose a permanent vanity code like brickos.io/r/yourname. Includes QR code generation for easy sharing at events or on business cards. Available for Clarity and Horizon tiers.',
    tooltip_de = 'Erstelle einen einprägsamen eigenen Kurzlink für deine Affiliate-Empfehlungs-URL. Wähle einen dauerhaften Code wie brickos.io/r/deinname. Beinhaltet QR-Code-Generierung zum einfachen Teilen bei Events oder auf Visitenkarten. Verfügbar für Clarity und Horizon.'
WHERE feature_key = 'vanity_links';

-- Coming Soon features (bottom)

-- Self-Hosted Hybrid
UPDATE product_features SET
    sort_order = 60,
    description_en = 'Run Sovereign Health on your own server with optional cloud sync. Full data sovereignty with the convenience of managed updates.',
    description_de = 'Betreibe Sovereign Health auf deinem eigenen Server mit optionaler Cloud-Synchronisation. Volle Datensouveränität mit dem Komfort verwalteter Updates.',
    tooltip_en = 'Deploy Sovereign Health on your own infrastructure using Docker. Your health data stays on your hardware. Optional cloud sync keeps your data backed up and accessible from mobile devices. Includes automatic updates and migration support.',
    tooltip_de = 'Betreibe Sovereign Health auf deiner eigenen Infrastruktur mit Docker. Deine Gesundheitsdaten bleiben auf deiner Hardware. Optionale Cloud-Synchronisation hält deine Daten gesichert und von Mobilgeräten erreichbar. Beinhaltet automatische Updates und Migrationssupport.'
WHERE feature_key = 'self_hosted_hybrid';

-- Self-Hosted Hybrid: Core and Horizon get green check (no text)
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE tier_key IN ('core', 'horizon')
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'self_hosted_hybrid');

-- StartOS Package
UPDATE product_features SET
    sort_order = 61,
    description_en = 'One-click installation on StartOS. Run Sovereign Health on a Raspberry Pi or mini PC at home with automatic Tor access.',
    description_de = 'Ein-Klick-Installation auf StartOS. Betreibe Sovereign Health auf einem Raspberry Pi oder Mini-PC zu Hause mit automatischem Tor-Zugang.',
    tooltip_en = 'Install Sovereign Health from the StartOS marketplace in one click. Runs on a Raspberry Pi, mini PC, or any StartOS-compatible hardware. Automatic Tor onion service for private access. Local PostgreSQL database — your health data never leaves your home network. Zero cloud dependency.',
    tooltip_de = 'Installiere Sovereign Health mit einem Klick vom StartOS-Marktplatz. Läuft auf Raspberry Pi, Mini-PC oder jeder StartOS-kompatiblen Hardware. Automatischer Tor-Onion-Service für privaten Zugang. Lokale PostgreSQL-Datenbank — deine Gesundheitsdaten verlassen nie dein Heimnetzwerk.'
WHERE feature_key = 'start9_package';

-- REST API Access
UPDATE product_features SET
    sort_order = 62,
    description_en = 'Programmatic access to your health data via REST API. Build integrations, automate workflows, or connect to other health tools.',
    description_de = 'Programmatischer Zugriff auf deine Gesundheitsdaten via REST API. Erstelle Integrationen, automatisiere Workflows oder verbinde andere Gesundheits-Tools.',
    tooltip_en = 'Full REST API access to read and write your health data programmatically. Authenticated via JWT tokens. Use for custom dashboards, automated imports from wearables, integration with other health platforms, or building your own tools on top of Sovereign Health.',
    tooltip_de = 'Voller REST-API-Zugriff zum programmatischen Lesen und Schreiben deiner Gesundheitsdaten. Authentifiziert via JWT-Tokens. Nutze es für eigene Dashboards, automatisierte Imports von Wearables, Integration mit anderen Gesundheitsplattformen oder eigene Tools auf Basis von Sovereign Health.'
WHERE feature_key = 'api_access';

-- Personal Onboarding
UPDATE product_features SET
    sort_order = 63,
    description_en = 'One-on-one setup session with our team. We help you configure your profile, import your first lab results, and get the most from Dr. Alex.',
    description_de = 'Persönliches Setup-Gespräch mit unserem Team. Wir helfen dir dein Profil einzurichten, deine ersten Laborergebnisse zu importieren und das Beste aus Dr. Alex herauszuholen.',
    tooltip_en = '30-minute video call with a team member. We walk you through profile setup, device registration, your first lab import, custom reference ranges, and Dr. Alex features. Get personalized tips based on your health goals and dietary protocol.',
    tooltip_de = '30-minütiges Videogespräch mit einem Teammitglied. Wir führen dich durch Profilsetup, Geräteregistrierung, deinen ersten Laborimport, eigene Referenzbereiche und Dr. Alex Funktionen. Erhalte personalisierte Tipps basierend auf deinen Gesundheitszielen und Ernährungsprotokoll.'
WHERE feature_key = 'personal_onboarding';

-- White-Labeling
UPDATE product_features SET
    sort_order = 64,
    description_en = 'Custom branding for your organization. Your logo, your colors, your domain. Offer Sovereign Health under your own brand.',
    description_de = 'Eigenes Branding für deine Organisation. Dein Logo, deine Farben, deine Domain. Biete Sovereign Health unter deiner eigenen Marke an.',
    tooltip_en = 'Full white-label customization for clinics, coaches, and enterprises. Replace the Sovereign Health branding with your own logo, color scheme, and custom domain. Your clients see your brand — powered by Sovereign Health technology under the hood.',
    tooltip_de = 'Vollständige White-Label-Anpassung für Kliniken, Coaches und Unternehmen. Ersetze das Sovereign Health Branding durch dein eigenes Logo, Farbschema und eigene Domain. Deine Kunden sehen deine Marke — angetrieben von Sovereign Health Technologie.'
WHERE feature_key = 'white_label';

-- =========================================================================
-- 2. Remove Priority Support (duplicate of Dedicated Support)
-- =========================================================================
DELETE FROM tier_features WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'priority_support');
DELETE FROM product_features WHERE feature_key = 'priority_support';

-- =========================================================================
-- 3. Add LOINC Integration for Horizon
-- =========================================================================
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('loinc_integration', 'LOINC Integration', 'LOINC-Integration',
        'Standardized medical coding for interoperability with clinical systems. Map your markers to international LOINC codes.',
        'Standardisierte medizinische Kodierung für Interoperabilität mit klinischen Systemen. Ordne deine Marker internationalen LOINC-Codes zu.',
        'LOINC (Logical Observation Identifiers Names and Codes) is the international standard for identifying medical laboratory observations. With LOINC integration, your biomarker data is coded in a format that clinical systems, electronic health records (EHR), and research databases understand. Enables seamless data exchange with hospitals, labs, and health information exchanges.',
        'LOINC (Logical Observation Identifiers Names and Codes) ist der internationale Standard zur Identifikation medizinischer Laborbeobachtungen. Mit LOINC-Integration werden deine Biomarker-Daten in einem Format kodiert, das klinische Systeme, elektronische Gesundheitsakten (EGA) und Forschungsdatenbanken verstehen. Ermöglicht nahtlosen Datenaustausch mit Krankenhäusern, Laboren und Gesundheitsinformationssystemen.',
        'integrations', 65, 'coming_soon', 'database')
ON CONFLICT (feature_key) DO UPDATE SET
    name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de,
    description_en = EXCLUDED.description_en, description_de = EXCLUDED.description_de,
    tooltip_en = EXCLUDED.tooltip_en, tooltip_de = EXCLUDED.tooltip_de,
    sort_order = EXCLUDED.sort_order;

-- LOINC: Horizon only
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
VALUES ('horizon', (SELECT id FROM product_features WHERE feature_key = 'loinc_integration'), true, 'Yes', 'Ja')
ON CONFLICT (tier_key, feature_id) DO NOTHING;

INSERT INTO tier_features (tier_key, feature_id, included)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'loinc_integration'), false
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;
