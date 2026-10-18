# Activación de CIM Studio en Cloudflare Pages

La rama de trabajo y producción seleccionada es `design/private-access-v1`. No fusionar con `main`. Compilación: `sh scripts/build-preview.sh`; salida `public`; raíz del repositorio; framework None. Pages detecta `functions/` en la raíz y empaqueta el servidor por separado: **no copiar Functions a public**. No se han cambiado DNS, la configuración externa de correo ni la composición visual. El proveedor actual de correo confirmado es Google Workspace (Gmail), y el único buzón confirmado y operativo es admin@cimstudio.es. No hay credenciales reales en el repositorio.

## 1. Aprobar los documentos antes de activar envíos

Los documentos ES/EN están redactados en `legal/content.js` con el titular CIM STUDIO ESPJ, NIF E88749155, domicilio facilitado y contacto legal/privacidad admin@cimstudio.es. Permanecen como borrador: `approved: false` y versión sin asignar. Los enlaces existentes abren los documentos con navegación discreta dentro del mismo diálogo, incluida Tarifa Fundadores. La compilación genera `public/legal-content.js` desde la única fuente `legal/content.js`: permite leer los borradores claramente identificados aunque `/api/config` siga sin exponer documentos no aprobados. Esto no altera la autorización de envíos. No subir esta rama ni desplegar sin nueva autorización.

Revisar `pendingReview` en ese archivo antes de aprobar:

- Bases jurídicas por finalidad, ponderaciones de interés legítimo y proporcionalidad de los documentos de verificación profesional.
- Criterios y procedimiento de conservación/supresión en cada sistema y buzón, con evidencia mínima de Fundadores separada del marketing y eliminación de copias fiscales innecesarias.
- Contratos reales, entidades proveedoras, encargos, ubicaciones y garantías de transferencias de Cloudflare, GetResponse, Resend y Google Workspace (Gmail).
- Inventario del despliegue de Turnstile y tecnologías de navegador; seguimiento de aperturas/clics de email y consentimiento que corresponda.
- Criterio horario confirmado: `Europe/Madrid` (`2027-01-01T00:00:00+01:00`, exclusivo). Elegibilidad por confirmación efectiva, nunca por la fecha de solicitud/API ni la de verificación profesional.
- Criterios de Precio Profesional y operativa comercial, condiciones de venta/muestras y datos registrales o información de reclamaciones que resulten exigibles.

Confirmado: altas confirmadas hasta el 31/12/2026 inclusive, sin límite; descuento permanente del 15 % sobre PVP para particulares y adicional sobre Precio Profesional para profesionales verificados; aplicable a colección y encargos a medida, compatible con Precio Profesional y no acumulable con otras promociones. El descuento es de por vida desde la confirmación, sin permanencia mínima; se aplica al PVP o Precio Profesional vigentes. La baja de la newsletter no supone perderlo. Mantener el registro de acreditación del beneficio separado de la autorización de marketing: la tabla actual de evidencias de solicitudes no constituye ese registro de confirmaciones y no debe utilizarse como tal. Definir su base jurídica y conservación antes de implementarlo, sin inventar plazos.

Asignar una versión estable (por ejemplo la fecha real de aprobación, no una fecha inventada), rellenar los documentos completos y marcar `approved: true` **solo tras su revisión**. Los diálogos legales existentes leerán estos textos desde `/api/config`. Las casillas mantienen su redacción aprobada y se enlaza a la privacidad dentro del formulario. El servidor archiva versión, texto exacto aceptado, idioma y hora UTC; no acepta el texto de consentimiento enviado por el navegador.

## 2. GetResponse

