# Despliegue privado de newsletter API v3

## Estado y alcance

CIM Studio comunica que GetResponse recomienda API v3 y ya no soporta/recomienda el endpoint HTML anterior. Se retira ese transporte de la ruta de envío privada; no se utiliza como fallback. Esta confirmación no demuestra que una suscripción concreta esté confirmada ni verifica la fecha original del double opt-in.

Único destino autorizado para este cambio: rama integration/three-forms-2026-10-20 → proyecto privado cim-studio-test, sin dominios personalizados. No modificar main, design/private-access-v1, otros proyectos, CIM Production o DNS. Los aislamientos de Cloudflare y Netlify son los confirmados manualmente por CIM Studio; no han sido reconsultados ni modificados desde esta intervención.

El código exige NEWSLETTER_API_REVIEWED=true además de todos los controles existentes. Ausente o false mantiene la ruta bloqueada ANTES de acceder a D1, Turnstile o GetResponse. Los ejemplos la dejan en false. No se cambia ninguna variable remota. Si un indicador de envío antiguo continúa en true, no basta para abrir esta versión: también necesita la nueva aprobación API independiente.

## Orden mínimo seguro

1. Commit y push exclusivamente a la rama de integración. El despliegue automático autorizado debe llegar solo a cim-studio-test. Mantener NEWSLETTER_API_REVIEWED=false (o ausente), NEWSLETTER_PREPARATION_ENABLED=false y NEWSLETTER_CONTROLLED_SEND_ENABLED=false; no activar el sitio público, muestras o colaboraciones. No hay autorización para cambiar variables desde Codex en este bloque.
2. En Cloudflare, verificar Success del commit, acceso con usuario/contraseña y config privada enabled=false. No realizar POST de suscripción para comprobar el bloqueo. Comprobar por lectura la configuración no produce altas.
3. Con autorización posterior independiente, aplicar únicamente migrations/0009_newsletter_api_deliveries.sql en cim-studio-samples-test, binding FORMS_DB. Requiere el ledger de 0007 y las evidencias de 0006 ya presentes. Solo crea newsletter_api_deliveries; no altera, borra ni migra registros existentes. Comprobar antes la identidad de la base y después tabla nueva vacía, recuentos previos intactos, PRAGMA foreign_key_check y PRAGMA quick_check. No aplicar a CAREERS_DB ni bases públicas. Si hay error, detener; no habilitar envíos ni borrar tablas para repetir.
4. Revisar la respuesta de soporte sobre double opt-in API para la cuenta y el comportamiento del campo personalizado. Mantener los avisos privados aprobados y legal/content.js approved:false; 202 no es prueba de DOI y Fundadores permanece pendiente.
5. Revisar y autorizar por separado el mecanismo de UNA nueva prueba. El correo ya utilizado sigue bloqueado por el intento HTML 404, incluso si se envía otro request_id. Este commit NO incorpora excepción. No borrar, modificar o reciclar el historial ni sus evidencias. No sirve activar los indicadores para superar el bloqueo.
6. Solo una vez implementado, probado y autorizado ese mecanismo, autorizar la activación temporal de NEWSLETTER_API_REVIEWED, NEWSLETTER_TEST_LEGAL_APPROVED, NEWSLETTER_PREPARATION_ENABLED y NEWSLETTER_CONTROLLED_SEND_ENABLED, manteniendo origen privado, Basic, allowlist, Turnstile y límites. Los demás formularios/sitio público siguen desactivados. NEWSLETTER_OBSERVATIONS_ENABLED puede usarse para las observaciones específicamente autorizadas; no concede Fundadores.
7. Una única solicitud manual. Conciliar D1/API/GetResponse/buzón; verificar correo DOI y confirmación efectiva sin tomar 202 o createdOn como fecha de confirmación. Ante rechazo, timeout o resultado incierto, detener y revisar, nunca repetir automáticamente. No atribuir Fundadores sin evidencia acreditada. Al cerrar, volver a false NEWSLETTER_CONTROLLED_SEND_ENABLED y NEWSLETTER_PREPARATION_ENABLED y, por prudencia, NEWSLETTER_API_REVIEWED; confirmar que enabled=false. No borrar evidencias en esa operación.

Si el despliegue o la migración fallan, mantener los bloqueos; no volver al HTML como solución. Una reversión a un commit con HTML solo sería aceptable manteniendo también el envío deshabilitado. La migración aditiva no requiere borrarse para revertir código.

## Propuesta para el mismo correo autorizado — NO implementada

El intento HTML 404 y su consentimiento se conservan íntegros. Proponer una autorización excepcional de un solo uso, concedida expresamente por CIM Studio después de conciliar que no hay contacto/confirmación, que identifique: subject HMAC autorizado, request_id del HTML rechazado y su 404, nuevo request_id API, caducidad y responsable de aprobación. No incluir el correo en logs ni permisos públicos.

La autorización debe consumirse atómicamente ANTES del POST, tras los controles normales y las lecturas autenticadas de GetResponse. Registrar el nuevo intento API como evento separado ligado al HTML original, manteniendo el bloqueo común por correo y sin actualizar/sustituir el intento histórico. Esto requiere una modificación adicional del modelo de intentos/permiso de prueba y pruebas de concurrencia; la migración 0009 actual no habilita por sí sola ese modelo. No implementar la excepción mediante DELETE, cambio de subject_hash o levantando UNIQUE.

El permiso se considera gastado una vez reclamado, incluso ante fallo de red o resultado incierto. No permite intentos posteriores, otro correo, otro origen ni evitar el consentimiento/Turnstile. La baja del newsletter y cualquier confirmación DOI permanecen separadas del derecho Fundadores. Una suscripción existente detectada por API detiene el nuevo POST.

Alternativa sin desarrollar excepción: utilizar un alias propio distinto, bajo control de CIM Studio, con actualización autorizada de su allowlist. No asumir que un alias es un contacto distinto para GetResponse sin verificar su tratamiento; nunca elegirlo para ocultar un duplicado o eludir controles. Ninguna de las dos opciones está activada ni autorizada para envíos reales ahora.
