# Launch decision: all three forms must pass real tests

Work branch integration/three-forms-2026-10-20 is based on the backed-up full integration work, not the informational alternative. launch/informational-2026-10-20 remains unchanged. No public deployment, DNS change, live migration or real subscription is authorised by this document.

## 1. GetResponse — confirmed contract and restricted API-verified test

### Confirmed by support — do not request these again

- List cim_studio_newsletter, token PL6jh, panel list ID 374914302; web/API double opt-in enabled.
- POST https://app.getresponse.com/add_subscriber.html with email and campaign_token=PL6jh.
- Cloudflare may submit the form server-side; double opt-in is preserved.
- For this standalone HTML form, contact-subscribed is sent after the subscriber confirms their email.
- A custom checkbox field may be added to carry consent. This is not, by itself, proof of a native GetResponse consent record or of confirmation.
- Support has not documented endpoint anti-spam protections or webhook authentication. Support now mentions created_on; earlier information identified event.occurredAt in UTC. Neither field is assumed to prove the original confirmation time without contrasting real payloads, authenticated API responses and the observed DOI sequence.

These confirmations allow preparation of the restricted environment without waiting for an undocumented webhook signature. No real subscription, deployment or public activation is authorised. This document update does not enable the existing runtime gates or assert that the adapter has already been changed.

### Confirmed custom consent field and local preparation

Owner has now verified by authenticated API (HTTP 200): name consentimiento, customFieldId njH9fM, permitted value aceptado. Support confirms HTML parameter custom_consentimiento=aceptado. Do not ask to create or identify this field again. The API identifier is for contact-value checks; it is not an extra HTML parameter.

server/getresponse-controlled.js prepares exactly email, campaign_token=PL6jh and custom_consentimiento=aceptado as an encoded POST. The preparation helper performs no fetch. Its new restricted handler may send only after its explicit test gates are authorised; the public route remains blocked. Actual acceptance/storage in GetResponse still requires an authorised test; fixtures do not verify the provider. The old generic export adapter remains blocked and is not used to assert native GDPR consent.

The same module prepares a consent evidence record in FORMS_DB using new additive migrations/0006_newsletter_consent.sql (NOT applied remotely). It records server UTC acceptance, server-selected exact checkbox text/version, language, purpose, request ID and verified custom-field reference. Email is AES-GCM encrypted with dedicated NEWSLETTER_DATA_KEY (32 random bytes, base64); AUDIT_HASH_SECRET signs the canonical evidence. That signature detects changes while its secret remains protected; it is not an independent trusted timestamp or proof of DOI. Repeated request IDs preserve the original record and conflicting reuse is rejected. Acceptance date never becomes confirmation date.

NEWSLETTER_PREPARATION_ENABLED=false is the default. The evidence function requires a restricted-test flag and expressly approved policy/version, but no combination enables the public signup route: /api/subscribe stays 503 and htmlFormReady stays false. The separate /api/controlled/subscribe route now rechecks Basic authentication, exact HTTPS origin, JSON bounds, required unchecked-by-default consent/version, honeypot, server Turnstile hostname/action and atomic D1 rate limits before saving evidence and sending. It accepts only one explicitly authorised test email represented by an HMAC allowlist. No browser, commercial copy, other forms, legal approval or production data are changed.

### GetResponse configuration needed from the owner

1. Keep cim_studio_newsletter, web double opt-in, existing confirmation email and default confirmation page unchanged. Do not recreate the confirmed custom field or enable Web Connect/Analytics.
2. Use the existing secret API key only server-side to resolve the real API campaignId and read the authorised test contact; no key needs to be shared in chat.
3. Prepare contact-subscribed notifications if supported, without an invented receiver URL. After a restricted deployment is authorised, configure its exact supplied URL. A webhook is only an untrusted trigger for independent API inspection.

### Next controlled test (not authorised or performed)

