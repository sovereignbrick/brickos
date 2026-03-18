-- Remove consent_product_updates column from user_profile.
-- This consent type is no longer collected or used.
ALTER TABLE user_profile DROP COLUMN IF EXISTS consent_product_updates;
