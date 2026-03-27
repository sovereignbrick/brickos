-- Add product_key to license_tiers for multi-product platform support.
-- Default 'sovereign-health' covers all existing rows.
-- Design 029, Decision 1.

ALTER TABLE license_tiers ADD COLUMN IF NOT EXISTS product_key VARCHAR(50) NOT NULL DEFAULT 'sovereign-health';
CREATE INDEX IF NOT EXISTS idx_license_tiers_product_key ON license_tiers(product_key);
