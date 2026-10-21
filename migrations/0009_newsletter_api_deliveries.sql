CREATE TABLE IF NOT EXISTS newsletter_api_deliveries (
 request_id TEXT PRIMARY KEY REFERENCES newsletter_html_deliveries(request_id),
 contract_version TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('sending','accepted','rejected','unknown')),
 provider_http_status INTEGER,
 updated_at TEXT NOT NULL
);
