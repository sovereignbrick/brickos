-- Batch 28: Smart Import - lab photo/PDF AI extraction

CREATE TABLE IF NOT EXISTS import_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name       TEXT NOT NULL,
    file_type       TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    import_type     TEXT NOT NULL DEFAULT 'lab_import',
    status          TEXT NOT NULL DEFAULT 'uploaded',
    extracted_data  JSONB,
    matched_data    JSONB,
    confirmed_data  JSONB,
    lab_date        DATE,
    lab_provider    TEXT,
    markers_extracted INT NOT NULL DEFAULT 0,
    markers_imported  INT NOT NULL DEFAULT 0,
    ai_tokens_used  INT,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_sessions_user ON import_sessions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS import_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    import_type     TEXT NOT NULL,
    source_type     TEXT NOT NULL,
    markers_extracted INT NOT NULL DEFAULT 0,
    markers_imported  INT NOT NULL DEFAULT 0,
    lab_date        DATE,
    lab_provider    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_history_user ON import_history(user_id, created_at DESC);