1. Crear/seleccionar la lista de CIM Studio; obtener su `campaignId` (API `GET /v3/campaigns`). Crear una clave API limitada a la cuenta adecuada.
2. Crear cuatro campos personalizados **de tipo texto** y copiar sus IDs (`GET /v3/custom-fields`): `cim_consent_at`, `cim_consent_version`, `cim_consent_text`, `cim_language`. No son nombres de variables: configurar abajo sus `customFieldId` reales.
3. Configurar remitente y confirmación/doble opt-in en GetResponse. El servidor envía `POST https://api.getresponse.com/v3/contacts` con lista y campos, y comprueba contactos existentes por email/lista antes de añadirlos. Una respuesta 202 significa petición en cola, no suscripción confirmada ni entrega del email.
4. Crear la etiqueta `cim_founders_2026`. Aplicarla solo tras la confirmación efectiva de alta dentro del plazo inclusivo. Usar automatización de la cuenta si permite filtrar la fecha de confirmación; en caso contrario, revisar/exportar las altas confirmadas y etiquetar el segmento manualmente. **No usar la fecha de clic ni el atributo HTML como prueba de elegibilidad**. La etiqueta y beneficio no caducan al terminar 2026. No hemos aplicado etiquetas a personas ni automatizaciones a la cuenta.
5. Verificar en una prueba real los campos guardados, el correo de confirmación y la condición de fecha. La documentación remota del proveedor estaba bloqueada por la red del entorno; las pruebas automatizadas validan el contrato preparado con respuestas simuladas, no el comportamiento de la cuenta real.

## 3. Correo de muestras sin cambiar Google Workspace (Gmail)

Crear una cuenta Resend y verificar un **subdominio de envío**, por ejemplo `envios.cimstudio.es`. Su panel indicará los registros exactos. Añadir en el DNS autoritativo solo esos registros del subdominio (DKIM/SPF y, si el proveedor lo pide, MX de ese subdominio). **No modificar los registros de correo vigentes ni las credenciales de Google Workspace. Cotejar la configuración real en el panel del proveedor y el DNS autoritativo antes de cualquier cambio autorizado: aquí no se prescriben valores de MX, SPF o DKIM de Google ni se reutilizan instrucciones del proveedor anterior**. No crear un segundo SPF en el mismo nombre.

Crear una clave Resend de envío para ese dominio. Configurar `MAIL_FROM` con un remitente verificado, por ejemplo `CIM Studio <notificaciones@envios.cimstudio.es>`. El destinatario es fijo en el servidor: `admin@cimstudio.es`; el email del solicitante se usa solo como Reply-To. El mensaje es texto plano y contiene nombre, email, empresa, profesión, proyecto y evidencia del consentimiento. Probar entrega real, correo no deseado y respuesta al profesional.

## 4. Cloudflare: datos y secretos exactos

En Storage & Databases → D1 crear `cim-studio-forms`. Ejecutar las sentencias de `migrations/0001_forms.sql` en su consola SQL. En Pages → proyecto → Settings → Bindings añadir **D1 database**, variable **`FORMS_DB`**, apuntando a esa base. Aplicar/redeploy según el panel. No hace falta publicar un identificador de base de datos en el código.

Crear un widget Turnstile y autorizar el hostname exacto del proyecto de prueba (por ejemplo `nombre-del-proyecto.pages.dev`) y `cimstudio.es`. No introducir un comodín: copiar el dominio real del proyecto y el de producción en el panel del widget. Guardar sus dos claves. Turnstile usa las acciones `subscribe` y `samples` y el servidor valida tanto acción como hostname.

En Pages → Settings → Variables and Secrets, entorno **Production** (rama `design/private-access-v1`):

| Nombre | Tipo / valor |
| --- | --- |
| `TURNSTILE_SECRET_KEY` | Secreto, clave privada de Turnstile |
| `AUDIT_HASH_SECRET` | Secreto aleatorio de al menos 32 caracteres; generar con gestor de contraseñas. No rotarlo sin migrar los hashes de D1 |
| `GETRESPONSE_API_KEY` | Secreto, API key de GetResponse |
| `RESEND_API_KEY` | Secreto, clave de envío Resend |
| `TURNSTILE_SITE_KEY` | Variable pública, clave de sitio del widget |
| `GETRESPONSE_CAMPAIGN_ID` | ID real de la lista |
| `GR_CONSENT_AT_FIELD_ID` | ID real de `cim_consent_at` |
| `GR_CONSENT_VERSION_FIELD_ID` | ID real de `cim_consent_version` |
| `GR_CONSENT_TEXT_FIELD_ID` | ID real de `cim_consent_text` |
| `GR_LANGUAGE_FIELD_ID` | ID real de `cim_language` |
| `MAIL_FROM` | Remitente Resend verificado |
| `FORMS_ENABLED` | Inicialmente `false`; cambiar a `true` para la prueba real, tras configurar todo y aprobar documentos |
| `FORMS_VERIFIED` | Mantener `false` hasta pasar todas las pruebas reales de abajo |
| `SITE_LIVE` | Mantener `false` hasta conectar y comprobar el dominio |

