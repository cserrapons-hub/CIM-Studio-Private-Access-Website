# CIM Studio — one integral validation and release runbook

This is the single current operational checklist. Previous task-specific notes remain as history; in case of conflict follow this file and the actual code. Work branch: integration/three-forms-2026-10-20. Current local change: record the owner’s express approval of the three private ES/EN policies only. No new commit/push/deployment, configuration change, subscription or email is authorised. Public legal approval remains false. Baseline 372193d was previously pushed and privately deployed.

## Confirmed baseline, not tasks to repeat

The owner confirmed cim-studio-test.pages.dev private Basic login, production branch integration/three-forms-2026-10-20, no custom domain. The public project's production branch remains design/private-access-v1, preview branches None. Netlify repository Not linked, as last confirmed by the owner. These are owner-confirmed settings, not live API checks by this environment.

Owner also confirmed FORMS_DB -> cim-studio-samples-test and CAREERS_DB -> cim-studio-careers-test, previous schemas including 0006/0007 applied in the samples test DB, empty test newsletter tables and quick_check ok. Do not re-run old migrations blindly or create duplicate databases. Owner subsequently confirmed 0008 in FORMS_DB and careers/0003 in CAREERS_DB applied: expected schemas, new tables empty, both quick_check=ok. Do not reapply them. Secret values cannot be read by this checkout.

GetResponse confirmed POST https://app.getresponse.com/add_subscriber.html, email, campaign_token=PL6jh, custom_consentimiento=aceptado, allowed Cloudflare relay, web/API DOI and contact-subscribed after confirmation for this form. Owner queried field consentimiento: customFieldId njH9fM and allowed value aceptado. The actual API campaignId is NOT inferred from panel ID 374914302 or token PL6jh. No Web Connect/Analytics.

## Actualización contractual y alcance de este paquete — 21/10/2026

**Revisión contractual inicial confirmada por CIM Studio (21/10/2026):** Cloudflare: DPA revisado, con garantías para transferencias internacionales y subencargados. GetResponse: soporte confirma DPA integrado en los Términos de Servicio y SCC de la UE. Resend: DPA descargado y revisado, contempla SCC y tratamiento principal en Estados Unidos. Google Workspace: CDPA aceptada en la consola de administración por admin@cimstudio.es el 20/10/2026 (fecha comunicada, sin hora acreditada). Estas son confirmaciones de CIM Studio, no una inspección de los contratos o paneles por Codex. No se vuelven a solicitar esas revisiones ni la aceptación ya comunicada. Deben archivarse las versiones/constancias disponibles en el expediente privado, sin Secrets.

La documentación pública y contractual revisada se distingue de la configuración efectiva de las cuentas: ubicación real, retención, remitente, seguimiento de correo, widget, bindings y funcionamiento requieren comprobación técnica. No se declara cumplimiento RGPD integral, residencia exclusiva en la UE ni garantías distintas de las comunicadas.

Datos confirmados: CIM STUDIO ESPJ, NIF E88749155; Carrer Joan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears; admin@cimstudio.es; Gmail / Google Workspace. Limpieza: CIM Studio, bajo supervisión de su responsable. Para este ensayo se propone limpieza manual dentro de siete días naturales desde el cierre, con excepciones mínimas justificadas. Los plazos de la futura actividad pública no sustituyen este plazo operativo.

PRIVATE-TEST-NOTICES.md conserva los tres avisos completos ES/EN, sus versiones y la tabla única de comprobaciones manuales. La revisión contractual inicial no sustituye la aprobación expresa de los avisos ni las comprobaciones técnicas de cuentas. No se exige repetir DPA/CDPA o aceptación ya confirmados. No se declara cumplimiento RGPD integral.

## A. Private approval recorded — operational gates remain off

