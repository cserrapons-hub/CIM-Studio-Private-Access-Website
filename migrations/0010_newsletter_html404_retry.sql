CREATE TABLE IF NOT EXISTS newsletter_retry_permits (
 parent_request_id TEXT PRIMARY KEY REFERENCES newsletter_html_deliveries(request_id),
 api_request_id TEXT NOT NULL UNIQUE,
 subject_hash TEXT NOT NULL UNIQUE,
 issued_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL CHECK(expires_at > issued_at AND expires_at <= issued_at + 900),
 approved_by TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
 consumed_at INTEGER
);
CREATE TABLE IF NOT EXISTS newsletter_retry_attempts (
 request_id TEXT PRIMARY KEY REFERENCES newsletter_retry_permits(api_request_id),
 parent_request_id TEXT NOT NULL UNIQUE REFERENCES newsletter_retry_permits(parent_request_id),
 subject_hash TEXT NOT NULL UNIQUE,
 contract_version TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('sending','accepted','rejected','unknown')),
 provider_http_status INTEGER,
 started_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
