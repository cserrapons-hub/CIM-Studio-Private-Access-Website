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

## Propuesta inicial para el mismo correo autorizado — historial de diseño

El intento HTML 404 y su consentimiento se conservan íntegros. Proponer una autorización excepcional de un solo uso, concedida expresamente por CIM Studio después de conciliar que no hay contacto/confirmación, que identifique: subject HMAC autorizado, request_id del HTML rechazado y su 404, nuevo request_id API, caducidad y responsable de aprobación. No incluir el correo en logs ni permisos públicos.

La autorización debe consumirse atómicamente ANTES del POST, tras los controles normales y las lecturas autenticadas de GetResponse. Registrar el nuevo intento API como evento separado ligado al HTML original, manteniendo el bloqueo común por correo y sin actualizar/sustituir el intento histórico. Esto requiere una modificación adicional del modelo de intentos/permiso de prueba y pruebas de concurrencia; la migración 0009 actual no habilita por sí sola ese modelo. No implementar la excepción mediante DELETE, cambio de subject_hash o levantando UNIQUE.

El permiso se considera gastado una vez reclamado, incluso ante fallo de red o resultado incierto. No permite intentos posteriores, otro correo, otro origen ni evitar el consentimiento/Turnstile. La baja del newsletter y cualquier confirmación DOI permanecen separadas del derecho Fundadores. Una suscripción existente detectada por API detiene el nuevo POST.

Alternativa sin desarrollar excepción: utilizar un alias propio distinto, bajo control de CIM Studio, con actualización autorizada de su allowlist. No asumir que un alias es un contacto distinto para GetResponse sin verificar su tratamiento; nunca elegirlo para ocultar un duplicado o eludir controles. Ninguna de las dos opciones está activada ni autorizada para envíos reales ahora. La implementación local posterior de la excepción se detalla en la sección siguiente.

## Excepción implementada posteriormente — solo local, NO activada

La propuesta anterior ya dispone de una implementación local para su revisión, sin commit/push ni cambios remotos. No se modifica el intento HTML ni se elimina su UNIQUE(subject_hash). La migración aditiva 0010_newsletter_html404_retry.sql crea newsletter_retry_permits y newsletter_retry_attempts. Aplicar en el futuro únicamente después de 0009 y con autorización; ambas siguen pendientes de aplicación remota según la información disponible.

- NEWSLETTER_HTML404_RETRY_ENABLED=false por defecto. NEWSLETTER_HTML404_RETRY_PARENT_ID vacío por defecto. No son secretos y nunca contienen un email. Activar solo tras crear y revisar UN permiso en la base privada y comprobar el intento HTML concreto.
- Permiso: parent_request_id exacto del HTML rechazado 404, api_request_id UUID nuevo asignado previamente, subject_hash ya existente del HTML (no recalcularlo ni exponerlo), issued_at/expires_at como segundos UTC Unix, duración máxima 900 segundos (15 minutos), approved_by del responsable, active=0 por defecto, consumed_at=NULL. El responsable revisará y autorizará expresamente su creación/activación; no hay endpoint ni tarea que lo emita, renueve o reactive. La combinación de PK/UNIQUE impide permisos adicionales automáticos para ese parent/correo.
- El servidor exige un HTML 404 sin registro API asociado, su consentimiento auténtico (HMAC), email allowlisted y subject coincidente. Mantiene Basic/origen privado, consentimiento vigente, Turnstile, límites y NEWSLETTER_API_REVIEWED. En modo excepción no se puede caer al flujo de nuevas altas si no existe el parent autorizado.
- La configuración privada devuelve únicamente el nuevo UUID (retryRequestId), sin email, subject, credenciales o identificador del HTML. El navegador lo usa al enviar; no necesita copiar IDs a mano ni cambiar textos/avisos. Con permiso ausente, inactivo, consumido o caducado la interfaz queda desactivada. El servidor vuelve a comprobar la caducidad al consumir, incluso si la pestaña llevaba abierta tiempo.
- Un UPDATE condicional con RETURNING consume atómicamente el permiso (active=0, consumed_at=UTC) antes de cualquier consulta o POST GetResponse de este ensayo. Se guarda una nueva evidencia de consentimiento con su nuevo UUID y un intento API independiente enlazado al HTML. Solo el ganador de la carrera puede llamar a GetResponse. Si se pierde la respuesta de D1 al consumir, falla una lectura API, falla el INSERT posterior, hay timeout/5xx/409/redirección, o falla la persistencia final, no se restaura el permiso ni se habilita otro POST.
- El registro nuevo usa newsletter_retry_attempts, no newsletter_api_deliveries: esta última referencia el ledger común de 0009, cuya fila histórica no debe duplicarse ni sobrescribirse. El vínculo entre ambos intentos se hace mediante parent_request_id; las dos evidencias separadas se conservan en newsletter_consent_requests. Un HTTP 202 nuevo solo devuelve request_accepted, confirmationVerified=false y founders=pending. Repeticiones del UUID solo consultan el resultado ya guardado; nuevos UUIDs no son elegibles. La interfaz deshabilita otro envío al terminar.

