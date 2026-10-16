CREATE TABLE IF NOT EXISTS form_requests (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('subscribe','samples')),
  subject_hash TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('processing','accepted','failed','unknown')),
  accepted_at TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  language TEXT NOT NULL,
  provider_id TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS form_requests_subject ON form_requests(subject_hash);
CREATE TABLE IF NOT EXISTS form_rate_limits (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
