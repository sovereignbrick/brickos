-- Add BTC rate locking and payout method snapshot columns to affiliate_conversions
ALTER TABLE affiliate_conversions ADD COLUMN IF NOT EXISTS btc_eur_rate DOUBLE PRECISION;
ALTER TABLE affiliate_conversions ADD COLUMN IF NOT EXISTS rate_locked_at TIMESTAMPTZ;
ALTER TABLE affiliate_conversions ADD COLUMN IF NOT EXISTS payout_method_snapshot TEXT;
-- payout_method_snapshot: 'eur' or 'btc_onchain', frozen when commission becomes pending
-- NULL for legacy rows (treat as 'eur')
