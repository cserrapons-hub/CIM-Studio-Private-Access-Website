# Launch decision: all three forms must pass real tests

Work branch integration/three-forms-2026-10-20 is based on the backed-up full integration work, not the informational alternative. launch/informational-2026-10-20 remains unchanged. No public deployment, DNS change, live migration or real subscription is authorised by this document.

## 1. GetResponse — one precise support request (release blocker)

Known: cim_studio_newsletter, token PL6jh, panel list ID 374914302; add_subscriber.html endpoint confirmed; web/API double opt-in enabled. Do not ask to reconfirm those facts. Send the following:

> We have confirmed our list cim_studio_newsletter (token PL6jh, panel ID 374914302), the endpoint https://app.getresponse.com/add_subscriber.html and web double opt-in. Please provide the exact standalone HTML/export for our account, including method/enctype, email and list-token field names, all mandatory fields, and the native consent field ID/name/value. We must not invent those parameters.
>
> May our Cloudflare server POST that documented form on behalf of the visitor while preserving web double opt-in and valid native consent evidence? Which consent content/version/origin information is actually recorded, and which fields are officially supported? Custom API fields are not a substitute for native consent. Please provide the documented success/rejection/redirect behaviour and server-side anti-abuse controls at the public GetResponse endpoint; local Turnstile does not prevent direct submissions to that endpoint.
>
> Please provide an actual sample/schema of contact-subscribed for this standalone form, including stable event ID, list/contact/source identifiers and occurredAt UTC. Does this event also fire for API imports/manual additions without an email confirmation? What authenticated evidence distinguishes the confirmed form flow?
>
> How can our receiver authenticate YOUR notification for OUR account? Specify the official signature/header/canonical signing algorithm/key verification, or supported secret-authentication mechanism if available. Provider-wide IP ranges or arbitrary headers alone do not prove account ownership. Also provide the retry/timeout policy and whether duplicate deliveries retain the same event ID. Please identify the actual v3 campaignId corresponding to this panel ID/token.

No genuine account form export, supported server-relay consent contract or authenticated real event has yet been received. Therefore /api/subscribe remains 503 and htmlFormReady remains false. The browser retains its original modal/translations/unchecked consent; there is no guessed action, no Web Connect and no Analytics.

Safe fallback if relay consent cannot be evidenced: a genuinely official hosted/native form or link, only after reviewing its consent, DOI and browser technologies and with owner approval. Do not embed an analytics-dependent widget. If webhook authentication cannot be established, no automatic Founders grant: require a separately reviewed, independently evidenced manual confirmation procedure before changing the current protocol. Do not treat a signed Cloudflare assertion as proof of an unauthenticated GetResponse event.

## 2. Cloudflare / Resend — private real-test configuration

Use config/controlled-test.vars.example on a dedicated Pages preview project and exact HTTPS origin, with Basic test protection. Keep acquisition/delivery/worker flags false initially. Do not configure cimstudio.es or deploy without approval.

Bindings and migrations, only on newly created TEST databases:

- FORMS_DB: root migrations 0001_forms.sql, 0003_getresponse_webhook.sql, 0004_production_outbox.sql, 0005_registrations.sql. Contains sample requests and temporary Founders deliveries; never definitive customer entitlements.
- CAREERS_DB: different physical D1 database. Apply migrations/careers/0001_careers.sql and 0002_registrations.sql with the careers migration directory. The stored purpose marker refuses a database reused for the wrong registration purpose. No automatic merge/delete of legacy records.
- Samples and career email use different 32-byte base64 AES-GCM secrets: SAMPLES_DATA_KEY and CAREERS_DATA_KEY. Do not rotate blindly: existing records need the old key until securely re-encrypted or removed.
- AUDIT_HASH_SECRET (separate HMAC secret), TURNSTILE_SITE_KEY/TURNSTILE_SECRET_KEY for the test hostname, RESEND_API_KEY, verified MAIL_FROM, REGISTRATION_ORIGIN equal to the private HTTPS origin.
- REGISTRATION_REVIEW_DAYS is an explicit operational necessity-review interval (no default/statutory period invented). REGISTRATIONS_STORAGE_REVIEWED remains false until the retention/deletion/incident procedure has an owner. Samples without a later commercial relationship keep the agreed 12-month criterion; reception as its starting point is proposed in the legal draft for approval. Review intervals do not automatically extend that retention.
- For an authorised restricted acquisition test only: CONTROLLED_TEST_MODE=true, matching CONTROLLED_TEST_ORIGIN, REGISTRATIONS_TEST_ENABLED=true and the specific form/global enable flags. The production alternative requires the specific *_VERIFIED and MAIL_RECEIPTS_VERIFIED flags after real success. Never set verified flags as a substitute for testing.
- workers/registrations.js: scheduled-only mail/overdue-review worker with the same D1 bindings, secrets and approved legal version; MAIL_WORKER_ENABLED=false initially. No public drain route. The separate Founders worker retains its own defaults and keys.
- Review Resend sender authentication and disable unnecessary open/click tracking. Do not replace Google Workspace MX or authorise DNS changes implicitly. A sender-domain/subdomain DNS setup, if missing, needs separate explicit approval.

