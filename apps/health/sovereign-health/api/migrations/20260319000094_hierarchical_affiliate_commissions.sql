-- Hierarchical Affiliate Commissions
-- Adds parent_referrer_id to track the referral chain (2 levels max).
-- Level 1 (direct): Referrer earns standard commission (e.g., 20%)
-- Level 2 (platform override): BrickOS earns a small % on downstream referrals
--
-- Example: BrickOS → Clinic A → Patient X
--   Clinic A earns 20% on Patient X's subscription
--   BrickOS earns 2% platform override on Patient X's subscription
--
-- This migration only adds the schema. Payout logic comes later.

-- ── Step 1: Add parent_referrer_id to users ──────────────────────────────────
-- When user B signs up via referral from user A, and user A was referred by user C,
-- then B.referred_by = A.affiliate_code, B.parent_referrer_id = C.id
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_referrer_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_users_parent_referrer ON users(parent_referrer_id)
  WHERE parent_referrer_id IS NOT NULL;

-- ── Step 2: Add parent commission fields to affiliate_conversions ─────────
ALTER TABLE affiliate_conversions
  ADD COLUMN IF NOT EXISTS parent_affiliate_code VARCHAR(8),
  ADD COLUMN IF NOT EXISTS parent_commission_cents INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_commission_sats BIGINT DEFAULT 0;

-- ── Step 3: Add configurable commission rates ────────────────────────────────
-- Stored as percentages (integer basis points: 2000 = 20.00%, 200 = 2.00%)
CREATE TABLE IF NOT EXISTS affiliate_commission_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INTEGER NOT NULL,              -- 1 = direct referrer, 2 = platform override
    rate_bps INTEGER NOT NULL,           -- basis points (2000 = 20%, 200 = 2%)
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(level)
);

-- Default rates: 20% direct, 2% platform override
INSERT INTO affiliate_commission_rates (level, rate_bps, description)
VALUES
    (1, 2000, 'Direct referrer commission (20%)'),
    (2, 200, 'Platform override on downstream referrals (2%)')
ON CONFLICT (level) DO NOTHING;

-- ── Step 4: Backfill parent_referrer_id for existing referred users ──────────
-- For each user who was referred (has referred_by), look up who referred
-- their referrer, and set that as parent_referrer_id.
UPDATE users u
SET parent_referrer_id = grandparent.id
FROM users referrer
JOIN users grandparent ON referrer.referred_by = grandparent.affiliate_code
WHERE u.referred_by = referrer.affiliate_code
  AND u.parent_referrer_id IS NULL
  AND referrer.referred_by IS NOT NULL;
