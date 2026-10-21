# Informe consolidado de preparación local — CIM Studio

Rama: integration/three-forms-2026-10-20. Último commit existente: ffb9d9c. Este bloque NO ha creado commit ni push. El trabajo local anterior de la política privada/interfaz y las 114 pruebas está conservado y ampliado. Cim-Production permanece sin cambios.

## Preparado localmente

- Ensayo de newsletter independiente de aprobación pública: aviso ES/EN con revisión draft-2, consentimiento obligatorio desmarcado, Basic y origen privado exacto, Turnstile, allowlist HMAC independiente, límites, evidencia AES-GCM/HMAC y exclusión de reenvíos inciertos.
- Observaciones API autenticadas antes/después/baja, lista exacta y campo njH9fM. Fechas devueltas se preservan como observaciones firmadas, NO como fecha original acreditada. Fundadores siempre pendiente; no grants ni envíos a CIM Production.
- Futuro adaptador público conectado al modal existente pero cerrado por contrato de respuesta aprobado=false, revisión legal y flags false. Solo una respuesta verdaderamente revisada podrá mostrar el modal de DOI; fixtures de éxito son simuladas, no URLs propuestas al proveedor.
- Muestras: campos originales, validación, consentimiento, Turnstile, cifrado, referencia en notificación, recibo ES/EN, deduplicación de UUID y solicitudes idénticas durante 24h, auditoría de consentimiento y acceso privado puntual.
- Empleo/colaboraciones: email solamente, base y consentimiento separados, confirmación propia por enlace sin activación al GET, baja y cancelación de correos pendientes, re-consentimiento y auditoría. No campañas masivas añadidas.
- Resend: payloads cifrados, claims atómicos e idempotencia, registro de aceptación técnica/ID, máximo cinco intentos de 429 con backoff; timeout/5xx/acuse inválido quedan desconocidos para conciliación. Aceptación NO equivale a entrega en buzón.
- Revisión privada autenticada de una solicitud y resúmenes sin exportación masiva. Generador puro de limpieza por IDs que no ejecuta SQL y conserva por defecto evidencias newsletter hasta revisión del posible derecho.

## Resultados comprobados

- 133 pruebas Node superadas: incluye las 114 existentes, seguridad, origen/autenticación, consentimientos, HMAC, duplicados/concurrencia, proveedor/D1, límites/reintentos, snapshots, limpieza y migraciones aditivas.
- 16 casos Chromium del ensayo privado ES/EN a 1920/1440/768/390 px, incluyendo snapshots antes/después. Borrador bloqueado sin peticiones externas.
- 12 casos Chromium del futuro newsletter público ES/EN a 1440/390 px con contrato/proveedor simulados: aceptación, rechazo y respuesta desconocida; modal DOI solo en aceptación simulada revisada.
- 10 casos Chromium de regresión de portada/muestras/empleo ES/EN a 1920/1440/768/390/320 px. Newsletter real sigue bloqueado; sin desbordamientos ni errores JS en esos recorridos.
- Compilación estática y Pages Functions correctas; Worker de correo comprueba sintaxis; diff sin errores y revisión de patrones de credenciales sin hallazgos. No hay secretos reales en los archivos añadidos.
- Las pruebas son locales con SQLite desechable y proveedores simulados. No acreditan entrega real, Safari físico, contratos del proveedor, estado actual de Cloudflare o aprobación jurídica.

## Aprobaciones y bloqueos reales

1. Aviso privado ES/EN y su versión fija, texto público de los cuatro documentos, bases por finalidad y garantías/contratos/transferencias de los proveedores. Ambas aprobaciones siguen false; las variables solas no aprueban documentos.
2. Retención: propuesta de siete días tras cerrar ensayo, excepciones documentadas; 12 meses muestras sin relación posterior (inicio pendiente), revisión de empleo/pendientes, mínimo tras baja y evidencia posible Fundadores. Treinta días es recordatorio operativo, no borrado automático.
3. Respuesta REAL de GetResponse y evidencia DOI: el endpoint/campos están confirmados, pero no se ha comprobado un envío. No hay campo autenticado demostrado para fecha original; mantener Fundadores pendiente y revisar pruebas manuales independientes. La firma de webhook no documentada no bloquea preparar/observar el ensayo y no se inventa.
4. Configuración REAL en el proyecto privado: clave API GetResponse disponible allí, campaignId real, remitente Resend verificado y entrega en ambos buzones, Turnstile del host correcto, nuevas tablas y política de eliminación/revisión asignada. No son hechos verificables desde el checkout.

## Una sola ronda y publicación

Seguir LAUNCH-RUNBOOK.md: aprobaciones y autorizar despliegue privado una vez; 0008 en FORMS_DB test y careers/0003 en CAREERS_DB test; habilitación selectiva de cada prueba; newsletter una vez con snapshots y DOI, muestras con notificación/recibo, empleo con confirmación y baja; verificar inboxes/proveedor, D1 y navegador; desactivar, conciliar y limpiar de forma acotada. No borrar un posible derecho por tratarse de un ensayo.

