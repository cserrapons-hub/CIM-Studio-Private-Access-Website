# Private Access → CIM Production (disabled pending verification)

CIM Production is the definitive customer and Founders registry. D1 only buffers encrypted, verified subscription-confirmation events while delivery is unavailable. Marketing unsubscribe never calls a benefit-revocation endpoint.

## Server-only configuration

- CIM_PRODUCTION_DELIVERY_ENABLED: remains false until a real GetResponse double-opt-in event and its authentication have been verified.
- CIM_PRODUCTION_URL: HTTPS origin of the authenticated Flask service, without credentials, query or fragment.
- CIM_PRODUCTION_KEY_ID and CIM_PRODUCTION_HMAC_SECRET: independent shared signing key identifier and secret (at least 32 characters). Never reuse the GetResponse API key or browser/session secret.
- OUTBOX_ENCRYPTION_KEY: independently generated base64-encoded 32-byte AES key, stored only as a Cloudflare secret. Preserve the old key until the queue is empty before rotating it.
- FORMS_DB: temporary D1 binding; apply additive migration 0004 only with deployment approval.
- OUTBOX_MAX_PENDING_SECONDS and OUTBOX_RECEIPT_SECONDS: explicit operational retention limits, each between 60 and 2,592,000 seconds. There is deliberately no default. Choose the shortest limits compatible with monitored outages and documented reconciliation; these are not invented statutory periods.
- OUTBOX_RECONCILIATION_REVIEWED: false until an operator has accepted the monitoring, reconciliation and removal procedure below.

## Transport and acknowledgement

POST /integrations/private-access/founders carries only the whitelisted verified event. HMAC-SHA256 signs the exact body hash, method, path, Unix timestamp and fresh random nonce. Render independently verifies its key, timestamp, nonce, campaign and cutoff, then commits customer and event atomically. Retries reuse the event ID but receive a fresh timestamp and nonce. They cannot alter an already processed event.

Only an authenticated HTTPS response with matching event ID and accepted/duplicate outcome permits removal of the AES-GCM encrypted personal payload. Ambiguous matches or ineligible outcomes require reconciliation, never automatic grants. Successful delivery also removes the corresponding GetResponse quarantine receipt when present. The remaining minimized technical delivery marker has its own configured bounded lifetime; CIM Production retains definitive event idempotency.

The scheduled-only worker in workers/production-outbox.js drains batches, leases jobs against concurrent workers, retries with bounded exponential backoff and emits only an aggregate reconciliation warning. Pages Functions have no cron: configure a separate scheduled Worker using this module and the same D1/secret bindings before enabling delivery. No public queue-drain HTTP route exists.

## Retention and incident procedure — approval required

At the pending deadline the queue stops retries and enters reconciliation, without silently destroying the only available evidence. This is an incident hold, not a permanent customer database or permission for indefinite retention. Before enabling, assign an operator and alert channel, review the queue at least as frequently as its configured deadline, and define a finite incident-resolution/removal deadline. Resolve the record into CIM Production via the same authenticated idempotent delivery after reviewing the cause, or document why processing must stop and remove it. Do not activate without this procedure: code cannot choose a legal basis or destroy an unresolved customer's entitlement safely.

Do not log emails, request bodies, credentials or encrypted payloads. No real subscription, migration, deployment or external request is needed for local tests.

## Repeatable local cross-project test

Set CIM_PRODUCTION_CHECKOUT to the local Production work branch and CIM_TEST_PYTHON to its isolated Python interpreter, then run node scripts/test-production-integration.mjs from this repository. The test starts Flask on loopback with a disposable SQLite database, signs requests with dummy test credentials and simulates the GetResponse response. It checks the real JavaScript-to-Python contract, replay/conflict rejection, idempotency, a failed delivery, recovery and purge. It never contacts Render or GetResponse.

The browser and all existing forms remain unchanged. The public subscription endpoint remains unavailable and the genuine HTML export is still required. Public configuration cannot override the unreviewed provider contract. Receipt hashes are pseudonymous technical data, not anonymous customer records; quarantine/reconciliation retention and responsibility must be approved before activation.

## Manual reconciliation of an ambiguous customer

1. In authenticated CIM Production, inspect /integrations/private-access/review. Resolve the event to the correct existing customer using the protected review action described in PRIVATE-ACCESS.md. Do not create or merge identities merely to empty the queue.
2. For that reviewed event only, before its pending deadline, an authorized D1 operator can resume delivery with the following statement, binding the reviewed event ID as its single parameter:

    UPDATE production_outbox SET state='pending', next_attempt=unixepoch(), lease_until=0, lease_token=NULL, last_error=NULL WHERE event_id=? AND state='reconciliation' AND expires_at>unixepoch();

3. The next scheduled run reuses the same event, obtains the authoritative idempotent acknowledgement and purges its encrypted payload. Check the resulting delivered count and the customer in CIM Production.

An expired event deliberately cannot be resumed by that statement. The operator must resolve the incident under the approved finite hold procedure, deliver/reconcile the evidence into CIM Production before removing it, or document why processing must cease. Do not change a confirmation date, silently extend every retention deadline, or delete the only pending evidence to clear an alert.
