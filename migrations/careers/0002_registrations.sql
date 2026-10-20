-- Apply separately to FORMS_DB (samples) and CAREERS_DB (careers).
-- First verified write fixes the store's purpose; aliases cannot mix purposes.
CREATE TABLE IF NOT EXISTS registration_store (id INTEGER PRIMARY KEY CHECK(id=1),purpose TEXT NOT NULL CHECK(purpose IN ('samples','careers')));
CREATE TABLE IF NOT EXISTS registrations (
 id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('samples','careers')),
 subject_hash TEXT NOT NULL, fingerprint TEXT NOT NULL, encrypted_data TEXT,
 state TEXT NOT NULL CHECK(state IN ('pending','active','withdrawn','expired')),
 consent_request TEXT NOT NULL, consent_at TEXT NOT NULL, consent_version TEXT NOT NULL,
 consent_text TEXT NOT NULL, language TEXT NOT NULL CHECK(language IN ('es','en')),
 unsubscribe_hash TEXT UNIQUE, confirmed_at TEXT, review_due TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS registrations_review ON registrations(state,review_due);
CREATE TABLE IF NOT EXISTS registration_consent_events (
 id TEXT PRIMARY KEY, registration_id TEXT NOT NULL, event TEXT NOT NULL CHECK(event IN ('granted','confirmed','withdrawn')),
 occurred_at TEXT NOT NULL, consent_version TEXT NOT NULL, consent_text TEXT NOT NULL, language TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS registration_mail (
 id TEXT PRIMARY KEY, registration_id TEXT NOT NULL, consent_request TEXT NOT NULL,
 encrypted_payload TEXT, state TEXT NOT NULL CHECK(state IN ('pending','sending','accepted','unknown','rejected','cancelled')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0, provider_id TEXT, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS form_rate_limits (id TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
