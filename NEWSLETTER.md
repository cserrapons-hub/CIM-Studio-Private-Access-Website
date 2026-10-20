# Newsletter: implementación preparada, todavía desactivada

**ACTUALIZACIÓN:** el flujo de alta por API ha sido retirado del acceso público. Seguir únicamente [GETRESPONSE-LAUNCH.md](GETRESPONSE-LAUNCH.md) para el formulario alojado y el webhook. Las instrucciones de activación siguientes son históricas y no deben ejecutarse para este lanzamiento.

**Continuación del lanzamiento:** [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md) incorpora bienvenida, registro privado de evidencias Fundadores y lanzamiento solo de newsletter. La propuesta final de este documento se concreta allí como carga privada revisada, sin automatización no verificada.

La rama Production de Pages es `design/private-access-v1`. Este cambio se mantiene en un commit local: no hacer push ni desplegar sin autorización. No se han utilizado credenciales reales, consultado la cuenta ni creado suscripciones reales. El secreto `GETRESPONSE_API_KEY` confirmado por la titular existe en Cloudflare, pero no está disponible en este entorno de desarrollo; no se puede leer desde aquí ni debe exportarse al navegador.

## Flujo y límites

- `POST /api/subscribe` reutiliza Pages Functions y las protecciones de `server/forms.js`.
- La suscripción requiere **además** `NEWSLETTER_ENABLED=true`. Sin esa variable exacta permanece desactivada, incluso si `FORMS_ENABLED=true`. Los documentos siguen con `approved: false`: ese bloqueo también permanece.
- Antes de crear un contacto se consulta `GET /v3/campaigns/{campaignId}` y se exige ID coincidente, nombre exacto `cim_studio_newsletter` y `optinTypes.api === 'double'`. Un error, un valor desconocido o ausencia de ese campo impiden el alta. No se modifican ajustes de GetResponse. Contrato consultado en el SDK oficial [CampaignOptinTypes](https://github.com/GetResponse/sdk-php/blob/a255de23ede4f9cf83b893e63e0770975f9ca4ce/src/Operation/Model/CampaignOptinTypes.php) y [GetCampaignFields](https://github.com/GetResponse/sdk-php/blob/a255de23ede4f9cf83b893e63e0770975f9ca4ce/src/Operation/Campaigns/GetCampaign/GetCampaignFields.php). La cuenta real y el valor devuelto todavía deben verificarse.
- Se envía únicamente email, campaña y los cuatro campos de evidencia existentes: fecha de consentimiento/solicitud, versión, texto exacto e idioma. No se envía una fecha de confirmación, etiqueta Fundadores, autoresponder ni instrucción para omitir la confirmación. No se envía correo desde Cloudflare/Resend para la newsletter.
- Solo un POST nuevo aceptado con HTTP 202 devuelve `subscription: confirmation_required` y abre el nuevo modal ES/EN. Esto significa **solicitud encolada**, no alta confirmada ni correo entregado. Errores, timeouts, rechazos y resultados ambiguos no abren el modal. Contactos existentes y solicitudes ya registradas reciben una respuesta genérica sin repetir el alta ni prometer otro correo de confirmación.
- D1 conserva evidencia HMAC de solicitud y consentimiento. `accepted_at` y `state=accepted` en `form_requests` son estados de **solicitud**, nunca prueba de double opt-in. No hay concesión automática de Fundadores ni cálculo de elegibilidad en esta implementación.
- Protecciones conservadas: origen idéntico, JSON hasta 16 KB, validación de email/idioma/consentimiento y versión legal, honeypot, Turnstile con acción/hostname, contador atómico de 8 intentos por IP/hora, clave HMAC por email, exclusión concurrente e idempotencia. Timeouts y 5xx no se reenvían automáticamente cuando el resultado es incierto. No se registran emails, cuerpos del proveedor, tokens ni claves en logs. Los IDs y parámetros de campaña no se aceptan del navegador.
- No se han cambiado los formularios de muestras y oportunidades laborales, los textos legales, estilos, fotografías ni la portada. Los avisos de demostración permanecen.

## Comprobación de lista: solo lectura

Con la clave inyectada como variable de entorno secreta en un **entorno de confianza**, ejecutar:

```sh
node scripts/check-getresponse-newsletter.mjs
```

No escribir la clave en comandos, archivos versionados, logs ni chat. El script no obtiene automáticamente secretos de Pages: hace falta ejecutarlo donde el secreto esté disponible por un mecanismo seguro. Si no se dispone de ese entorno, obtener el ID y comprobar el double opt-in en la cuenta de GetResponse antes de continuar, sin publicar un endpoint de diagnóstico con acceso público.

El script consulta `GET /v3/campaigns?query[name]=cim_studio_newsletter`, pagina de forma acotada, exige una única coincidencia exacta y comprueba su detalle/opt-in. Solo muestra nombre, ID y valor de opt-in verificados; no imprime claves ni respuestas completas. Si ya existe `GETRESPONSE_CAMPAIGN_ID`, exige que coincida. No crea ni modifica listas/contactos. Guardar el ID **real devuelto** en `GETRESPONSE_CAMPAIGN_ID`; no usar un nombre como ID ni un identificador simulado de las pruebas.

## Primera prueba real: pendiente de autorización

1. Autorizar el push/despliegue de esta implementación. No cambiar DNS. Mantener `NEWSLETTER_ENABLED=false`, `FORMS_ENABLED=false`, `FORMS_VERIFIED=false` y `SITE_LIVE=false` en el entorno público.
2. Realizar la comprobación de solo lectura anterior y verificar en GetResponse el correo de confirmación y double opt-in para **API**, no solo formularios web. Revisar si la cuenta devuelve exactamente el contrato esperado; no relajar el bloqueo para hacerlo pasar.
3. Configurar un entorno de pruebas aislado y con acceso restringido (por ejemplo Cloudflare Access); no habilitar la ruta pública de Production para una prueba privada. Vincular D1 `FORMS_DB` con `migrations/0001_forms.sql`, Turnstile autorizado para ese hostname, `TURNSTILE_SITE_KEY`, secretos `TURNSTILE_SECRET_KEY` y `AUDIT_HASH_SECRET` (al menos 32 caracteres), `GETRESPONSE_API_KEY`, `GETRESPONSE_CAMPAIGN_ID` y los cuatro IDs reales `GR_CONSENT_AT_FIELD_ID`, `GR_CONSENT_VERSION_FIELD_ID`, `GR_CONSENT_TEXT_FIELD_ID`, `GR_LANGUAGE_FIELD_ID` descritos en LAUNCH.md. No copiar secretos al repositorio. No configurar servicios de muestras/carreras para esta prueba.
4. Revisar/aprobar expresamente privacidad y asignar su versión antes de cualquier envío real: `approved: false` bloquea el servidor incluso con las claves configuradas. Esta tarea no modifica esa aprobación ni elimina el bloqueo. Después de esas autorizaciones, activar únicamente en el entorno restringido `FORMS_ENABLED=true` y `NEWSLETTER_ENABLED=true`, manteniendo `FORMS_VERIFIED=false` y `SITE_LIVE=false`.
5. **Avisar antes de crear la suscripción de prueba** y usar una dirección propia autorizada. Comprobar ES/EN, consentimiento sin premarcar, Turnstile, modal solo al aceptar y conservación de datos ante error. Verificar correo recibido; antes del clic no debe ser un contacto confirmado. Confirmar y revisar qué evidencia verificable ofrece GetResponse de ese instante. Comprobar duplicados y baja sin reactivación automática. No confundir el timestamp de creación/solicitud con el de confirmación.
6. Mantener la activación pública y retirada de avisos pendientes hasta documentar el resultado de las pruebas, la revisión legal y una autorización posterior. No tocar muestras/carreras, DNS ni el dominio en este proceso.

## Propuesta de registro Fundadores (no implementada)

Primero comprobar en la cuenta/contrato API qué evento o dato acredita **la confirmación efectiva**, su fecha y su autenticidad. No asumir que la existencia de un contacto, `createdOn`, una redirección de confirmación o un webhook sin autenticar la demuestran. GetResponse debe proporcionar una evidencia verificable y reconciliable; comprobar disponibilidad según el plan. Si no la proporciona, definir y aprobar un procedimiento de comprobación/documentación o confirmación propia antes de automatizar beneficios; nunca deducir una fecha histórica a partir de una consulta posterior.

Una vez verificado el mecanismo, proponer una tabla D1 independiente del marketing, con identificador estable HMAC del email normalizado, campaña/contacto de origen necesarios, instante de confirmación acreditado, tipo e identificador único de evidencia y momento de verificación. Restricciones únicas por persona/beneficio y por evento impedirían duplicados; conservar solo la evidencia mínima necesaria y su versión de condiciones. No añadir aquí proyecto, documentos fiscales ni perfiles de marketing.

Comparar el instante real con `2027-01-01T00:00:00+01:00` **exclusivo** (`2026-12-31T23:00:00Z`), correspondiente al final del 31/12/2026 en Europe/Madrid. La fecha de solicitud no otorga derecho. La baja detiene comunicaciones y no borra el registro mínimo de acreditación; la verificación profesional posterior tampoco cambia la fecha de adquisición. Para una compra, una consulta interna autenticada del HMAC acreditaría el derecho sin volver a suscribir a la persona ni exponer búsquedas públicas por email.

Antes de implementarlo hay que aprobar el mecanismo real de evidencia, la base jurídica del registro separado, su conservación/revisión y ejercicio de derechos, el procedimiento de identificación en compras/cambios de email y la política de copias/rotación del secreto HMAC. No se fija conservación indefinida por defecto ni un plazo inventado.

## Validación sin contactos reales

```sh
sh scripts/build-preview.sh
npm test
```

Las pruebas inyectan un proveedor simulado y SQLite en memoria; no llaman a GetResponse ni Turnstile reales. La revisión de navegador intercepta config, Turnstile y POST de suscripción para probar aceptación, rechazo, fallo de red, solicitud ya registrada y demostración. Estas pruebas no acreditan entrega de correos, configuración efectiva de la cuenta o confirmaciones reales.
