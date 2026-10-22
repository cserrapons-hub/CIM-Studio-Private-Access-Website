# Publicación desde f7c39fb — configuración pendiente de autorización

No se ha realizado ninguna operación remota. La rama privada y sus datos se conservan.
No incluye nuevas funciones, ajustes visuales o activación de bienvenidas.

## Estado y correcciones imprescindibles

- Google Workspace definitivo, admin@cimstudio.es principal. Alias operativos:
  info@cimstudio.es, newsletter@cimstudio.es y pedidos@cimstudio.es. No se cambia el
  destinatario administrativo existente ni el remitente configurado en Resend.
- Domicilio confirmado: Carrer Joan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears.
- legal/content.js sigue approved:false, version vacía; la revisión completa ES/EN
  está en PUBLIC-LEGAL-REVIEW.md. Las aprobaciones privadas no aprueban la publicación.
- server/newsletter-release.js sigue approved:false: su contrato API y versión de
  publicación solo se registrarán tras autorización y validación real suficiente.
- La última prueba de clasificación se detuvo por deduplicación. No se ha probado
  el campo tipo_suscriptor en un alta real. No se debe marcar NEWSLETTER_VERIFIED
  para la nueva clasificación basándose solo en simulaciones o en el DOI anterior.
- Sincronización y concesión automática de Fundadores continúan desactivadas. Antes
  de captar con esa oferta, aprobar un procedimiento mínimo de acreditación y
  conservación independiente de la baja comercial; no confundir solicitud con DOI.

## Cloudflare público: cim-studio-private-access-website / Production

Base: código validado f7c39fb más correcciones documentales imprescindibles.
La promoción a design/private-access-v1 requiere autorización: tiene autodespliegue.
No tocar main, cim-studio-test ni su rama integration/three-forms-2026-10-20.

Compilación: sh scripts/build-preview.sh; salida public; raíz repositorio; preset None.
Recompilar después de la configuración y aprobaciones para generar canonical,
robots y sitemap públicos. No basta con cambiar una variable sobre el artefacto anterior.

Bindings de producción separados de las pruebas, nombres propuestos NO creados:
- FORMS_DB → cim-studio-samples-production.
- CAREERS_DB → cim-studio-careers-production.

Aplicar a bases vacías las migraciones existentes en orden, sin inventar ni modificar
sus esquemas. No hay migraciones nuevas para direcciones o segmentación:
- FORMS_DB: 0001_forms.sql, 0003_getresponse_webhook.sql, 0004_production_outbox.sql,
  0005_registrations.sql, 0006_newsletter_consent.sql, 0007_newsletter_html_deliveries.sql,
  0008_launch_operations.sql, 0009_newsletter_api_deliveries.sql, 0010_newsletter_html404_retry.sql.
- CAREERS_DB: careers/0001_careers.sql, careers/0002_registrations.sql,
  careers/0003_audit_seals.sql.

Conservar los esquemas históricos aunque no se active su recuperación/webhook.
Verificar tablas y PRAGMA quick_check tras una aplicación autorizada. No reutilizar
bases privadas como públicas ni cambiar sus claves para intentar convertirlas.

Secrets requeridos (valores nunca en Git ni en chat):
GETRESPONSE_API_KEY, RESEND_API_KEY, TURNSTILE_SECRET_KEY, AUDIT_HASH_SECRET,
NEWSLETTER_DATA_KEY, SAMPLES_DATA_KEY, CAREERS_DATA_KEY.
Las tres claves de datos se configuran como claves independientes de 32 bytes Base64.
Para bases públicas nuevas, usar sus claves de producción; no rotar claves de bases
que ya contengan datos ni perder la copia segura de ellas.

Variables públicas:
GETRESPONSE_CAMPAIGN_ID=PL6jh
GETRESPONSE_SUBSCRIBER_TYPE_FIELD_ID=njdbT6
NEWSLETTER_PROVIDER=getresponse-api-v3
NEWSLETTER_ORIGIN=https://cimstudio.es
REGISTRATION_ORIGIN=https://cimstudio.es
TURNSTILE_SITE_KEY=<site key real con cimstudio.es autorizado>
MAIL_FROM=<remitente ya verificado en Resend>
REGISTRATION_REVIEW_DAYS=30

Indicadores finales SOLO tras aprobar y verificar, todavía no habilitados:
FORMS_ENABLED, NEWSLETTER_ENABLED, NEWSLETTER_PUBLIC_ENABLED, SAMPLES_ENABLED,
CAREERS_ENABLED, FORMS_VERIFIED, NEWSLETTER_VERIFIED, SAMPLES_VERIFIED,
CAREERS_VERIFIED, MAIL_RECEIPTS_VERIFIED, REGISTRATIONS_STORAGE_REVIEWED,
NEWSLETTER_EVIDENCE_REVIEWED y SITE_LIVE → true.

