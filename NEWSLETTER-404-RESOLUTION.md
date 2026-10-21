# Rechazo HTML 404: resolución propuesta (21/10/2026)

Estado actualizado: CIM Studio comunica que soporte confirma API v3 como vía recomendada y que el endpoint HTML ya no está recomendado ni soportado. Las secciones de investigación siguientes son históricas. La publicación privada autorizada mantiene la nueva aprobación API desactivada, sin migración remota ni envío. Secuencia actual y propuesta de prueba única: PRIVATE-NEWSLETTER-API-RUNBOOK.md.

## Evidencia y límites

CIM Studio comunica una evidencia y una entrega en D1, state=rejected, provider_http_status=404, con 04b2772. El flujo ya superó Turnstile y persistió consentimiento y claim antes del POST. Una respuesta HTTP descarta que este intento terminara en la construcción de fetch; no prueba quién generó el 404 ni que el endpoint haya sido retirado. No se conserva el cuerpo ni cabeceras del proveedor, por seguridad; no se pueden reconstruir a posteriori. No repetir la solicitud ni borrar/reclamar el claim.

POST real construido por prepareControlledHtml:
- URL https://app.getresponse.com/add_subscriber.html
- method POST, Content-Type application/x-www-form-urlencoded
- campos email (normalizado), campaign_token=PL6jh, custom_consentimiento=aceptado
- redirect manual, AbortSignal.timeout(12000), sin API key ni cabeceras de navegador inventadas
- el navegador solo llama al endpoint privado de la propia web; no es un problema CORS de navegador contra GetResponse

La URL y el mapping provienen de confirmaciones previas de soporte, no de una comprobación pública actual satisfactoria. Las lecturas de documentación oficial intentadas desde este entorno han sido bloqueadas por el proxy (403); el intento directo tampoco aporta una fuente actual accesible. Referencias que requieren contraste actual: https://www.getresponse.pl/pomoc/czy-oferujecie-kod-html-dla-formularzy.html y https://apidocs.getresponse.com/v3/contacts. No se ha enviado ningún POST real. Posibles causas pendientes: ruta HTML ya no operativa o específica de cuenta/plataforma, o rechazo de infraestructura del proveedor. No hay evidencia para atribuirlo al token, al consentimiento o a Cloudflare. No cambiar host, parámetros, User-Agent ni seguir redirecciones para eludirlo.

## Corrección local segura

El handler devuelve provider_rejected y delivery=rejected solo tras persistir el rechazo. Incluye únicamente diagnóstico estático y status HTTP; no cuerpo, Location, email ni credenciales. La interfaz privada ES/EN muestra rechazo en lugar de incertidumbre. IDs repetidos o nuevos para el mismo subject devuelven el rechazo guardado sin volver a GetResponse. Timeouts, 5xx, fallos de persistencia y respuestas no verificadas conservan el tratamiento prudente anterior. No se modifica la evidencia, el HTML enviado, los secretos, aprobaciones legales o Fundadores. No hay migración.

## Recomendación de transporte

Priorizar la API v3 autenticada en servidor sobre el HTML heredado si se verifica su double opt-in efectivo. El SDK oficial de GetResponse ya disponible localmente (GetResponse/sdk-php, revisión a255de23ede4f9cf83b893e63e0770975f9ca4ce) declara CreateContact POST /v3/contacts, éxito HTTP 202 y NewContact con email/campaign/customFieldValues. Es evidencia del contrato de esa revisión, no de la documentación vigente ni de un envío real.

Payload mínimo previsto: email, campaign:{campaignId: identificador verificado mediante API}, customFieldValues:[{customFieldId:'njH9fM',value:['aceptado']}]. Nunca asumir que un campo personalizado es el registro nativo de consentimiento de GetResponse. D1 mantiene la evidencia del consentimiento explícito (texto/version/fecha UTC/cifrado/HMAC), separada de la confirmación DOI y de Fundadores. La respuesta 202 solo acreditaría aceptación de procesamiento; no confirmación, correo enviado ni derecho al descuento.

No se ha conectado la API como fallback: un intento HTML previo jamás debe disparar automáticamente un POST API. Una futura sustitución debe verificar campaña exacta y optinTypes.api=double, comprobar contactos existentes, conservar claim único y registrar antes del POST; no usar métodos de alta confirmada, no reintentar resultados inciertos. Mantener Fundadores pendiente hasta evidencia de confirmación independiente acreditada. Una futura prueba con el mismo correo exige conciliación y autorización explícita sobre el claim existente; no eliminar ni reciclarlo automáticamente. Ninguna decisión de retención o aprobación legal cambia aquí.

## Único bloqueo externo para decidir el siguiente transporte

Solicitar a un técnico de GetResponse que confirme para esta cuenta que POST /v3/contacts, con optinTypes.api=double y el customFieldId verificado, deja al destinatario sin confirmar hasta clicar el correo y conserva el valor personalizado; aclarar qué señal autenticada acredita esa confirmación. Alternativamente, debe aportar el HTML independiente actual de esta cuenta y explicar el 404 del endpoint que recomendó. No enviar correo, API key, payload completo ni capturas con datos personales al compartir el diagnóstico. El 404 y endpoint/método/codificación son suficientes para abrir la consulta.

