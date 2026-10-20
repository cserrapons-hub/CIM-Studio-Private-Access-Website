# Lanzamiento: HTML independiente de GetResponse, pendiente de contrato oficial

La decisión vigente sustituye la propuesta de formulario alojado. No se instala Web Connect ni Analytics. El formulario de CIM Studio mantiene su marcado, diseño, traducciones y checkbox obligatorio sin premarcar; continúa en demostración.

## Datos de cuenta confirmados por la titular

- Lista: cim_studio_newsletter; token: PL6jh; ID visible de lista: 374914302.
- Doble opt-in web y API activado; HTML plano permitido.
- Notificaciones de suscripción: admin@cimstudio.es.
- Página posterior a confirmar: la predeterminada de GetResponse.

Estos datos se conservan como referencias inmutables en server/getresponse-form.js. El adaptador comprueba que la revisión corresponda a esta lista, pero no los convierte automáticamente en campos ocultos ni interpreta el ID del panel como campaignId de API v3 o como autenticación del webhook. La vinculación del HTML y de la API se verificará con el formato oficial correspondiente. No se ha conectado ni probado la cuenta real.

## Acceso a documentación y bloqueo concreto

En la nueva consulta, tanto la solicitud a la ayuda como al índice oficial https://www.getresponse.com/help/ han fallado con CONNECT tunnel failed, response 403, antes de recibir una página HTTP (HTTP 000). Es una restricción del proxy de este entorno, no una respuesta de la documentación que permita determinar el formato. No se ha recibido HTML auténtico. El action ha sido confirmado después por soporte (véase el apartado final); siguen faltando el contrato method/enctype, nombres/valores de campos obligatorios y consentimiento, respuesta del proveedor y protección antispam en su destino. El token y el ID confirmados no bastan para inventarlos.

## Investigación y bloqueo concreto

La titular ha recibido confirmación de soporte de que GetResponse admite HTML independiente y conserva el double opt-in y contact-subscribed tras confirmación. Falta el código generado para su lista y consentimiento. La consulta a la ayuda web está bloqueada por el proxy de este entorno (CONNECT 403, sin recibir contenido de la ayuda). Los repositorios oficiales examinados (GetResponse/DevZone y GetResponse/wordpress) contienen documentación antigua o están archivados: no se usan como contrato actual para inferir action, parámetros o consentimiento.

El UUID 9748c724-790b-4c48-bbde-29366c400934 pertenece al widget getresponse-form que exige Web Connect. No es un destino HTML, ni un token de lista ni un ID de consentimiento. No se convierte en otro identificador.

Se ha retirado la alternativa de enlace alojado del controlador y de la configuración pública. No se han añadido action, parámetros de proveedor, campos ocultos ni cambios en CSP. HTML permanece bloqueado en código; los flags de entorno no pueden habilitar un contrato desconocido. POST /api/subscribe continúa retirado para no presentar campos personalizados de la API como consentimiento nativo.

## Qué se necesita antes de conectar

1. El HTML independiente COMPLETO generado por GetResponse para cim_studio_newsletter: desde la etiqueta form hasta su cierre, incluidos method/action, campos ocultos, checkbox de consentimiento con su nombre/valor/identificador reales y cualquier protección obligatoria. No sirve la etiqueta getresponse-form ni código Web Connect. No enviar claves API, sesiones ni datos de contactos; los identificadores públicos de inserción no son una API key.
2. La ayuda oficial o indicación escrita del soporte que corresponda a ESE HTML: cómo registra el consentimiento, vinculación de lista, double opt-in para ese método y protección antispam.
3. Comprobar en el panel que el consentimiento asociado es el correcto y queda obligatorio/sin marcar, que la lista es la prevista y que el email de confirmación está activado para el método HTML. El estado confirmado del widget nativo no demuestra por sí solo que otro formulario generado comparta esos ajustes.

Si el HTML no admite consentimiento acreditable o exige scripts incompatibles, detener la conexión y pedir a GetResponse una alternativa oficial. No sustituirla por campos inventados, un simple campo personalizado o un proxy no autorizado.

