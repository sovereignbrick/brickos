-- Sprint 013: New categories (support, compliance), security features, misc fixes
--
-- 1. Move Standard Support + Dedicated Support to "support" category
-- 2. Custom Short Links: add Core ✓
-- 3. Personal Onboarding: replace "Soon" with ✓
-- 4. Nostr Login: all tiers ✓ (green checks)
-- 5. Add security features: RLS, encryption at rest, encryption in transit
-- 6. Add compliance category: GDPR, HIPAA, NIS2, ISO 27001
-- 7. Improve security tooltips

-- =========================================================================
-- 1. Move support features to "support" category
-- =========================================================================
UPDATE product_features SET category = 'support', sort_order = 10 WHERE feature_key = 'standard_support';
UPDATE product_features SET category = 'support', sort_order = 11 WHERE feature_key = 'dedicated_support';

-- =========================================================================
-- 2. Custom Short Links: add Core ✓
-- =========================================================================
UPDATE tier_features SET included = true, limit_label_en = 'Yes', limit_label_de = 'Ja'
WHERE tier_key = 'core'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'vanity_links');

-- =========================================================================
-- 3. Personal Onboarding: Horizon ✓ (green check, not "Soon")
-- =========================================================================
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE tier_key = 'horizon'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'personal_onboarding');

-- =========================================================================
-- 4. Nostr Login: all tiers green check
-- =========================================================================
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE feature_id = (SELECT id FROM product_features WHERE feature_key = 'decentralized_auth');

-- =========================================================================
-- 5. Add security features we're proud of
-- =========================================================================

-- Row-Level Security
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('row_level_security', 'Row-Level Security', 'Zeilenbasierte Sicherheit',
        'Database-level data isolation. Your data is invisible to other users — enforced by PostgreSQL, not just application code.',
        'Datenisolierung auf Datenbankebene. Deine Daten sind für andere Nutzer unsichtbar — durchgesetzt von PostgreSQL, nicht nur vom Anwendungscode.',
        'Every database query is automatically scoped to your user ID using PostgreSQL Row-Level Security (RLS) policies. Even if application code has a bug, the database itself prevents access to other users'' data. This is the gold standard for multi-tenant data isolation — the same approach used by banking and healthcare systems.',
        'Jede Datenbankabfrage wird automatisch auf deine Benutzer-ID beschränkt, mittels PostgreSQL Row-Level Security (RLS). Selbst bei einem Bug im Anwendungscode verhindert die Datenbank selbst den Zugriff auf Daten anderer Nutzer. Dies ist der Goldstandard für mandantenfähige Datenisolierung — derselbe Ansatz wie bei Bank- und Gesundheitssystemen.',
        'security', 10, 'active', 'shield')
ON CONFLICT (feature_key) DO NOTHING;

-- Encryption at Rest
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('encryption_at_rest', 'Encryption at Rest', 'Verschlüsselung im Ruhezustand',
        'Sensitive health values are encrypted in the database using AES-256-GCM. Even with database access, values are unreadable without the encryption key.',
        'Sensible Gesundheitswerte werden in der Datenbank mit AES-256-GCM verschlüsselt. Selbst mit Datenbankzugriff sind Werte ohne den Verschlüsselungsschlüssel unlesbar.',
        'All biomarker measurement values are encrypted using AES-256-GCM before being stored in PostgreSQL. The encryption key is held separately from the database. This means even if the database is compromised, your actual health values (blood glucose, cholesterol, etc.) remain encrypted and unreadable. Database administrators cannot see your health data.',
        'Alle Biomarker-Messwerte werden vor der Speicherung in PostgreSQL mit AES-256-GCM verschlüsselt. Der Verschlüsselungsschlüssel wird getrennt von der Datenbank aufbewahrt. Selbst bei einem Datenbankzugriff bleiben deine Gesundheitswerte (Blutzucker, Cholesterin usw.) verschlüsselt und unlesbar. Datenbankadministratoren können deine Gesundheitsdaten nicht einsehen.',
        'security', 11, 'active', 'lock')
ON CONFLICT (feature_key) DO NOTHING;