### Secuencia mínima posterior, requiere nuevas autorizaciones

1. Autorizar commit/push y despliegue exclusivamente privado con NEWSLETTER_API_REVIEWED y todos los envíos/indicadores de excepción desactivados. Verificar Success, Basic y enabled=false.
2. Autorizar/aplicar en FORMS_DB → cim-studio-samples-test, por orden, 0009 y 0010. Verificar nuevas tablas vacías, recuentos/filas antiguas sin cambios, PRAGMA foreign_key_check y quick_check. No tocar CAREERS_DB ni producción.
3. Conciliar por lectura el HTML 404 exacto, su evidencia, ausencia de entrega API previa y estado en GetResponse. Revisar la confirmación de soporte sobre double opt-in API. Autorizar la emisión de un permiso inactivo enlazado al HTML y un UUID nuevo. Mantener el HMAC allowlist y los secretos existentes. No compartir correo o hashes para estas comprobaciones.
4. En un único bloque posterior autorizado, fijar el parent ID en configuración, activar exclusivamente newsletter/ensayo y el permiso (máximo 15 minutos). Mantener sitio público, muestras y colaboraciones desactivados. La interfaz mostrará enabled=true solo con permiso válido. No generar el permiso antes de estar listos: la ventana es absoluta desde issued_at y no se renueva al abrir la página.
5. Introducir el mismo correo autorizado, aceptar de nuevo el aviso/consentimiento vigente y completar Turnstile. Pulsar una sola vez. Verificar nuevo intento, consentimiento, permiso consumido, resultado API y buzón. No repetir ante ningún error. Si llega el email, documentar estado antes de clicar y después confirmar; contrastar con observación API/webhook bajo autorización. No conceder Fundadores por el 202.
6. Desactivar envío/preparación y modo excepción al terminar, independientemente del resultado. Registrar la conciliación y cierre; conservar el permiso gastado y ambos historiales. Preparar limpieza manual según el aviso aprobado, sin borrar evidencias ahora. Si no se utilizó o caducó, detener: no renovar, borrar ni rearmar automáticamente.

No se han creado permisos reales, cambiado variables, aplicado migraciones remotas, enviado suscripciones/correos ni modificado aprobaciones legales/Fundadores/CIM Production.

Validación de la excepción local: 178 pruebas automatizadas; 11 casos completos workerd API (incluyen uso único, caducidad y concurrencia); 16 casos Chromium ES/EN a 1440/390 px; builds estático y Pages Functions correctos. Red externa interceptada, SQLite desechable y datos ficticios. No se ha hecho commit ni push.

## Aplicación manual de 0009 y 0010 desde Cloudflare D1 — preparación, NO ejecutada