1. CIM Studio expressly approved newsletter-private-test-v1, samples-private-test-v1 and careers-private-test-v1, ES/EN, on 2026-10-21, including independent consent, restricted scope and seven-calendar-day manual cleanup after documented closure with individually justified exceptions. Source content is exactly the approved 372193d content, unchanged. Only private policy approved fields become true locally. Public legal/content.js remains approved=false. Do not ask for these approvals again.
2. Runtime acknowledgements NEWSLETTER_TEST_LEGAL_APPROVED, SAMPLES_TEST_LEGAL_APPROVED and CAREERS_TEST_LEGAL_APPROVED remain false, as do acquisition and sending flags. Source approval does not bypass them, Basic, exact origin, own-email HMAC or server validation of fictional sample data.
3. Owner confirms Turnstile Managed, No pre-clearance, hostname cim-studio-test.pages.dev allowed. Do not repeat widget setup; browser technologies and actual request validation still need checking in an authorised session. No blanket cookie exemption is claimed.
4. Retention responsibility: CIM Studio under its responsible representative, seven calendar days after documented closure with minimal justified exceptions and review dates. REGISTRATION_REVIEW_DAYS=30 is a reminder, not a deletion deadline. No deletion or production entitlement is authorised.
5. Still needed before real sends: actual GetResponse API campaign ID/key in the test project and no unrelated automations; verified Resend sender/tracking/recipients; Cloudflare Secret presence and owner-email HMAC match. Never request or log Secret values. No new functionality is required for these checks.

## B. Cloudflare configuration — names only, never values in Git

Check bindings under the private project's Production environment. This is the production environment OF THE TEST PROJECT, not public production.

| Group | Variables/secrets | Check |
|---|---|---|
| Private boundary | CONTROLLED_TEST_MODE=true, CONTROLLED_TEST_ORIGIN=https://cim-studio-test.pages.dev, CONTROLLED_TEST_USER, CONTROLLED_TEST_PASSWORD (Secret, >=32 chars) | Keep HTTPS Basic; preview aliases deliberately rejected. |
| Stores | FORMS_DB, CAREERS_DB | Separate physical D1 databases, correct migrations. |
| Turnstile | TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY (Secret) | Real test host allowed; actions subscribe/samples/careers; browser script only after a form is enabled. |
| Existing audit/encryption | AUDIT_HASH_SECRET, SAMPLES_DATA_KEY, CAREERS_DATA_KEY, NEWSLETTER_DATA_KEY (Secrets) | Do not rotate/recreate existing keys. Data keys encode 32 bytes; samples and career keys differ. |
| Owner allowlist | NEWSLETTER_TEST_ALLOWLIST_SECRET, NEWSLETTER_TEST_EMAIL_HASH (Secrets) | New independent Base64 key TEXT used as UTF-8 HMAC key, message newsletter-test-allowlist:v1: + trimmed/lowercase owner email. Never use it to re-sign evidence. |
| GetResponse read-only | GETRESPONSE_API_KEY (Secret), GETRESPONSE_CAMPAIGN_ID | Existing account key; discover genuine campaignId read-only, verify exact list. No new API key if existing is usable. |
| Resend | RESEND_API_KEY (Secret), MAIL_FROM | Verified sender, authorised recipients. Notification -> admin@cimstudio.es (Google Workspace). Disable unnecessary open/click tracking. Do not replace MX or change DNS without authorisation. |
| Review/retention | REGISTRATION_ORIGIN=https://cim-studio-test.pages.dev, REGISTRATION_REVIEW_DAYS=30, REGISTRATIONS_STORAGE_REVIEWED=false | Set reviewed true only after procedure is approved, not merely to pass a guard. |
| Future public relay | NEWSLETTER_ORIGIN (blank today), NEWSLETTER_PROVIDER=getresponse-html | Canonical public origin will be https://cimstudio.es after launch authorisation. |

All acquisition, sending, runtime-approval and verification flags remain false today:

FORMS_ENABLED, NEWSLETTER_ENABLED, SAMPLES_ENABLED, CAREERS_ENABLED, REGISTRATIONS_TEST_ENABLED, NEWSLETTER_PREPARATION_ENABLED, NEWSLETTER_CONTROLLED_SEND_ENABLED, NEWSLETTER_TEST_LEGAL_APPROVED, NEWSLETTER_OBSERVATIONS_ENABLED, CONTROLLED_REVIEW_ENABLED, SAMPLES_TEST_LEGAL_APPROVED, CAREERS_TEST_LEGAL_APPROVED, MAIL_WORKER_ENABLED, SAMPLES_VERIFIED, CAREERS_VERIFIED, MAIL_RECEIPTS_VERIFIED, FORMS_VERIFIED, NEWSLETTER_PUBLIC_ENABLED, NEWSLETTER_VERIFIED, NEWSLETTER_EVIDENCE_REVIEWED, SITE_LIVE. Also keep GETRESPONSE_WEBHOOK_ENABLED, GETRESPONSE_WEBHOOK_GRANTS_ENABLED, FOUNDERS_RECORDING_VERIFIED and CIM_PRODUCTION_DELIVERY_ENABLED false. This block does not configure CIM Production or its secrets.

