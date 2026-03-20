-- Sprint 004: Add German translations for license tiers
-- EN translations exist but DE was never populated.

INSERT INTO license_tier_translations (tier_id, locale, name, tagline, description, features_summary)
SELECT lt.id, 'de', t.name_de, t.tagline_de, t.description_de, NULL
FROM license_tiers lt
JOIN (VALUES
  ('core',    'Core',    'Dein Server, deine Regeln',              'Selbstgehostete Open-Source-Edition. Voller Zugriff, keine Limits, vollständige Datensouveränität.'),
  ('glimpse', 'Glimpse', 'Starte deine Gesundheitsreise',         'Kostenloser Zugang zur Erkundung deiner Gesundheitsdaten. Verfolge deine wichtigsten Marker und erhalte einen Vorgeschmack auf KI-gestützte Gesundheitseinblicke.'),
  ('focus',   'Focus',   'Übernimm die Kontrolle über deine Gesundheit', 'Schalte alle Marker, vollständigen Verlauf und personalisierte Ziele frei. Das wichtigste Werkzeug für alle, die ihre Gesundheit ernst nehmen.'),
  ('insight', 'Insight', 'Verstehe das Gesamtbild',               'Erweiterte KI-Analyse, intelligenter Labordaten-Import und detaillierte Gesundheitsberichte. Für Gesundheitsbewusste, die tieferes Verständnis wollen.'),
  ('clarity', 'Clarity', 'Optimiere jeden Marker',                'Unbegrenzter KI-Zugang, Kohortenvergleich und Team-Sharing. Für Biohacker und Gesundheitsoptimierer, die alles tracken.'),
  ('horizon', 'Horizon', 'Vollständige Gesundheitssouveränität',  'Alles unbegrenzt. API-Zugang, selbstgehosteter Hybrid, 10-Mitglieder-Team-Sharing und dedizierter Support. Für Profis und Power-User.')
) AS t(slug, name_de, tagline_de, description_de) ON lt.slug = t.slug
ON CONFLICT (tier_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  updated_at = NOW();
