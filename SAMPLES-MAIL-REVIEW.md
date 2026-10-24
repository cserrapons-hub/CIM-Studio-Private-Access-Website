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

Este es un correo automático, por lo que te pedimos que no respondas directamente. Encontrarás las indicaciones para contactar con nosotros en el propio mensaje.

Botón: **Entendido**.

## English — email accepted

**We have received your request.**

Thank you for your interest in our ceramic samples.

**Check your inbox.**

We have sent you an email with information about your request from [notificaciones@envios.cimstudio.es](mailto:notificaciones@envios.cimstudio.es).

This is an automated email, so please do not reply directly. You will find instructions on how to contact us in the message itself.

Button: **Got it**.

## Alternativa — acuse no aceptado o incierto

ES: «Hemos registrado tu solicitud de muestras, pero no podemos confirmar el envío del correo de recepción. No es necesario repetirla.»

EN: “Your sample request has been recorded, but we cannot confirm that the acknowledgement email has been sent. There is no need to submit it again.”

Ambos incluyen el contacto `admin@cimstudio.es` mediante `mailto:` y los mismos controles de cierre. Comparten el título de solicitud recibida, que se refiere al registro de la solicitud y nunca a recepción del correo por el destinatario.

## Alcance

Un único componente de modal de muestras, con los estilos nativos compartidos de los diálogos de newsletter y dos contenidos accesibles ES/EN. No se modifica el modal de newsletter, GetResponse, consentimientos, tablas, registros, claves, envío Resend, rutas de confirmación de candidaturas ni rama editorial. No requiere migración o variables nuevas.

## Validación local

227 pruebas automatizadas, 40 recorridos de muestras ES/EN en escritorio/móvil, 40 regresiones de newsletter y 6 simulaciones workerd de muestras/candidaturas superadas. Compilación estática y Pages Functions correctas. Los escenarios cubren acuse aceptado con aviso administrativo fallido, acuse pendiente/rechazado/incierto, idempotencia, fallo de persistencia y ausencia de confirmación inferior simultánea. Proveedores y datos simulados en todas las pruebas.
