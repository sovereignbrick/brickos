-- Standardize soft delete pattern (Sprint 003 P1-8)
-- All soft-deletable tables should have both is_deleted and deleted_at.

-- devices: add deleted_at timestamp (has is_deleted but no timestamp)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill: set deleted_at for already soft-deleted devices
UPDATE devices SET deleted_at = updated_at WHERE is_deleted = true AND deleted_at IS NULL;

-- organizations: add deleted_at timestamp
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- influence_factors: add standard soft delete columns
-- Note: is_active is kept (different semantics: active/inactive vs deleted)
ALTER TABLE influence_factors ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE influence_factors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
