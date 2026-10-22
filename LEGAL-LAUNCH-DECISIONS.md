# Cierre legal público — propuestas pendientes de validación

Estado: documento local de justificación; no aprueba documentos ni activa tratamiento. Decisiones comerciales y de conservación ya aprobadas: no se someten de nuevo a decisión.

## 1. Bases jurídicas y coherencia ES/EN

- Newsletter: artículo 6.1.a RGPD. Finalidad específica: comunicaciones de colección y acceso anticipado; email, idioma y tipo autodeclarado. Casilla independiente, obligatoria, inicialmente desmarcada; baja gratuita y sin perder Fundadores. Doble opt-in verifica control del buzón, no sustituye el texto aceptado. D1 guarda texto, versión, UTC de aceptación e integridad; GetResponse custom consentimiento=aceptado no es su consentimiento nativo.
- Avisos laborales: artículo 6.1.a. Finalidad independiente, solo email e idioma y evidencia técnica. Casilla específica no premarcada, confirmación expresa del buzón, retirada independiente. No es una candidatura con CV ni marketing de productos. Revisión de necesidad cada 12 meses aprobada; supresión sin finalidad válida.
- Muestras: 6.1.b solo cuando la persona pide medidas realmente relacionadas con una posible contratación propia. Para representantes de una entidad, propuesta 6.1.f: responder a la petición profesional que han iniciado y tramitar muestras. No extender 6.1.b automáticamente a cualquier solicitud gratuita. Si no existe conexión precontractual suficiente, evaluar 6.1.f para la propia solicitud. La casilla de contacto no constituye consentimiento a marketing ni debe presentarse como base alternativa confusa. Conservar separadamente la base que corresponda al contexto.
- Ponderación propuesta para muestras: interés concreto en responder a la solicitud; datos necesarios (contacto, estudio, sector y dirección para posible envío), expectativa razonable por petición voluntaria, ausencia de venta de datos o incorporación a newsletter. Salvaguardas: acceso limitado, cifrado D1, no datos sensibles, aviso previo, oposición y revisión, 12 meses desde recepción salvo causa posterior justificada. Riesgo: dirección/contacto usados fuera de la finalidad; limitar destinatarios a gestión y envío. Requiere validación de CIM Studio/revisión jurídica, no aprobación por este documento.
- Antispam: propuesta 6.1.f para disponibilidad y seguridad de los formularios. Necesidad: límites por franja, HMAC de IP sin IP en claro en esas tablas, Turnstile bajo verificación de proporcionalidad; no usar señales para marketing. Impacto: señales de dispositivo/conexión y posibles falsos positivos. Salvaguardas: límites, acceso, identificadores seudonimizados, revisión de conservación, canal admin@cimstudio.es para asistencia. HMAC no anonimiza. Justificar Turnstile frente a alternativas menos intrusivas y determinar aparte el régimen de acceso/almacenamiento en el terminal. Artículo 6.1.f no exime por sí mismo del consentimiento de cookies.

Comprobado en server/settings.js: ES/EN coherentes para los tres fines; casillas independientes y validación del consentimiento en servidor. Muestras autoriza contacto sobre la petición, no newsletter. No se altera el consentimiento aprobado ni la lógica. Pendiente: validar la ponderación y cerrar la redacción final de bases.

## 2. Fundadores: procedimiento mínimo sin automatización

Hechos: soporte comunicó que contact-subscribed tras DOI contiene occurredAt UTC. No están acreditadas su autenticación ni las semánticas exactas para cada origen API. El código mantiene bloqueada la concesión: observaciones API conservan createdOn/changedOn y devuelven confirmationVerified=false y originalConfirmationAt=null. No hay evidencia autenticada disponible en este entorno que pruebe que createdOn sea la confirmación original. Una prueba de recepción/clic verifica el flujo de ese buzón, no demuestra un mecanismo universal de fecha histórica.

