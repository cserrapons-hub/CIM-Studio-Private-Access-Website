// Draft for express owner/legal review. Never enable forms by merely filling these texts.
// Commercial terms are included in the existing legal-notice dialog; no new UI is required.
const business = {
  name: 'CIM STUDIO ESPJ',
  taxId: 'E88749155',
  postalAddress: 'C/ Juan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears, España.',
  privacyEmail: 'info@cimstudio.es'
};

const termsEs = `CONDICIONES COMERCIALES — TARIFA FUNDADORES Y PRECIO PROFESIONAL

La Tarifa Fundadores corresponde a todas las personas que confirmen su suscripción hasta el 31 de diciembre de 2026 inclusive. No existe límite de plazas. La fecha determinante es la confirmación efectiva de la suscripción, no el envío del formulario ni la aceptación de la solicitud por la API de GetResponse. El criterio horario de cierre debe validarse antes de la activación.

El beneficio es un 15 % de descuento permanente en la compra de piezas de colección y en encargos a medida. Para particulares, se aplica un 15 % sobre el precio de venta al público (PVP). Para profesionales verificados, se aplica un 15 % adicional sobre el Precio Profesional: el importe resultante es el Precio Profesional multiplicado por 0,85. Es compatible con el Precio Profesional, pero no acumulable con otras promociones.

El acceso al Precio Profesional está dirigido a interioristas, arquitectos, hoteles, hostelería, tiendas, distribuidores y profesionales relacionados. CIM Studio verificará personalmente la actividad antes de concederlo. Para comprobarla podrá solicitar por email un certificado de situación censal, un modelo 036 con los datos innecesarios ocultos o un documento equivalente. No es necesario aportar todos estos documentos: solo la acreditación pertinente solicitada. La información ajena a la comprobación de la actividad debe ocultarse.

El derecho a la Tarifa Fundadores depende de la fecha de confirmación de suscripción, no de la fecha de verificación profesional. Una verificación posterior al 31 de diciembre de 2026 no excluye a quien hubiera confirmado su suscripción dentro del plazo. La etiqueta interna de Fundadores sirve para gestionar el beneficio; debe corresponder a una confirmación comprobada y no sustituye esa prueba.

La suscripción es voluntaria. Se puede retirar el consentimiento para recibir comunicaciones sin coste. No se establece aquí que la baja de comunicaciones haga perder un beneficio permanente ya adquirido. La forma de conservar una acreditación mínima de ese derecho tras una baja debe concretarse en el procedimiento de privacidad.

Esta portada y sus formularios permiten solicitar información, acceso y muestras; no son un proceso de compra ni formalizan por sí solos un encargo. Antes de contratar, CIM Studio deberá facilitar el presupuesto y las condiciones de venta aplicables, incluidos impuestos, gastos, pago, entrega y derechos legalmente exigibles. Estas condiciones de Fundadores no sustituyen esa información ni limitan los derechos imperativos de consumidores. Las condiciones de venta, la operativa de aplicación del descuento y los criterios concretos de acceso al Precio Profesional requieren revisión antes de aceptar pedidos. No se promete aquí un importe de Precio Profesional, una entrega gratuita de muestras ni un plazo de fabricación o envío.`;

