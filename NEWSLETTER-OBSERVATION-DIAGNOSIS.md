# Newsletter privada — diagnóstico local de observación

Fecha: 21/10/2026. Base: commit 4109e80; rama integration/three-forms-2026-10-20. No hay commit/push/despliegue nuevo ni consultas reales a proveedores o D1.

## Resultado y límite

No se ha identificado la causa concreta del fallo en Cloudflare: no hay acceso a la ejecución real ni a la respuesta HTTP original. Sí se han identificado y corregido localmente dos defectos verificables:

1. El botón de observación reutilizaba el mensaje de fallo de envío y no borraba el mensaje anterior al completar una observación posterior.
2. El servidor ocultaba bajo unavailable todos los fallos de API, validación de respuesta y D1; el cliente descartaba incluso el código HTTP/error. La configuración de la interfaz solo comprobaba parte de los requisitos y podía habilitar observaciones con claves/bindings/HMAC mal formados.

No se ha relajado ninguna comprobación de correo, origen, Basic, consentimiento de suscripción, identidad de lista o double opt-in. No se ha cambiado el endpoint/filtro oficial ni se ha sustituido una fecha de observación por confirmación efectiva.

## Recorrido exacto y compatibilidad

controlled/newsletter/index.html usa type=button y data-observe=before. El listener de controlled/newsletter/test.js solo hace POST /api/controlled/newsletter-observation con email y phase. La Function llama observeNewsletter. Tras origen/Basic/política/allowlist, lee contadores D1, hace GET /v3/campaigns/PL6jh y GET /v3/contacts?query[email]=...&query[campaignId]=PL6jh&perPage=100, y finalmente inserta una observación firmada.

PL6jh pasa ambos patrones de identificador y se conserva su caso. La respuesta de campaña debe tener exactamente campaignId=PL6jh, name=cim_studio_newsletter y optinTypes.api=double. No se normaliza ni se supone otro identificador. Los filtros email y campaignId y GET /v3/contacts están contemplados en el SDK oficial GetResponse/sdk-php, commit a255de23ede4f9cf83b893e63e0770975f9ca4ce, archivos src/Operation/Contacts/GetContacts/GetContactsSearchQuery.php y GetContacts.php, consultados en su copia local. Fuente: https://github.com/GetResponse/sdk-php/tree/a255de23ede4f9cf83b893e63e0770975f9ca4ce/src/Operation/Contacts/GetContacts . Esto demuestra el contrato documentado consultado, no el resultado de la cuenta real.

Esta ruta no llama add_subscriber.html ni POST /contacts, no exige token Turnstile ni checkbox de marketing, no registra solicitudes de consentimiento/envío y no concede Fundadores. Sí puede guardar una observación técnica D1. Turnstile visible en la página no acredita que esta consulta haya terminado.

## Reproducción antes de corregir

Con fixtures ficticios y SQLite en memoria:

- PL6jh, campaña correcta y contactos []: HTTP 200, dos GET simulados, una observación; cero altas/solicitudes.
- Campaña correcta y GET contactos HTTP 403: HTTP 503 unavailable, cero observaciones; interfaz antigua habla de envío.
- Tabla newsletter_observations ausente: mismo HTTP 503 unavailable, sin llegar a GetResponse; mismo mensaje antiguo.

Por tanto, los datos que aporta CIM Studio no evidencian una incompatibilidad de ID/filtro. Con las mismas condiciones declaradas el recorrido nominal funciona. Una diferencia en la ejecución real sigue siendo necesaria para localizar la causa.

## Corrección mínima preparada