The new public /api/samples and /api/careers routes use encrypted local records and transactional Resend messages, NOT GetResponse contacts. The historical generic API adapter/tests remain as a non-routed reference only; they are not proof of native GetResponse consent and are not used for career acquisition.

## 3. What the two independent forms now do

Samples: validate all existing fields, current legal version, explicit acceptance, honeypot, same-origin JSON and server-verified Turnstile hostname/action; per-IP rate limiting. Commit encrypted request + exact consent + two encrypted mail jobs atomically. Notify admin@cimstudio.es with the professional/project details; send the applicant a separate bilingual receipt without the project. Neither email grants Professional Pricing, sample dispatch, a newsletter subscription or Founders.

Careers: same validations; email only, separate consent and database/key. Receipt contains a random one-time-purpose link; link GET/open does not activate anything. The preferences page removes the fragment and requires explicit POST confirmation. The record stays pending until email-owner confirmation is recorded. Withdrawal remains available when acquisition is disabled; it removes the active encrypted email and cancels unsent mail, retaining only justified minimum consent/withdrawal evidence pending the approved review/deletion procedure. New affirmative consent rotates the link; old links cannot withdraw a renewed registration. Only active, confirmed, current-review records may be used for future career notices. No CV/phone fields and no commercial list/Funders writes.

Mail: provider acceptance is NOT inbox delivery. Accepted jobs purge encrypted mail content; uncertain timeout/5xx/bad acknowledgements are parked for reconciliation, not blindly resent. A definite 429 is retried after a bounded wait. A repeated registration does not duplicate receipts. If saved but email cannot be confirmed, the UI states that clearly and does not ask for a duplicate submission. Retention review warnings contain counts only; no emails/bodies/keys are logged. Staff must reconcile uncertain/rejected messages in Resend before an authorised retry. Review/deletion procedures cover D1, message contents in Resend, Google Workspace, exports and backups; they are a release requirement, not an optional future improvement.

Future bulk vacancy dispatch/admin exports can wait; any later sender must apply confirmation, withdrawal and current necessity-review filters and include the independent withdrawal mechanism. No broadcast service is silently enabled now.

## 4. Render / Founders — existing safe path retained

Use PRIVATE-ACCESS.md and scripts/rehearse-private-access.py in Cim-Production. Privately download the full backup, verify and rehearse on a disposable copy; use a separate staging Render service/disk and HMAC keys. Existing customers, issued documents and prices are not rewritten. Confirm the real campaignId in both sides. Registration follows ONLY authenticated, verified original confirmation before 2026-12-31T23:00:00Z. Newsletter unsubscribe is never a revocation. No production migration is part of this preparation.

## Local checks

Run `npm test` and `sh scripts/build-preview.sh`. The reproducible browser integration test is `node scripts/test-three-forms-browser.mjs` (Playwright and Chromium required; optional PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE overrides). It exercises local handlers and disposable SQLite, with Turnstile and Resend mocked and all external requests blocked. It is not a real provider verification. Production keeps its existing 230-test suite and `scripts/test-production-integration.mjs` exercises HMAC against disposable Flask/SQLite.

## 5. Legal approval and first integral real test

legal/content.js ES/EN describes all three forms, separate D1 career confirmation/withdrawal and sample receipts. approved=false/version empty remain unchanged. Approval must cover provider entities/processing/transfers, bases for enquiries and minimal Founders evidence, review/deletion criteria and pending-consent handling, retention in provider mailboxes/backups and effective Turnstile/browser technologies. The proposed 12-month samples starting point and operational review interval need owner decision. No cookie exemption or provider guarantee is invented.

After explicit authorisation to deploy ONLY the private test and process the named owner test emails:

1. Private Access: submit once, verify DOI receipt and no benefit before click; confirm; inspect authenticated event and UTC/list/source; deliver idempotently to staging CIM Production; verify potential customer and 15% PVP/professional/custom draft; unsubscribe and verify entitlement remains. Stop if the GetResponse contract/authentication cannot be proved.
2. Samples: submit ES and EN, check every professional/project field in admin mailbox and a separate customer receipt, D1 ciphertext and exact acceptance; repeat same request ID (no duplicate email), invalid email/consent/token, rate limit, known rejection and uncertain timeout. Check Resend status AND both inboxes; a provider ID alone does not pass delivery.
3. Careers: submit ES and EN, verify independent consent/DB and pending state; receipt in owner mailbox; open link without action (still pending); explicit confirm (active + confirmation evidence); withdraw (email removed, no later career notice); repeat link safely; re-consent and verify old link cannot alter new state. Newsletter and Founders stay untouched.
4. Check 1920/1440/tablet/390/320px, legal links, error and recorded-but-email-pending copy, actual network/cookies/storage with Turnstile, no Analytics/Web Connect, no PII in request URLs or logs. Record only minimum test evidence privately.
5. Reconcile/purge test data under the approved policy. Set SAMPLES_VERIFIED, CAREERS_VERIFIED, MAIL_RECEIPTS_VERIFIED, FORMS_VERIFIED and Founders verification only after their real checks pass. Public SITE_LIVE requires all three; there is no informational launch in this branch.