Tras la ronda, aprobar el contrato de respuesta real y las verificaciones, repetir el smoke check y autorizar la publicación por una única ruta de release preservando el despliegue anterior. No se requieren cambios de CIM Production para esta publicación. DNS/custom domain y HTTPS se autorizan aparte; conservar todos los registros de correo Google Workspace. La reversión pausa envíos, conserva registros y restaura el código/deployment anterior sin deshacer destructivamente D1 ni reenviar mensajes inciertos.

## Tiempo efectivo estimado restante

Con decisiones legales resueltas y comportamiento esperado del proveedor: aproximadamente 4–8 horas técnicas para configuración, ronda integral, ajustes del contrato real y publicación/chequeos. No incluye revisión jurídica externa, esperas de soporte, verificación de remitente, certificados o propagación DNS. Si el resultado de GetResponse no permite una respuesta segura/evidencia suficiente, no se puede prometer un plazo cerrado para resolver ese bloqueo.

## Archivos pendientes (incluye el trabajo local preservado)

- .dev.vars.example
- CONTROLLED-TEST.md
- GETRESPONSE-HTML.md
- GETRESPONSE-REAL-TEST.md
- LAUNCH-CHECKLIST.md
- LAUNCH-RUNBOOK.md
- LAUNCH.md
- README.md
- THREE-FORMS-LAUNCH.md
- _headers
- config/controlled-test.vars.example
- controlled/newsletter/index.html
- controlled/newsletter/test.css
- controlled/newsletter/test.js
- functions/_middleware.js
- functions/api/controlled/newsletter-config.js
- functions/api/controlled/newsletter-observation.js
- functions/api/controlled/review.js
- functions/api/subscribe.js
- integrations.js
- legal/content.js
- migrations/0008_launch_operations.sql
- migrations/careers/0003_audit_seals.sql
- scripts/build-preview.sh
- scripts/prepare-launch.mjs
- scripts/test-newsletter-private-browser.mjs
- scripts/test-newsletter-public-browser.mjs
- scripts/test-three-forms-browser.mjs
- server/controlled-review.js
- server/getresponse-controlled-handler.js
- server/getresponse-controlled.js
- server/getresponse-form.js
- server/newsletter-observations.js
- server/newsletter-public.js
- server/newsletter-release.js
- server/newsletter-test-boundary.js
- server/newsletter-test-policy.js
- server/registration-audit.js
- server/registrations.js
- server/settings.js
- server/test-cleanup-plan.js
- tests/getresponse-controlled-handler.test.mjs
- tests/getresponse-controlled.test.mjs
- tests/getresponse-form.test.mjs
- tests/helpers/launch-fixture.mjs
- tests/launch-migrations.test.mjs
- tests/launch-operations.test.mjs
- tests/newsletter-private-interface.test.mjs
- tests/newsletter-public.test.mjs
- tests/registrations.test.mjs
- tests/test-cleanup-plan.test.mjs
- workers/registrations.js
- LOCAL-VALIDATION-REPORT.md

## Ajuste posterior: aprobación limitada de muestras y colaboraciones

Implementado localmente el ámbito privado independiente por formulario, sin cambiar legal/content.js ni aprobar sus documentos. Versiones fijas propuestas: newsletter-private-test-v1, samples-private-test-v1 y careers-private-test-v1; las tres aprobaciones siguen false. Avisos completos exactos ES/EN: PRIVATE-TEST-NOTICES.md.

Se añade /controlled/registrations/ y rutas privadas de configuración, muestras, empleo y preferencias. Exigen host privado exacto, Basic, consentimiento obligatorio, versión vigente, reconocimiento de datos de ensayo y correo propio mediante la allowlist HMAC existente. Muestras admite únicamente datos ficticios prefijados en servidor. Los endpoints públicos permanecen bloqueados; bases, claves de cifrado y evidencias siguen separadas. No se requieren migraciones nuevas ni Secrets adicionales.

Validación del ajuste: 142/142 pruebas Node; 16 simulaciones Chromium nuevas de la interfaz privada (muestras/empleo, ES/EN, 1440/390 px, borrador bloqueado y aprobación simulada). Compilación estática y Pages Functions correctas. Todo con SQLite desechable y proveedores interceptados; ningún envío real.

## Paquete privado consolidado — 21/10/2026 (estado más reciente)

Esta actualización prevalece sobre los estados históricos de aprobación contractual y conteo de archivos que aparecen antes. No se ha creado commit ni realizado operación remota. Último commit permanece ffb9d9c; rama integration/three-forms-2026-10-20.

### Revisión contractual comunicada y cambios de esta intervención