- server/getresponse-newsletter.js: errores tipados y sanitizados de configuración, transporte, HTTP, JSON, identidad y opt-in. Solo conservan un código estático y estado HTTP; nunca payload, URL de búsqueda, email, credenciales ni trazas del proveedor. No hay reintentos ni cambios de método/contrato.
- server/newsletter-observations.js: etapas precisas y motivos estáticos en diagnostic; preflight común sin accesos remotos; se mantienen los cierres de seguridad. No se afirma que una escritura no ocurrió por no recibir respuesta.
- functions/api/controlled/newsletter-config.js: observaciones habilitadas solo si supera ese mismo preflight. El correo se verifica después en servidor; no se expone la allowlist.
- controlled/newsletter/test.js: mensajes ES/EN propios de observación, diagnóstico visible mediante listas permitidas, HTTP y resultado remoto sanitizado; sin console.log, nuevos rastreadores ni datos personales. Limpia errores antiguos al obtener éxito y distingue respuesta perdida de rechazo. No reenvía automáticamente.

## Dato técnico que falta y obtención segura

Se necesita la etapa/motivo del intento real, y el estado HTTP externo si se llegó al proveedor. 4109e80 no lo conserva ni lo devuelve con ese detalle; un 503 por sí solo no separa API y D1. No puede reconstruirse desde las tres tablas vacías.

Si la petición original sigue en Network, basta su HTTP y error JSON; no copiar Payload, Authorization, cookies, HAR, API key ni correo. Si no existe, no repetir a ciegas. Tras revisión y autorización explícita de publicación/prueba, esta corrección permitirá una única observación autorizada con NEWSLETTER_PREPARATION_ENABLED=false y NEWSLETTER_CONTROLLED_SEND_ENABLED=false, Basic/origen/allowlist intactos, y solo los indicadores necesarios para observación. El panel mostrará únicamente operation, httpStatus, stage, code y providerStatus cuando proceda. No habrá solicitud de suscripción, aunque una observación correcta escribirá su evidencia D1 y requerirá autorización para esos datos reales.

Ejemplos de diagnóstico, todos ficticios:

- stage=getresponse_campaign, code=campaign_http, providerStatus=401: rechazo de credenciales/acceso en la lectura de campaña.
- stage=getresponse_campaign, code=campaign_identity o campaign_optin: la respuesta no acredita identidad u opt-in esperados; no se omite la comprobación.
- stage=getresponse_contacts, code=contacts_http, providerStatus=400/403: rechazo en la consulta de contactos; revisar contrato/acceso solo con esa evidencia.
- stage=storage_rate_read o storage_consent_read: fallo de lectura D1, binding/esquema o disponibilidad por comprobar.
- stage=storage_observation_write: fallo o resultado incierto al persistir; conciliar antes de repetir.
- stage=configuration: requisito ausente/mal formado, sin llegar al proveedor.
- stage=allowlist: el correo no coincide con la autorización efectiva de la Function, aunque una comparación local haya coincidido con otros valores.
- code=browser_network_or_timeout: falta respuesta del navegador; comprobar D1 antes de otra observación.

No requiere pedir al usuario que investigue código ni que revele secretos. Con un único diagnóstico seguro se podrá dirigir la comprobación técnica en lugar de reiterar toda la configuración. Sigue pendiente autorización antes de publicar o realizar esa observación real.

## Validación

151/151 pruebas Node: ID PL6jh, filtros documentados, lista vacía, identidad/opt-in estrictos, errores HTTP 400/401/403/404/429/500, transporte/JSON, lectura/escritura D1, preflight, allowlist, autenticación y redacción. No contactos ni solicitudes de newsletter creados por observaciones.

32 casos Chromium locales: 16 nuevos de error/recuperación en modo solo observación (ES/EN, 1440/390), más 16 de regresión privada a 1920/1440/768/390. Todas las llamadas externas interceptadas y SQLite desechable; ninguna suscripción ni correo real. Sin desbordamiento horizontal ni errores JS observados. No Safari físico.

Compilación estática y Pages Functions correctas. Ningún cambio de flags/Secrets, migración remota, política aprobada, diseño público, otro formulario ni CIM Production. No hay commit ni push de esta corrección.
