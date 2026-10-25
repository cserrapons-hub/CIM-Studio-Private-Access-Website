# Modal de solicitud de muestras — versión final local

Base pública: `5b93498`, que incluye la corrección legal `f83da6a`. Reutiliza el componente de `23a1a56`. CIM Studio comunica que el envío real mediante Resend ya está resuelto; no se han realizado nuevos envíos ni inspeccionado datos reales durante este trabajo.

## Comportamiento

- El modal solo aparece tras respuesta satisfactoria con `ok:true` y `recorded:true`.
- La respuesta de muestras añade `receiptMailState`, calculado mediante lectura de los trabajos existentes cuyo identificador termina en `:receipt`. No modifica datos ni la integración de envío de Resend.
- `receiptMailState:accepted`: muestra el texto final de recepción. Acredita aceptación por el proveedor, no entrega al buzón ni lectura. `deliveryVerified` continúa en `false`.
- Un fallo del aviso administrativo no oculta esta confirmación cuando el acuse al solicitante está aceptado. Se conserva el estado agregado `mail`/`mailState` para seguimiento técnico, sin reinterpretarlo como estado del acuse.
- `pending`, `rejected`, `uncertain` o campo ausente: muestra el texto alternativo, sin afirmar envío ni invitar a repetir la solicitud.
- Error de registro, HTTP 503, fallo de conexión o Turnstile: conserva el mensaje de error del formulario, sin mostrar éxito.
- Al mostrar cualquiera de los dos estados del modal se limpia el estado inferior del formulario: no hay dos confirmaciones simultáneas.
- No se solicitan verificaciones de dirección ni se añaden enlaces de confirmación.

## Español — correo aceptado

**Hemos recibido tu solicitud.**

Gracias por tu interés en nuestras muestras cerámicas.

**Revisa tu bandeja de entrada.**

Te hemos enviado un correo con información sobre tu solicitud desde [notificaciones@envios.cimstudio.es](mailto:notificaciones@envios.cimstudio.es).

Puedes responder directamente al email recibido. Tu respuesta llegará a CIM Studio.

Botón: **Entendido**.

## English — email accepted

**We have received your request.**

Thank you for your interest in our ceramic samples.

**Check your inbox.**

We have sent you an email with information about your request from [notificaciones@envios.cimstudio.es](mailto:notificaciones@envios.cimstudio.es).

You can reply directly to the email you receive. Your reply will reach CIM Studio.

Button: **Got it**.

## Alternativa — acuse no aceptado o incierto

ES: «Hemos registrado tu solicitud de muestras, pero no podemos confirmar el envío del correo de recepción. No es necesario repetirla.»

EN: “Your sample request has been recorded, but we cannot confirm that the acknowledgement email has been sent. There is no need to submit it again.”

Ambos incluyen el contacto `admin@cimstudio.es` mediante `mailto:` y los mismos controles de cierre. Comparten el título de solicitud recibida, que se refiere al registro de la solicitud y nunca a recepción del correo por el destinatario.

## Alcance

Un único componente de modal de muestras, con los estilos nativos compartidos de los diálogos de newsletter y dos contenidos accesibles ES/EN. No se modifica el modal de newsletter, GetResponse, consentimientos, tablas, registros, claves, envío Resend, rutas de confirmación de candidaturas ni rama editorial. No requiere migración o variables nuevas.

## Validación local

227 pruebas automatizadas, 40 recorridos de muestras ES/EN en escritorio/móvil, 40 regresiones de newsletter y 6 simulaciones workerd de muestras/candidaturas superadas. Compilación estática y Pages Functions correctas. Los escenarios cubren acuse aceptado con aviso administrativo fallido, acuse pendiente/rechazado/incierto, idempotencia, fallo de persistencia y ausencia de confirmación inferior simultánea. Proveedores y datos simulados en todas las pruebas.

## Correo personalizado de muestras — 25/10/2026, pendiente de publicar

`server/sample-receipt.js` genera el nuevo asunto, HTML adaptable y alternativa de texto plano ES/EN. Inserta únicamente los datos de envío suministrados, escapados en HTML; no inventa valores ausentes. La firma muestra `www.cimstudio.es` con enlace HTTPS al dominio público canónico. El acuse mantiene `MAIL_FROM` y añade `reply_to:admin@cimstudio.es`; el aviso administrativo conserva el Reply-To del solicitante. El modal solo cambia la indicación para permitir responder directamente al correo recibido. No se modifican estados, SQL, consentimientos o mensajes de candidaturas/newsletter; no se reescriben trabajos de correo anteriores.

Validación actualizada: 231 pruebas automatizadas, 40 casos del modal de muestras, 40 regresiones de newsletter, 6 simulaciones workerd y cuatro renderizados HTML ES/EN escritorio/móvil sin recursos externos ni ejecución de datos HTML maliciosos. Compilaciones estática y Pages Functions correctas. Ningún envío real.
