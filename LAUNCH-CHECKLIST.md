> Procedimiento vigente: [LAUNCH-RUNBOOK.md](LAUNCH-RUNBOOK.md). Consolida los tres formularios y sustituye estados e instrucciones de fases anteriores; se conservan debajo como referencia histórica. Las aprobaciones y activaciones siguen deshabilitadas.

# Lanzamiento mínimo — estado y acciones pendientes

**DECISIÓN POSTERIOR:** [CIM-PRODUCTION-LAUNCH.md](CIM-PRODUCTION-LAUNCH.md) establece CIM Production como único registro de Clientes/Fundadores y la activación posterior de muestras. No aplicar las propuestas antiguas de derechos definitivos en D1.

**ACTUALIZACIÓN:** el flujo de alta por API ha sido retirado del acceso público. Seguir únicamente [GETRESPONSE-LAUNCH.md](GETRESPONSE-LAUNCH.md) para el formulario alojado y el webhook. Las instrucciones de activación siguientes son históricas y no deben ejecutarse para este lanzamiento.

Rama exclusiva: design/private-access-v1. Se conserva el commit 57afd89. Sin push, despliegue, cambios DNS/GetResponse/Google Workspace ni suscripciones reales. Se ha retirado la comparativa temporal. Georgia permanece en títulos; Montserrat 300/400 se aloja localmente en WOFF2 (unos 58 KB).

## Preparado en código

- Pages Functions de newsletter, comprobación de lista exacta y double opt-in, consentimiento, Turnstile, límite de intentos, idempotencia y modal ES/EN.
- Bienvenida en /bienvenida/ y /bienvenida/?lang=en, con selector ES/EN y siempre no indexable. No interpreta emails, contactos o tokens de URL ni escribe datos. Una visita no acredita confirmación ni concede un descuento. No se ha cambiado la redirección de GetResponse.
- Tabla D1 independiente founders_entitlements, migración migrations/0002_founders.sql. Sin email en claro ni cascada con registros de marketing: una baja no elimina el derecho. No usa la fecha de solicitud ni createdOn. Límite exclusivo: 2026-12-31T23:00:00.000Z, medianoche del 1 de enero en Europe/Madrid. La verificación profesional puede ser posterior.
- Herramienta privada de carga de evidencias revisadas, sin endpoint público ni supuesto webhook no comprobado.
- Muestras requieren SAMPLES_ENABLED=true: permanecen desactivadas. Colaboraciones/carreras continúan condicionadas a CAREERS_ENABLED y sus requisitos propios; mantenerlo false. El lanzamiento no depende de activar esos formularios.

## No verificado todavía

La clave existente en Cloudflare no está disponible en este entorno. No se ha consultado la cuenta: faltan ID real, campos de consentimiento, configuración efectiva y prueba de entrega/confirmación. Las simulaciones no prueban nada de eso.

Tampoco se ha verificado qué dato/exportación/evento de GetResponse acredita la confirmación efectiva y su instante. No hay automatización que se pueda declarar operativa. La carga privada exige que una persona autorizada coteje una evidencia auténtica primero. Si no se obtiene esa evidencia, no activar la captación que promete Fundadores.

## Acciones manuales, en orden

