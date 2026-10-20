-- Technical, encrypted delivery queue only. CIM Production is the customer registry.
CREATE TABLE IF NOT EXISTS production_outbox (
 event_id TEXT PRIMARY KEY CHECK(length(event_id)=64),
 payload_hash TEXT NOT NULL CHECK(length(payload_hash)=64),
 encrypted_payload TEXT,
 state TEXT NOT NULL CHECK(state IN ('pending','sending','reconciliation','delivered')),
 attempts INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 next_attempt INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 lease_until INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT,
 receipt_until INTEGER,
 last_error TEXT
);
CREATE INDEX IF NOT EXISTS production_outbox_due ON production_outbox(state,next_attempt);