The base restricted route from f79a456 has been deployed to the private test project according to the owner, with sends disabled. The independent allowlist-key change must be deployed to the private test project before use. The owner has authorised committing/pushing this change after manually verifying project isolation; no send flag or legal approval is activated by that authorisation. Before a real test: approve test privacy/version and retention; authorise push/private deployment and one owner test email; apply 0006_newsletter_consent.sql then 0007_newsletter_html_deliveries.sql ONLY to FORMS_DB test; configure NEWSLETTER_DATA_KEY, independent NEWSLETTER_TEST_ALLOWLIST_SECRET and NEWSLETTER_TEST_EMAIL_HASH, then explicitly authorise NEWSLETTER_PREPARATION_ENABLED=true and NEWSLETTER_CONTROLLED_SEND_ENABLED=true only on the protected test project. No production migration, public activation, webhook grant or CIM Production delivery is needed for the first DOI observation. Before DOI click record the observed state; after click query the same contact/list and njH9fM value through authenticated API. The current API inspector accepts only an exact value array ['aceptado'] for the identified field, fails closed for unknown shapes, and never marks confirmation or Founders verified. Contrast the actual redacted API structure before adapting it. Keep a minimal protected test record; no personal data in logs.

#### Restricted relay behaviour and first request

The main modal and /api/config remain unchanged and newsletter submission stays disabled there. First authorised provider observation uses POST /api/controlled/subscribe from the authenticated test browser (same origin), with email, consent=true, language, legalVersion, requestId (UUID), website empty and a fresh Turnstile token with action subscribe. Never put credentials/tokens/emails in URLs. This is a technical probe, not public activation or a claim the full modal is connected.

NEWSLETTER_TEST_EMAIL_HASH is computed privately using HMAC-SHA256 with the UTF-8 TEXT of NEWSLETTER_TEST_ALLOWLIST_SECRET (32 random bytes encoded as Base64) over UTF-8 'newsletter-test-allowlist:v1:' followed by the trimmed/lowercase approved owner email. Do NOT decode the Base64 key text before HMAC. This independent secret is used ONLY for authorised-email checking; AUDIT_HASH_SECRET remains unchanged for evidence signatures, subject identifiers, rate limits and existing records. No old audit-key allowlist fallback is accepted. A missing/invalid secret or a reused audit key closes the test route. Changing the allowlist key and its matching hash never re-signs consent records or resets delivery deduplication. It is an allowlist, not a provider parameter or anonymisation claim. No plaintext email or key belongs in Git. Rate limits are five requests per IP/hour and twenty total/hour; D1 stores only keyed bucket identifiers. Turnstile guards our relay, not direct submissions to the provider.

Evidence commits before a separate delivery claim. UNIQUE(subject_hash) prevents concurrent sends and retries with fresh request IDs; same-ID conflicts are rejected. No automatic resend, including after restart/timeout/rejection. An expired in-flight claim becomes unknown for manual reconciliation. Even a new UUID cannot bypass the one-email guard. Approving any later resend requires inspecting provider state first; do not delete evidence to force a retry.

GetResponse is sent only the three confirmed fields and no API secret. Redirects are never followed, and response bodies, Location, Set-Cookie and provider error content are neither stored nor returned. Recognised HTTP rejection statuses are reported generically; timeout/5xx are unknown. A 2xx/3xx is unverified, NOT evidence that GetResponse accepted the form or sent a DOI email. With the provider success contract still unverified, the route responds error=pending / pending_provider_verification (HTTP 409), and never confirmation_required or ok=true. A first real test may therefore receive pending while the owner inspects their inbox and authenticated API. Learning the genuine acceptance/rejection response is required before enabling the modal's success message. No second DOI email is sent by Cloudflare.

Keep NEWSLETTER_CONTROLLED_SEND_ENABLED and NEWSLETTER_PREPARATION_ENABLED false after preparation and until explicit test authorisation. All *_VERIFIED, Founders delivery/grant flags and SITE_LIVE remain false. MAIL_WORKER_ENABLED has no role in this one-shot newsletter relay.

There is still no confirmed API field for the original DOI date. createdOn/changedOn, a stored custom checkbox or an untrusted occurredAt do not independently establish it. Keep Founders pending until an evidence-based automatic mechanism or a separately approved manual review workflow exists in CIM Production. Existing duplicate-resolution review is NOT that evidence-approval workflow.

