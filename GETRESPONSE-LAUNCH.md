# Ruta vigente para el lanzamiento: formulario GetResponse + webhook

**ACTUALIZACIÓN POSTERIOR:** seguir [GETRESPONSE-HTML.md](GETRESPONSE-HTML.md). Se retira la vía alojada y se prepara HTML independiente, bloqueado hasta recibir/revisar el código oficial de GetResponse. Se mantiene CIM Production como registro definitivo.

**DECISIÓN POSTERIOR:** [CIM-PRODUCTION-LAUNCH.md](CIM-PRODUCTION-LAUNCH.md) establece CIM Production como único registro de Clientes/Fundadores y la activación posterior de muestras. No aplicar las propuestas antiguas de derechos definitivos en D1.

Este documento sustituye las instrucciones anteriores de alta por API de LAUNCH.md, NEWSLETTER.md y LAUNCH-CHECKLIST.md. No activar nada siguiendo esas instrucciones históricas. Todo sigue local, sin push ni despliegue, sin altas reales y con legal.approved=false.

## Decisión mínima preparada

Se conserva la portada y el modal CIM Studio. Al activar una conexión revisada, el formulario local de newsletter se sustituye dentro del modal por un enlace con el estilo del botón actual. Abre un formulario ALOJADO por GetResponse en otra pestaña, sin enviarle los campos del formulario local ni parámetros personales.

Se conoce el identificador público del formulario: 9748c724-790b-4c48-bbde-29366c400934. La titular confirmó visualmente su lista cim_studio_newsletter y la opción de email de confirmación. Eso no proporciona su URL alojada, su campaignId ni verifica aún su consentimiento obligatorio inicialmente desmarcado o el comportamiento real del webhook.

**Falta confirmar que este formulario permite una URL alojada pública.** El código getresponse-form por sí solo no es una URL ni un formulario HTML autónomo: necesita Web Connect. No se ha inventado una dirección a partir del ID. Si GetResponse no facilita una página alojada para ese formulario, esta vía no se puede activar; habría que obtener otra forma de inserción oficial sin seguimiento o revisar Web Connect y el consentimiento antes de incorporarlo.

La ruta pública POST /api/subscribe devuelve 503 de forma incondicional. El código histórico del commit 57afd89 permanece en el repositorio para referencia y sus pruebas, pero los campos de consentimiento de aquella API no se presentan como equivalentes al consentimiento del formulario de GetResponse.

No se cargan Web Connect, GetResponse Analytics, píxeles, iframes o fuentes externas. No se han ampliado CSP ni permisos de terceros. La página alojada de GetResponse tendrá sus propias tecnologías: hay que revisar su información/consentimiento también. El diseño de nuestra portada/modal se conserva; el diseño y la pantalla posterior al envío del formulario externo dependen del editor GetResponse y deben revisarse allí. No se promete una inserción visualmente idéntica del widget dentro del modal.

Al abrir el enlace NO se muestra una confirmación de envío en CIM Studio: abrir o volver de otra pestaña no acredita que GetResponse haya aceptado nada. El mensaje que pide confirmar el email debe configurarse/comprobarse en el propio formulario GetResponse. La bienvenida preparada en /bienvenida/ puede usarse tras la confirmación cuando se autorice configurar esa redirección. Tampoco acredita ni concede beneficios.

## Receptor y registro preparados

Endpoint: POST /api/webhooks/getresponse.

- Desactivado por defecto y bloqueado mientras no se revise el contrato real.
- Confía únicamente en CF-Connecting-IP suministrado por Cloudflare Pages, exige metadatos CF y rangos CIDR revisados del proveedor. No acepta User-Agent, Origin o X-Forwarded-For como autenticación.
- Verifica adicionalmente el contacto, email y campaña en NUESTRA cuenta con GET /v3/contacts/{id}, usando GETRESPONSE_API_KEY solo en servidor. Esa consulta no crea contactos ni confirma consentimiento. Los rangos IP pueden compartirse entre clientes de GetResponse; no bastan por sí solos para atribuir un evento a la cuenta.
- Si GetResponse admite una cabecera secreta configurable, se puede exigir Authorization: Bearer mediante un secreto adicional. No se ha confirmado que lo admita; no se inventa firma de proveedor ni se pone ningún secreto en la URL.
- Limita tamaño JSON y solicitudes por IP, valida occurredAt UTC, campaña, identidad y origen del formulario; no utiliza fechas de solicitud/creación. Solo se puede conceder si el contrato real demuestra la confirmación y la procedencia del formulario esperado.
- Deduplica por identidad/campaña/contacto/formulario/instante normalizados. Guarda HMAC de email, referencias, fecha del evento/recepción y huella del cuerpo; no guarda email/IP en claro ni cuerpo completo. Es información personal seudonimizada.
- Una copia mínima queda en cuarentena antes de consultar el contacto, para no perder un aviso por baja inmediata o fallo de API. Eso NO concede beneficio. Un contacto ya inactivo o una comprobación fallida requiere conciliación manual.
- Solo tras verificación expresa de semántica/autenticación, configuración de concesión y coincidencia del formulario puede pasar al registro independiente founders_entitlements.
- Reintentos y nuevas confirmaciones no sobrescriben el primer derecho. Una baja u otro evento no lo elimina.
- Se aplica el límite exclusivo 2026-12-31T23:00:00Z, equivalente al final del 31/12/2026 en Europe/Madrid. No se conserva un expediente Fundadores para fechas posteriores.
- Un fallo de almacenamiento no se comunica como recibido. Deben comprobarse la política real de reintentos y la conciliación de entregas fallidas de GetResponse.