const termsEn = `COMMERCIAL TERMS — FOUNDERS RATE AND PROFESSIONAL PRICING

The Founders Rate is available to everyone who confirms their subscription on or before December 31, 2026. There is no limit on places. Eligibility is determined by the effective subscription confirmation date, not by submission of the form or acceptance of a request by the GetResponse API. The time zone used for the closing deadline must be validated before activation.

The benefit is a permanent 15% discount on collection pieces and bespoke commissions. For private customers, this is 15% off the retail price. For verified professionals, it is an additional 15% off the Professional Price: the resulting amount is the Professional Price multiplied by 0.85. It can be combined with Professional Pricing, but not with other promotions.

Professional Pricing is intended for interior designers, architects, hotels, hospitality businesses, shops, distributors and related professionals. CIM Studio will personally verify professional activity before granting access. It may request by email a Spanish certificate of tax registration status, a Modelo 036 tax registration form with unnecessary information concealed, or an equivalent document. Applicants need only provide the relevant evidence requested, rather than all these documents. Information unrelated to verification of professional activity should be concealed.

Entitlement to the Founders Rate depends on the subscription confirmation date, not the date of professional verification. Verification after December 31, 2026 does not exclude someone whose subscription was confirmed within the qualifying period. The internal Founders tag helps administer the benefit; it must reflect a verified confirmation and does not replace evidence of it.

Subscription is voluntary. Consent to receive communications may be withdrawn free of charge. These terms do not make withdrawal of marketing consent a reason to remove a permanent benefit already acquired. The procedure for retaining minimal evidence of that entitlement after withdrawal must be finalised as part of the privacy arrangements.

This website and its forms allow visitors to request information, access and samples; they are not a checkout and do not in themselves conclude a commission. Before a purchase, CIM Studio must provide the quotation and applicable sale terms, including taxes, charges, payment, delivery and statutory rights. These Founders terms do not replace that information or restrict mandatory consumer rights. Sale terms, the practical application of the discount and the specific criteria for Professional Pricing require review before orders are accepted. No Professional Price amount, free sample delivery or manufacturing or dispatch period is promised here.`;