1. En Workers & Pages → cim-studio-test → Settings → Bindings, confirmar que FORMS_DB apunta a cim-studio-samples-test. Anotar/comparar el identificador de la base con el que aparece al abrir Storage & databases → D1 → cim-studio-samples-test. La identidad se confirma en el panel; SQL no demuestra por sí solo el nombre de la base. No seleccionar CAREERS_DB, cim-studio-careers-test ni un proyecto público.
2. Mantener NEWSLETTER_API_REVIEWED=false, NEWSLETTER_PREPARATION_ENABLED=false, NEWSLETTER_CONTROLLED_SEND_ENABLED=false y NEWSLETTER_HTML404_RETRY_ENABLED=false. No modificar secretos para aplicar SQL. Confirmar proyecto privado sin dominio personalizado y acceso Basic. El despliegue no ejecuta las migraciones: el build solo compila/copia archivos.
3. En la consola D1 de esa base, ejecutar antes de migrar estas lecturas (una por ejecución si el editor no admite varias):

```sql
SELECT COUNT(*) AS consentimientos FROM newsletter_consent_requests;
```
```sql
SELECT COUNT(*) AS entregas FROM newsletter_html_deliveries;
```
```sql
SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('newsletter_consent_requests','newsletter_html_deliveries','newsletter_api_deliveries','newsletter_retry_permits','newsletter_retry_attempts');
```

Conservar solo los recuentos y esquemas, sin exportar correos cifrados, hashes o evidencias. Si una tabla nueva ya existe, contrastar su definición antes de continuar: IF NOT EXISTS no corrige un esquema diferente. Las tablas de consentimiento y ledger deben existir (0006/0007 previas).

4. Desde GitHub, abrir el commit de este despliegue → migrations/0009_newsletter_api_deliveries.sql → Raw. Copiar exclusivamente el SQL completo y ejecutarlo en cim-studio-samples-test. El archivo no tiene comentarios --, por lo que no se convierte en un comentario único al pegarlo en la consola. Verificar:

```sql
SELECT COUNT(*) AS registros_api FROM newsletter_api_deliveries;
```

Se espera 0 si acaba de crearse. Si hay datos previos o error, parar y conciliar; no borrarlos para repetir.

5. Abrir en el mismo commit migrations/0010_newsletter_html404_retry.sql → Raw. Copiar el contenido completo. Contiene dos CREATE TABLE: primero newsletter_retry_permits y después newsletter_retry_attempts. Ejecutarlos en ese orden. Si la consola solo permite una sentencia por ejecución, pegar por separado cada CREATE completo hasta su punto y coma. No eliminar restricciones o REFERENCES.
6. Comprobar, una consulta por ejecución:

```sql
SELECT 'newsletter_api_deliveries' AS tabla, COUNT(*) AS registros FROM newsletter_api_deliveries UNION ALL SELECT 'newsletter_retry_permits', COUNT(*) FROM newsletter_retry_permits UNION ALL SELECT 'newsletter_retry_attempts', COUNT(*) FROM newsletter_retry_attempts;
```
```sql
SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('newsletter_api_deliveries','newsletter_retry_permits','newsletter_retry_attempts');
```
```sql
PRAGMA foreign_key_check;
```
```sql
PRAGMA quick_check;
```

Se esperan tres tablas con el SQL del commit, vacías si son nuevas; foreign_key_check sin filas y quick_check=ok. Repetir los dos recuentos de consentimiento/ledger del paso 3: deben coincidir, conservando el HTML 404 y su evidencia. No se ha autorizado crear permisos, ni siquiera inactivos, en este bloque.

7. Confirmar despliegue Success del hash exacto en cim-studio-test, acceso protegido y /api/controlled/newsletter-config tras autenticarse con enabled=false (GET de configuración, no POST de envío). No compartir Authorization, cookies, hashes ni claves. Los demás indicadores públicos/otros formularios deben permanecer desactivados; no es necesario activar observaciones para aplicar las migraciones. Si falla cualquier comprobación, mantener todos los bloqueos y detenerse.

Estas instrucciones no constituyen autorización para ejecutar SQL remoto. La aplicación de ambas migraciones y la emisión/activación del permiso requieren autorizaciones posteriores independientes.

Se ha verificado también la aplicación inicial de 0009 y 0010, en ese orden y con foreign_keys=ON, sobre un historial HTML 404 firmado ya existente: tablas nuevas vacías, evidencia y entrega originales idénticas, foreign_key_check sin filas y quick_check=ok.
