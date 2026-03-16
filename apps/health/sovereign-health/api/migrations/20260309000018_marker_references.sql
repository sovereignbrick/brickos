-- Migration 018: marker_references table for scientific references/PubMed links

CREATE TABLE marker_references (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marker_id    VARCHAR(50) NOT NULL,
    title        TEXT NOT NULL,
    source       VARCHAR(200),
    year         INT,
    url          VARCHAR(500),
    display_order INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_marker_references_marker ON marker_references(marker_id);