### New additive schemas — applied and verified by CIM Studio

- FORMS_DB test: migrations/0008_launch_operations.sql AFTER 0001/0003/0004/0005/0006/0007. Four new tables: registration_audit_seals, registration_submission_claims, newsletter_observations, newsletter_http_receipts. No ALTER/UPDATE/DELETE of old tables.
- CAREERS_DB test: migrations/careers/0003_audit_seals.sql AFTER careers/0001 and 0002. One new table: registration_audit_seals.
- Owner confirms both migrations applied, expected schemas, new tables empty and quick_check=ok in both test databases. Do not re-run migration SQL. Existing unsealed history remains unverified; never retroactively invent evidence.
- Any future PUBLIC database must be separately chosen, backed up and receive its own migration authorisation. Never point test Functions at public customer/production databases.

## C. One authorised private deployment, then one integral test round

### Secuencia única posterior a autorización — nueve operaciones agrupadas

**Estado actualizado:** pasos 1–4 completados por las autorizaciones previas y las comprobaciones comunicadas, excepto que el registro de aprobación privada es ahora un cambio local aún no publicado. Este registro requiere un futuro commit/push/despliegue autorizado, con indicadores false. El paso 5 y los posteriores siguen sin autorizar. Ninguna aprobación documental activa variables o envíos. Una incidencia obliga a parar, no amplía el alcance.

| Paso | Operación posterior | Comprobación y punto de parada |
|---|---|---|
| 1 · Completado | Aprobados expresamente el 21/10/2026; conservar sin cambios los tres avisos ES/EN y sus huellas. No repetir la aprobación. Archivar la aprobación de esta conversación y los textos de 372193d; conservar las confirmaciones contractuales. Correo propio y fechas de ensayo siguen en el inventario privado. | Si falta decisión de consentimiento/tecnologías o el correo no corresponde a la allowlist, no enviar. No aprobar documentos públicos. |
| 2 · Baseline completada | Commit/push 372193d completados previamente; el registro local de aprobación necesita autorización nueva de publicación, con flags false. Repetir revisión del contenido exacto a incluir, pruebas y secretos; commit/push solo a integration/three-forms-2026-10-20. El commit autorizado podrá incorporar las tres aprobaciones limitadas, no la pública; todos los indicadores de entorno seguirán false. | Verificar aislamiento comunicado: solo cim-studio-test autodespliega esta rama; proyecto público con Preview None y Netlify Not linked. Si cambió, detener el push. |
| 3 · Baseline verificada | 372193d Success, Basic y bloqueo de rutas confirmados por CIM Studio; repetir el smoke check solo tras publicar un nuevo commit autorizado. Esperar Success del commit en cim-studio-test. Comprobar Basic sin sesión y con sesión, origen exacto, noindex/no-store, configuración y endpoints de los cuatro tipos bloqueados (newsletter, muestras, empleo y públicos). | Si falla protección, aislamiento o cierre de envíos, detener. No introducir dominios, DNS o acceso público. Registrar commit/despliegue anterior para reversión. |
| 4 · Completado; no ejecutar otra vez | Ambas migraciones aplicadas por CIM Studio, tablas correctas/vacías y quick_check=ok. Identidad confirmada: FORMS_DB → cim-studio-samples-test y CAREERS_DB → cim-studio-careers-test; 0008_launch_operations.sql y careers/0003_audit_seals.sql ya aplicadas; estructuras y quick_check ya verificados por CIM Studio. No reejecutarlas. | No volver a aplicar 0006/0007 ni modificar bases reales. Si esquema inesperado, parar; no reparar destructivamente ni restaurar una base sobre registros nuevos. |
| 5 | Activar únicamente las variables privadas enumeradas debajo; redesplegar la configuración y verificar usuario/correo permitido, origen, versiones y cierres públicos. | Si el servidor no refleja la configuración prevista o falta clave/binding, no enviar. No marcar *_VERIFIED ni SITE_LIVE. |
| 6 | Una única ronda: una solicitud newsletter con observaciones antes, antes del clic DOI y después; una solicitud de muestras con datos ficticios; un registro de empleo con confirmación y baja por acción expresa. | Primero revisar que el correo no sea ya un suscriptor preexistente y esté excluido de campañas/automatizaciones ajenas. No eliminar contactos previos ni cambiar el correo autorizado sin revisión. Probar ES/EN y tamaños localmente; elegir un idioma para cada envío real, sin duplicarlo para traducir. |
| 7 | En la misma sesión comprobar GetResponse/API/campo njH9fM, Resend, Gmail, D1 cifrado y sellos, separación de finalidades y bloqueos. Inspeccionar tecnologías de navegador autorizadas. | Aceptación API no equivale a buzón ni DOI; fecha de solicitud/observación no equivale a fecha original de confirmación. Fundadores pendiente. Resultados inciertos → conciliar, nunca repetir. |
| 8 | Desactivar captación y envíos, redesplegar y comprobar cierre efectivo. Conciliar estados en proveedores/buzones; completar baja newsletter y conservar revisión restringida solo mientras sea necesaria. | Si falla un paso previo, ejecutar esta parada inmediatamente. Mantener canal de retirada y Basic; no reenviar, borrar ni restaurar estados para resolver la incertidumbre. |
| 9 | Preparar inventario final y SQL manual por IDs en ambas bases, con excepciones y fecha límite de siete días. Entregar para limpieza supervisada de CIM Studio. | Solo preparación: no ejecutar DELETE ni limpieza en proveedores bajo esta intervención. La evidencia de posible derecho se revisa antes de proponer supresión. |