-- Encryption in Transit
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('encryption_in_transit', 'Encryption in Transit (TLS)', 'Verschlüsselung bei Übertragung (TLS)',
        'All data between your device and our servers is encrypted via TLS 1.3. No one can intercept or read your health data in transit.',
        'Alle Daten zwischen deinem Gerät und unseren Servern sind via TLS 1.3 verschlüsselt. Niemand kann deine Gesundheitsdaten während der Übertragung abfangen oder lesen.',
        'Every connection to Sovereign Health uses TLS 1.3 encryption — the strongest available transport security. This applies to the web app, API calls, and the PWA. Combined with Cloudflare''s edge network, your data is protected from the moment it leaves your device until it reaches our servers. HSTS headers ensure your browser never falls back to unencrypted HTTP.',
        'Jede Verbindung zu Sovereign Health nutzt TLS 1.3 Verschlüsselung — die stärkste verfügbare Transportsicherheit. Dies gilt für die Web-App, API-Aufrufe und die PWA. Zusammen mit Cloudflares Edge-Netzwerk sind deine Daten vom Moment des Verlassens deines Geräts bis zum Erreichen unserer Server geschützt. HSTS-Header stellen sicher, dass dein Browser nie auf unverschlüsseltes HTTP zurückfällt.',
        'security', 12, 'active', 'lock')
ON CONFLICT (feature_key) DO NOTHING;

-- Audit Log
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('audit_log', 'Data Access Audit Log', 'Datenzugriffs-Protokoll',
        'See exactly who accessed your data and when. Full transparency as required by GDPR Article 15.',
        'Sieh genau wer wann auf deine Daten zugegriffen hat. Volle Transparenz wie von DSGVO Artikel 15 gefordert.',
        'Every access to your health data is logged: who accessed it, when, and what they viewed. You can review your complete access history in Settings > Data & Privacy. This audit trail is your proof of data handling and a requirement under GDPR Article 15 (right of access). PostgreSQL pgAudit provides additional database-level audit logging.',
        'Jeder Zugriff auf deine Gesundheitsdaten wird protokolliert: wer darauf zugegriffen hat, wann und was angezeigt wurde. Du kannst deinen vollständigen Zugriffsverlauf unter Einstellungen > Daten & Datenschutz einsehen. Dieses Protokoll ist dein Nachweis der Datenverarbeitung und eine Anforderung nach DSGVO Artikel 15 (Auskunftsrecht). PostgreSQL pgAudit bietet zusätzliche Audit-Protokollierung auf Datenbankebene.',
        'security', 13, 'active', 'eye')
ON CONFLICT (feature_key) DO NOTHING;

-- Security features: all tiers ✓
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
SELECT tier_key, pf.id, true, NULL, NULL
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('horizon'), ('core')) AS t(tier_key)
CROSS JOIN product_features pf
WHERE pf.feature_key IN ('row_level_security', 'encryption_at_rest', 'encryption_in_transit', 'audit_log')
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- Reorder existing security features
UPDATE product_features SET sort_order = 14 WHERE feature_key = 'mfa_totp';
UPDATE product_features SET sort_order = 15 WHERE feature_key = 'tor_support';
UPDATE product_features SET sort_order = 16 WHERE feature_key = 'decentralized_auth';

-- Update Tor and MFA tooltips
UPDATE product_features SET
    tooltip_en = 'TOTP-based two-factor authentication adds an extra layer of security to your account. Use any authenticator app (Google Authenticator, Authy, Bitwarden) to generate time-based codes. Even if your password is compromised, your account stays protected.',
    tooltip_de = 'TOTP-basierte Zwei-Faktor-Authentifizierung fügt deinem Konto eine zusätzliche Sicherheitsebene hinzu. Nutze eine beliebige Authenticator-App (Google Authenticator, Authy, Bitwarden) zur Generierung zeitbasierter Codes. Selbst wenn dein Passwort kompromittiert wird, bleibt dein Konto geschützt.'
WHERE feature_key = 'mfa_totp';

UPDATE product_features SET
    tooltip_en = 'Access Sovereign Health as a Tor hidden service (.onion address). All traffic stays within the Tor network — your IP address and location are never revealed to our servers. Perfect for users in restricted environments or anyone who values maximum privacy.',
    tooltip_de = 'Greife auf Sovereign Health als Tor Hidden Service (.onion-Adresse) zu. Der gesamte Datenverkehr bleibt im Tor-Netzwerk — deine IP-Adresse und dein Standort werden nie an unsere Server übermittelt. Ideal für Nutzer in eingeschränkten Umgebungen oder alle die maximale Privatsphäre schätzen.'
