# Corrección mínima del 503 público — pendiente de publicación

Origen: `design/private-access-v1`, commit `a7e9ee8`. Rama correctiva: `fix/public-newsletter-error-stages-2026-10-23`.
No incorpora cambios editoriales, visuales, legales, de configuración o de datos. No activa formularios ni cambia sus puertas de seguridad.

## Cambios

`/api/subscribe` registra un objeto JSON únicamente cuando falla. Tiene exactamente cuatro campos:

- `stage`: nombre estático de la operación.
- `code`: código estático del fallo, nunca el mensaje de una excepción.
- `providerStatus`: estado HTTP del proveedor si está disponible; si no, `null`.
- `requestId`: UUID aleatorio generado por el servidor para esta invocación. No es el identificador enviado por el navegador ni una referencia de D1.

No incluye correos, nombres, IP, cuerpos, URLs de consulta, cabeceras, tokens, claves, hashes ni trazas. Tampoco añade detalles a las respuestas públicas. Un fallo del logger no cambia el resultado del formulario.

| Etapa | Interpretación |
|---|---|
| `configuration` / `validation` | Configuración general o validación del formulario. |
| `d1_rate_limits` | Cabecera IP requerida, HMAC técnico o almacenamiento de límites. |
| `turnstile` | Transporte, respuesta HTTP/JSON o comprobación del desafío en servidor. |
| `d1_deduplication` | Lecturas de solicitudes anteriores o integridad de sus evidencias. |
| `getresponse_prepare` | Construcción local de la petición API. No se envía nada en esta etapa. |
| `getresponse_campaign` | Consulta autenticada de campaña: códigos `campaign_http`, `campaign_network`, `campaign_timeout`, `campaign_redirect`, `campaign_response`, `campaign_identity`, `campaign_optin` o `campaign_request`. |
| `getresponse_contacts` | Consulta autenticada de contactos o validación de su estructura. |
| `consent_persistence` | Cifrado, firma, escritura y relectura del consentimiento. |
| `d1_delivery_claim` / `d1_api_delivery` | Reserva de entrega y registro API. |
| `getresponse_send` | Envío API: transporte, timeout, rechazo o resultado incierto. |
| `d1_delivery_result` / `d1_http_receipt` | Persistencia del resultado o acuse técnico. |

El timeout de 12 segundos del POST se crea justo antes del envío. Las comprobaciones tempranas de URL/cabeceras se conservan, pero no arrancan ese reloj. Los adaptadores privados conservan su comportamiento anterior.

## Publicación posterior, solo con autorización

1. Revisar el commit correctivo entregado. Incorporar **solo ese commit** mediante `git cherry-pick <commit-correctivo>` en `design/private-access-v1`, después de actualizar esa rama con `git pull --ff-only origin design/private-access-v1`. No incorporar la rama editorial.
2. Hacer push exclusivamente a `origin/design/private-access-v1`. Si el despliegue automático público está habilitado, este push inicia el despliegue; no lanzar otro manual adicional.
3. En Cloudflare → Workers & Pages → `cim-studio-private-access-website` → Deployments, comprobar Success, rama y commit del nuevo despliegue.
4. No cambiar variables, secretos, bindings ni tablas. No se requieren migraciones.

## Capturar un fallo sin exponer datos

1. Abrir el despliegue público activo → Functions → Real-time logs / Logs → Begin log stream (los rótulos pueden variar). No son necesarios nuevos secretos ni variables. Si la cuenta requiere habilitar la captura de logs, hacerlo expresamente desde esa interfaz antes de la prueba; los logs anteriores no se reconstruyen retroactivamente.
2. Tras autorizar específicamente la prueba, realizar **un único intento** con correo propio y consentimiento. Puede llegar a enviar una suscripción si el recorrido funciona; no es una prueba de solo lectura.
3. Localizar la invocación de `POST /api/subscribe` por hora y abrir el objeto JSON emitido por `console.error`. Compartir solo sus cuatro campos. No compartir HAR, capturas del formulario ni metadatos completos de la invocación.
4. Si vuelve a fallar, no repetir: la etapa/código y el estado HTTP permitirán dirigir la corrección. Si llega al envío, conciliar el intento en D1/GetResponse antes de cualquier repetición. HTTP 202 no acredita el double opt-in ni concede Fundadores.

## Muestras y colaboraciones

La revisión preventiva no encontró un nuevo defecto demostrado en las dependencias compartidas: mantienen `redirect:manual`, comprobaciones de origen/Turnstile, bases separadas, cifrado y consentimientos. No se modifican estas rutas. El envío inmediato llama a Resend dentro de la ruta; `MAIL_WORKER_ENABLED` solo controla el trabajador programado. Las pruebas locales no acreditan entregas reales.

## Validación local de esta corrección

- 221 pruebas automatizadas pasan. Las nuevas pruebas simulan errores D1, Turnstile, campaña, contactos, rechazo/timeout de envío, integridad HMAC, deduplicación y fallo del logger; verifican el esquema cerrado de cuatro campos y ausencia de datos sensibles.
- El test de timeout aborta los relojes de las lecturas previas y verifica que el POST recibe una señal nueva y vigente.
- 12 recorridos de navegador pasan: ES/EN, escritorio/móvil, consentimiento y segmentación obligatorios, aceptación/rechazo/incertidumbre simulados. Se actualiza la aserción obsoleta de este test para comprobar que no cambia las aprobaciones existentes, en lugar de suponer que siguen desactivadas.
- 6 simulaciones locales workerd pasan para muestras y colaboraciones (aceptación, redirección Turnstile y redirección de correo).
- Compilación estática y compilación Pages Functions con Wrangler correctas.
- No se modifican archivos visuales, documentos legales, variables, datos remotos ni la rama editorial. Ninguna prueba contacta con proveedores reales.
