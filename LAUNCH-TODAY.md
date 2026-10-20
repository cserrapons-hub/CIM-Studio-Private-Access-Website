# Lanzamiento mínimo — 20 de octubre de 2026 (Europe/Madrid)

## Versión preparada

Rama launch/informational-2026-10-20, descendiente de la copia respaldada y conservando también el trabajo posterior. SITE_MODE=informational crea una portada ES/EN con las mismas cuatro fotografías, colores, tipografías y composición. Sustituye los accesos por controles desactivados Próximamente / Coming soon. Elimina del HTML publicado los tres formularios y el modal de falsa espera de confirmación; no carga integrations.js, Turnstile, GetResponse, Web Connect ni Analytics. Mantiene los originales en el repositorio para su conexión futura. Los endpoints de captación y webhook responden 503 aunque se copien flags antiguos por error.

Tarifa Fundadores visible: 15 % permanente para confirmaciones hasta el 31/12/2026 Europe/Madrid. Ninguna solicitud, visita o publicación concede derechos. No se modifica CIM Production ni se necesita desplegarlo para esta salida.

## Legal — falta revisión expresa, no aprobación automática

legal/informational.js contiene los cuatro borradores ES/EN de esta salida; legal/content.js conserva los de la captación futura (aviso, privacidad, cookies/tecnologías y condiciones). Identidad comprobada: CIM STUDIO ESPJ; E88749155; C/ Juan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears, España; admin@cimstudio.es. approved continúa false y version vacía.

El borrador informativo describe solo alojamiento, seguridad y consultas voluntarias por email, y aclara que no hay captación. Reutiliza las condiciones de Fundadores sin alterarlas. No se declara jurídicamente revisado ni aprobado. Antes de publicar hay que revisar expresamente este documento, las bases propuestas y su proporcionalidad, los servicios efectivos de Cloudflare/Google Workspace, conservación/transferencias y los datos registrales que legalmente procedan (no facilitados). No hay que activar un formulario para cerrar una portada informativa. No inventar datos ni aprobar por una variable de entorno.

Hasta esa revisión, SITE_LIVE=true NO elimina noindex ni convierte la vista en lanzamiento oficial. Tras aprobación expresa se asignará una versión legal real; ambas fuentes legales y las pruebas conservan actualmente approved=false. La aprobación de la versión informativa no activará los formularios ni aprobará automáticamente el documento de captación futura.

## Cloudflare Pages: configuración exacta, después de autorizar el despliegue

1. Workers & Pages → proyecto de CIM Studio → Settings → Builds / Branch control: usar la rama launch/informational-2026-10-20 para la versión de salida. Conservar las ramas de respaldo y no fusionar main. No reintentar un despliegue viejo de otra rama.
2. Framework: None. Build command: sh scripts/build-preview.sh. Output: public. Root: raíz del repositorio (vacía). No se necesita GetResponse, Resend, D1, Turnstile o Render para este modo.
3. Variables de Production: SITE_MODE=informational; CONTROLLED_TEST_MODE=false; inicialmente SITE_LIVE=false. Mantener FORMS_ENABLED, NEWSLETTER_ENABLED, SAMPLES_ENABLED, CAREERS_ENABLED, FORMS_VERIFIED, FOUNDERS_RECORDING_VERIFIED, GETRESPONSE_WEBHOOK_ENABLED, GETRESPONSE_WEBHOOK_GRANTS_ENABLED y CIM_PRODUCTION_DELIVERY_ENABLED en false. No copiar credenciales del ensayo ni activar Web Analytics en el panel.
4. Preview: SITE_MODE=informational y SITE_LIVE=false. Mantener la protección del ensayo si se desea. Aunque un build público se visualice en pages.dev, el middleware añade noindex y sirve robots Disallow y un sitemap vacío. Solo https://cimstudio.es pasa el control de indexación pública; los dominios de prueba nunca lo hacen.
5. Después de aprobar los textos y autorizar publicación, SITE_LIVE=true SOLO en Production y nuevo build de ESTA rama. El cambio genera title, canonical, robots y sitemap públicos; sin formularios y sin sincronización de clientes. No quitar avisos de prueba manualmente por separado.