**Activación temporal autorizable en el paso 5:** NEWSLETTER_TEST_LEGAL_APPROVED, SAMPLES_TEST_LEGAL_APPROVED, CAREERS_TEST_LEGAL_APPROVED, NEWSLETTER_PREPARATION_ENABLED, NEWSLETTER_CONTROLLED_SEND_ENABLED, NEWSLETTER_OBSERVATIONS_ENABLED, CONTROLLED_REVIEW_ENABLED, FORMS_ENABLED, SAMPLES_ENABLED, CAREERS_ENABLED, REGISTRATIONS_TEST_ENABLED y REGISTRATIONS_STORAGE_REVIEWED (solo tras revisar almacenamiento). CONTROLLED_TEST_MODE permanece true; el resto de captación pública, verificaciones públicas, Worker, webhook, concesión Fundadores, CIM Production y SITE_LIVE permanecen false. Cambios de variables requieren despliegue efectivo.

**Parada y reversión común:** pausar adquisición/envío y comprobar el despliegue de cierre. Si el código es la causa, restaurar únicamente el despliegue privado previo tras revisar sus indicadores y mantener cerrado; no revertir datos D1, no rotar claves, no deshacer evidencias ni disparar reenvíos. Conservar estado incierto para conciliación. Ante fallo de autenticación/origen o tecnología no consentida, detener ese flujo antes de nuevos accesos/envíos. No publicar una corrección especulativa ni tocar el proyecto público. Reanudar fuera del alcance autorizado exige nueva decisión.

Los detalles siguientes describen esa misma ronda, no rondas adicionales. El Worker programado y la publicación pública de los apartados posteriores son referencias futuras, **excluidas de este paquete**.

### Newsletter

The scoped notice is now expressly approved locally, not yet deployed. Only after a future authorised closed deployment and separate activation authorisation, set NEWSLETTER_TEST_LEGAL_APPROVED, NEWSLETTER_PREPARATION_ENABLED and NEWSLETTER_CONTROLLED_SEND_ENABLED true. Optional read-only controls: NEWSLETTER_OBSERVATIONS_ENABLED and CONTROLLED_REVIEW_ENABLED true for the authorised operators. Other public forms can remain false during this part.

