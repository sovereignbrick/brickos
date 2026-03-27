-- AI Credit Pool: unified monthly credit tracking replacing per-agent quotas.
-- Design 029, Decision 3.
-- Keeps chat_agent_quota for per-agent analytics (dual-write from tier.rs).

CREATE TABLE IF NOT EXISTS ai_credit_usage (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_year  VARCHAR(7)  NOT NULL,   -- e.g. '2026-03'
    used_credits INTEGER    NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_usage_user ON ai_credit_usage(user_id);

-- Seed from existing per-agent usage (sum all agents per user per month).
INSERT INTO ai_credit_usage (user_id, month_year, used_credits)
SELECT user_id, month_year, SUM(used_count)::integer
FROM chat_agent_quota
GROUP BY user_id, month_year
ON CONFLICT DO NOTHING;
