-- Sprint 013: Reporting features — all tiers ✓, add GDPR export, fix PDF reports
--
-- 1. CSV Export: all tiers ✓ (was X for Glimpse)
-- 2. JSON Export: all tiers ✓ (was X for Glimpse)
-- 3. Add GDPR Data Export feature (all tiers ✓)
-- 4. PDF Health Reports: Insight/Clarity/Horizon ✓ (no limits), improve descriptions

-- =========================================================================
-- 1. CSV Export: enable for Glimpse
-- =========================================================================
UPDATE license_tiers SET csv_export = true WHERE slug = 'glimpse';

UPDATE tier_features SET included = true, limit_label_en = 'Yes', limit_label_de = 'Ja'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'csv_export');

-- Update CSV tooltip
UPDATE product_features SET
    description_en = 'Download your measurement data as a CSV spreadsheet. Open in Excel, Google Sheets, or any data tool.',
    description_de = 'Lade deine Messdaten als CSV-Tabelle herunter. Öffne sie in Excel, Google Sheets oder einem Analyse-Tool.',
    tooltip_en = 'Export all your biomarker measurements to a CSV file. Includes timestamps, values, units, protocols, and lifestyle context. Perfect for sharing with your doctor or importing into other health tools.',
    tooltip_de = 'Exportiere alle deine Biomarker-Messungen als CSV-Datei. Beinhaltet Zeitstempel, Werte, Einheiten, Protokolle und Lebensstil-Kontext. Ideal zum Teilen mit deinem Arzt oder Import in andere Gesundheits-Tools.'
WHERE feature_key = 'csv_export';

-- =========================================================================
-- 2. JSON Export: enable for Glimpse
-- =========================================================================
UPDATE license_tiers SET json_export = true WHERE slug = 'glimpse';

UPDATE tier_features SET included = true, limit_label_en = 'Yes', limit_label_de = 'Ja'
WHERE tier_key = 'glimpse'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'json_export');

-- Update JSON tooltip
UPDATE product_features SET
    description_en = 'Download your complete health profile as structured JSON data. Machine-readable format for developers and integrations.',
    description_de = 'Lade dein komplettes Gesundheitsprofil als strukturierte JSON-Daten herunter. Maschinenlesbares Format für Entwickler und Integrationen.',
    tooltip_en = 'Full data export in JSON format including measurements, calculated markers, settings, and health zones. Use for data portability, backup, or integration with other systems. Your data, your format.',
    tooltip_de = 'Vollständiger Datenexport im JSON-Format inkl. Messungen, berechneter Marker, Einstellungen und Gesundheitszonen. Nutze es für Datenportabilität, Backup oder Integration mit anderen Systemen. Deine Daten, dein Format.'
WHERE feature_key = 'json_export';

-- =========================================================================
-- 3. Add GDPR Data Export (Art. 20 — data portability)
-- =========================================================================
INSERT INTO product_features (feature_key, name_en, name_de, description_en, description_de, tooltip_en, tooltip_de, category, sort_order, status, icon)
VALUES ('gdpr_export', 'Export All Data (GDPR)', 'Alle Daten exportieren (DSGVO)',
        'Download everything we store about you. Your right under GDPR Article 20.',
        'Lade alles herunter was wir über dich speichern. Dein Recht nach DSGVO Artikel 20.',
        'Complete data portability export as required by GDPR Article 20. Includes your profile, all measurements, medications, Dr. Alex conversations, access logs, and settings. One-click download of everything — because your health data belongs to you.',
        'Kompletter Datenportabilitäts-Export gemäß DSGVO Artikel 20. Beinhaltet dein Profil, alle Messungen, Medikamente, Dr. Alex Gespräche, Zugriffsprotokolle und Einstellungen. Ein-Klick-Download von allem — weil deine Gesundheitsdaten dir gehören.',
        'reporting', 35, 'active', 'download')
ON CONFLICT (feature_key) DO UPDATE SET
    name_en = EXCLUDED.name_en, name_de = EXCLUDED.name_de,
    description_en = EXCLUDED.description_en, description_de = EXCLUDED.description_de,
    tooltip_en = EXCLUDED.tooltip_en, tooltip_de = EXCLUDED.tooltip_de;

-- GDPR Export: all tiers ✓
INSERT INTO tier_features (tier_key, feature_id, included, limit_label_en, limit_label_de)
SELECT tier_key, (SELECT id FROM product_features WHERE feature_key = 'gdpr_export'), true, 'Yes', 'Ja'
FROM (VALUES ('glimpse'), ('focus'), ('insight'), ('clarity'), ('horizon'), ('core')) AS t(tier_key)
ON CONFLICT (tier_key, feature_id) DO NOTHING;

-- =========================================================================
-- 4. PDF Health Reports: update limits and descriptions
-- =========================================================================
UPDATE product_features SET
    status = 'active',
    description_en = 'Beautiful PDF health reports you can share with your doctor. Includes biomarker overview, trends, and reference ranges.',
    description_de = 'Ansprechende PDF-Gesundheitsberichte zum Teilen mit deinem Arzt. Beinhaltet Biomarker-Überblick, Trends und Referenzbereiche.',
    tooltip_en = 'Generate a professional PDF health report with your biomarker summary, trend charts, traffic-light status indicators, and personalized reference ranges. Share with your doctor, print for your records, or keep as a health snapshot. Available for Insight tier and above.',
    tooltip_de = 'Erstelle einen professionellen PDF-Gesundheitsbericht mit deiner Biomarker-Zusammenfassung, Trend-Diagrammen, Ampel-Statusindikatoren und personalisierten Referenzbereichen. Teile ihn mit deinem Arzt, drucke ihn aus oder behalte ihn als Gesundheits-Momentaufnahme.'
WHERE feature_key = 'pdf_reports';

-- PDF: Insight ✓ (no limit label, just green check)
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE tier_key = 'insight'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'pdf_reports');

-- PDF: Clarity ✓
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE tier_key = 'clarity'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'pdf_reports');

-- PDF: Horizon ✓
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE tier_key = 'horizon'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'pdf_reports');

-- PDF: Core ✓
UPDATE tier_features SET included = true, limit_value = NULL, limit_label_en = NULL, limit_label_de = NULL
WHERE tier_key = 'core'
  AND feature_id = (SELECT id FROM product_features WHERE feature_key = 'pdf_reports');