Open /controlled/newsletter/ after Basic login. Review ES/EN notice and initially unchecked mandatory checkbox. Enter only the allowlisted owner email. Click the BEFORE observation (authenticated API only); do not infer DOI from contact presence. If already subscribed, stop and choose a separately authorised fresh owner address rather than deleting pre-existing contacts. Verify GetResponse automation will not send unrelated campaign emails to the test contact.

Submit once with Turnstile. Our relay sends ONLY email, campaign_token and custom_consentimiento. It does not call the contacts-create API or send a second email. D1 consent commits before a unique delivery claim. HTTP 409 pending_provider_verification is expected while response semantics are unverified: do not repeat the request. No raw HTML, redirects, cookies, provider errors or secrets are returned/logged.

Inspect the DOI email in the owner inbox, without clicking first. Record the provider state BEFORE clicking; then click once, check the GetResponse UI and click AFTER observation in the private page. The API verifies account/list/contact and njH9fM=aceptado. Snapshots include authenticated read facts and createdOn/changedOn when present, not an invented confirmedAt. They are HMAC sealed with a server observation time. Observe after unsubscribe too. Missing/inactive API contact is only an observation, not proof of original confirmation or a reason to remove a possible entitlement.

Check the private evidence by UUID using the read-only review route; verify consent signature and observation seals. It never grants Founders. No webhook is needed for this first observation test. Do not enable unknown webhook shape/authentication or call it trusted because the payload email happens to match.

The genuine GetResponse acknowledgement must be reviewed before the public release contract can be approved. server/newsletter-release.js is currently approved=false/version empty/acceptedResponse null. Its test fixtures are SIMULATED only. If the actual response cannot distinguish request acceptance from rejection, leave it unapproved and agree a safe alternative; never fill in a guessed success URL or mark HTTP 200 as DOI confirmation.

### Samples

The samples trial notice is now approved locally. Only after future publication and activation authorisation, with SAMPLES_TEST_LEGAL_APPROVED=true, set FORMS_ENABLED=true, SAMPLES_ENABLED=true, REGISTRATIONS_TEST_ENABLED=true, REGISTRATIONS_STORAGE_REVIEWED=true and keep private Basic mode. Leave verification flags false until delivery succeeds. The restricted-test path allows the acquisition test without falsely setting *_VERIFIED.

Use the separate /controlled/registrations/ samples interface; test ES/EN required fields and contact consent. Submit only the preset fictional sample request with the allowlisted owner email and the mandatory test-data acknowledgement. Verify admin@ receives all fields and the request reference; the applicant receives a separate receipt in the chosen language. Receipt does not promise professional pricing, availability or dispatch and does not subscribe to newsletter or grant Founders. Check D1 ciphertext, audit seals and mail provider IDs. Duplicate/reused UUID and changed-content cases are already exercised locally with mocks; do not generate additional real requests or emails for them in this round. An uncertain response must be reconciled, never retried with a new UUID. Exact repeat dedup lasts 24h and does not shorten the approved file-retention period.

### Careers / work with us

The career trial notice is now approved locally. Only after future publication and activation authorisation, with CAREERS_TEST_LEGAL_APPROVED=true, enable CAREERS_ENABLED=true under the same private registration test gates; use /controlled/registrations/ and the existing owner-email allowlist. Submit email only with its independent unchecked consent. Verify a separate CAREERS_DB record, HMAC evidence and Resend receipt. GET/open of the email link does not activate career updates. Explicit Confirm action records career-email confirmation; newsletter/Founders remain untouched. Withdraw, verify encrypted active email removed, queued unsent messages cancelled and minimum consent history retained only as justified. Re-consent/new-token/old-token rejection are covered locally; no additional real signup is needed in this round. Future broadcasts are outside this block and must filter confirmed/current-review/non-withdrawn records and carry the independent withdrawal mechanism.

### Mail errors, spam and receipts

Turnstile validates server-side hostname/action; same-origin JSON, honeypot and per-IP rate limits apply. Local protection does not prevent direct POST to GetResponse's separate endpoint. Record this provider-side risk before public activation.