CIM Studio comunica: Cloudflare DPA revisado con garantías de transferencias/subencargados; GetResponse soporte confirma DPA en ToS y SCC UE; Resend DPA descargado/revisado con SCC y tratamiento principal en Estados Unidos; Google Workspace CDPA aceptada por admin@cimstudio.es el 20/10/2026. Se incorporan a PRIVATE-TEST-NOTICES.md y LAUNCH-RUNBOOK.md y a las explicaciones ES/EN de proveedores de los avisos fuente. Son confirmaciones de CIM Studio, no inspecciones independientes de contratos/paneles. No se exige repetirlas ni se declara cumplimiento integral.

Cambios exclusivamente documentales: LAUNCH-RUNBOOK.md, PRIVATE-TEST-NOTICES.md, server/newsletter-test-policy.js y server/registration-test-policy.js, además de este informe. Las casillas/consentimientos, versiones v1, campos HTML GetResponse, código de envío/evidencia y aprobación false permanecen intactos. Verificados por SHA-256 sin cambio durante esta intervención: legal/content.js, adaptadores GetResponse, scope privado, index.html, styles.css, script.js e integrations.js. Ninguna fotografía se ha añadido/modificado.

### Inventario completo y seguridad

Hay 65 archivos pendientes: todos los 53 del inventario anterior siguen presentes y se suman exactamente estos 12:

- PRIVATE-TEST-NOTICES.md
- controlled/registrations/index.html
- controlled/registrations/test.css
- controlled/registrations/test.js
- functions/api/controlled/career-preferences.js
- functions/api/controlled/careers.js
- functions/api/controlled/registration-config.js
- functions/api/controlled/samples.js
- scripts/test-registration-private-browser.mjs
- server/registration-test-policy.js
- server/registration-test-scope.js
- tests/registration-private-policy.test.mjs

Revisión del conjunto pendiente y patrones de credenciales/archivos sensibles sin hallazgos. Direcciones: datos corporativos necesarios o fixtures de dominios reservados de prueba; no datos reales de participantes, claves, tokens de cuenta, bases/exports ni archivos de configuración con Secrets. Antes del futuro commit se revisará de nuevo el contenido exacto preparado para staging. Esta revisión no concede autorización de commit/push.

### Validación actual ejecutada

- 142/142 pruebas Node, incluidas migraciones aditivas en SQLite desechable y bloqueos/consentimiento/aislamiento.
- Build estático correcto; Pages Functions compiladas correctamente con Wrangler (solo build).
- 54 casos Chromium: 16 newsletter privado, 16 muestras/empleo privados, 10 regresión de portada/formularios, 12 newsletter público futuro con perfil simulado. ES/EN, escritorio/tablet/móvil según cada matriz; sin errores JS ni desbordamientos comprobados. Todas las llamadas de proveedores interceptadas; bases SQLite locales, no D1 remota. No se verifica Safari físico ni entregas reales.
- git diff --check sin errores. Aprobaciones global/privadas false e indicadores de ejemplo false, salvo CONTROLLED_TEST_MODE=true para exigir el acceso privado. Secrets/variables reales no se pueden inspeccionar desde el checkout.
- Nuevos SQL: solo CREATE TABLE IF NOT EXISTS; FORMS_DB agrega cuatro tablas y CAREERS_DB agrega registration_audit_seals. Sin ALTER/UPDATE/DELETE/DROP ni sustitución de datos. Compatibilidad y repetición cubiertas por tests. FORMS_DB → cim-studio-samples-test y CAREERS_DB → cim-studio-careers-test siguen siendo bindings confirmados por CIM Studio, no consultados ahora en Cloudflare.

### Pendiente real y secuencia

LAUNCH-RUNBOOK.md apartado C fija nueve pasos: aprobación; commit/push solo integración; deploy privado cerrado; dos migraciones solo test; activación restringida; una ronda real; verificación conjunta de proveedores/buzones/D1; desactivación y conciliación; preparación de limpieza por IDs sin ejecutar borrados. Incluye paradas y reversión no destructiva. No repetir un resultado incierto ni generar altas adicionales para casos de duplicado ya simulados.

Falta aprobación expresa de los tres avisos/retención/tecnologías y autorización de operaciones; comprobación técnica de cuentas existentes (campaña API real, correo allowlisted, remitente, tracking, widget/host, retención y bindings/aislamiento); aplicación autorizada de dos esquemas nuevos; y comprobar comportamiento real/entrega durante la ronda. Revisión contractual inicial no se vuelve a pedir. Fecha original DOI, autenticación de webhook y CIM Production siguen pendientes pero no bloquean observar el ensayo sin conceder Fundadores. Ningún envío está habilitado ahora.

Estimación, con decisiones y cuentas disponibles: 2–3 horas técnicas efectivas para ejecutar la secuencia privada y preparar la limpieza, más esperas de despliegue/proveedores. No incluye subsanar incidencias externas ni acredita que el lanzamiento público esté listo.