WHERE feature_key = 'tor_support';

UPDATE product_features SET
    tooltip_en = 'Sign in with your Nostr identity using NIP-98 authentication. No email address or password needed — your cryptographic keypair is your identity. Your private key (nsec) is never sent to our servers. True self-sovereign authentication.',
    tooltip_de = 'Melde dich mit deiner Nostr-Identität via NIP-98-Authentifizierung an. Keine E-Mail-Adresse oder Passwort nötig — dein kryptographisches Schlüsselpaar ist deine Identität. Dein privater Schlüssel (nsec) wird nie an unsere Server gesendet. Echte selbstbestimmte Authentifizierung.'
WHERE feature_key = 'decentralized_auth';

-- =========================================================================
-- 6. Add compliance category
-- =========================================================================

-- GDPR
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('compliance_gdpr', 'GDPR (EU)', 'DSGVO (EU)',
        'European General Data Protection Regulation. Your data rights: access, portability, deletion, and consent management.',
        'Europäische Datenschutz-Grundverordnung. Deine Datenrechte: Auskunft, Portabilität, Löschung und Einwilligungsverwaltung.',
        'Sovereign Health is designed for GDPR compliance from the ground up. Implemented: consent management (Art. 7), right of access via audit log (Art. 15), data portability via JSON/CSV export (Art. 20), right to deletion, encryption of health data, and data breach notification procedures (Art. 33/34). EU data stays on EU servers. Note: full compliance certification requires external audit.',
        'Sovereign Health ist von Grund auf für DSGVO-Konformität konzipiert. Implementiert: Einwilligungsverwaltung (Art. 7), Auskunftsrecht via Audit-Log (Art. 15), Datenportabilität via JSON/CSV-Export (Art. 20), Recht auf Löschung, Verschlüsselung von Gesundheitsdaten und Verfahren zur Meldung von Datenschutzverletzungen (Art. 33/34). EU-Daten bleiben auf EU-Servern. Hinweis: Vollständige Compliance-Zertifizierung erfordert externe Prüfung.',
        'compliance', 10, 'active', 'shield')
ON CONFLICT (feature_key) DO NOTHING;

-- HIPAA
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('compliance_hipaa', 'HIPAA (US)', 'HIPAA (US)',
        'US Health Insurance Portability and Accountability Act. Technical safeguards for protected health information.',
        'US-Gesetz zur Portabilität und Rechenschaftspflicht in der Krankenversicherung. Technische Schutzmaßnahmen für geschützte Gesundheitsinformationen.',
        'Sovereign Health implements HIPAA technical safeguards: encryption at rest (AES-256-GCM), encryption in transit (TLS 1.3), access controls, audit logging, and automatic session expiry. US customer data will be hosted on US-based servers. Note: HIPAA compliance requires a Business Associate Agreement (BAA) and external audit — currently in preparation for US market launch.',
        'Sovereign Health implementiert technische HIPAA-Schutzmaßnahmen: Verschlüsselung im Ruhezustand (AES-256-GCM), Verschlüsselung bei Übertragung (TLS 1.3), Zugriffskontrollen, Audit-Protokollierung und automatischer Sitzungsablauf. US-Kundendaten werden auf US-basierten Servern gehostet. Hinweis: HIPAA-Konformität erfordert ein Business Associate Agreement (BAA) und externe Prüfung — derzeit in Vorbereitung für den US-Marktstart.',
        'compliance', 11, 'coming_soon', 'shield')
ON CONFLICT (feature_key) DO NOTHING;

