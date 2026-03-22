-- Rename "Thresholds"/"Grenzwerte" to "Reference Ranges"/"Referenzbereiche"
-- The i18n JSON already has the correct value but content_strings overrides at runtime
UPDATE content_strings
SET value_en = 'Reference Ranges',
    value_de = 'Referenzbereiche'
WHERE section = 'app'
  AND key = 'settings.tabs.thresholds';
