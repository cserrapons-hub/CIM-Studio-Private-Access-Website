# Una prueba real controlada — todavía NO autorizada

## Entrada necesaria ahora

Obtener el HTML plano completo oficial para cim_studio_newsletter (token PL6jh; ID de panel 374914302), desde form hasta /form, con action/method, campos ocultos y el campo nativo de consentimiento con su nombre/valor. Adjuntar las instrucciones oficiales sobre consentimiento y protección antispam del destino. No sirve el widget getresponse-form ni Web Connect. No incluir claves API, cookies de sesión ni datos de contactos.

Soporte ha confirmado el endpoint https://app.getresponse.com/add_subscriber.html; no se deduce un nombre de campo ni un ID de consentimiento a partir del token. La ruta preferente de envío desde Cloudflare y la configuración restringida se detallan en CONTROLLED-TEST.md. La ayuda oficial no es accesible desde el proxy de este entorno. Si el proveedor no documenta cómo acreditar consentimiento o cómo proteger su destino público contra abuso, la conexión permanece bloqueada hasta resolverlo.

## Preparación antes de autorizar la ejecución

- Revisar el export auténtico: lista correcta, email, consentimiento obligatorio sin premarcar, enlace a privacidad, DOI web, destino POST y resultado/errores. Mantener modal y traducciones actuales. No prometer el modal de aceptación propio si el proveedor solo ofrece navegación HTML sin una respuesta verificable.
- Verificar con GetResponse la protección DEL DESTINO contra automatización: restricciones/rate limits/captcha que valide su servidor o flujo oficial equivalente. Un Turnstile local, required o un honeypot propio no impiden un POST directo al proveedor. El double opt-in tampoco impide abuso del envío de correos de confirmación. Si exige seguimiento o scripts incompatibles, detener y revisar, no instalarlos automáticamente.
- Revisar formato y autenticación reales del webhook, incluido el origen de la confirmación y la lista. Headers arbitrarios, IPs compartidas o conocer el email/contactId no son por sí solos prueba de un evento auténtico. Mantener shapeVerified, authenticationVerified y confirmationSemanticsVerified en false hasta acreditar cada aspecto. HMAC Cloudflare→CIM Production no autentica GetResponse.
- Preparar, solo con autorización posterior, un entorno de prueba restringido, secretos separados, Worker programado y D1 temporal; CIM Production de prueba con SQLite copiada o desechable. No migrar ni enviar eventos a producción. Revisar/aprobar privacidad y la conservación de incidencias antes de captar datos reales.
- Elegir un email propio autorizado, sin imprimirlo en logs ni usarlo en URLs. Fijar quién observa el buzón y quién verifica el webhook. GetResponse puede exigir habilitar temporalmente el formulario para esta prueba: requiere autorización previa. No activar públicamente los envíos.

## Secuencia y criterios de aceptación