Resend acceptance is NOT inbox delivery. Check provider dashboard AND inboxes, including spam. Five definite 429 attempts maximum with bounded backoff; scheduled worker is opt-in. Timeout/5xx/unparseable acknowledgement is unknown, parked for reconciliation, not blindly resent. Accepted mail payload ciphertext is cleared; minimal provider ID/state remains. No request/email/PII logging. During the single round use simulated failures locally rather than intentionally spamming live providers.

For scheduled retries only after authorisation, deploy workers/registrations.js with the same D1/approved policy/secrets and a reviewed schedule, then MAIL_WORKER_ENABLED=true. The Pages variable by itself does not create a scheduled Worker. Unknown/rejected mail must be reconciled in Resend before a separately authorised targeted retry. No public drain route exists.

### Owner-only read access

CONTROLLED_REVIEW_ENABLED permits POST /api/controlled/review on the exact private host after Basic login and same-origin JSON. action=summary plus kind=samples/careers/newsletter returns counts only. action=record plus exact opaque id returns only that request; samples/careers decrypt with their own key and show audit status, consent and minimal mail state. Newsletter review returns signed evidence/observations, not a grant or secret. Never publish screenshots/exports containing personal details. No list of all decrypted contacts, mutating admin action or public operator route is provided. Public operational samples access remains the authorised admin mailbox and restricted Cloudflare administration; do not repoint a test project to production data for convenience.

## D. Browser and legal technology review during the SAME round

Use clean profiles ES/EN and desktop/mobile. Capture only minimum redacted evidence. Check scripts, network destinations, cookies, local/session storage, IndexedDB, service workers and provider redirects before/after opening, Turnstile, submitting and confirming. Do not infer cookie exemption from the Turnstile brand or add a generic banner without evidence. Non-essential technologies, if observed, require appropriate blocking/consent before public activation. No Google Analytics, Meta Pixel, GetResponse Analytics or Web Connect in this code.

Check 1920/1440/tablet/390/320 layouts, legal links, modal focus/keyboard, mandatory consent initially unchecked, no horizontal overflow, loading/errors/pending states and no secret/PII in public URLs. Server-side GetResponse search necessarily includes an email in its API query; do not log it, and do not claim the provider has no request logs.

## E. Stop, reconcile and clean up

1. Set NEWSLETTER_CONTROLLED_SEND_ENABLED=false and NEWSLETTER_PREPARATION_ENABLED=false, disable SAMPLES_ENABLED/CAREERS_ENABLED/FORMS_ENABLED/REGISTRATIONS_TEST_ENABLED, MAIL_WORKER_ENABLED and stop any scheduled Worker. For immediate containment use Cloudflare controls as appropriate; saved environment changes need a new deployment before serving Functions picks them up. Never rely on a change not yet deployed.
2. Keep independent withdrawal available where possible; do not deactivate an already-live user's opt-out merely because acquisition is paused. On the private project an operator may need Basic login. Check no mail is in-flight and reconcile uncertain records with provider dashboard/inbox.
3. Newsletter unsubscribe in GetResponse first, then inspect the provider's deletion options/limits. Review any possible Founders evidence before deleting it: the test label alone does not automatically extinguish rights. Default cleanup plan RETAINS newsletter evidence until reviewed. No automatic benefit/revocation.
4. server/test-cleanup-plan.js generates only identifier-scoped SQL, never executes it. It requires explicit authorisation, stopped sends, reconciled providers and a separate erase-after-reviewed-rights decision for newsletter evidence. Supply exact test request/observation IDs, not emails/keys. CAREERS_DB and FORMS_DB plans are separate, children first. Never DROP/TRUNCATE or delete all table contents. Do not remove dedup locks merely to force a resend.
5. Verify selected test rows gone and unrelated marker/records intact; quick_check ok. Include D1 recovery/Time Travel, provider logs/backups, mailbox and private downloads in retention review; no promise of instant physical erasure across providers. Remove only no-longer-needed own test artifacts, not evidence held under an approved purpose. Disable observations/review flags and redeploy when reconciliation is complete.

## F. Public launch without changing the existing project prematurely

Before this point: one successful authorised integral round, all actual delivery/consent checks recorded, legal/source response/evidence workflow explicitly approved. The automatic CIM Production connector and automatic Founders discount grant are EXCLUDED; their flags remain false. Keep minimal signed evidence pending independent original-confirmation verification and later reconciliation; assign a responsible reviewer, review frequency and justified retention limit. If original date cannot be substantiated, keep the claim pending, never fabricate it.