## Tratamiento técnico previsto tras la revisión

- Conservar los estilos, textos ES/EN, email y consentimiento actuales. Solo mapear nombres/valores y campos requeridos a los del HTML oficial, sin inferencias.
- No usar fetch/CORS ni un proxy para enviar sin que el proveedor documente ese método y su efecto en consentimiento/confirmación. Un formulario HTML puede navegar a una respuesta del proveedor: eso deberá revisarse antes de prometer un modal de éxito propio.
- No mostrar confirmación por un clic, por salir de la página ni por volver de otra pestaña. Comprobar aceptación y errores con el mecanismo oficial real.
- Mantener CSP sin autorizar destinos externos hasta conocer y revisar el action exacto. Nunca enviar email por parámetros de URL ni incluir credenciales privadas.
- Verificar protección contra automatización en el destino de GetResponse. Required, validación HTML, checkbox, un honeypot no documentado o un Turnstile ejecutado solo en el cliente NO impiden que un bot llame directamente a un endpoint público externo. No afirmar protección por reutilizar el Turnstile de nuestros otros formularios. Si fuera preciso un flujo de servidor, GetResponse deberá confirmar que lo admite para ese HTML sin perder consentimiento/double opt-in.

## Fundadores y prueba real

El receptor sigue bloqueado hasta revisar el payload real y autenticación. No se conceden beneficios por solicitud, visita a bienvenida o evento no acreditado. CIM Production → Clientes sigue siendo el registro definitivo; no se restaura el registro de derechos D1. La conexión local con CIM Production se prepara por separado; no sustituye la verificación del evento real ni habilita este formulario.

Solo después de revisar el HTML, consentimiento y antispam: configurar en un entorno restringido, autorizar despliegue y avisar antes de una única suscripción real con email propio autorizado. Comprobar campos/idioma, errores, lista, consentimiento, que no hay confirmación antes del clic y que después llega contact-subscribed con occurredAt UTC verificable. Probar duplicados y baja sin pérdida del beneficio. Las simulaciones no prueban el comportamiento de la cuenta real.

No se han modificado servicios externos, activado suscripciones, hecho commit, push ni despliegue.

## Adaptador local preparado, sin activación

`server/getresponse-form.js` incluye una función pura `prepareOfficialHtmlSubmission` que prepara una descripción POST únicamente a partir de un contrato revisado explícito. No realiza solicitudes, no cambia el modal ni se conecta al controlador público. Los nombres de email, consentimiento y campos ocultos no tienen valores predeterminados: deberán copiarse del HTML auténtico. Rechaza consentimiento no afirmativo, correo inválido, campos duplicados, destinos HTTP/no revisados, credenciales y parámetros de URL. Si el HTML oficial requiere parámetros en action u otra estructura, se revisará expresamente antes de adaptar esta restricción; no se elimina a ciegas.

Exige acreditar por separado la vinculación de lista, double opt-in, consentimiento nativo, protección de proveedor contra abuso y ausencia de scripts adicionales. Los tests emplean exclusivamente campos simulados y un dominio .invalid. Estos indicadores son una revisión de implementación, no una prueba automática de las garantías de GetResponse. `htmlFormReady` sigue devolviendo false incluso con ese contrato: no existe activación por variables de entorno ni endpoint real inventado.


## Prueba real

El procedimiento único vigente está en GETRESPONSE-REAL-TEST.md. No está autorizado ejecutarlo todavía. La siguiente entrada necesaria es el HTML plano completo que GetResponse genera o documenta para esta lista, junto con sus indicaciones de consentimiento y protección en el destino.

## Endpoint comunicado por soporte

Se incorpora como referencia confirmada https://app.getresponse.com/add_subscriber.html. Esto resuelve el destino, pero todavía no los nombres/valores obligatorios ni la equivalencia del consentimiento al reenviar desde Cloudflare. No se inventan ni conectan. La preparación preferente del proxy es pura y bloqueada hasta revisión. Configuración y acciones vigentes: CONTROLLED-TEST.md.