Mantener Preview con `FORMS_ENABLED=false`, `FORMS_VERIFIED=false`, `SITE_LIVE=false`. No heredar secretos ni DB de producción a despliegues de ramas ajenas. No activar Netlify Forms. No se necesita un Worker independiente, npm install de librerías de aplicación ni un servidor permanente.

## 5. Pruebas reales imprescindibles

Publicar/redeploy con documentos aprobados y `FORMS_ENABLED=true`, conservando `FORMS_VERIFIED=false` y `SITE_LIVE=false`. Verificar `/api/config`: enabled debe ser true para ambos formularios, verified y siteLive false. No debe exponer ninguna clave privada.

En esta modalidad el aviso de demostración permanece, pero avisa expresamente de que **se enviarán datos de prueba reales**; no se afirma que no se guardan datos. Hacer las pruebas con direcciones propias y datos ficticios:

1. ES y EN: comprobar que un formulario incompleto/no consentido no se envía; completar Turnstile.
2. Suscribir una dirección propia nueva, comprobar que GetResponse la recibe y guarda los cuatro campos; confirmar el email si la lista lo exige y comprobar fecha/elegibilidad Fundadores. Repetir la misma dirección: no debe crearse otro contacto ni reactivarse una baja anterior automáticamente.
3. Enviar muestras; verificar recepción efectiva en `admin@cimstudio.es` y Reply-To, todos los campos y consentimiento. Reintentar el mismo envío no debe duplicarlo. Aceptación API del proveedor no demuestra entrega.
4. Provocar un fallo controlado (por ejemplo clave de envío desactivada en un entorno separado de pruebas): debe mostrarse error, conservar datos y permitir reintento. No desactivar credenciales de producción en uso.
5. Revisar D1 y los paneles de proveedores, sin compartir datos personales ni claves por chat. Los tests automatizados no sustituyen estas pruebas.

Solo después marcar `FORMS_VERIFIED=true` y redeploy. Eso retira el aviso de demostración **de los formularios**. El aviso global de web de prueba y noindex se mantienen hasta SITE_LIVE.

### Incidencias y conservación

D1 guarda evidencia de consentimiento con un HMAC del email y estados `processing`, `accepted`, `failed`, `unknown`. No almacena el proyecto ni el email en claro. Los datos viajan a los proveedores necesarios. La limitación por IP usa hashes por hora, con máximo 8 intentos/hora y limpieza automática de contadores vencidos.

Tras un timeout de resultado incierto, no se anuncia éxito ni se reenvía automáticamente: reconciliar en el proveedor antes de actualizar la fila D1. `processing` antiguo y `unknown` requieren esa revisión. No borrar una fila aceptada para forzar una nueva alta. Para solicitudes de acceso que ya existían en GetResponse se conserva el consentimiento previo del proveedor; no se sobrescribe ni se cambia su estado.

Definir y documentar la conservación y el borrado de evidencias y solicitudes en cada proveedor con el responsable de privacidad. Para localizar evidencias de una persona se necesita el secreto HMAC y su email normalizado; gestionar solicitudes de derechos en todos los proveedores. No cambiarlo sin plan de migración. No se registran claves, IPs ni respuestas con datos personales en logs de aplicación.

## 6. Dominio y retirada del modo de prueba

1. En Cloudflare Pages → Custom domains añadir `cimstudio.es` y seguir la activación propuesta. **No apuntar DNS a mano antes de vincularlo en Pages**.
2. El dominio raíz en Pages suele requerir que la zona DNS esté en Cloudflare. Si aún está en GoDaddy, exportar TODOS los registros, incorporarlos a Cloudflare y cotejar todos los registros vigentes de correo y verificación con la configuración real de Google Workspace, sin inventar ni sustituir sus valores. Solo entonces, si Cloudflare lo exige y tras revisar DNSSEC, cambiar en GoDaddy los nameservers a los asignados por Cloudflare. Si la zona ya está en Cloudflare, no cambiar nameservers en GoDaddy. No borrar registros de correo ni modificar la configuración de Google Workspace.
3. Esperar al dominio activo y certificado HTTPS válido; probar que admin@cimstudio.es sigue enviando y recibiendo mediante Google Workspace (Gmail) y los dos formularios funcionan desde `cimstudio.es` (también autorizado en Turnstile).
4. Poner `SITE_LIVE=true`, manteniendo los otros dos flags true, y redeploy. El build añade canonical/sitemap/robots y elimina el noindex HTML solo si los documentos están aprobados y las pruebas están confirmadas. El middleware mantiene noindex en páginas de prueba/hostnames distintos de `cimstudio.es` y si falta configuración. La marca global de prueba solo se oculta en el dominio definitivo listo. Verificar noindex/canonical con las herramientas del navegador antes de anunciar el lanzamiento.

