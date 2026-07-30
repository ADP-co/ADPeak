CREATE TABLE IF NOT EXISTS app_evidence (
  storage_ref TEXT PRIMARY KEY,
  content BYTEA NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_evidence_updated_at_idx
  ON app_evidence (updated_at DESC);
