CREATE TABLE IF NOT EXISTS registration_audit_seals (
 event_id TEXT PRIMARY KEY,
 registration_id TEXT NOT NULL,
 evidence_json TEXT NOT NULL,
 evidence_mac TEXT NOT NULL
);
