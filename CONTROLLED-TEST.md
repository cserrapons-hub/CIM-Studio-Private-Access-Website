> Procedimiento vigente: [LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md). Consolida los tres formularios y sustituye estados e instrucciones de fases anteriores; se conservan debajo como referencia histórica. Las aprobaciones y activaciones siguen deshabilitadas.

# Primera prueba controlada — configuración preparada, nada activado

Rama de trabajo: controlled-getresponse-test-2026-10-20, derivada de los respaldos. Ningún despliegue, alta real, cambio de dominio o migración de producción está autorizado por este documento. Usar un proyecto Pages independiente y un CIM Production de ensayo con disco/base separados.

## 1. GetResponse: una única revisión de contrato

Endpoint confirmado por soporte: https://app.getresponse.com/add_subscriber.html. Lista cim_studio_newsletter, token PL6jh, ID visible 374914302, double opt-in web/API activado, notificaciones admin@cimstudio.es. No cambiar la página de confirmación predeterminada.

Pedir al soporte, en el mismo mensaje:

- HTML plano completo o contrato oficial: method/enctype, nombre EXACTO del campo del token y del email, campo/valor del consentimiento nativo y campos obligatorios. No inferir campaign_token u otros nombres a partir de ejemplos antiguos.
- Si se permite POST desde Cloudflare y se conserva double opt-in Y evidencia del consentimiento, qué datos de procedencia/consentimiento registra y cómo documentar la aceptación en CIM sin confundirla con la confirmación del email. No enviar IP/UA u otros campos si no están documentados y justificados.
- Protección antispam que aplica el servidor a add_subscriber.html cuando alguien lo llama directamente, límites y resultado/errores/redirecciones oficiales. Un Turnstile local solo protege nuestra Function; no impide saltársela y llamar al destino externo. Double opt-in tampoco impide bombardear un buzón con solicitudes de confirmación.
- Payload real de contact-subscribed para ESTE HTML, evento/ID/origen/lista/occurredAt UTC, reintentos y método verificable de autenticación. No asumir que un header arbitrario o una IP compartida acreditan el origen. Confirmar cómo distinguir la confirmación efectiva y obtener evidencia si el contacto se da de baja rápidamente.

Cloudflare es la opción preferida SOLO si ese contrato acredita los cuatro puntos. prepareCloudflareHtmlRequest ya prepara un POST exclusivamente al endpoint confirmado, con campos revisados, sin reenviar credenciales del visitante ni seguir redirects; es una función pura sin red y NO está conectada al endpoint público. No se presenta 200/302 como aceptación sin revisar la respuesta oficial. Si el proxy no está admitido o pierde evidencia de consentimiento, no activarlo: revisar el HTML directo permitido y su antispam, manteniendo intacto el modal. Ninguna variante está habilitada hoy.

El ID del panel no se considera automáticamente campaignId v3. Comprobar el ID real con la API de solo lectura preparada o con soporte. El antiguo UUID del widget Web Connect no identifica necesariamente el HTML plano: sourceBindingVerified y expectedFormId deben revisarse con el evento real, nunca copiar ese UUID por comodidad.

## 2. Cloudflare: proyecto de ensayo cerrado

Después de autorizar expresamente el despliegue de prueba, usar esta rama en un proyecto Pages independiente, sin dominio personalizado. Build sh scripts/build-preview.sh, salida public, raíz del repositorio. No apuntar al proyecto/entorno Production existente ni modificar DNS.

Preparar las variables de config/controlled-test.vars.example en ESTE entorno; no publicar el archivo. CONTROLLED_TEST_MODE=true, CONTROLLED_TEST_ORIGIN=origen HTTPS exacto del proyecto, CONTROLLED_TEST_USER=usuario privado, CONTROLLED_TEST_PASSWORD=secreto aleatorio de al menos 32 caracteres. La Function protege todos los accesos con HTTP Basic sobre HTTPS y no-store/noindex. Un origen alternativo/alias o configuración incompleta se rechaza. Limitar quién recibe las credenciales; no introducirlas en URLs. El webhook POST exacto queda fuera del login de navegador, pero conserva íntegramente sus propios controles y, por ahora, devuelve no disponible.

Crear D1 NUEVA de ensayo y enlazarla como FORMS_DB; aplicar únicamente allí, tras autorización, 0001_forms.sql, 0003_getresponse_webhook.sql y 0004_production_outbox.sql. No aplicar tests/fixtures/legacy-founders.sql ni restaurar D1 como registro de clientes. Para reintentos se necesitará el Worker programado workers/production-outbox.js con el mismo binding y secretos; no está desplegado ni programado hoy.