1. **Solicitud:** enviar una sola vez desde el modal, con el email autorizado y consentimiento explícito. Comprobar lista y registro de consentimiento en GetResponse. Antes del clic de DOI no debe existir acreditación Fundador, aunque el proveedor acepte la solicitud. No confundir notificación a admin@cimstudio.es con confirmación del suscriptor.
2. **Correo DOI:** recibir el mensaje de GetResponse en el buzón de prueba; verificar remitente, enlace y que Cloudflare no ha enviado otro correo. Si no llega o existe error, no mostrar ni registrar confirmación efectiva.
3. **Confirmación:** pulsar el enlace una vez. Comprobar estado confirmado en la lista correcta y la página predeterminada de GetResponse. La visita a esa página no constituye evidencia para CIM Production.
4. **Evento:** comprobar que contact-subscribed no llegó antes del clic y sí después. Revisar autenticación, campos reales de lista/contacto/origen, identificador estable y occurredAt UTC. Conservar únicamente evidencia mínima de prueba de forma restringida; nunca publicar el payload completo ni credenciales. Repetir/reproducir solo la entrega del evento autorizado para comprobar idempotencia, sin nuevas suscripciones. Si no se acredita origen o instante de confirmación, detener el alta de Fundadores.
5. **Cliente:** entregar el evento verificado al CIM Production de prueba mediante HMAC. Comprobar email normalizado, cliente potencial sin compra, fecha original acreditada, procedencia/evento y condición Fundador. El límite exclusivo es 2026-12-31T23:00:00Z (01/01/2027 00:00 Europe/Madrid). No sustituirlo por fecha de recepción/solicitud. Ante caída, comprobar cola cifrada, reintento, respuesta idempotente y borrado del contenido temporal tras recepción. Las coincidencias ambiguas requieren revisión manual.
6. **Proforma:** crear únicamente borradores de prueba para particular, profesional previamente verificado y pieza personalizada. Comprobar el 15 % sobre PVP o tarifa profesional, sin duplicarlo. No emitir documentos fiscales/comerciales reales ni alterar documentos existentes. Las fechas de ambos lados del límite ya se comprueban localmente con eventos simulados; no falsificar la fecha de un webhook real.
7. **Baja:** darse de baja con el email de prueba. Comprobar estado inactivo y cese de envíos en GetResponse; verificar en CIM Production que la condición y evidencia Fundador permanecen y que una futura proforma de prueba sigue aplicando el 15 %. Revisar la limpieza de los datos de prueba según el procedimiento acordado, sin revocar derechos de clientes reales.

Si falla un paso, dejar la integración desactivada; no considerar las simulaciones como prueba del comportamiento real del proveedor.

## Navegador y tecnologías

Antes y después de cargar, abrir, enviar y confirmar, inspeccionar en un perfil limpio de navegador, tanto ES/EN como móvil:

- Peticiones y destinos, redirects, iframes, scripts y cabeceras Set-Cookie.
- Cookies de primera/tercera parte, localStorage, sessionStorage, IndexedDB y service workers, incluidos dominios del proveedor tras navegar.
- Datos realmente enviados: email, consentimiento y SOLO campos oficiales indispensables; evitar PII en query strings, URLs de retorno, analytics o logs.
- Finalidad y duración efectivas de cada tecnología. No afirmar que Turnstile está exento ni añadir un banner genérico por precaución. Si aparecen tecnologías no necesarias que requieren consentimiento, bloquearlas previamente y revisar el mecanismo/documentación antes de activar.

La comprobación local del modal desactivado no permite concluir qué hará el destino de GetResponse. Sin su HTML real y sin ejecutar el recorrido autorizado, sus cookies/tecnologías y la eventual necesidad de consentimiento adicional siguen pendientes de verificación. No instalar Web Connect, GetResponse Analytics, Google Analytics ni Meta Pixel.

## Resultado local de esta preparación

- Compilación estática y Pages Functions correctas; 72 pruebas automatizadas superadas.
- Diez casos Chromium ES/EN a 1920, 1440, 768, 390 y 320 px: modal, consentimiento obligatorio sin marcar, apertura de privacidad, ausencia de desbordamiento y de falsa confirmación.
- En un perfil limpio, sirviendo el build local con configuración de formularios desactivados: ninguna petición externa ni POST, ninguna cookie, claves localStorage/sessionStorage, base IndexedDB o service worker observados. Es una comprobación del flujo local desactivado; no prueba la web desplegada, el comportamiento del destino de GetResponse ni Safari/iPhone real.
- Circuito JavaScript→Flask→SQLite local superado con datos simulados: HMAC, firma incorrecta, repetición de nonce, conflicto, idempotencia, caída/reintento y borrado del contenido temporal tras recepción.
- Ninguna suscripción real, push, despliegue ni migración en producción. No se ha modificado CIM Production en esta fase y su integración permanece preparada en feature/private-access-founders-2026.
