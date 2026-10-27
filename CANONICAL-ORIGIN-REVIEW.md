# Canonical public origin

## Demonstrated cause
The reported browser request is `POST https://www.cimstudio.es/api/subscribe`, with HTTP 403 and `{ "error": "origin" }`. The frontend deliberately uses relative `/api/...` URLs. Opening a form on www therefore submits to www. Newsletter checks the request URL origin against NEWSLETTER_ORIGIN and its Origin header; samples and careers perform equivalent checks against REGISTRATION_ORIGIN. Changing sender credentials cannot fix this rejection.

## Minimal correction
The Pages root middleware returns 308 for GET/HEAD navigation on exactly www.cimstudio.es, targeting https://cimstudio.es with the same path and query. Other hosts, including private Pages previews, are unchanged. POST requests are not redirected or replayed: existing origin and Turnstile validation remain intact. A page already open on www must be reloaded after deployment before use.

## Cloudflare account checks (no secret changes)
Public project: cim-studio-private-access-website → Settings → Variables and Secrets → Production:
- NEWSLETTER_ORIGIN = https://cimstudio.es
- REGISTRATION_ORIGIN = https://cimstudio.es
Both are origins only: no trailing slash or path. Do not change private project variables.
Custom domains: cimstudio.es and www.cimstudio.es must both be Active on this Pages project, with valid TLS. The middleware can only handle www if requests reach this project. Check Cloudflare Rules → Redirect Rules / Page Rules / Bulk Redirects: no rule may redirect the apex back to www. Account configuration cannot be read from this environment; do not assume these checks have been verified remotely. No extra redirect rule is necessary if both hosts reach Pages. No mail DNS records need changing.

## Verification scope
Automated middleware tests cover GET/HEAD paths, queries, preview isolation and refusal to redirect POST. Browser simulations run both entry origins through the canonical middleware, then load its destination and exercise all three forms in ES/EN at 1440 and 390 px using mocked config, Turnstile and API responses. This does not verify live Cloudflare routing, real tokens or provider delivery. No real submissions are made.

After an authorised deployment, GET-only checks suffice initially: open https://www.cimstudio.es/?lang=en and verify the final URL is https://cimstudio.es/?lang=en; check /api/config returns JSON from the apex. Do not resubmit earlier uncertain requests automatically.