Configurar sin imprimir valores:

- GetResponse: GETRESPONSE_API_KEY (secreto), GETRESPONSE_CAMPAIGN_ID verificado. El secreto que exista en otro proyecto/entorno no se hereda automáticamente.
- Webhook: GETRESPONSE_WEBHOOK_CIDRS según lista oficial revisada y GETRESPONSE_WEBHOOK_IPS_REVIEWED; GETRESPONSE_WEBHOOK_BEARER_SECRET solo si el proveedor realmente admite enviarlo. No usar un token en la URL. Las banderas de código de autenticación, payload, origen y DOI siguen sin verificar.
- Turnstile: clave de sitio limitada al hostname de ensayo y TURNSTILE_SECRET_KEY privado; validar servidor/hostname/action/token y rate limit cuando se autorice el envío. No incorporarlo al HTML externo como sustituto de antispam de GetResponse. Antes, revisar en navegador cookies, storage, red y finalidad; no presumir exención ni instalar analytics.
- AUDIT_HASH_SECRET independiente; OUTBOX_ENCRYPTION_KEY base64 de 32 bytes; CIM_PRODUCTION_KEY_ID y CIM_PRODUCTION_HMAC_SECRET compartidos SOLO con Render de ensayo; CIM_PRODUCTION_URL de ese servicio de ensayo.
- OUTBOX_MAX_PENDING_SECONDS y OUTBOX_RECEIPT_SECONDS explícitos. Asignar responsable y plazo finito de conciliación antes de OUTBOX_RECONCILIATION_REVIEWED=true. Revisar los datos sin consentimiento o sin autenticación antes de decidir su conservación; nunca mantenerlos por defecto indefinidamente.

Dejar FORMS_ENABLED, NEWSLETTER_ENABLED, SAMPLES_ENABLED, CAREERS_ENABLED, FORMS_VERIFIED, FOUNDERS_RECORDING_VERIFIED, SITE_LIVE, GETRESPONSE_WEBHOOK_ENABLED, GETRESPONSE_WEBHOOK_GRANTS_ENABLED y CIM_PRODUCTION_DELIVERY_ENABLED en false. No cambiar legal.approved=false. Los flags no pueden habilitar el contrato HTML aún incompleto.

## 3. Render: copia y migración solo en ensayo

Seguir PRIVATE-ACCESS.md del otro repositorio. Usar el botón autenticado Copia de seguridad de CIM Production: descarga SQLite coherente Y adjuntos con manifiesto y hashes. Guardar el archivo privadamente, nunca en Git o en este chat. Verificarlo y ejecutar el nuevo ensayo local:

    python scripts/verify-full-backup.py /ruta/privada/copia.tar.gz
    python scripts/rehearse-private-access.py /ruta/privada/copia.tar.gz

El ensayo extrae SOLO una copia temporal, comprueba que las tablas/columnas/datos existentes se conservan, repite init_db y verifica integridad/relaciones. No toca la copia original ni la base viva. Si falla, detener el despliegue; no ignorar el error. Una prueba con un backup real requiere que la titular lo ejecute en un entorno privado; aquí solo se han usado fixtures.

Crear/configurar un servicio Render separado con su disco/base propia (mejor datos sintéticos para la primera suscripción), auto-deploy desactivado y esta rama. No compartir /var/data ni secretos de sesión con el servicio vivo. init_db ejecuta la migración al arrancar/importar app: no probar comandos Flask contra la base real. CIM_DATABASE y CIM_UPLOAD_DIR deben apuntar al disco de ensayo. CIM_SEED_DEMO=false. CIM_PRIVATE_ACCESS_ENABLED=false inicialmente; claves HMAC independientes en CIM_PRIVATE_ACCESS_KEYS y el campaignId verificado en CIM_PRIVATE_ACCESS_CAMPAIGN_ID. No montar ni migrar la base viva.

## 4. Autorización y ejecución

Cuando estén resueltos el contrato oficial, protección del destino, autenticación del evento y privacidad, solicitar autorización para desplegar exclusivamente el ensayo y realizar UNA suscripción con email propio. Seguir GETRESPONSE-REAL-TEST.md: solicitud → correo DOI → clic → evento autenticado → cliente en CIM de ensayo → proforma borrador → baja sin pérdida del beneficio. No emitir documentos reales.

La primera observación del evento no permite activar automáticamente Fundadores. Verificar fecha UTC, lista y procedencia antes de habilitar entrega al CIM de ensayo; usar el evento acreditado original, nunca fecha de solicitud/recepción/visita. Si la evidencia es insuficiente, mantenerlo bloqueado. No se publicará cimstudio.es ni se tocará Google Workspace.
