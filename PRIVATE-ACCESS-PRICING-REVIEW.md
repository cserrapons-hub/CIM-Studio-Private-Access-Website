# Private access and unified pricing — communication update

PR #14 was merged as 7756e23. This follow-up starts from that public commit in a separate branch.

## Website
The approved private-access wording occupies the two existing presentation paragraphs: `intro` describes the collection, and `founders` explains access plus the €25 benefit. The earlier introductory sentence is replaced rather than duplicated. No extra paragraph, button, graphic, CSS rule or animation is added. Both existing CTA translations are unchanged.

## Legal copy
Remove Professional Pricing references from the notice, sample acknowledgement description and voucher terms. Remove the professional-price verification section and its documentary retention statement because that price-related purpose no longer applies. Preserve consumer rights and the legal distinctions concerning enquiries made personally versus on behalf of an organisation.

Retain the exact required Particular/Profesional field, internal values, consent strings/version and provider integration. The newsletter privacy paragraph still explains profile-based communication and adds one sentence that the classification is not used to set different prices.

The public legal review mirror and integrity hash are updated. A separate owner-requested communication amendment is recorded alongside earlier approval history; no new general legal approval or deployment permission is claimed.

## Unchanged
The €25 first-purchase voucher, no minimum spend, single use, eligibility wording and manual administration remain unchanged. No historical records are modified. No email template, endpoint, Turnstile, provider payload, security check, environment variable, field or consent is changed.

## Validation and limits

Passed locally: 255 Node tests, all 396 Public forms regression browser scenarios and six responsive ES/EN visual combinations. Form/confirmation/legal dialog HTML is byte-identical to the public baseline.
Node and the existing Public forms regression browser runner use simulated providers/local SQLite. The responsive copy test covers ES/EN at 1440, 768 and 390 px and checks the private-collection-first wording, existing paragraph structure, legal modal and horizontal overflow. Screenshots: /workspace/artifacts/cim-unified-pricing in this workspace.

Local results do not certify live GetResponse/Resend delivery or the hosted Actions status. GetResponse-owned message templates remain outside this repository and have not been edited. No merge or deployment is authorised.
