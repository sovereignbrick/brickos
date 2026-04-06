-- Migration: add NOSTR pubkey to users for NIP-98 login
-- Ported from Sovereign Link's standalone auth model

ALTER TABLE users ADD COLUMN IF NOT EXISTS nostr_pubkey VARCHAR(64) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_nostr_pubkey ON users(nostr_pubkey);
