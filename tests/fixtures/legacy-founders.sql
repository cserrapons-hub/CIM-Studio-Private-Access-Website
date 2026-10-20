-- Separate purpose from marketing consent. No link/cascade to form_requests or unsubscribes.
-- Apply only after approving the legal basis and the evidence verification procedure.
CREATE TABLE IF NOT EXISTS founders_entitlements (
  subject_hash TEXT PRIMARY KEY CHECK(length(subject_hash)=64),
  campaign_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  evidence_sha256 TEXT NOT NULL UNIQUE CHECK(length(evidence_sha256)=64),
  evidence_reference TEXT NOT NULL,
  terms_version TEXT NOT NULL CHECK(terms_version='founders-2026-v1'),
  CHECK(confirmed_at < '2026-12-31T23:00:00.000Z'),
  CHECK(verified_at >= confirmed_at)
);
-- Imports are idempotent only for consistent evidence; conflicts abort, never silently overwrite.
CREATE TRIGGER IF NOT EXISTS founders_conflicting_evidence
BEFORE INSERT ON founders_entitlements
WHEN EXISTS (
  SELECT 1 FROM founders_entitlements
  WHERE (subject_hash=NEW.subject_hash AND (
    evidence_sha256<>NEW.evidence_sha256 OR confirmed_at<>NEW.confirmed_at OR
    campaign_id<>NEW.campaign_id OR contact_id<>NEW.contact_id
  )) OR (evidence_sha256=NEW.evidence_sha256 AND subject_hash<>NEW.subject_hash)
)
BEGIN
  SELECT RAISE(ABORT,'Conflicting Founders evidence; manual review required');
END;
