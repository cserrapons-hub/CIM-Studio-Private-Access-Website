# Revisión de entrega del modal público

Base: rama pública en `f83da6a`, que incluye `8649035`. Corrección local, sin publicación.

## Hechos comprobados

- `8649035` contiene el modal genérico, sus textos ES/EN y la rama de respuesta de `integrations.js` que lo abre.
- El formulario público utiliza `integrations.js`. `script.js` aporta las traducciones y controles compartidos, pero no tiene otra implementación de envío de newsletter.
- HTTP 202 con `confirmation_required` abre la confirmación. HTTP 202 con `request_recorded`, y HTTP 409 con `error:pending`, abren el modal genérico.
- Un contacto existente puede devolver `409 pending`. Esa respuesta también cubre resultados inciertos: el texto del modal no confirma la existencia de un contacto ni promete un nuevo correo.
- HTTP 503, rechazos explícitos y fallos de conexión conservan mensajes de error; no deben convertirse en un modal de solicitud recibida.
- La compilación copiaba correctamente los archivos nuevos, pero solo versionaba la hoja CSS. `script.js` e `integrations.js` conservaban URLs fijas a pesar de cambiar su contenido. Esto permite reutilizar versiones anteriores si una caché las mantiene, pero no demuestra que haya ocurrido en producción.

## Corrección limitada

La compilación añade a los dos JavaScript de la página principal un parámetro `v` con los primeros 12 caracteres del SHA-256 del archivo servido. Cada archivo conserva su versión cuando no cambia y obtiene una URL nueva cuando cambian sus bytes. No se alteran los scripts, diálogos, estilos ni rutas del servidor. No se cambian cabeceras, configuración Cloudflare, aprobaciones legales o consentimientos.

## Verificación y límite

224 pruebas automatizadas, compilación estática y 40 recorridos de navegador ES/EN, escritorio/móvil, pasan. Los recorridos verifican que se solicitan las URLs correspondientes al contenido nuevo y prueban primera suscripción, repetición, contacto existente, respuesta genérica, incertidumbre, rechazo, 503, conexión, Turnstile y límites, sin solicitudes reales.

La lectura GET del JavaScript de `cimstudio.es` fue bloqueada por el proxy del entorno (HTTP 403), también con permisos ampliados. No se pudo confirmar qué archivo sirve Cloudflare ni su estado de caché. No se han enviado formularios para comprobarlo.

No se puede atribuir con certeza el síntoma remoto a caché sin ver el estado y JSON de la solicitud ya realizada, o comprobar el JavaScript cargado. Si aquella solicitud devuelve el 503 `getresponse_prepare` comunicado previamente, la causa de que no abra un modal genérico es la rama de error del frontend, deliberada; este cambio de versiones no corrige ese fallo del servidor. No se debe repetir una suscripción únicamente para comprobarlo.