export default {
  approved: false,
  version: '', // Assign an actual approved version only after express review.
  business,
  // Internal review notes are not returned by /api/config.
  pendingReview: [
    'Validate legal bases, professional-verification necessity and legitimate-interest assessments where applicable.',
    'Adopt retention/deletion criteria and procedures for each store, including minimal Founders evidence after marketing withdrawal and deletion of verification documents.',
    'Verify contracting entities, processing agreements, locations, subprocessors and international-transfer safeguards for Cloudflare, GetResponse, Resend and Microsoft 365.',
    'Audit the deployed Turnstile configuration, browser technologies and email tracking; determine any consent requirements before enabling non-essential technologies.',
    'Validate Europe/Madrid as the inclusive deadline time zone; configure evidence of confirmed subscriptions and the Founders entitlement process.',
    'Finalise Professional Pricing criteria, discount administration and full sale/sample terms; confirm any legally required registration, consumer-information and dispute-resolution details.',
    'Review both languages, remove outstanding drafting qualifications, assign the approved version and expressly approve; keep forms disabled until then.'
  ],
  es: {
    notice: `AVISO LEGAL

Titular del sitio: CIM STUDIO ESPJ. NIF: E88749155.
Domicilio: C/ Juan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears, España.
Contacto y privacidad: info@cimstudio.es.

CIM Studio presenta su trabajo de diseño y cerámica artesanal y permite solicitar acceso a comunicaciones de la colección y muestras para proyectos profesionales. El envío de un formulario no constituye una compra ni garantiza la concesión de Precio Profesional. Los datos registrales o autorizaciones adicionales que resulten legalmente exigibles deben comprobarse antes de la publicación definitiva; no se han facilitado datos registrales para incorporarlos.

Los contenidos, fotografías, identidad visual y diseños están sujetos a los derechos de sus respectivos titulares. Su presencia en el sitio no concede una licencia de explotación; cualquier uso debe contar con autorización o amparo legal. El usuario debe utilizar el sitio de forma lícita, sin suplantar a terceros ni interferir en su seguridad.

La información comercial deberá concretarse en cada propuesta o contratación. Los enlaces a servicios de terceros se rigen también por la información y condiciones de esos servicios. Nada de este aviso excluye responsabilidades o derechos que no puedan excluirse por ley. La aplicación de la legislación española se entiende sin perjuicio de las normas imperativas y de la protección que corresponda al consumidor. No se impone un fuero exclusivo que limite sus derechos.

Las consultas pueden dirigirse a info@cimstudio.es. Deben completarse, cuando correspondan, los datos sobre mecanismos de resolución de reclamaciones y obligaciones específicas de contratación antes de aceptar ventas.

${termsEs}`,
    terms: termsEs,
    privacy: `POLÍTICA DE PRIVACIDAD

1. Responsable y alcance
CIM STUDIO ESPJ, NIF E88749155, con domicilio en C/ Juan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears, España, es responsable de los tratamientos descritos. Contacto para privacidad y ejercicio de derechos: info@cimstudio.es. No se identifica un delegado de protección de datos porque no se ha confirmado su designación.

Esta política describe el funcionamiento preparado para los formularios y su activación posterior. Mientras la configuración mantenga los formularios deshabilitados, estos son demostraciones y no envían los datos introducidos. El alojamiento puede tratar datos técnicos de navegación incluso en modo de demostración. La activación de pruebas conectadas se indicará expresamente: en esa modalidad sí se envían datos de prueba a los proveedores.

2. Acceso al Universo CIM Studio
Con el consentimiento de la casilla del formulario, tratamos el email y el idioma para gestionar la suscripción y enviar novedades de la colección y acceso anticipado a nuevas piezas. La base jurídica de estas comunicaciones es el consentimiento (artículo 6.1.a del RGPD). Puede retirarse en cualquier momento mediante el mecanismo de baja de los mensajes o escribiendo al contacto de privacidad, sin afectar a la licitud del tratamiento previo. Solicitar muestras no suscribe a estas comunicaciones.

GetResponse recibe el email, la lista de destino, el idioma y la evidencia de consentimiento: fecha de solicitud, versión de la información aceptada y texto de la casilla. La petición aceptada por su API no equivale a una suscripción confirmada. El procedimiento de confirmación y la fecha efectiva deben comprobarse en la cuenta antes de conceder Fundadores. Se comprueban contactos existentes para evitar altas duplicadas; no se sobrescribe automáticamente su estado ni se reactiva una baja por el mero reenvío del formulario.

3. Muestras, proyectos y contacto profesional
Tratamos nombre, email profesional, estudio o empresa, profesión y descripción del proyecto para atender la solicitud, valorar sus necesidades y responder. La casilla autoriza el contacto relativo a esa solicitud, no marketing independiente. La gestión de medidas precontractuales solicitadas por la propia persona puede ampararse en el artículo 6.1.b del RGPD; para contactos que actúan por una entidad, la base propuesta es el interés legítimo en atender su petición profesional (artículo 6.1.f), sujeto a validar y documentar su ponderación. La base concreta y la información de la casilla deben revisarse conjuntamente antes de activar el formulario.

No incluya datos sensibles, documentos fiscales ni información de terceros innecesaria en el campo de proyecto. Los campos obligatorios permiten tramitar la petición; sin ellos o sin la aceptación requerida, el formulario no se envía. Resend transmite la solicitud a pedidos@cimstudio.es, con los datos del formulario y la evidencia de aceptación; el email del solicitante se utiliza para responder. La gestión de este buzón se realiza en Microsoft 365. La aceptación por Resend no acredita por sí sola la entrega del mensaje.

4. Verificación profesional y Fundadores
Antes de conceder Precio Profesional, CIM Studio verificará personalmente la actividad de interioristas, arquitectos, hoteles, hostelería, tiendas, distribuidores y profesionales relacionados. Podrá solicitar por email un certificado de situación censal, un modelo 036 con los datos innecesarios ocultos o un documento equivalente. La finalidad es comprobar la vinculación y actividad profesional pertinentes para el acceso a esa tarifa, no recopilar un expediente fiscal completo.

Solo se solicitará evidencia adecuada y necesaria. Deben ocultarse datos ajenos a la comprobación, especialmente información económica, identificadores y datos personales que no sean necesarios para acreditar la actividad y su relación con el solicitante. No se solicitan estos documentos mediante los formularios actuales. Se revisarán por personal autorizado y no se incorporarán a las listas de marketing. La base propuesta es la gestión precontractual de la tarifa solicitada para el propio profesional o, si actúa por una entidad, el interés legítimo en verificar esa condición; su necesidad y ponderación deben validarse antes de solicitar documentos.

La fecha de confirmación de suscripción, y no la verificación profesional, determina el derecho a Fundadores. Para gestionar el descuento permanente será necesario conservar una acreditación mínima de la elegibilidad, separada de la finalidad de enviar publicidad. Su base jurídica y el procedimiento de conservación después de una baja deben aprobarse; no se condiciona la posibilidad de retirar el consentimiento publicitario.

5. Seguridad y evidencia
Cloudflare aloja la web, ejecuta Pages Functions y Turnstile para verificar solicitudes y presta la base de datos D1. La protección frente al abuso trata datos técnicos de conexión y señales del navegador; el servidor comprueba el token, hostname y acción de Turnstile. No se envía expresamente el campo de IP del visitante a la API de verificación, lo que no impide que Cloudflare trate datos de conexión al prestar sus servicios.

D1 conserva identificadores seudonimizados derivados del email, una huella de la solicitud, estado, fecha, versión y texto de consentimiento, idioma e identificador del proveedor cuando exista. No conserva el email en claro ni el texto del proyecto. La limitación de solicitudes utiliza un identificador derivado de la IP y la hora; no guarda la IP en claro en esas tablas. Estos identificadores siguen siendo datos personales seudonimizados, no anónimos. La prevención del abuso y la conservación de pruebas se proponen sobre el interés legítimo en proteger el servicio y acreditar solicitudes; la ponderación y la duración deben documentarse. No se adoptan decisiones automatizadas con efectos jurídicos ni se concede automáticamente Precio Profesional. Turnstile puede impedir un envío ante una verificación fallida; puede contactar por email si necesita asistencia.

6. Destinatarios y transferencias
Intervienen Cloudflare (alojamiento, Functions, D1 y Turnstile), GetResponse (suscripciones y comunicaciones), Resend (envío de solicitudes) y Microsoft 365 (correo y gestión de respuestas y documentación profesional), además del personal autorizado de CIM Studio. Cada proveedor recibe los datos necesarios para su función, no todos los datos de todos los formularios. Podrán comunicarse datos cuando exista una obligación legal aplicable.

Deben verificarse en los contratos reales las entidades contratantes, el papel de cada proveedor, sus encargos de tratamiento, subencargados y ubicaciones. Puede existir tratamiento fuera del Espacio Económico Europeo. Las garantías concretas, como una decisión de adecuación o cláusulas contractuales tipo cuando correspondan, y el modo de obtener información sobre ellas deben completarse tras esa comprobación. No se afirma que todo el tratamiento tenga lugar en la UE ni que un proveedor concreto esté cubierto por una garantía no verificada. Esta revisión es requisito previo a la activación.

7. Conservación y supresión
Las comunicaciones se gestionarán mientras exista consentimiento; una baja exige cesar el marketing y mantener solo los datos mínimos necesarios para respetarla y justificar actuaciones cuando exista base legal. Las solicitudes de muestras se conservarán durante su tramitación y el seguimiento necesario; una contratación posterior exigirá la conservación legal correspondiente a esa relación. Deben fijarse y documentarse los criterios concretos de revisión y borrado en GetResponse, Resend, D1, Microsoft 365 y los registros técnicos del alojamiento; no se establece un número de años sin una justificación verificada.

Para los documentos de verificación profesional, el criterio propuesto es limitar el acceso al personal que comprueba la actividad, registrar únicamente el resultado y la evidencia mínima necesaria y suprimir las copias completas cuando concluya la verificación y dejen de ser necesarias para resolver incidencias o cumplir una obligación aplicable. La retención por defecto del buzón no debe sustituir este procedimiento. La decisión final sobre el momento de borrado, responsables, copias y posibles bloqueos por obligaciones o reclamaciones está pendiente de aprobación antes de solicitar documentación.

Las pruebas de consentimiento y de derecho al descuento requieren un criterio propio y proporcionado; no se fija una conservación indefinida de todos los datos por el carácter permanente del beneficio. Los contadores de frecuencia tienen una ventana horaria y los vencidos se limpian al recibir nuevas solicitudes; no existe una tarea programada que garantice su borrado inmediato al vencer. La supresión de evidencias y solicitudes no está automatizada todavía. Debe aprobarse un procedimiento que contemple también las condiciones de conservación y borrado de los proveedores.

8. Derechos y reclamaciones
Puede solicitar acceso, rectificación, supresión, limitación, oposición y portabilidad cuando procedan, y retirar el consentimiento, escribiendo a info@cimstudio.es. Solo se solicitará información adicional para comprobar identidad cuando sea necesaria y proporcionada. También puede reclamar ante la Agencia Española de Protección de Datos (https://www.aepd.es). La baja de publicidad no impide ejercer otros derechos ni autoriza conservar información innecesaria. Las revisiones pendientes indicadas en este borrador deberán resolverse antes de su aprobación y de habilitar tratamientos reales.`,
    cookies: `POLÍTICA DE COOKIES Y TECNOLOGÍAS

Responsable: CIM STUDIO ESPJ, NIF E88749155. Contacto: info@cimstudio.es. Domicilio: C/ Juan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears, España.

El código de esta web no incorpora analítica publicitaria ni utiliza cookies propias, localStorage o sessionStorage para guardar preferencias o datos de los formularios. El idioma y el estado del formulario se mantienen en memoria durante la visita. Esta descripción del código no significa que los servicios de alojamiento o seguridad no traten datos técnicos o no puedan utilizar tecnologías del navegador.

Al habilitar los formularios, Turnstile de Cloudflare se carga para comprobar solicitudes y prevenir envíos abusivos. La verificación puede implicar señales del navegador, datos de conexión y tecnologías técnicas del proveedor. La configuración real del widget, incluidas posibles opciones de preautorización y almacenamiento, debe auditarse en el despliegue. No se afirma que se instale una cookie concreta ni se atribuyen nombres, duraciones o garantías que no se hayan comprobado. En la configuración de demostración deshabilitada no se solicita cargar el widget de Turnstile.

GetResponse y Resend se invocan desde el servidor, no mediante un script de seguimiento instalado en esta página. Microsoft 365 recibe el correo de solicitudes. Deben verificarse por separado las opciones de seguimiento de aperturas y clics de las comunicaciones enviadas y su información y base jurídica antes de utilizarlas. No se ha incorporado un píxel de marketing a esta portada.

Antes de activar servicios deben inventariarse las tecnologías realmente observadas, su proveedor, finalidad, duración y carácter propio o de tercero. Si se utilizan tecnologías no exentas del consentimiento, deberán permanecer bloqueadas hasta obtenerlo y ofrecerse mecanismos de rechazo y retirada con la información correspondiente. No hay actualmente un gestor de consentimiento para tecnologías opcionales; no deben añadirse ni activarse sin resolver este punto. La calificación de necesidad técnica de Turnstile debe validarse en función de su configuración efectiva.

Puede revisar o eliminar almacenamiento del sitio mediante los ajustes de su navegador; bloquear recursos técnicos puede impedir la verificación o el envío. Para cuestiones de privacidad o asistencia: info@cimstudio.es. El tratamiento de datos personales y sus derechos se describen en la política de privacidad. El inventario y las decisiones pendientes deben completarse antes de aprobar esta política.`
  },
  en: {
    notice: `LEGAL NOTICE

Website operator: CIM STUDIO ESPJ. Spanish tax identification number (NIF): E88749155.
Address: C/ Juan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears, España.
Contact and privacy enquiries: info@cimstudio.es.

CIM Studio presents its design and handcrafted ceramics and allows visitors to request collection communications and samples for professional projects. Submitting a form does not constitute a purchase or guarantee access to Professional Pricing. Any additional registration or authorisation details required by law must be checked before the final publication; no registration details have been supplied for inclusion.

The content, photographs, visual identity and designs are subject to their respective holders’ rights. Their presence on this website does not grant a licence to exploit them; any use requires authorisation or a lawful basis. Visitors must use the website lawfully, without impersonating others or interfering with its security.

Commercial information must be confirmed in each proposal or contract. Links to third-party services are also subject to those services’ own information and terms. Nothing in this notice excludes liabilities or rights that cannot lawfully be excluded. Spanish law applies without prejudice to mandatory rules and the protection available to consumers. No exclusive jurisdiction is imposed that would restrict their rights.

Enquiries may be sent to info@cimstudio.es. Where applicable, information on complaint resolution and specific contracting obligations must be completed before sales are accepted.

${termsEn}`,
    terms: termsEn,
    privacy: `PRIVACY POLICY

1. Controller and scope
CIM STUDIO ESPJ, NIF E88749155, at C/ Juan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears, España, is the controller for the processing described here. For privacy enquiries and rights requests, contact info@cimstudio.es. No data protection officer is identified because an appointment has not been confirmed.

This policy describes the prepared form integrations and their subsequent activation. While the forms remain disabled in the configuration, they are demonstrations and do not send the details entered. Hosting may process technical browsing data even in demonstration mode. Connected testing will be expressly identified: in that mode, real test data is sent to providers.

2. Access to the CIM Studio Universe
With the consent given through the form checkbox, we process your email and language to manage your subscription and send collection news and early access to new pieces. These communications rely on consent (Article 6(1)(a) GDPR). You may withdraw it at any time through the unsubscribe mechanism in messages or by contacting our privacy address, without affecting the lawfulness of earlier processing. Requesting samples does not subscribe you to these communications.

GetResponse receives your email, destination list, language and consent evidence: request timestamp, information version and checkbox wording. Acceptance by its API is not a confirmed subscription. The confirmation process and effective date must be checked in the account before the Founders benefit is granted. Existing contacts are checked to avoid duplicate subscriptions; their status is not automatically overwritten and submitting the form again does not in itself reactivate an unsubscribed contact.

3. Samples, projects and professional enquiries
We process your name, professional email, studio or company, profession and project description to handle your enquiry, assess your needs and respond. The checkbox authorises contact about that enquiry, not separate marketing. Taking steps at an individual’s own request before entering a contract may rely on Article 6(1)(b) GDPR; for contacts acting for an organisation, the proposed basis is the legitimate interest in responding to their professional enquiry (Article 6(1)(f)), subject to validating and documenting the balancing assessment. The specific basis and checkbox information must be reviewed together before activation.

Do not include sensitive data, tax documents or unnecessary third-party information in the project field. Required fields enable us to handle the enquiry; the form cannot be sent without them or the required acceptance. Resend transmits the enquiry to pedidos@cimstudio.es, including the form details and acceptance evidence; the applicant’s email is used for replies. This mailbox is managed through Microsoft 365. Resend’s acceptance alone does not establish delivery.

4. Professional verification and the Founders benefit
CIM Studio will personally verify the activity of interior designers, architects, hotels, hospitality businesses, shops, distributors and related professionals before granting Professional Pricing. It may request by email a Spanish certificate of tax registration status, a Modelo 036 tax registration form with unnecessary information concealed, or an equivalent document. The purpose is to verify the relevant professional connection and activity for access to that pricing, rather than to collect a complete tax file.

Only suitable and necessary evidence will be requested. Information unrelated to verification should be concealed, especially financial information, identifiers and personal details not needed to establish the activity and the applicant’s connection to it. These documents are not requested through the current forms. They will be reviewed by authorised personnel and will not be added to marketing lists. The proposed basis is precontractual administration of the pricing requested by the professional personally or, when acting for an organisation, the legitimate interest in verifying that status; necessity and the balancing assessment must be validated before requesting documents.

The subscription confirmation date, rather than professional verification, determines Founders eligibility. Administering the permanent discount requires minimal evidence of entitlement, kept separate from the purpose of sending advertising. Its legal basis and retention procedure after unsubscribe must be approved; the right to withdraw marketing consent is not made conditional on this.

5. Security and evidence
Cloudflare hosts the website, runs Pages Functions and Turnstile for request verification, and provides the D1 database. Abuse prevention processes technical connection data and browser signals; the server checks the Turnstile token, hostname and action. The visitor’s IP field is not expressly sent to the verification API, although Cloudflare may still process connection data when providing its services.

D1 retains pseudonymous identifiers derived from the email, a request fingerprint, status, timestamp, consent version and wording, language and a provider identifier where available. It does not retain the email in plain text or the project description. Request limiting uses an identifier derived from the IP address and the hour; it does not store the plain IP in those tables. These identifiers remain pseudonymous personal data, not anonymous data. Abuse prevention and retention of evidence are proposed on the basis of legitimate interests in protecting the service and evidencing requests; the balancing assessment and retention criteria must be documented. No automated decisions with legal effects are made and Professional Pricing is not granted automatically. Turnstile may block submission when verification fails; you may contact us by email for assistance.

6. Recipients and international transfers
Services involved are Cloudflare (hosting, Functions, D1 and Turnstile), GetResponse (subscriptions and communications), Resend (transmitting enquiries) and Microsoft 365 (email, replies and professional documentation), alongside authorised CIM Studio personnel. Each provider receives the information needed for its role, rather than all data from every form. Information may also be disclosed where required by an applicable legal obligation.

The actual contracts must be checked for contracting entities, each provider’s role, processing agreements, subprocessors and locations. Processing outside the European Economic Area may occur. Specific safeguards, such as an adequacy decision or standard contractual clauses where applicable, and how to obtain information about them must be completed after that review. We do not state that all processing takes place in the EU or that any particular provider is covered by an unverified safeguard. This review is required before activation.

7. Retention and deletion
Communications will be managed while consent remains valid; an unsubscribe requires marketing to stop, retaining only the minimum information needed to respect the withdrawal and justify actions where a lawful basis exists. Sample enquiries will be retained while handled and for necessary follow-up; a subsequent contract will require the lawful retention applicable to that relationship. Specific review and deletion criteria must be established and documented for GetResponse, Resend, D1, Microsoft 365 and hosting technical records; no number of years is stipulated without verified justification.

For professional verification documents, the proposed approach is to restrict access to those verifying activity, record only the outcome and minimum necessary evidence, and delete full copies once verification is complete and they are no longer needed to resolve issues or meet an applicable obligation. Default mailbox retention must not substitute for this procedure. The final decision on deletion timing, responsible personnel, copies and any restriction on deletion for obligations or claims remains subject to approval before documentation is requested.

Consent evidence and discount entitlement require their own proportionate retention criteria; the permanent benefit does not justify indefinite retention of all information. Rate counters use an hourly window and expired entries are cleaned when new requests arrive; no scheduled task guarantees immediate deletion at expiry. Deletion of request and consent records is not yet automated. An approved procedure must also account for providers’ retention and deletion arrangements.

8. Rights and complaints
You may request access, rectification, erasure, restriction, objection and portability where applicable, and withdraw consent, by emailing info@cimstudio.es. Additional identity information will only be requested where necessary and proportionate. You may also complain to the Spanish Data Protection Agency (https://www.aepd.es). Unsubscribing does not prevent you from exercising other rights or authorise unnecessary retention. Outstanding reviews identified in this draft must be completed before approval and the activation of real processing.`,
    cookies: `COOKIES AND TECHNOLOGIES POLICY

Controller: CIM STUDIO ESPJ, NIF E88749155. Contact: info@cimstudio.es. Address: C/ Juan Sindic, 7, planta baja, 07420 Sa Pobla, Illes Balears, España.

The website code does not include advertising analytics or use first-party cookies, localStorage or sessionStorage to retain preferences or form details. Language and form state remain in memory during the visit. This description of the code does not mean that hosting or security services process no technical data or cannot use browser technologies.

When forms are enabled, Cloudflare Turnstile loads to verify requests and prevent abusive submissions. Verification may involve browser signals, connection data and the provider’s technical technologies. The widget’s actual configuration, including possible pre-clearance and storage options, must be audited in the deployment. No particular cookie is asserted to be set, and no unverified names, lifetimes or guarantees are stated. In disabled demonstration mode, the application does not request the Turnstile widget.

GetResponse and Resend are called from the server, rather than through a tracking script installed on this page. Microsoft 365 receives enquiry emails. Email open and click tracking settings, associated information and their lawful basis must be checked separately before use. No marketing pixel has been added to this homepage.

Before services are enabled, the technologies actually observed must be inventoried, including provider, purpose, lifetime and first- or third-party status. Technologies requiring consent must remain blocked until it is obtained, with appropriate information and mechanisms to refuse and withdraw it. There is currently no consent manager for optional technologies; they must not be added or enabled without resolving this requirement. Whether Turnstile qualifies as technically necessary must be assessed against its effective configuration.

You can inspect or remove site storage through your browser settings; blocking technical resources may prevent verification or submission. For privacy questions or assistance, contact info@cimstudio.es. Personal-data processing and your rights are described in the privacy policy. The inventory and outstanding decisions must be completed before this policy is approved.`
  }
};
