# Public form regression gate

## Existing coverage reused
- Node unit/server tests: input and consent validation, per-form runtime gates, D1 persistence/transactions, deduplication, safe provider errors, origin and Turnstile checks, delivery acceptance versus actual confirmation.
- Browser suites: newsletter new/repeated/pending responses; samples accepted/pending/rejected/uncertain receipt; careers accepted/error response modals and personal confirmation/withdrawal flow; ES/EN at desktop/mobile widths. They exercise published build assets and real server handlers where applicable, with local SQLite and intercepted providers.
- Turnstile lifecycle: independent forms, SDK/render failures, missing/expired tokens, getResponse exceptions, recovery, language/reopen/resize and duplicate prevention.
- Bootstrap isolation: all three forms still work with the optional careers response modal absent or incomplete. Required newsletter/sample modal markup is still part of the page contract; tests do not claim that arbitrary removal of required components is supported.
- Canonical navigation: GET/HEAD www-to-apex redirect preserves paths/queries; POST is not redirected. Browser suite applies the real middleware to the entry URL before navigating to its destination, rather than proving live Cloudflare routing.

## Added protection
- A single browser runner reuses seven maintained suites, reporting the failed suite immediately. No historical visual snapshot suites with obsolete layouts are added to the gate.
- Explicit empty-required-fields check for samples; empty/invalid email and independent-consent checks for careers, in both languages and widths. Existing newsletter required audience/consent checks remain.
- Error-path assertions preserve newsletter email, audience and consent, plus every entered sample address/contact field, sector and consent. Careers retains its existing email preservation checks.
- Actual server-handler origin matrix for all three forms through middleware: www, mismatched/missing Origin and cross-site requests must fail with 403/origin, make zero provider calls, persist zero registrations/consents and never redirect a POST. This supplements the existing middleware-only redirect test.
- Bootstrap browser tests apply the declared Content-Security-Policy from `_headers` to the simulated document; no CSP relaxation is introduced.
- Test Chromium path is configurable so the same suites work locally and in Actions; no application code changed.

## Run locally
Use Node 24, Playwright with its Chromium installed, then:

```sh
sh scripts/build-preview.sh
npm test
node scripts/test-public-forms.mjs
```
Install the pinned Playwright version from the workflow in your test tooling environment. PLAYWRIGHT_MODULE may point to an isolated Playwright package; CHROMIUM_EXECUTABLE may select an installed Chromium. Without the latter, the runner uses Playwright's downloaded Chromium. The tests never require production credentials. Build finishes before browser suites start; suites run sequentially to avoid asset races and shared-fixture interference.

## GitHub Actions and required check (owner action)
The workflow `.github/workflows/public-forms.yml` runs on every pull_request targeting `design/private-access-v1`, without path exclusions, and can be run manually. It uses read-only repository permissions, Node 24, isolated pinned Playwright tooling and Chromium. It does not deploy, contact production providers or use secrets. Browser requests are intercepted and unexpected destinations fail assertions. CI downloads test tooling only.

After the workflow has had its first PR check run (and before future merges):
1. Repository Settings → Rules → Rulesets → New branch ruleset (or edit the existing production ruleset).
2. Target exactly `design/private-access-v1`; set enforcement Active.
3. Require a pull request and status checks before merging; add the check `Public forms regression` from GitHub Actions after it appears in recent check runs. Require branches to be up to date if appropriate for your merge process.
4. Ensure direct pushes and bypass permissions cannot circumvent this rule, according to the repository's available GitHub plan. Save only when authorised by the owner.

No remote ruleset or branch protection was changed. The workflow alone reports failures; it does not prohibit merges until configured as required. If Actions are disabled, an owner must enable repository Actions first. Ruleset availability depends on the GitHub plan/repository visibility. This initial PR may require an owner to run/approve the workflow before the check can be selected.

## Real-environment limits
Passing these tests establishes application behaviour under simulated service responses, not live Cloudflare routing/bindings, valid production Turnstile tokens, actual GetResponse double opt-in or mailbox delivery through Resend. HTTP 202 means accepted, not confirmed/delivered. Browser screenshots cannot certify native Gmail/Outlook rendering.

Safe post-deployment observation, without a submission: open www with an existing path/query, verify the browser lands at the apex retaining both, and inspect GET /api/config availability. Live form/provider delivery verification requires separate explicit authorisation and controlled data. These observations are deliberately not automatic PR checks: transient external availability must not be confused with a code regression, and no production form is submitted by this gate.
