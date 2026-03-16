-- Migration 024: Encryption at rest - change column types to TEXT for encrypted storage.
-- After this migration, the encrypt-existing-data binary must be run to
-- encrypt existing plaintext values.

-- measurements.value_canonical: NUMERIC(12,4) -> TEXT
-- Cast existing numeric values to text so they survive the type change.
ALTER TABLE measurements ALTER COLUMN value_canonical TYPE TEXT USING value_canonical::text;

-- Drop the CHECK constraint on lifestyle_note length.
-- Encrypted text is longer than plaintext due to base64 + prefix overhead.
-- Validation is enforced in the application layer before encryption.
ALTER TABLE measurements DROP CONSTRAINT IF EXISTS measurements_lifestyle_note_check;

-- user_profile.height_cm: NUMERIC(5,1) -> TEXT
ALTER TABLE user_profile ALTER COLUMN height_cm TYPE TEXT USING height_cm::text;

-- user_profile.age: INT -> TEXT (not actively used yet, but future-proofing)
ALTER TABLE user_profile ALTER COLUMN age TYPE TEXT USING age::text;

-- user_profile.default_waist_cm: NUMERIC(5,1) -> TEXT
ALTER TABLE user_profile ALTER COLUMN default_waist_cm TYPE TEXT USING default_waist_cm::text;

-- user_profile.default_weight_kg: NUMERIC(5,1) -> TEXT
ALTER TABLE user_profile ALTER COLUMN default_weight_kg TYPE TEXT USING default_weight_kg::text;

-- Key rotation procedure (not implemented, documented for reference):
-- 1. Generate new key: openssl rand -hex 32
-- 2. Set OLD_ENCRYPTION_KEY and NEW_ENCRYPTION_KEY in env
-- 3. Run rotation script: decrypt with old key, re-encrypt with new key
-- 4. Update ENCRYPTION_KEY to new key
-- 5. Remove OLD_ENCRYPTION_KEY
