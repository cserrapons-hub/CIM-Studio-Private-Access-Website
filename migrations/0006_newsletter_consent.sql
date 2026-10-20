CREATE TABLE IF NOT EXISTS newsletter_consent_requests (
 request_id TEXT PRIMARY KEY,
 subject_hash TEXT NOT NULL,
 accepted_at TEXT NOT NULL,
 purpose TEXT NOT NULL CHECK(purpose='newsletter-private-access'),
 language TEXT NOT NULL CHECK(language IN ('es','en')),
 consent_text TEXT NOT NULL,
 policy_version TEXT NOT NULL,
 custom_field_id TEXT NOT NULL,
 custom_value TEXT NOT NULL,
 encrypted_email TEXT NOT NULL,
 evidence_mac TEXT NOT NULL
);
