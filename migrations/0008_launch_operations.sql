CREATE TABLE IF NOT EXISTS registration_audit_seals (
 event_id TEXT PRIMARY KEY,
 registration_id TEXT NOT NULL,
 evidence_json TEXT NOT NULL,
 evidence_mac TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS registration_submission_claims (
 fingerprint TEXT PRIMARY KEY,
 request_id TEXT NOT NULL UNIQUE,
 registration_id TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS newsletter_observations (
 id TEXT PRIMARY KEY,
 request_id TEXT,
 subject_hash TEXT NOT NULL,
 phase TEXT NOT NULL CHECK(phase IN ('before','after','unsubscribe')),
 observed_at TEXT NOT NULL,
 evidence_json TEXT NOT NULL,
 evidence_mac TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS newsletter_http_receipts (
 request_id TEXT PRIMARY KEY,
 accepted_at TEXT NOT NULL,
 contract_version TEXT NOT NULL,
 evidence_mac TEXT NOT NULL
);
