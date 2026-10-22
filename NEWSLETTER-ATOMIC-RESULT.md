# Newsletter: consentimiento sin entrega API

## Hallazgos del código desplegado 17ae35b

La ruta normal es POST /api/controlled/subscribe → handleControlledNewsletter.
Su versión de consentimiento es newsletter-private-test-v1, la misma que usaba
el ensayo HTML. La versión NO identifica el transporte ni el correo del registro.
newsletter_html_deliveries es el ledger compartido de deduplicación, también para
el transporte API v3. newsletter_api_deliveries es su traza API asociada.

Antes de almacenar consentimiento se validan configuración, autenticación, origen,
entrada/consentimiento, límites, allowlist, Turnstile, duplicados, esquema API,
campaña con double opt-in API y consulta de contactos existentes. Un bloqueo en
esos puntos no crea el consentimiento de esa nueva solicitud.

El código desplegado guarda después consentimiento, claim compartido y traza API
en tres escrituras separadas. Un fallo después de la primera puede dejar
consentimiento sin API; un fallo después de la segunda puede bloquear la solicitud
sin haber hecho el POST. Se ha reproducido localmente mediante fallos SQL inyectados.
Esto demuestra un defecto posible del código, NO la causa acreditada del incidente remoto.
El POST a GetResponse solo ocurre después de guardar la traza API. Sin esa traza,
en esta ruta, y salvo borrado/cambio posterior no acreditado, no se alcanza el POST.

## Corrección local

Las tres escrituras se agrupan en D1 batch transaccional. No hay POST antes del
commit, de ganar el claim único y de comprobar la evidencia HMAC guardada.
Si falla cualquiera de las tres escrituras, se revierte el lote. Se conservan
idempotencia, validaciones, separación de secretos, double opt-in y Fundadores pendiente.
No hay migración, reparación de filas históricas ni reenvío de solicitudes.
El helper de consentimiento mantiene por defecto el comportamiento de sus otros
llamadores; solo el handler privado normal utiliza preparación diferida y batch.

## Conciliación remota cerrada por CIM Studio

CIM Studio ha confirmado que la única fila es del 21/10/2026 a las 11:41 UTC,
corresponde al ensayo HTML rechazado con HTTP 404 y no tiene traza API.
La solicitud reciente no quedó acreditada en las tablas consultadas.
No se solicitan más consultas SQL ni se reutiliza el ensayo anterior.

## Respuestas del flujo normal corregidas

Las comprobaciones previas a persistencia conservan todas sus restricciones.
Cuando el servidor bloquea antes del POST, responde submission=not_submitted y
una etapa estática: configuration, request, storage_rate, allowlist, turnstile,
storage_read, getresponse_campaign, getresponse_contacts o persistence.
No se devuelven emails, secretos, hashes, respuestas de proveedores ni excepciones.
El navegador distingue ese bloqueo de una solicitud API aceptada, rechazada o
incierta. Si no recibe JSON válido o falla el transporte, no deduce que no hubo
envío: muestra resultado desconocido y mantiene bloqueado el botón de repetición.

No se ha identificado cuál de esas comprobaciones bloqueó el ensayo reciente:
el dato histórico no contiene esa información. La corrección evita ocultar bajo
un mensaje genérico el bloqueo en cualquier futura validación autorizada, sin
nuevos endpoints diagnósticos ni cambios de seguridad.

## Paquete privado integrado

Incluye transacción D1, respuestas de bloqueo previas a persistencia, estados de
correo de muestras/candidaturas y pruebas de navegador ES/EN. No hay migraciones
nuevas, activación de envíos, cambios legales ni cambios de producción pública.
La publicación del paquete está autorizada exclusivamente en la rama de integración
y en cim-studio-test. La verificación de entrega real y DOI sigue pendiente de una validación expresamente autorizada, sin repetir solicitudes
existentes automáticamente ni relajar deduplicación.
