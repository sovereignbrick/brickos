-- Add Tor Browser Support and Start9 Self-Hosted Package features
-- Update decentralized_auth name to "Nostr Login (nsec)" for clarity

-- Update existing nsec/Nostr feature name
UPDATE product_features
SET name_en = 'Nostr Login (nsec)',
    name_de = 'Nostr-Anmeldung (nsec)',
    description_en = 'Sign in with your Nostr identity. No email or password required.',
    description_de = 'Melden Sie sich mit Ihrer Nostr-Identität an. Keine E-Mail oder Passwort erforderlich.',
    tooltip_en = 'Authenticate using your Nostr secret key (nsec) via NIP-98. Your key remains under your control and is never stored on our servers.',
    tooltip_de = 'Authentifizierung mit Ihrem geheimen Nostr-Schlüssel (nsec) über NIP-98. Ihr Schlüssel bleibt unter Ihrer Kontrolle und wird niemals auf unseren Servern gespeichert.',
    updated_at = NOW()
WHERE feature_key = 'decentralized_auth';

-- Tor Browser Support (security category)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES (
    'tor_support',
    'Tor Browser Support',
    'Tor-Browser-Unterstützung',
    'Access your health data anonymously via the Tor network.',
    'Greifen Sie anonym über das Tor-Netzwerk auf Ihre Gesundheitsdaten zu.',
    'Your health dashboard is accessible as a Tor onion service. All traffic stays within the Tor network -- your IP address is never revealed to our servers.',
    'Ihr Gesundheits-Dashboard ist als Tor-Onion-Service erreichbar. Der gesamte Datenverkehr bleibt im Tor-Netzwerk -- Ihre IP-Adresse wird niemals an unsere Server übermittelt.',
    'security',
    20,
    'coming_soon',
    NULL
)
ON CONFLICT (feature_key) DO NOTHING;

-- Start9 Self-Hosted Package (integrations category)
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES (
    'start9_package',
    'StartOS Package',
    'StartOS-Paket',
    'Run Sovereign Health on your Start9 server at home.',
    'Betreiben Sie Sovereign Health auf Ihrem Start9-Server zu Hause.',
    'One-click installation via the StartOS marketplace. Automatic Tor onion service, local database, full data sovereignty. Your health data never leaves your home network.',
    'Ein-Klick-Installation über den StartOS-Marktplatz. Automatischer Tor-Onion-Service, lokale Datenbank, volle Datensouveränität. Ihre Gesundheitsdaten verlassen nie Ihr Heimnetzwerk.',
    'integrations',
    15,
    'coming_soon',
    NULL
)
ON CONFLICT (feature_key) DO NOTHING;

-- tier_features entries: all tiers get these features (included=true, no limit)
-- Uses tier_key (text slug) not tier_id (UUID)

-- Tor support for all tiers
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT lt.slug, pf.id, true, NULL, NULL, NULL
FROM license_tiers lt
CROSS JOIN product_features pf
WHERE pf.feature_key = 'tor_support'
ON CONFLICT DO NOTHING;

-- Start9 package for all tiers
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT lt.slug, pf.id, true, NULL, NULL, NULL
FROM license_tiers lt
CROSS JOIN product_features pf
WHERE pf.feature_key = 'start9_package'
ON CONFLICT DO NOTHING;

-- Ensure decentralized_auth (nsec) is available to ALL tiers (including glimpse)
INSERT INTO tier_features (tier_key, feature_id, included, limit_value, limit_label_en, limit_label_de)
SELECT lt.slug, pf.id, true, NULL, NULL, NULL
FROM license_tiers lt
CROSS JOIN product_features pf
WHERE pf.feature_key = 'decentralized_auth'
ON CONFLICT DO NOTHING;
