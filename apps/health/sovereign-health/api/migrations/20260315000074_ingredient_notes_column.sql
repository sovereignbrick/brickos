-- Add notes and role columns to influence_factor_ingredients
-- notes: for AI comments e.g. "equivalent to 20,000 IU"
-- role: active ingredient (Wirkstoff) or auxiliary/excipient (Hilfsstoff)
ALTER TABLE influence_factor_ingredients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE influence_factor_ingredients ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'active';

-- Fix existing data: the unit column was incorrectly storing role values
-- Move "active" and "auxiliary" from unit to role, set unit to NULL
UPDATE influence_factor_ingredients SET role = unit, unit = NULL
WHERE unit IN ('active', 'auxiliary');