Favicon y apple-touch-icon son derivados del logotipo original, sin modificarlo. No hay analítica añadida. La composición de `3f2baa6` permanece; los tres botones de acción comparten ahora estilos, flecha, hover, teclado y pulsación táctil.

## Verificación local sin servicios reales

Node 24: `sh scripts/build-preview.sh` y `npm test`. Pruebas con SQLite real en memoria y proveedores/Turnstile simulados, sin credenciales ni envíos. Para compilar Functions sin desplegar: `npx wrangler@4 pages functions build --outdir /tmp/cim-functions-build`. Para ejecutar Pages localmente se requiere configurar un binding D1 local con Wrangler; no sustituir por el servidor Python para probar Functions. El servidor estático solo sirve la maqueta y permanece en demostración.

## Avisos laborales: preparación independiente, aún desactivada

El enlace centrado del pie abre `careers-dialog` en ES/EN. El formulario solo solicita email y consentimiento específico; no pide CV ni teléfono. En demostración no se guarda nada ni se realiza una petición de alta. El endpoint preparado es `/api/careers` y reutiliza validación, Turnstile (acción `careers`), comprobación de origen, limitación de frecuencia, deduplicación y evidencia verificable de los otros endpoints, sin cambiar su funcionamiento.

Para la activación futura, previa autorización:

1. Aprobar la privacidad ampliada y definir conservación/supresión de la lista y evidencias laborales, sin suponer plazos. Mantener por ahora `approved: false`.
2. Crear una lista distinta en GetResponse, con finalidad laboral y mensajes/confirmación y baja propios; configurar su ID real en `GETRESPONSE_CAREERS_CAMPAIGN_ID`. Debe ser distinto de `GETRESPONSE_CAMPAIGN_ID`. No añadir estos contactos a automatizaciones comerciales ni Fundadores. La misma cuenta puede usar los cuatro campos de evidencia ya documentados, conservando cada consentimiento en su lista.
3. Crear una base D1 propia, enlazarla como `CAREERS_DB` y aplicar **solo** `migrations/careers/0001_careers.sql` a esa base. No aplicar esta migración sobre `FORMS_DB`. No se permite usar el mismo binding/objeto de base que los formularios comerciales. La tabla laboral solo admite `kind=careers`.
4. Reutilizar las claves de servidor de GetResponse y Turnstile y los IDs de campos de consentimiento ya descritos; no hay valores nuevos inventados. El widget debe aceptar el hostname real y validar la acción `careers`. Configurar `CAREERS_ENABLED=false` y `CAREERS_VERIFIED=false` en todos los entornos hasta autorizar una prueba controlada.
5. En un entorno de pruebas autorizado y separado, con documentos aprobados y datos propios, activar temporalmente ambos flags para comprobar confirmación de email, evidencias (fecha UTC, texto, versión, idioma, identificador seudonimizado y estado), duplicados, errores y baja efectiva. La aceptación API significa solicitud recibida, no confirmación final de inscripción. Comprobar que no cambian la lista comercial ni Fundadores. Desactivar los flags si alguna prueba falla. No habilitar un entorno público hasta que las pruebas estén documentadas.
6. Solo con autorización de publicación y pruebas superadas conservar ambos flags en true. La activación laboral no depende de `FORMS_ENABLED` ni habilita los otros formularios. Tampoco bloquea ni activa por sí sola el lanzamiento de la portada. Las claves siguen siendo exclusivamente de servidor; el navegador solo recibe el estado público y la sitekey.

La baja se gestionará en la lista laboral de GetResponse, con enlace en todas sus comunicaciones y atención en admin@cimstudio.es. No reactivar automáticamente contactos existentes/bajas. La evidencia D1 no sustituye el estado de confirmación/baja del proveedor; las solicitudes de derechos deben resolverse también en la base laboral y conforme al procedimiento de conservación aprobado.