## Dominio y correo: no se ha cambiado nada

No se ha podido consultar el DNS público desde este entorno (resolvedores rechazan consultas), por lo que el estado actual debe comprobarse en el panel.

- Para cimstudio.es (apex), la guía oficial de Pages exige una zona activa de ese dominio en LA MISMA cuenta Cloudflare y nameservers de Cloudflare. Si ya está activa, no cambiar registrador ni nameservers.
- Si sigue en GoDaddy: añadir la zona en Cloudflare, exportar/comparar TODOS los registros y preservar exactamente los de Google Workspace (MX, SPF/TXT, DKIM, DMARC y verificaciones), junto al resto de servicios. Revisar DNSSEC/DS siguiendo la activación oficial. Solo tras aprobación separada cambiar los nameservers en GoDaddy por los dos asignados a esa zona. Esta transición puede impedir garantizar la publicación durante la mañana; no improvisar un CNAME de raíz ni cambiar el correo.
- Pages → proyecto → Custom domains → Set up a custom domain: asociar cimstudio.es. No crear solo un CNAME sin asociarlo antes al proyecto. Esperar estado Active y certificado emitido.
- Asociar también www.cimstudio.es si se quiere admitirlo, con su registro al proyecto. El middleware ya prepara www→https://cimstudio.es con 308 conservando ruta/query. Sin asociar www ni certificado, una redirección no soluciona errores TLS.
- SSL/TLS → Edge Certificates: verificar certificado activo y habilitar Always Use HTTPS después de la autorización. No usar Flexible para ocultar problemas. Si CAA impide emitir, seguir el diagnóstico de Cloudflare, sin borrar registros al azar.

Guía oficial consultada: https://developers.cloudflare.com/pages/configuration/custom-domains/

## Comprobación final real, solo tras autorizar despliegue/dominio

- Abrir https://cimstudio.es en incógnito, ES y EN, ordenador y móvil; revisar las cuatro imágenes, logo, enlaces legales y Próximamente. No debe haber formulario, falso éxito ni requests a GetResponse/Resend/Turnstile.
- https://cimstudio.es/robots.txt permite rastreo y referencia sitemap.xml; el sitemap contiene únicamente el canonical. El HTML y la respuesta de / no incluyen noindex cuando la publicación está aprobada. pages.dev conserva noindex y Disallow.
- http://cimstudio.es y https://www.cimstudio.es redirigen una sola vez hacia HTTPS canonical sin bucles y con certificado válido. Revisar también la URL final real, no solo el estado de DNS.
- /api/subscribe, /api/samples, /api/careers y /api/webhooks/getresponse devuelven 503 en modo informativo.
- Inspeccionar red/cookies/storage del despliegue real y ajustes del panel: las pruebas locales no acreditan todos los servicios que Cloudflare puede activar. No afirmar ausencia global de cookies ni añadir banner sin determinar tecnologías efectivas.
- Confirmar que los MX/TXT de correo siguen intactos y probar envío/recepción de admin@cimstudio.es si se cambiaron nameservers.

## Formularios: preparados, pero no verificados en real

GetResponse: destino/token confirmados, pero faltan campos oficiales de consentimiento, contrato del proxy y autenticación/evento real; ninguna suscripción real autorizada o ejecutada.
Muestras: código existente con validación, honeypot, Turnstile verificado en servidor, limitación y Resend→admin@cimstudio.es. Faltan secretos/configuración real de Resend, remitente verificado, Turnstile para dominio y prueba de entrega autorizada, además de aprobación legal. No configurar DKIM/SPF ni activar envíos sin permiso. Las simulaciones pasan; no se declara operativo.

Esto no bloquea la modalidad informativa. Conectar formularios será un cambio posterior aprobado, sin condicionar el lanzamiento a CIM Production.