1. **GetResponse, solo lectura:** ejecutar el script scripts/check-getresponse-newsletter.mjs en un entorno seguro con la clave inyectada. Exige nombre cim_studio_newsletter y optinTypes.api=double; devuelve el campaignId real. Comprobar los cuatro campos y sus IDs según NEWSLETTER.md. No pegar claves en comandos, archivos versionados ni chat.
2. **Evidencia de confirmación:** comprobar en la cuenta o con soporte qué dato/exportación/evento acredita la confirmación y su hora exacta. Confirmar con una futura prueba autorizada que no es la fecha de solicitud, creación o importación. Comprobar también que la evidencia sigue siendo recuperable si la persona se da de baja antes del cotejo; una revisión periódica de la lista activa por sí sola puede omitir derechos. No sustituirlo por una redirección ni inventar un webhook.
3. **Aprobación legal expresa:** revisar Aviso Legal, Privacidad, Cookies/Tecnologías y Fundadores ES/EN en legal/content.js. Sigue approved: false y versión vacía. Resolver bases jurídicas/conservación del registro separado, contratos/transferencias de proveedores reales, Turnstile/seguimiento del email, términos profesionales/comerciales y datos de reclamaciones/registro que correspondan. Comprobar que muestras/carreras/Resend figuran como preparación posterior, no servicio activo de este lanzamiento. Solo tras aprobar, asignar versión real y approved: true.
4. **Cloudflare, prueba aislada:** autorizar antes push/despliegue y proteger el entorno de prueba con control de acceso. Mantener públicos FORMS_ENABLED=false, NEWSLETTER_ENABLED=false, SAMPLES_ENABLED=false, CAREERS_ENABLED=false, FORMS_VERIFIED=false, FOUNDERS_RECORDING_VERIFIED=false y SITE_LIVE=false. Vincular FORMS_DB y aplicar 0001_forms.sql; aplicar 0002_founders.sql tras aprobar su finalidad/procedimiento. Configurar Turnstile para hostnames reales y sus dos claves, AUDIT_HASH_SECRET de al menos 32 caracteres, clave GetResponse existente, ID de campaña y los cuatro GR_*_FIELD_ID de NEWSLETTER.md. No configurar Resend ni una campaña laboral.
5. **Prueba real solo avisando y con autorización:** en el entorno restringido, tras aprobación legal, activar FORMS_ENABLED y NEWSLETTER_ENABLED. Mantener FORMS_VERIFIED y SITE_LIVE false. Usar un email propio autorizado. Revisar ES/EN, móvil/escritorio, consentimiento, Turnstile, un solo correo, double opt-in (no confirmado antes del clic), modal solo al aceptar, errores, duplicados, baja y evidencia real de confirmación. No retirar avisos por una simulación.
6. **Fundadores:** aprobar/probar la operativa de registro privado de abajo. Designar responsable de revisión y cotejo para no omitir confirmaciones; acordar conservación mínima, copias/restauración y atención de derechos. Solo al verificarlo marcar FOUNDERS_RECORDING_VERIFIED=true. La opción manual es viable únicamente con evidencia fiable y una persona responsable; automatizar exige comprobar antes el contrato real de GetResponse.
7. **Bienvenida:** tras autorizar ese ajuste externo, comprobar/establecer la redirección posterior a confirmar hacia https://cimstudio.es/bienvenida/; durante pruebas usar el hostname restringido. Mantener correo de confirmación, double opt-in y demás configuración. No añadir emails ni identificadores a la URL. Hay selector inglés; no se asumen variables de plantilla no verificadas.
8. **Dominio, previa autorización:** añadir cimstudio.es en Pages → Custom domains. Seguir las instrucciones reales del panel. Antes de tocar GoDaddy o DNS, exportar/cotejar la zona completa, especialmente MX, SPF, DKIM, DMARC y verificaciones de Google Workspace. No inventar valores ni borrar registros. Si el apex exige cambiar nameservers, revisar zona/DNSSEC y autorizarlo; si ya usa Cloudflare, no moverlos otra vez. Comprobar HTTPS, correo admin@cimstudio.es y hostname de Turnstile.
9. **Activación definitiva:** después de las pruebas, mantener SAMPLES_ENABLED=false y CAREERS_ENABLED=false. Marcar FORMS_VERIFIED=true y SITE_LIVE=true con newsletter y registro verificados. Redeploy autorizado; comprobar /api/config, canonical, robots, sitemap, noindex de bienvenida y dominio. La retirada de avisos depende de esas pruebas, no solo de este código.

## Registro privado de Fundadores

server/founders.js prepara y consulta registros internos, evita duplicados y rechaza sobrescrituras contradictorias. No hay endpoint público. Se conserva HMAC del email, IDs mínimos de campaña/contacto, fecha confirmada, fecha de verificación, referencia y SHA-256 del justificante y versión de condiciones. Son datos personales seudonimizados, no anónimos. No se guarda consentimiento de marketing ni obligación de seguir suscrito.

scripts/prepare-founders-import.mjs genera SQL privado desde un manifiesto interno revisado, fuera del repositorio. No accede a GetResponse ni escribe en Cloudflare. No verifica por sí mismo la autenticidad del proveedor: primero debe revisarla una persona autorizada. Exige aprobación legal, FOUNDERS_RECORDING_VERIFIED=true, ID real de campaña y secreto HMAC inyectados de forma segura. El justificante debe existir y coincidir con su digest. Nunca usar una visita o createdOn como evidencia.

Cada entrada del manifiesto necesita source: "getresponse-confirmation", reviewed: true, email, campaignId, contactId, confirmedAt y verifiedAt ISO con zona, evidenceReference (referencia interna sin datos personales), evidenceSha256 y evidenceFile. Son campos de NUESTRO manifiesto, no nombres afirmados de la API GetResponse. confirmedAt debe proceder de una confirmación auténtica revisada.

Tras aprobarlo, ejecutar en un entorno seguro:

    node scripts/prepare-founders-import.mjs /ruta/privada/confirmaciones.json /ruta/privada/founders.sql

Revisar/importar el SQL con cuenta autorizada de Cloudflare/D1 y autorización de esa escritura. Aplicar antes la migración. Un trigger aborta evidencias contradictorias y nunca las sobrescribe. Cotejar recuentos/filas antes y después; revisar conflictos u omisiones y no borrar registros para forzar altas. Guardar justificantes mínimos con acceso restringido y conservación aprobada, separados de marketing. No subir manifiestos, SQL o justificantes al repositorio.

findFounder permite consulta interna por HMAC/email al comprar, sin volver a suscribir. No hay buscador público ni automatización de ventas o Precio Profesional. Respaldar el secreto y no rotarlo sin migración. La continuidad del registro requiere copias/restauración y procedimiento aprobados; no se promete conservación indefinida de todos los datos.

## Estimación pendiente

Con accesos, aprobación legal y evidencia de confirmación resueltos: unas 2–4 horas de configuración y pruebas reales. Revisión legal, respuesta de GetResponse y propagación/validación del dominio son dependencias externas y pueden añadir días; no hay una hora de publicación garantizada. Si GetResponse no acredita el instante de confirmación, revisar el mecanismo de Fundadores antes de lanzar la promesa.