Una vez elegida y autorizada la vía API, preparar el cambio local y sus pruebas antes de autorizar despliegue y una única prueba real. No hace falta resolver toda la sincronización de Fundadores para probar la captación, pero no se concede ningún beneficio por aceptar la solicitud.

## Validación local de esta intervención

158/158 pruebas Node; cuatro casos Chromium ES/EN a 1440/390 px que muestran rechazo y dejan el botón bloqueado, con todas las peticiones interceptadas; build estático y Pages Functions correctos; git diff --check sin errores. Las pruebas verifican 404 persistido, repetición del mismo ID y de un ID nuevo sin segundo POST, otros rechazos HTTP, y mantenimiento de incertidumbre para timeouts/5xx. No se han realizado nuevas suscripciones, consultas de cuenta, cambios remotos, commit, push o despliegue.

## Preparación API autorizada posteriormente — solo local, sin activación

La ruta privada /api/controlled/subscribe queda migrada a la API v3; nunca selecciona HTML como alternativa. Nueva condición NEWSLETTER_API_REVIEWED=true, ausente/false por defecto, independiente de la aprobación legal y de los indicadores de envío existentes. No debe configurarse hasta revisar la respuesta de soporte sobre double opt-in API. Los dos ejemplos de configuración la mantienen en false. No se ha cambiado ninguna variable real.

Flujo nuevo: autenticación/origen/allowlist/límites → Turnstile manual sin seguir 3xx → claim histórico (si existe, devuelve su resultado sin otro intento) → esquema API disponible → construcción segura → GET campaña exacta PL6jh y optinTypes.api=double → GET contactos por correo/campaña (no reañade contactos existentes ni acepta respuestas incompletas) → consentimiento cifrado y firmado → claim común único por email → registro de transporte API → único POST JSON /v3/contacts autenticado con GETRESPONSE_API_KEY. Nunca se registra el secreto ni la URL de búsqueda con correo.

El POST solo transmite email, campaña PL6jh y customFieldValues njH9fM=['aceptado']. No fuerza contactos confirmados ni configura autorespondedores ni modifica la lista. El campo personalizado NO equivale por sí solo a consentimiento nativo; la evidencia exacta del consentimiento sigue en D1. El servidor no remite un segundo correo. Un 202 significa únicamente accepted/request_accepted/confirmationVerified=false/founders=pending. 4xx definidos se conservan como rejected. Conflicto 409, 3xx, éxitos inesperados, 5xx, timeout o persistencia incierta no implican éxito ni se reintentan. La interfaz privada ES/EN distingue solicitud aceptada, rechazada e incierta y bloquea un segundo envío. Su timeout de 60 s permite las comprobaciones secuenciales del servidor; si pierde la respuesta sigue siendo un resultado incierto.

Migración local preparada, NO aplicada remotamente: migrations/0009_newsletter_api_deliveries.sql, exclusivamente FORMS_DB de pruebas si se autoriza posteriormente. Requiere 0007 (ledger común) y 0006 (evidencias del flujo); CREATE TABLE IF NOT EXISTS solamente. Añade un registro de transporte/estado API por request_id con FK al ledger común, sin email, claves ni cambios a tablas previas. Mantiene newsletter_html_deliveries como ledger de deduplicación entre transportes por compatibilidad: el nombre histórico no implica que los nuevos envíos sean HTML. Estado accepted en el registro API + HTTP 202, junto con evidencia de consentimiento válida y ledger unverified, permite reproducir únicamente la aceptación de solicitud. No prueba DOI y no concede Fundadores. Se conserva el intento HTML 404 y su evidencia sin modificación; para ese subject no se hace GET de contactos ni POST API. La única excepción al mantenimiento de estados previos es el cierre prudente ya existente de claims sending caducados a unknown; nunca se reclaman para repetir.

Antes de cualquier prueba real siguen siendo necesarias: respuesta de soporte y autorización explícita de configuración/despliegue/migración privada. El correo del intento HTML existente seguirá bloqueado. Es preferible usar otro correo propio autorizado (p. ej., alias bajo control del titular) para una nueva prueba, con actualización manual autorizada de allowlist; no borrar ni reciclar el intento anterior. Si se exige reutilizar el mismo correo, requiere una decisión y un procedimiento de conciliación/reintento explícito conservando el historial, no implementado ni autorizado en esta intervención.

Los formularios públicos, muestras, colaboraciones, Fundadores, CIM Production y aprobaciones legales no se modifican. No se ha realizado ninguna petición real, envío, operación D1 remota, cambio de variables o secretos, commit, push o despliegue.

Validación final de la preparación API: 166/166 pruebas automatizadas, siete recorridos completos API en workerd con D1 en memoria y toda salida interceptada, tres casos workerd de regresión Turnstile y ocho casos Chromium ES/EN a 1440/390 px. Compilaciones estática y Pages Functions correctas. Incluye histórico HTML 404 intacto, claim idempotente/concurrente, configuración sin aprobación bloqueada, opt-in single bloqueado, contacto existente, rechazo/timeout/5xx/redirección/409, fallo al persistir tras 202, y migración aditiva repetible con quick_check ok. Todo exclusivamente local y ficticio.
