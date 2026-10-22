# Preparación pública sin publicación ni captación

## Estado que consta y límite de acceso

Proyecto público existente según comprobaciones expresas del titular: cim-studio-private-access-website, Production branch design/private-access-v1 y Preview branch None. Privado independiente: cim-studio-test. No crear un proyecto duplicado. Esta sesión no dispone de API/credenciales Cloudflare para verificar el estado actual de la cuenta; ninguna afirmación de comprobación remota nueva.

La base pública es 632350b. La incorporación de la aprobación legal es local, sin commit, push ni despliegue bajo esta intervención. Las fotografías, composición y traducciones comerciales no cambian. Documentos ES/EN y consentimientos expresamente aprobados: approved:true, versión public-legal-2026-10-22-v1. Los tres botones de envío están deshabilitados hasta recibir configuración explícita habilitada del servidor; texto ES/EN de no disponibilidad sin simular éxito. APIs conservan bloqueos legales y de configuración. Abrir modal no debe cargar Turnstile con formularios deshabilitados. La compilación conserva noindex y no se declara lanzamiento/SEO completado.

## Acciones en cuenta, sin publicar

1. Cloudflare → Workers & Pages → cim-studio-private-access-website. Si existe, usarlo. Si no aparece, detenerse y confirmar cuenta/proyecto antes de crear otro.
2. Guardar referencia del deployment actual y comprobar dominios personalizados existentes; no retirarlos ni añadir dominios todavía. Si ya existe un dominio público conectado, no provocar un deployment accidental.
3. Settings → Builds & deployments: comprobar repositorio cserrapons-hub/CIM-Studio-Private-Access-Website, Production branch design/private-access-v1 y Preview branch None. Deshabilitar despliegues automáticos antes de preparar cambios si fuera necesario; no usar Deploy/Retry/Sync. No cambiar a la rama privada.
4. Registrar configuración de compilación: Framework preset None, build command sh scripts/build-preview.sh, output public, root del repositorio (vacío o / según el panel). Guardar no equivale a desplegar; si el panel propone desplegar, cancelar. No marcar SITE_LIVE ni aprobaciones como true.
5. En Production, mantener los siguientes indicadores en false. Si modificarlos exige un deployment, guardar solo sin iniciarlo; cambios pendientes no alteran el deployment anterior:

CONTROLLED_TEST_MODE=false
SITE_LIVE=false
FORMS_ENABLED=false
FORMS_VERIFIED=false
NEWSLETTER_ENABLED=false
NEWSLETTER_PUBLIC_ENABLED=false
NEWSLETTER_VERIFIED=false
SAMPLES_ENABLED=false
SAMPLES_VERIFIED=false
CAREERS_ENABLED=false
CAREERS_VERIFIED=false
MAIL_RECEIPTS_VERIFIED=false
REGISTRATIONS_STORAGE_REVIEWED=false
NEWSLETTER_EVIDENCE_REVIEWED=false
REGISTRATIONS_TEST_ENABLED=false
NEWSLETTER_PREPARATION_ENABLED=false
NEWSLETTER_CONTROLLED_SEND_ENABLED=false
NEWSLETTER_OBSERVATIONS_ENABLED=false
NEWSLETTER_HTML404_RETRY_ENABLED=false
NEWSLETTER_API_REVIEWED=false
NEWSLETTER_TEST_LEGAL_APPROVED=false
SAMPLES_TEST_LEGAL_APPROVED=false
CAREERS_TEST_LEGAL_APPROVED=false
CONTROLLED_REVIEW_ENABLED=false
MAIL_WORKER_ENABLED=false
GETRESPONSE_WEBHOOK_ENABLED=false
GETRESPONSE_WEBHOOK_GRANTS_ENABLED=false
CIM_PRODUCTION_DELIVERY_ENABLED=false

No copiar Basic Auth, allowlist, claves de cifrado ni bindings de pruebas. No borrar/rotar secretos existentes. Para esta preparación sin captación no es necesario crear D1, aplicar migraciones o configurar proveedores/secretos de envío; se completará antes de habilitar formularios, por autorización separada.

## Dominio y HTTPS: preparar, no ejecutar

6. GoDaddy → cimstudio.es → DNS: exportar la zona completa y anotar nameservers actuales, DNSSEC/DS y todos los registros, incluidos MX, SPF/TXT, cada selector DKIM/CNAME/TXT, DMARC, verificaciones, GetResponse y Resend. No compartir secretos o exportaciones completas en repositorio. Comparar también subdominios y CAA si existen. No cambiar registros ni nombres de servidor.
7. Cloudflare → Websites: comprobar si cimstudio.es ya está incorporado/activo y si la cuenta es correcta. Si no existe, registrar que falta la zona; no completar una conexión que modifique DNS. Si existe, cotejar zona contra exportación sin editar. Un escaneo DNS no garantiza haber copiado todos los selectores o verificaciones.
8. Para el futuro apex cimstudio.es, Pages requiere zona Cloudflare y nameservers delegados; GoDaddy puede seguir como registrador. No inventar CNAME en @ ni IP. La eventual delegación exige copia íntegra verificada de la zona y tratamiento correcto de DNSSEC/DS; se autorizará aparte. Mantener valores de correo idénticos y DNS-only donde corresponda.
9. Solo tras autorización posterior: promover versión a rama pública, desplegar con captación deshabilitada, añadir cimstudio.es y www en Custom domains y seguir registros indicados por Cloudflare. Verificar certificados Active/HTTPS, CAA si bloquea emisión y redirección www→apex conservando ruta y consulta. No hay HTTPS del dominio acreditado antes de asociarlo y validar DNS. No habilitar HSTS/preload como requisito de lanzamiento.

## Comprobaciones tras un futuro deployment autorizado

/api/config: enabled.subscribe/samples/careers false, siteKey null, siteLive false y legal con los documentos aprobados. Página sin Basic cuando CONTROLLED_TEST_MODE=false; /controlled/* bloqueado. ES/EN con no disponibilidad, botones de envío deshabilitados, borradores legales identificados, ningún POST proveedor/D1 por interacción con formularios. Noindex permanece hasta decisión de publicación/indexación. La aprobación legal y pruebas necesarias preceden a cualquier captación real.

No ejecutado: commit/push, deployment, configuración remota, DNS, migración, envío o aprobación. La web pública existente no ha sido modificada.
