# Withdrawal of current promotion and access deadline

Public baseline: b69c2e6. Branch: copy/remove-founder-promotion-2026-11-10. Editorial-only changes; no merge, deployment, real subscriptions or remote data writes authorised.

## Files changed
- Public presentation and matching arrow label: index.html, script.js, editorial-effects.js.
- Legal copy, exact historical snapshot and review mirror: legal/content.js, legal/history/2026-11-10-before-promotion-withdrawal.js, PUBLIC-LEGAL-REVIEW.md.
- Sample email and administrative message literal: server/sample-receipt.js, server/registrations.js.
- Matching signup instructions only: careers/preferences/index.html, careers/preferences/preferences.js.
- Updated copy/history tests: tests/founding-voucher-copy.test.mjs, tests/legal.test.mjs, tests/sample-receipt-template.test.mjs, tests/unified-pricing-copy.test.mjs and scripts/test-voucher-copy-browser.mjs.
- This review document.

## Before → after

| Location | Previous current copy | Replacement |
| --- | --- | --- |
| Main title ES / EN | Una invitación a descubrir. / An invitation to discover. | Accede a nuestra colección privada. / Access our private collection. |
| Main description ES | Descubre nuestra colección privada… elaborados a mano en Mallorca. | Suscríbete a nuestra newsletter para descubrir nuestras nuevas piezas y colecciones de cerámica artesanal, diseñadas y fabricadas en Mallorca. |
| Main description EN | Discover our private collection… made in Mallorca. | Subscribe to our newsletter to discover our latest pieces and collections of handcrafted ceramics, designed and made in Mallorca. |
| Promotion paragraph | Request access before 31 December 2026 and receive a €25 first-purchase voucher; ES equivalent | Removed, without replacement benefit or empty paragraph. |
| First-year paragraph ES | Presentación exclusiva a suscriptores durante la primera etapa | Durante nuestro primer año, las novedades y los enlaces de compra se compartirán a través de nuestra newsletter. |
| First-year paragraph EN | Exclusive subscriber introductions during the first chapter | During our first year, new releases and purchase links will be shared through our newsletter. |
| Main CTA | Acceder a la colección privada / Access the private collection | Solicitar acceso / Request access; same button and opening behaviour. |
| Sample email invitation | Voucher amount, founding membership and subscription deadline | Offer paragraph removed in HTML and text; invitation and homepage links retained. |
| Signup instructions in sample email and career preferences | Select old CTA and then request access | Select Request access and complete the subscription form, in ES/EN. |
| Career administrative notice | No commercial subscription or founding-voucher entitlement | No commercial subscription; only the final literal disclaimer changed. |
| Legal navigation / terms | Founding member voucher terms with prospective eligibility deadline | Private collection access terms, with no current promotion or announced deadline. |
| Privacy | Ongoing voucher eligibility / deadline and benefit record | Minimum evidence only for previously communicated commitments; newsletter consent remains separate. |

The decorative scroll arrow's accessible label is updated to match the renamed target heading. No scroll behaviour changes. Typography, CSS, images, animation and form structures are unchanged; removing one obsolete marketing paragraph naturally changes the text block height.

## Existing contractual commitments — flagged before editing
Withdrawal of advertising must not revoke commitments already communicated to recipients. The full original legal source is preserved verbatim in `legal/history/2026-11-10-before-promotion-withdrawal.js`, including its original approval hash and terms. It is not copied into the public build. Earlier permanent-discount terms remain in the unchanged Git history.

Current public terms explicitly preserve previously communicated commitments under their original conditions. Existing consents, legal consent version and all D1/entitlement/receipt records are untouched. The current legal content hash is updated and the owner-requested editorial withdrawal is recorded separately from previous approval history. No new general legal approval is claimed.

Any assessment of an individual previously promised benefit must use its original communication and conditions. This change neither determines eligibility nor cancels, reissues or alters benefits. Previously delivered emails cannot be recalled or rewritten.

## Intentionally retained references
Technical identifiers such as `data-getresponse-eligibility-tag`, historical schemas/modules, original test policies, audit documents and existing diagnostics fields are not current promotional communications. They remain unchanged to preserve the existing contracts, field names and historical evidence. Factual provider-contract dates in privacy are not subscription deadlines and remain.

## External manual review
GetResponse-owned confirmation messages, “Bienvenida CIM Studio” templates if active, other campaigns and any external landing pages are outside this repository. Their contents could not be inspected here; review them for earlier voucher/permanent-discount/deadline wording before publishing the withdrawal. No GetResponse account or automation changes were made. Existing recipients' commitments must remain honoured.

## Verification

Local results: 256 Node tests, all 396 Public forms regression browser scenarios and six responsive ES/EN visual combinations passed. A direct baseline comparison also confirmed byte-identical form markup and unchanged controller/security code.
The Node tests check absence of the old and replacement promotions in active public copy, preservation of original archive integrity and unchanged consent version, subscriber classifications and legacy rights. Existing text/link/escaping and security tests remain. The complete Public forms regression runner uses simulated providers and local D1 fixtures only.

The responsive copy suite covers ES/EN at 1440, 768 and 390 px, new heading/descriptions/CTA, legal terms, sample email, no new lead magnets, no horizontal overflow or actual submissions. Screenshots: /workspace/artifacts/cim-open-access.

Hosted GitHub Actions, native mailbox rendering and actual external-provider operation are not inferred from local simulations. No live sends were performed.
