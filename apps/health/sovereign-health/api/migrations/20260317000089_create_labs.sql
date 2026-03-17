-- Labs: store laboratory information separately from devices
CREATE TABLE IF NOT EXISTS labs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    address         TEXT,
    postal_code     TEXT,
    city            TEXT,
    country         TEXT,
    phone           TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_labs_user ON labs(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_labs_user_name ON labs(user_id, name);

-- Add lab_id to measurements (nullable — only set for lab-imported measurements)
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS lab_id UUID REFERENCES labs(id);
CREATE INDEX IF NOT EXISTS idx_measurements_lab ON measurements(lab_id) WHERE lab_id IS NOT NULL;

-- Add lab_id to import_sessions so we can track which lab was used
ALTER TABLE import_sessions ADD COLUMN IF NOT EXISTS lab_id UUID REFERENCES labs(id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER trg_labs_updated_at
    BEFORE UPDATE ON labs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