Propuesta operativa, sin implementarla ni conceder beneficios:
1. Conservar por separado la aceptación del formulario y su versión; nunca usar esa hora como confirmación.
2. Un responsable de CIM Studio revisa evidencia obtenida de la cuenta GetResponse autenticada o constancia escrita del proveedor que identifique contacto, lista, confirmación efectiva y fecha original con zona horaria. Guardar referencia al justificante en un expediente privado con acceso limitado; no copiar fichas completas.
3. Si no hay fecha original pero una comprobación autenticada acredita inequívocamente que el contacto YA está confirmado antes del límite, se puede proponer revisión manual por prueba temporal: la confirmación ocurrió no más tarde que esa observación. Registrar fecha exacta como desconocida y el instante acreditado de observación por separado, sin inventar confirmed_at. Esta alternativa requiere validar que el estado consultado realmente significa DOI completado para esa lista/origen y aprobar expresamente el criterio manual. No sirve una mera presencia del contacto ni una observación después del límite.
4. Sin prueba suficiente: pendiente de revisión, sin conceder automáticamente ni denegar definitivamente el derecho. Investigar el caso antes de resolver su presupuesto; no sustituir evidencia por una declaración técnica falsa.
5. Registro mínimo manual protegido: email normalizado único, estado pendiente/acreditado, descuento 15 %, referencia y tipo de evidencia, fecha original si conocida, fecha UTC de comprobación, responsable y motivo de decisión. Límite: 2027-01-01T00:00:00 Europe/Madrid, equivalente a 2026-12-31T23:00:00Z. Sin CV/documentación fiscal completa ni historial comercial.
6. La baja cancela marketing, no este expediente. Revisar supresión y minimizar lo conservado conforme a la base validada para gestionar el compromiso. Propuesta 6.1.b para administrar el beneficio ofrecido y aceptado, pendiente de validar su encaje; no invocar consentimiento de newsletter para retenerlo.
7. CIM Studio aplica el descuento al preparar presupuesto. CIM Production será la integración definitiva futura: ninguna transferencia ni automatización activa. Antes de migrar, conciliar duplicados y trasladar evidencia sin inventar fechas.

Bloqueo real: disponer de evidencia de confirmación suficiente y un procedimiento manual aprobado antes de operar públicamente la oferta. No hace falta integrar CIM Production ni autenticar un webhook si una alternativa acreditada y proporcionada lo resuelve.

## 3. Contratos recuperados, sin repetir su revisión

Fuente: confirmaciones expresas del titular registradas en PRIVATE-TEST-NOTICES.md. No afirmamos haber inspeccionado contratos privados de las cuentas.

| Proveedor | Revisión ya comunicada | Únicamente pendiente en cuentas reales |
|---|---|---|
| Cloudflare | DPA revisado; transferencias y subencargados contemplados | Identificar entidad/versión aplicable, alcance Turnstile, ubicación y recuperación/retención efectiva de D1/logs |
| GetResponse | Soporte confirma DPA integrado en términos y SCC UE | Correspondencia de cuenta y términos; configuración DOI/API y evidencia efectiva; retención y tracking reales |
| Resend | DPA descargado/revisado, SCC, tratamiento principal en EEUU | Cuenta/entidad y términos aplicables; retención y apertura/clic efectivos |
| Google Workspace | CDPA aceptada por admin@cimstudio.es el 20/10/2026 | Constancia vinculada a la cuenta y configuración de retención/archivo/holds usados |

No pedir otra aceptación CDPA ni suponer residencia UE o cumplimiento integral. Archivar referencias a contratos y versiones en expediente privado. Los plazos operativos aprobados deben poder aplicarse en buzones y proveedores; las copias retenidas requieren acceso restringido y reaplicar supresiones tras restaurar.

## 4. Tecnologías: evidencia y límite de acceso

Revisión de fuentes: CSP limita scripts a self y challenges.cloudflare.com, sin Analytics/Web Connect/Meta; no se encontraron document.cookie, localStorage o sessionStorage en los JS/HTML de las rutas revisadas. Estado de idioma/formulario en memoria. Tokens laborales en fragmento, retirados de URL y procesados por POST. Turnstile se carga con formularios habilitados; servidor valida token, acción y hostname. Esto no inventaría cookies de infraestructura, configuración de cuenta ni páginas externas.

Configuración comunicada por CIM Studio: Managed, No pre-clearance, hostname privado autorizado. No se deduce exención automática ni ausencia de almacenamiento.

Intento de lectura del entorno privado el 22/10/2026: el proxy de este entorno rechazó el túnel con HTTP 403, también al repetir con permisos ampliados. No se accedió a la página ni al tráfico de navegador real; ese 403 NO es un estado del sitio. Sin credenciales privadas o navegador autenticado, no se ha verificado ejecución remota.

Única comprobación técnica pendiente: sesión autenticada de pruebas, sin enviar formularios, inspeccionar Network y Application/Storage antes/después de abrir cada modal y cargar Turnstile. Registrar solo hosts, tecnologías, finalidad y duración observada/configurada, no tokens ni datos. Comprobar además tracking de Resend/GetResponse y páginas de confirmación. Conservar opcionales desactivadas; si aparecen tecnologías no necesarias, deshabilitarlas o resolver consentimiento antes de habilitarlas. No añadir banner sin necesidad acreditada. Revisar jurídicamente la necesidad técnica cuando haya duda.

## 5. Puertas de salida

Preparar infraestructura pública con formularios desactivados es posible. Activar captación requiere: bases y ponderaciones validadas; mecanismo de evidencia Fundadores operativo/aprobado; correspondencia de contratos y tecnología efectiva comprobadas; aprobación expresa de versión ES/EN. La segmentación GetResponse sigue pendiente de validación real autorizada. No se reabren decisiones comerciales/conservación aprobadas. Sin commit, push, DNS, envíos, borrados o activaciones bajo esta intervención.
