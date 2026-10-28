# Founding member voucher — commercial copy review

Based on public branch commit 25b3235. Requested offer: €25 towards the first purchase, no minimum spend, one use per founding member, for subscriptions before 31 December 2026. This change contains no voucher generator, code, redemption endpoint or automatic discount logic.

## Changed communications
- Main presentation paragraph in index.html and both script.js language dictionaries.
- Legal navigation label, notice cross-reference, relevant privacy paragraphs and promotion terms in ES/EN. Manual confirmation evidence remains separate from marketing consent; the record now describes the voucher and its usage status rather than a lifetime discount. The copy uses the requested “before 31 December” wording consistently. Existing actual double opt-in remains required.
- Public legal review mirror and content integrity hash. The existing consent version, approval history and consent strings are unchanged. A separate dated commercial amendment records this owner-requested change; no new general legal approval or deployment permission is claimed.
- Sample-request email invitation, both HTML and plain text, with identical offer details and unchanged formatting/links/spacers.
- Career administrative notification: only the final disclaimer is updated to say that career confirmation does not grant voucher entitlement. Sender, recipients, tokens and sending logic are unchanged.

## Deliberately preserved
All endpoints, provider payloads, safety gates, Turnstile, D1 data, consent wording/version, environment variables, historical technical identifiers and legacy evidence are unchanged. Historical internal documents and restricted test policies are not rewritten: they are not the active public commercial offer. No change to the treatment of existing records is performed by this copy update.

## GetResponse account-only content
The repository does not own the confirmation-message content or the “Bienvenida CIM Studio” autoresponder template. Check those templates in GetResponse for any old 15%/lifetime offer and update the text separately if present. Other account-managed campaigns or landing pages should be checked likewise. No account inspection or modification is claimed here; double opt-in and autoresponder configuration must remain unchanged.

## Verification

Local results: 252 Node tests, 396 public-form browser scenarios, six responsive copy layouts and eight email spacing cases passed. No real services were contacted.
- Node suite includes a new regression check on published HTML/JS/legal bundle and both sample email formats, rejecting old offer phrases and checking €25, first purchase, no minimum and single use.
- Existing public-form runner: seven suites, 396 simulated browser scenarios, ES/EN desktop/mobile. Real emails and production data are never used.
- Additional visual browser suite: six width/language combinations (1440, 768, 390 px; ES/EN), web copy, legal modal and sample email HTML, with screenshots and horizontal-overflow assertions. Screenshot directory: /workspace/artifacts/cim-voucher in this execution workspace. Native Gmail/Outlook rendering is not certified by Chromium screenshots.
- Hosted GitHub Actions “Public forms regression” must be checked on the PR; a local pass is not represented as a hosted CI result. No merge or deployment is authorised.