### Independent legal gate and private test interface — LOCAL, NOT APPROVED

The local implementation now separates the test policy from legal/content.js. Public approved remains false. server/newsletter-test-policy.js contains the exact ES/EN checkbox text and a scoped DRAFT privacy notice; approved=false and version empty. NEWSLETTER_TEST_LEGAL_APPROVED=false is a second runtime acknowledgement. Environment flags alone cannot approve the code-owned draft. A future express approval must lock both language texts, provider arrangements, technical-processing/evidence bases, proposed seven-day cleanup period and incident/Founders-evidence handling, then assign an immutable version archived with its repository commit. Never silently edit approved content under the same version.

Only after that express review may the test definition be approved and separately acknowledged on the private project. This never approves public legal documents or allows samples/careers/marketing acquisition. The specific test route still requires both existing preparation/send flags, Basic authentication, exact cim-studio-test.pages.dev origin, the independent HMAC owner allowlist, server Turnstile and dedup/rate protections. Founders remain pending; the original DOI date is not presumed.

The separate /controlled/newsletter/ page uses /api/controlled/newsletter-config, not the public modal/config. While blocked it can display the draft notice after private login, with disabled fields and no Turnstile script or POST. Once separately authorised/configured, it shows the server-owned ES/EN checkbox text, initially unchecked and required, links to the matching private notice in an accessible dialog, and loads Turnstile with action subscribe. It sends JSON only to the restricted route, leaves evidence-version selection to the server/config, stores no browser data and never makes a direct browser submission to GetResponse. After any POST/uncertain result it locks the form; no automatic retries or fake confirmation modal.