1. Record current public project branch, deployed commit, custom domains/DNS/MX and settings for rollback. Verify a consistent D1 backup/restore method. Do not rotate encryption/audit secrets with outstanding records.
2. Prepare a candidate release from this reviewed branch after authorisation, initially on a separate protected Pages project with fresh approved bindings/secrets or a deliberately reviewed release environment. Do not change the current public deployment or its design/private-access-v1 branch during local preparation. Re-run all tests and real smoke checks before a separate publication authorisation.
3. Public code gates require legal/content.js approved/versioned, server/newsletter-release.js reviewed with a real response contract, NEWSLETTER_PUBLIC_ENABLED, NEWSLETTER_VERIFIED, NEWSLETTER_EVIDENCE_REVIEWED, FORMS/NEWSLETTER/SAMPLES/CAREERS enable flags, registration storage reviewed, all three real verification flags and receipt/forms verification. Public NEWSLETTER_ORIGIN/REGISTRATION_ORIGIN must be https://cimstudio.es; test Basic mode must NOT be used on public release. None of these flags are enabled now. A source contract or legal review cannot be fabricated by setting env flags.
4. Publish only after explicit authorisation, either by a reviewed project branch switch to the release commit or by switching the domain to a separately validated release project; choose ONE path in that authorisation and preserve the old deployment. No main merge is required. Do not keep two projects collecting production subscriptions unintentionally.
5. Domain changes are manual and separately authorised. Follow Cloudflare Pages Custom domains instructions for cimstudio.es; exact GoDaddy records depend on the actual zone/delegation and must be inspected, never guessed. Preserve Google Workspace MX/SPF/DKIM/DMARC and other mail records. Verify ownership, HTTPS certificate, canonical host and www/root redirect without loops, then forms/receipts/rights/SEO/favicon. Remove demonstration copy only for truly connected/verified forms. No test project indexability; only approved live canonical release gets index/follow, robots allow and canonical/sitemap.
6. Rollback: stop acquisition/send/worker flags and deploy them first, preserve evidence/mail-state to avoid duplicates, then restore the recorded previous code/Pages deployment if appropriate. Do not roll back D1 by destructive old-schema restoration, erase consents or re-send uncertain mail. An old deployment may have old approval/gate semantics; check flags/config and opt-out behaviour explicitly. Restore only web DNS if a separately authorised cutover needs reversal, never touch mail records. Reconcile missing/duplicate acknowledgements before re-enabling.

## G. Local validation commands

- sh scripts/build-preview.sh
- npm test
- node scripts/test-newsletter-private-browser.mjs
- node scripts/test-registration-private-browser.mjs
- node scripts/test-three-forms-browser.mjs
- Wrangler pages functions build functions --outdir /tmp/... (build only, not deploy)

Browser scripts require Playwright/Chromium and Node with node:sqlite; PLAYWRIGHT_MODULE/CHROMIUM_EXECUTABLE may point at the local installation. All providers are mocked/intercepted. No real Safari/iPhone verification or real delivery is claimed. Existing integration simulations may be run against disposable Flask/SQLite, but this block never modifies Cim-Production.

## H. Local validation report

LOCAL-VALIDATION-REPORT.md records the checks, exact scope, outstanding approvals and pending-file inventory for this local block. Read it together with this runbook; neither file authorises any operation. Additional future-public UI simulation: node scripts/test-newsletter-public-browser.mjs, using a SIMULATED response contract only.

## Limited approval adjustment (local only)

The sample/career private routes have their own fixed-version source approvals and false-by-default runtime acknowledgements. No new database schema or Secret is required. They reuse the independent owner-email allowlist solely for authorisation, not the audit key for consent signing. The complete unchanged notices and the express approval record are in PRIVATE-TEST-NOTICES.md. The career test receipt points to the protected trial page; its fragment is cleared on opening and no confirmation/withdrawal occurs without an explicit action. Run node scripts/test-registration-private-browser.mjs for the additional fully mocked browser checks. No public approval, activation or deployment is implied.