En público, mantener false:
CONTROLLED_TEST_MODE, REGISTRATIONS_TEST_ENABLED, NEWSLETTER_PREPARATION_ENABLED,
NEWSLETTER_CONTROLLED_SEND_ENABLED, NEWSLETTER_OBSERVATIONS_ENABLED,
NEWSLETTER_HTML404_RETRY_ENABLED, NEWSLETTER_TEST_LEGAL_APPROVED,
SAMPLES_TEST_LEGAL_APPROVED, CAREERS_TEST_LEGAL_APPROVED, CONTROLLED_REVIEW_ENABLED,
NEWSLETTER_API_REVIEWED, MAIL_WORKER_ENABLED, GETRESPONSE_WEBHOOK_ENABLED,
GETRESPONSE_WEBHOOK_GRANTS_ENABLED, CIM_PRODUCTION_DELIVERY_ENABLED.

No se necesitan credenciales Basic ni Secrets de allowlist en producción pública.
No hacen falta GETRESPONSE_CAREERS_CAMPAIGN_ID ni GR_CONSENT_* del adaptador histórico.
Los handlers públicos actuales usan GetResponse para newsletter y Resend/D1 para
muestras y candidaturas. El envío inmediato no depende del worker programado.
La ruta pública /careers/preferences/ confirma con token y acción explícita,
sin usuario/contraseña; /controlled/* permanece inaccesible en modo público.
La página /bienvenida/ nunca concede Fundadores.

## GoDaddy y dominio raíz: ejecución manual autorizada aparte

Si GoDaddy mantiene el DNS autoritativo, cimstudio.es como dominio raíz de Pages
requiere dar de alta la zona en Cloudflare y delegar sus nameservers. GoDaddy
puede seguir siendo el registrador. No inventar un CNAME en @ o direcciones A.

1. Exportar y conservar la zona actual y comprobar nameservers/DNSSEC vigentes.
2. Dar de alta la zona en Cloudflare y cotejar TODOS los registros importados,
   especialmente MX, SPF, DKIM, DMARC, verificaciones y servicios de Google Workspace.
   Mantener intactos sus valores y comportamiento DNS-only cuando corresponda.
   No confiar en que el escaneo automático haya importado todo.
3. Solo tras autorizar y comprobar esa copia, cambiar en GoDaddy los nameservers
   por los dos asignados por Cloudflare. Si DNSSEC está activo, seguir el proceso
   de cambio de proveedor/DS indicado por ambos paneles; nunca dejar un DS antiguo
   incompatible con la nueva zona. No cambiar MX/SPF/DKIM/DMARC.
4. Pages → proyecto público → Custom domains → añadir cimstudio.es y www.cimstudio.es.
   Seguir los registros web exactos ofrecidos por el panel, sin tocar los de correo.
5. Esperar Active/HTTPS válido para ambos; configurar redirección www → cimstudio.es
   preservando ruta y parámetros. Canonical público: https://cimstudio.es/.
6. Verificar HTTPS/redirecciones, ausencia de Basic, /api/config con los tres
   enabled, enlaces legales, formularios, carrera/preferences y robots/sitemap.
   No enviar datos reales sin autorización adicional de prueba pública.

Si no se autoriza delegar la zona, detener el paso del dominio raíz y acordar una
alternativa www con DNS externo; no prometer que @ funcionará mediante un CNAME.

## Reversión

Ante fallos, desactivar captación mediante FORMS_ENABLED=false y redesplegar; la
newsletter tiene además NEWSLETTER_PUBLIC_ENABLED=false. SITE_LIVE=false impide
considerar la versión como publicada. No borrar D1 ni reenviar resultados inciertos.
Restaurar el deployment/código anterior si procede. No cambiar nameservers ni
registros de correo como respuesta automática a un error de formulario.

## Actualización documental aprobada (sin activación)

- Fundadores: 15 % adicional sobre Precio Profesional vigente, también en proyectos personalizados; la baja comercial no elimina el derecho. CIM Studio aplicará el descuento al preparar el presupuesto. CIM Production sigue sin integración activa y no bloquea por sí mismo el lanzamiento.
- Verificación profesional: primero web del estudio, presencia pública o información empresarial; documentación solo cuando no baste.
- Muestras: 12 meses desde recepción salvo relación comercial posterior u otra causa legal. Oportunidades laborales: revisión de necesidad cada 12 meses y supresión cuando no exista finalidad válida. Newsletter: consentimiento válido y evidencia mínima posterior justificada. Fundadores: acreditación mínima separada.
- REGISTRATION_REVIEW_DAYS es una revisión técnica del registro, no un plazo de conservación ni una aprobación legal. La configuración pública deberá reflejar el procedimiento anual aprobado sin extender datos carentes de finalidad; no se ha cambiado ninguna variable.
- Antes de captar: aprobación final de documentos y bases jurídicas pendientes, procedimiento mínimo verificable de confirmación Fundadores y conservación, comprobación real de segmentación, preparación de D1/secretos/Turnstile públicos y verificación de tecnologías efectivas. No repetir revisiones contractuales ya realizadas: comprobar su correspondencia con las cuentas usadas.