Middleware independently closes the private page/assets and /api/controlled/* when controlled mode is disabled or the origin is not the test project; Basic authentication is rechecked by the configuration/POST handlers. The private pages have noindex/no-store/no-referrer protection and no link from the main site. Public /api/subscribe remains disabled. No migrations, pushes, deployments, subscriptions or policy approvals are authorised by this local preparation.

Local checks: npm test; sh scripts/build-preview.sh; node scripts/test-newsletter-private-browser.mjs (Playwright/Chromium required, with optional PLAYWRIGHT_MODULE/CHROMIUM_EXECUTABLE overrides). Browser scenarios use disposable SQLite and mock every provider request. They exercise blocked drafts and simulated approval; neither counts as a real policy approval or provider verification.

### Independent verification and minimal outstanding questions

The webhook is an untrusted trigger, not entitlement evidence. Before delivering a Founders grant, the server must independently query GetResponse using its secret API key and establish the expected account/list, contact email and identifier, effective confirmed subscription, the relevant checkbox/consent evidence and an original confirmation instant demonstrably tied to this DOI flow. Correlate these with the restricted server's own consent record and the authorised test submission; knowing a contact identifier/email alone is insufficient. Rate-limit and bound API verification; deduplicate triggers and do not log personal data or keys.

Capture minimal before-click and after-click evidence in the authorised test. Compare actual created_on, event.occurredAt and API fields, including time zones and whether they represent submission, creation, confirmation or a later change. A contact creation timestamp, observation time or untrusted webhook timestamp is not automatically the DOI confirmation timestamp. No automatic grant from a page visit, initial form acceptance or an unverified payload. If the API does not independently establish confirmation, original date and consent, keep Founders pending; use only a separately reviewed manual process with independent evidence. Do not grant from the webhook simply because its data matches an existing contact.

Only ask support for what remains unresolved after inspecting the account/export and read-only API: the generated custom-checkbox submission/API mapping if unavailable, the precise semantics and availability of confirmation/consent fields (including created_on versus occurredAt), and any documented authentication or anti-abuse controls. Do not repeat the confirmed endpoint, email/campaign_token fields, relay permission, DOI or event timing questions. The relay's verified success/rejection behaviour still needs an authorised test before showing a successful request modal.

Cloudflare-side Turnstile and rate limits protect our relay, not direct POSTs to GetResponse. The provider's endpoint anti-abuse remains unverified: record that risk, restrict the initial test to authorised owner emails and do not claim the public endpoint is protected. Native consent functionality, public launch security and any additional browser technologies remain subject to review. No Web Connect or Analytics.

Existing /api/subscribe remains disabled and htmlFormReady remains false until the confirmed contract is implemented and the restricted test is authorised. CIM Production stays the sole definitive Founders register; D1 is temporary event transport only.

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

Use PRIVATE-ACCESS.md and scripts/rehearse-private-access.py in Cim-Production. Privately download the full backup, verify and rehearse on a disposable copy; use a separate staging Render service/disk and HMAC keys. Existing customers, issued documents and prices are not rewritten. Confirm the real campaignId in both sides. Registration follows ONLY independently verified original confirmation before 2026-12-31T23:00:00Z; an untrusted webhook alone cannot provide that evidence. Newsletter unsubscribe is never a revocation. No production migration is part of this preparation.

## Local checks

Run `npm test` and `sh scripts/build-preview.sh`. The reproducible browser integration test is `node scripts/test-three-forms-browser.mjs` (Playwright and Chromium required; optional PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE overrides). It exercises local handlers and disposable SQLite, with Turnstile and Resend mocked and all external requests blocked. It is not a real provider verification. Production keeps its existing 230-test suite and `scripts/test-production-integration.mjs` exercises HMAC against disposable Flask/SQLite.

## 5. Legal approval and first integral real test

legal/content.js ES/EN describes all three forms, separate D1 career confirmation/withdrawal and sample receipts. approved=false/version empty remain unchanged. Approval must cover provider entities/processing/transfers, bases for enquiries and minimal Founders evidence, review/deletion criteria and pending-consent handling, retention in provider mailboxes/backups and effective Turnstile/browser technologies. The proposed 12-month samples starting point and operational review interval need owner decision. No cookie exemption or provider guarantee is invented.

After explicit authorisation to deploy ONLY the private test and process the named owner test emails:

1. Private Access: submit once, verify DOI receipt and no benefit before click; confirm; treat the event as an untrusted trigger and independently verify confirmation/date/consent/list through the authenticated API; compare created_on and event.occurredAt rather than assuming either date; deliver idempotently to staging CIM Production; verify potential customer and 15% PVP/professional/custom draft; unsubscribe and verify entitlement remains. Keep Founders pending if independent verification cannot prove confirmation, original date and consent. Lack of a documented webhook signature alone does not prevent this restricted test preparation.
2. Samples: submit ES and EN, check every professional/project field in admin mailbox and a separate customer receipt, D1 ciphertext and exact acceptance; repeat same request ID (no duplicate email), invalid email/consent/token, rate limit, known rejection and uncertain timeout. Check Resend status AND both inboxes; a provider ID alone does not pass delivery.
3. Careers: submit ES and EN, verify independent consent/DB and pending state; receipt in owner mailbox; open link without action (still pending); explicit confirm (active + confirmation evidence); withdraw (email removed, no later career notice); repeat link safely; re-consent and verify old link cannot alter new state. Newsletter and Founders stay untouched.
4. Check 1920/1440/tablet/390/320px, legal links, error and recorded-but-email-pending copy, actual network/cookies/storage with Turnstile, no Analytics/Web Connect, no PII in request URLs or logs. Record only minimum test evidence privately.
5. Reconcile/purge test data under the approved policy. Set SAMPLES_VERIFIED, CAREERS_VERIFIED, MAIL_RECEIPTS_VERIFIED, FORMS_VERIFIED and Founders verification only after their real checks pass. Public SITE_LIVE requires all three; there is no informational launch in this branch.

## Consolidated launch block (local only)

The current single execution checklist is LAUNCH-RUNBOOK.md. It supersedes stale phase-specific status notes in this file (for example, owner has already applied 0006/0007 to the test database). Preserve earlier work; new 0008 and careers/0003 remain unapplied remotely. The full CIM Production integration is outside this block; retain minimal signed, reviewable candidate evidence without auto-granting Founders. All approvals/flags remain off.