El adaptador server/getresponse-webhook-contract.js contiene shapeVerified=false, confirmationSemanticsVerified=false y paths=null. No se han inventado nombres del JSON que no pudimos consultar. Los tests inyectan un contrato SIMULADO, no una supuesta muestra del proveedor. Hace falta completar el adaptador con el JSON/documentación reales. Si no hay un dato que acredite el origen del formulario, la automatización queda bloqueada hasta disponer de otro criterio verificable: el nombre del evento no prueba por sí solo que todas las altas sean double opt-in.

La activación del enlace público también queda bloqueada mientras falten la forma real del webhook, almacenamiento y controles de recepción. SITE_LIVE requiere además la semántica de confirmación verificada y concesión habilitada. No bastan dos variables para saltarse un contrato desconocido.

## Configuración pendiente (sin aplicar)

Cloudflare Pages Production sigue en design/private-access-v1. No tocar main ni DNS ahora.

- D1: binding FORMS_DB. Aplicar migrations/0001_forms.sql, 0002_founders.sql y 0003_getresponse_webhook.sql tras aprobar la finalidad legal. Revisar acceso, conservación mínima y copias/recuperación de evidencias y cuarentenas; no hay borrado automático de evidencias y no se presume conservación indefinida.
- GETRESPONSE_API_KEY: secreto ya existente; se reutiliza solo para consultas de cuenta/contacto en este flujo.
- GETRESPONSE_CAMPAIGN_ID: ID real de la lista, no el ID UUID del formulario.
- AUDIT_HASH_SECRET: secreto estable, aleatorio, de al menos 32 caracteres; no rotar sin migración.
- NEWSLETTER_PROVIDER=getresponse-hosted.
- GETRESPONSE_HOSTED_FORM_URL: URL real HTTPS, revisada, sin credenciales ni parámetros personales. Se permiten dominios de alojamiento GetResponse/gr8/getresponsepages. No se admite una URL arbitraria.
- GETRESPONSE_HOSTED_FORM_REVIEWED=false hasta revisión de formulario y tecnologías.
- GETRESPONSE_WEBHOOK_CIDRS: rangos oficiales pertinentes de https://us-ms.gr-cdn.com/ip-ranges.json, revisados sin inventar ni ampliar a 0.0.0.0/0. Definir revisión de cambios; no se descargan ni actualizan automáticamente.
- GETRESPONSE_WEBHOOK_IPS_REVIEWED=false hasta comprobar los rangos y la IP efectiva de una entrega.
- GETRESPONSE_WEBHOOK_BEARER_SECRET: solo si se confirma soporte de cabecera secreta. Nunca pegar secretos en chat ni parámetros URL.
- Mantener false: GETRESPONSE_WEBHOOK_ENABLED, GETRESPONSE_WEBHOOK_GRANTS_ENABLED, FOUNDERS_RECORDING_VERIFIED, FORMS_ENABLED, NEWSLETTER_ENABLED, FORMS_VERIFIED y SITE_LIVE.
- Mantener SAMPLES_ENABLED=false y CAREERS_ENABLED=false. No hacen falta Resend, lista laboral, los cuatro campos GR_CONSENT_* de la antigua API ni Turnstile propio para abrir el formulario alojado. Las protecciones del formulario alojado se revisan en GetResponse.

## Únicos bloqueos imprescindibles

1. **Formulario sin Analytics en nuestra web:** obtener su URL alojada real y revisar consentimiento obligatorio sin premarcar, double opt-in, mensaje tras envío y tecnologías del proveedor. Si no hay URL, decidir una inserción oficial alternativa antes de cargar Web Connect.
2. **Contrato y atribución del webhook:** obtener ejemplo JSON anonimizado, cabeceras documentadas, rangos IP y campaignId real. Completar los campos, verificar qué prueba el origen del formulario y comprobar reintentos. El soporte confirma occurredAt UTC, pero eso no sustituye la verificación del payload y del comportamiento concreto.
3. **Privacidad y almacenamiento:** aprobación expresa de documentos ES/EN, base/conservación del registro separado, cuarentena y proveedores; D1 y secretos configurados. approved sigue false.
4. **Prueba real autorizada:** desplegar primero en un entorno restringido; verificar que no se acredita nada antes del clic, que después se recibe occurredAt correcto, que duplicados no duplican derechos y que una baja inmediata/posterior no los pierde. No hacerla sin avisar y autorización. Solo después habilitar concesión/registro y publicación del enlace.

La conexión de cimstudio.es será una acción posterior autorizada en Pages → Custom domains, preservando toda la zona y los registros de Google Workspace. No se ha cambiado ninguna configuración externa.
