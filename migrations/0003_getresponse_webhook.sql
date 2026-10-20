-- Minimal quarantined evidence; never store raw payloads, email addresses, tokens or sender IPs.
CREATE TABLE IF NOT EXISTS gr_webhook_receipts (
 event_key TEXT PRIMARY KEY CHECK(length(event_key)=64),
 subject_hash TEXT NOT NULL CHECK(length(subject_hash)=64),
 campaign_id TEXT NOT NULL,
 contact_id TEXT NOT NULL,
 form_id TEXT,
 occurred_at TEXT NOT NULL,
 received_at TEXT NOT NULL,
 payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256)=64),
 state TEXT NOT NULL CHECK(state IN ('quarantined','verified','after_cutoff')),
 reason TEXT NOT NULL
);
-- A receipt is not a marketing permission. Unsubscribe events never delete entitlements.