-- NIS2
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('compliance_nis2', 'NIS2 Directive (EU)', 'NIS2-Richtlinie (EU)',
        'EU Network and Information Security Directive. Cybersecurity risk management and incident reporting requirements.',
        'EU-Richtlinie für Netz- und Informationssicherheit. Anforderungen an Cybersicherheits-Risikomanagement und Meldung von Vorfällen.',
        'The NIS2 Directive (effective October 2024) requires essential and important entities in the health sector to implement cybersecurity risk management measures. Sovereign Health addresses NIS2 through: encrypted data storage, access control, incident detection via monitoring (Gatus + Sentry), and documented security practices. Note: NIS2 applicability depends on organization size and sector classification — verification by qualified assessor recommended.',
        'Die NIS2-Richtlinie (gültig seit Oktober 2024) verpflichtet wesentliche und wichtige Einrichtungen im Gesundheitssektor zu Cybersicherheits-Risikomanagementmaßnahmen. Sovereign Health adressiert NIS2 durch: verschlüsselte Datenspeicherung, Zugriffskontrollen, Vorfallserkennung via Monitoring (Gatus + Sentry) und dokumentierte Sicherheitspraktiken. Hinweis: NIS2-Anwendbarkeit hängt von Organisationsgröße und Sektorklassifizierung ab — Überprüfung durch qualifizierten Prüfer empfohlen.',
        'compliance', 12, 'coming_soon', 'shield')
ON CONFLICT (feature_key) DO NOTHING;

-- ISO 27001
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('compliance_iso27001', 'ISO 27001', 'ISO 27001',
        'International standard for information security management systems (ISMS). Systematic approach to managing sensitive data.',
        'Internationaler Standard für Informationssicherheits-Managementsysteme (ISMS). Systematischer Ansatz zum Umgang mit sensiblen Daten.',
        'ISO 27001 provides a framework for establishing, implementing, and maintaining an information security management system. Sovereign Health follows ISO 27001 principles: risk assessment, access control policies, encryption standards, incident management, and continuous improvement. Note: formal ISO 27001 certification requires external audit by an accredited body — planned for enterprise readiness.',
        'ISO 27001 bietet einen Rahmen für die Einrichtung, Implementierung und Aufrechterhaltung eines Informationssicherheits-Managementsystems. Sovereign Health folgt ISO 27001-Prinzipien: Risikobewertung, Zugriffsrichtlinien, Verschlüsselungsstandards, Vorfallsmanagement und kontinuierliche Verbesserung. Hinweis: Formale ISO 27001-Zertifizierung erfordert externe Prüfung durch eine akkreditierte Stelle — geplant für Unternehmensreife.',
        'compliance', 13, 'coming_soon', 'shield')
ON CONFLICT (feature_key) DO NOTHING;

-- SOC 2
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('compliance_soc2', 'SOC 2 Type II', 'SOC 2 Typ II',
        'Service Organization Control report for security, availability, and confidentiality. Required by many US enterprise customers.',
        'Service Organization Control Bericht für Sicherheit, Verfügbarkeit und Vertraulichkeit. Von vielen US-Unternehmenskunden gefordert.',
        'SOC 2 Type II evaluates an organization''s controls for security, availability, processing integrity, confidentiality, and privacy over a period of time. Sovereign Health''s architecture supports SOC 2 requirements: encrypted data, access logging, monitoring, incident response procedures, and change management via version control. Note: SOC 2 certification requires engagement with an independent CPA firm — planned for enterprise market.',
        'SOC 2 Typ II bewertet die Kontrollen einer Organisation für Sicherheit, Verfügbarkeit, Verarbeitungsintegrität, Vertraulichkeit und Datenschutz über einen Zeitraum. Sovereign Healths Architektur unterstützt SOC 2-Anforderungen: verschlüsselte Daten, Zugriffsprotokolle, Monitoring, Vorfallsreaktionsverfahren und Änderungsmanagement via Versionskontrolle. Hinweis: SOC 2-Zertifizierung erfordert Beauftragung einer unabhängigen Wirtschaftsprüfungsgesellschaft — geplant für Unternehmensmarkt.',
        'compliance', 14, 'coming_soon', 'shield')
ON CONFLICT (feature_key) DO NOTHING;

-- Compliance features: GDPR active for all, others ✓ for Horizon (coming soon)
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'compliance_gdpr'), true, NULL, NULL
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('horizon'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- HIPAA, NIS2, ISO 27001, SOC 2: Horizon + Core
INSERT INTO tier_features (tier_key, feature_id, included)
SELECT tier_key, pf.id, CASE WHEN tier_key IN ('horizon', 'core') THEN true ELSE false END
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('horizon'), ('core')) AS t(tier_key)
CROSS JOIN product_features pf
WHERE pf.feature_key IN ('compliance_hipaa', 'compliance_nis2', 'compliance_iso27001', 'compliance_soc2')
ON CONFLICT (tier_key, feature_id) DO NOTHING;
