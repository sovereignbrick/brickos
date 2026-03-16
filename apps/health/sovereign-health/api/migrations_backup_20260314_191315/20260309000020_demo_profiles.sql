-- Migration 020: Demo profile support
-- Adds demo_profile column to separate multiple demo health profiles.

ALTER TABLE measurements ADD COLUMN IF NOT EXISTS demo_profile VARCHAR(20) DEFAULT NULL;
ALTER TABLE calculated_marker_values ADD COLUMN IF NOT EXISTS demo_profile VARCHAR(20) DEFAULT NULL;

-- Relabel existing demo data as 'optimized' profile
UPDATE measurements SET demo_profile = 'optimized' WHERE is_demo = true AND demo_profile IS NULL;
UPDATE calculated_marker_values SET demo_profile = 'optimized' WHERE is_demo = true AND demo_profile IS NULL;

CREATE INDEX IF NOT EXISTS idx_measurements_demo_profile ON measurements(demo_profile) WHERE demo_profile IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cmv_demo_profile ON calculated_marker_values(demo_profile) WHERE demo_profile IS NOT NULL;
