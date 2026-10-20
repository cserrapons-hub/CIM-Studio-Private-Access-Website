CREATE TABLE IF NOT EXISTS newsletter_html_deliveries (
 request_id TEXT PRIMARY KEY,
 subject_hash TEXT NOT NULL UNIQUE,
 state TEXT NOT NULL CHECK(state IN ('sending','unverified','rejected','unknown')),
 provider_http_status INTEGER,
 started_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 lease_until INTEGER NOT NULL
);
