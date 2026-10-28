# Centred welcome page and simple receipt emails

Based on public commit eadd5a0, in a separate branch. No merge, deployment, real email or remote data change authorised.

## /bienvenido
A single wrapper groups the existing original logo, short rule, heading and three paragraphs. Flex centring places the entire group in the visible viewport, with equal vertical safe padding and natural scrolling on short screens. Logo size, text/fonts, colours, paragraph spacing and language selector positioning remain unchanged. The logo-to-rule and rule-to-text spaces follow the supplied reference (52 px and 40 px respectively).

The centring CSS is scoped to `.subscription-confirmation`. Career preferences share the base stylesheet but do not receive this class or the new positioning. The welcome page still uses its existing routes, bilingual script and clean-URL build. No confirmation or provider logic changes.

## Samples and careers user emails
The shared receipt shell now uses Arial, 14 px, transparent backgrounds, left alignment and a single 10 px padded cell. One unbordered presentation table provides email-client-compatible padding, without a centred/max-width editorial container. Paragraph margins are a natural 14 px.

Remove the sample address background/box and the 30/40 px decorative spacers. Retain its address heading and all words, emphasis and links. Normalise excess blank lines in its plain-text alternative. Career content/template and personal token generation are untouched; its HTML adopts the same simple shared shell. Subjects, sender and Reply-To are unchanged.

A local comparison against the public baseline confirmed identical subjects, all visible HTML words and links, and identical plain-text content after normalising only the extra blank lines.

## Validation

Passed locally: 255 Node tests, all 396 Public forms regression scenarios, 16 local Pages welcome checks and eight simple email layouts.
- Updated existing unit assertions for the new presentation instead of requiring the superseded cream background and spacers. Retain complete text, URL, escaping, provider state and safety coverage.
- Email browser suite: eight ES/EN sample/career layouts at 390/800 px; computed Arial 14 px, transparent background, exact 10 px padding, left alignment, natural paragraph margins, no decorative content or horizontal overflow; exact personal/homepage URLs.
- Welcome browser suite: 16 local Cloudflare Pages cases covering both clean URL variants, ES/EN, desktop/tablet/mobile and a short viewport. Assert whole-group centring, consistent internal gaps, original logo, real Montserrat Regular, selector/copy, security headers and no external/API requests.
- Complete Public forms regression remains simulated, including real local handlers/SQLite where applicable. It does not certify native Gmail/Outlook rendering or actual provider delivery. No live sends were performed.

Screenshots and generated sample HTML are available in this workspace at /workspace/artifacts/cim-centered-welcome and /workspace/artifacts/cim-simple-emails. Hosted GitHub Actions status must be checked on the PR; it is not inferred from local results.
