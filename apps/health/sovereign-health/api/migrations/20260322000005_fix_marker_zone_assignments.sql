-- Fix marker-to-zone misassignments identified in Sprint 007 audit.
--
-- 1. Move mcv, mch, mchc, rdw from immune → structural (blood indices, not immune cells)
-- 2. Move rbc, hemoglobin, hematocrit from immune → structural (hematologic, not immune)
-- 3. Remove creatinine from cognitive zone (too indirect; keep in detoxification + structural)
-- 4. Add homocysteine to cardiovascular zone (established CV risk marker)

-- ── 1. RBC indices: immune → structural ──
UPDATE markers SET zone_id = (SELECT id FROM zones WHERE zone_slug = 'structural')
WHERE marker_slug IN ('mcv', 'mch', 'mchc', 'rdw')
  AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'immune');

UPDATE zone_markers SET zone_slug = 'structural'
WHERE marker_slug IN ('mcv', 'mch', 'mchc', 'rdw')
  AND zone_slug = 'immune';

-- ── 2. RBC, hemoglobin, hematocrit: immune → structural ──
UPDATE markers SET zone_id = (SELECT id FROM zones WHERE zone_slug = 'structural')
WHERE marker_slug IN ('rbc', 'hemoglobin', 'hematocrit')
  AND zone_id = (SELECT id FROM zones WHERE zone_slug = 'immune');

UPDATE zone_markers SET zone_slug = 'structural'
WHERE marker_slug IN ('rbc', 'hemoglobin', 'hematocrit')
  AND zone_slug = 'immune';

-- ── 3. Remove creatinine from cognitive zone ──
DELETE FROM zone_markers
WHERE marker_slug = 'creatinine' AND zone_slug = 'cognitive';

-- ── 4. Add homocysteine to cardiovascular zone ──
INSERT INTO zone_markers (marker_slug, zone_slug, marker_type)
VALUES ('homocysteine', 'cardiovascular', 'standard')
ON CONFLICT DO NOTHING;
