-- Add brand column to influence_factors (needed for Dr. Alex supplement import)
ALTER TABLE influence_factors ADD COLUMN IF NOT EXISTS brand VARCHAR(200);
