-- Populate features_summary for all tiers in EN and DE
-- These match the website pricing page content

-- EN
UPDATE license_tier_translations SET features_summary = t.summary
FROM (VALUES
  ('core',    'All markers, Self-hosting, API access, Full data control'),
  ('glimpse', '10 markers, Basic dashboard, 3 AI questions/month'),
  ('focus',   '75+ markers, AI insights, Cloud sync, 5 AI questions/month'),
  ('insight', 'Everything in Focus plus experiments, comparisons, 15 AI questions/month'),
  ('clarity', 'Everything in Insight plus unlimited AI, coaching, API access'),
  ('horizon', 'Everything in Clarity plus white-label, multi-user, enterprise features')
) AS t(slug, summary)
JOIN license_tiers lt ON lt.slug = t.slug
WHERE license_tier_translations.tier_id = lt.id
  AND license_tier_translations.locale = 'en'
  AND license_tier_translations.features_summary IS NULL;

-- DE
UPDATE license_tier_translations SET features_summary = t.summary
FROM (VALUES
  ('core',    'Alle Marker, Self-Hosting, API-Zugang, Volle Datenkontrolle'),
  ('glimpse', '10 Marker, Basis-Dashboard, 3 KI-Fragen/Monat'),
  ('focus',   '75+ Marker, KI-Einblicke, Cloud-Sync, 5 KI-Fragen/Monat'),
  ('insight', 'Alles in Focus plus Experimente, Vergleiche, 15 KI-Fragen/Monat'),
  ('clarity', 'Alles in Insight plus unbegrenzte KI, Coaching, API-Zugang'),
  ('horizon', 'Alles in Clarity plus White-Label, Multi-Nutzer, Unternehmensfunktionen')
) AS t(slug, summary)
JOIN license_tiers lt ON lt.slug = t.slug
WHERE license_tier_translations.tier_id = lt.id
  AND license_tier_translations.locale = 'de'
  AND license_tier_translations.features_summary IS NULL;
